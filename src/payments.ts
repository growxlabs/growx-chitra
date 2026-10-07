import type { Env } from './types';
import { ensureBusiness } from './store';
import { PLANS, plansMessage, rupees, selectPlan } from './plans';
import { parseRazorpayEvent, RazorpayError, RazorpayService, type RazorpayEvent } from './razorpay';
import { WhatsAppService } from './whatsapp';
import { copy } from './messages/copy';
import { allowRate, confirmDeletion } from './store';
import { getStorage } from './storage';

const now = () => new Date().toISOString();
function logPayment(event: string, fields: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...fields }));
}
function legalLines(env: Env): string {
  const links = [
    env.TERMS_URL ? `Terms: ${env.TERMS_URL}` : '',
    env.PRIVACY_URL ? `Privacy: ${env.PRIVACY_URL}` : '',
    env.REFUND_POLICY_URL ? `Refund policy: ${env.REFUND_POLICY_URL}` : '',
    env.PAYMENT_SUPPORT_CONTACT ? `Payment support: ${env.PAYMENT_SUPPORT_CONTACT}` : ''
  ].filter(Boolean);
  return links.length ? `\n\n${links.join('\n')}` : '';
}

export async function handleWhatsAppText(env: Env, whatsapp: WhatsAppService, sender: string, rawText: string, messageId: string): Promise<void> {
  const text = rawText.trim().toLowerCase();
  if (!text || text.length > 100) return;
  if (text==='help') { await whatsapp.sendText(sender,copy.help); return; }
  if (text==='privacy') { await whatsapp.sendText(sender,copy.privacy(env)); return; }
  if (text==='terms') { await whatsapp.sendText(sender,copy.terms(env)); return; }
  if (text==='support') { await whatsapp.sendText(sender,`For Growx Chitra support:${env.SUPPORT_CONTACT ? `\n${env.SUPPORT_CONTACT}` : ' support contact is not configured yet.'}`); return; }
  let businessId:string;
  try { businessId=await ensureBusiness(env,sender); }
  catch(error) { if(error instanceof Error && error.message==='deleted_identity') { await whatsapp.sendText(sender,'This number was previously used for a deleted Growx Chitra account. Contact support if you need help.'); return; } throw error; }
  const business=await env.DB.prepare('SELECT account_state,legal_notice_shown_at FROM businesses WHERE id=?').bind(businessId).first<{account_state:string;legal_notice_shown_at:string|null}>();
  if(business?.account_state==='suspended' && !['delete my data','confirm delete','cancel'].includes(text)) { await whatsapp.sendText(sender,copy.suspended(env)); return; }
  if(business?.account_state==='deleted') return;
  const knownCommand=['help','privacy','terms','support','delete my data','confirm delete','cancel','brand','brand status','setup brand','change logo','change colour','change color','change style','remove logo','skip','credits','plan','plans','buy','payment','payment status','starter','business','pro','1','2','3','custom','4'].includes(text);
  if(!business?.legal_notice_shown_at && !knownCommand) {
    const shown=await env.DB.prepare('UPDATE businesses SET terms_version=?,privacy_version=?,legal_notice_shown_at=?,updated_at=? WHERE id=? AND legal_notice_shown_at IS NULL RETURNING id')
      .bind(env.TERMS_VERSION??'v1',env.PRIVACY_VERSION??'v1',now(),now(),businessId).first<{id:string}>();
    if(shown)
    await whatsapp.sendText(sender,copy.welcome(env));
  }
  if(text==='delete my data') {
    const expires=new Date(Date.now()+15*60_000).toISOString();
    await env.DB.prepare("UPDATE businesses SET account_state='deletion_pending',deletion_requested_at=?,deletion_confirmation_expires_at=?,deletion_confirmed_at=NULL WHERE id=? AND account_state IN ('active','suspended')")
      .bind(now(),expires,businessId).run();
    await whatsapp.sendText(sender,copy.deletionConfirm); return;
  }
  if(text==='confirm delete') { await confirmDeletion(env,businessId); await whatsapp.sendText(sender,copy.deletionDone); return; }
  if(text==='cancel' && business?.account_state==='deletion_pending') { await env.DB.prepare("UPDATE businesses SET account_state=CASE WHEN status='blocked' THEN 'suspended' ELSE 'active' END,deletion_requested_at=NULL,deletion_confirmation_expires_at=NULL WHERE id=? AND deletion_confirmed_at IS NULL").bind(businessId).run(); await whatsapp.sendText(sender,'Your deletion request was cancelled.'); return; }
  if(business?.account_state==='deletion_pending') { await whatsapp.sendText(sender,'Your account deletion is awaiting confirmation. Reply CONFIRM DELETE to continue or CANCEL to keep your account.'); return; }
  if(!await allowRate(env,businessId,'command',messageId,Number(env.MAX_COMMANDS_PER_MINUTE??20),60_000)) { await whatsapp.sendText(sender,copy.rateLimit); return; }
  const brand=await env.DB.prepare('SELECT *,logo_r2_key AS logo_storage_key FROM brand_profiles WHERE business_id=?').bind(businessId).first<{setup_state:string;business_name:string|null;primary_color:string|null;background_style:string|null;logo_enabled:number;logo_storage_key:string|null}>();
  if(brand && (['brand','setup brand','change logo','change colour','change color','change style'].includes(text) || (brand.setup_state!=='none'&&brand.setup_state!=='complete'))) {
    if(!await allowRate(env,businessId,'brand_setup',messageId,Number(env.MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR??10),3_600_000)) { await whatsapp.sendText(sender,copy.rateLimit); return; }
  }
  if(text==='brand status' || text==='brand' || text==='setup brand') {
    if(['brand','setup brand'].includes(text) && (!brand || ['none','complete'].includes(brand.setup_state))) {
      await env.DB.prepare("UPDATE brand_profiles SET setup_state='awaiting_logo',updated_at=? WHERE business_id=?").bind(now(),businessId).run();
      await whatsapp.sendText(sender,"Let's set up your brand.\n\nFirst, send your business logo, or reply SKIP."); return;
    }
    await whatsapp.sendText(sender,`Brand profile${brand?.business_name?` for ${brand.business_name}`:''}\nStyle: ${brand?.background_style??'clean white'}\nPrimary colour: ${brand?.primary_color??'not set'}\nLogo: ${brand?.logo_enabled&&brand.logo_storage_key?'on':'off'}\n\nReply CHANGE LOGO, CHANGE COLOUR, CHANGE STYLE, or REMOVE LOGO.`); return;
  }
  if(['change logo','change colour','change color','change style'].includes(text)) {
    const state=text==='change logo'?'awaiting_logo':text==='change style'?'awaiting_background_style':'awaiting_primary_color';
    await env.DB.prepare('UPDATE brand_profiles SET setup_state=?,updated_at=? WHERE business_id=?').bind(state,now(),businessId).run();
    await whatsapp.sendText(sender,state==='awaiting_logo'?'Send your new logo, or reply SKIP.':state==='awaiting_background_style'?'Choose an image style:\n1 — Clean white\n2 — Soft neutral\n3 — Brand colour background':'Send your primary brand colour, such as #000000 or black.'); return;
  }
  if(text==='remove logo') {
    const profile=await env.DB.prepare('SELECT logo_r2_key AS logo_storage_key FROM brand_profiles WHERE business_id=?').bind(businessId).first<{logo_storage_key:string|null}>();
    if(profile?.logo_storage_key?.startsWith(`brands/${businessId}/`)) await getStorage(env).delete(profile.logo_storage_key);
    await env.DB.prepare('UPDATE brand_profiles SET logo_enabled=0,logo_r2_key=NULL,updated_at=? WHERE business_id=?').bind(now(),businessId).run(); await whatsapp.sendText(sender,'Your logo has been removed from future images.'); return;
  }
  if(brand && brand.setup_state!=='none' && brand.setup_state!=='complete') {
    if(brand.setup_state==='awaiting_logo' && text==='skip') { await env.DB.prepare("UPDATE brand_profiles SET setup_state='awaiting_business_name',updated_at=? WHERE business_id=?").bind(now(),businessId).run(); await whatsapp.sendText(sender,"What's your business name?"); return; }
    if(brand.setup_state==='awaiting_logo' && text!=='skip') { await whatsapp.sendText(sender,'Please send a logo image, or reply SKIP.'); return; }
    if(brand.setup_state==='awaiting_business_name') { await env.DB.prepare("UPDATE brand_profiles SET business_name=?,setup_state='awaiting_primary_color',updated_at=? WHERE business_id=?").bind(rawText.trim().slice(0,100),now(),businessId).run(); await whatsapp.sendText(sender,'Send your primary brand colour (example: #000000 or black).'); return; }
    if(brand.setup_state==='awaiting_primary_color') {
      const colors:Record<string,string>={black:'#000000',white:'#ffffff',red:'#ff0000',blue:'#0000ff',green:'#008000',yellow:'#ffff00',orange:'#ffa500',purple:'#800080',pink:'#ffc0cb',brown:'#8b4513',gray:'#808080',grey:'#808080',navy:'#000080'};
      const color=colors[text]??( /^#[0-9a-f]{6}$/i.test(text)?text.toLowerCase():null );
      if(!color) { await whatsapp.sendText(sender,'That colour is not supported. Send a six-digit hex colour or a basic colour name.'); return; }
      await env.DB.prepare("UPDATE brand_profiles SET primary_color=?,setup_state='awaiting_background_style',updated_at=? WHERE business_id=?").bind(color,now(),businessId).run(); await whatsapp.sendText(sender,'Choose an image style:\n1 — Clean white\n2 — Soft neutral\n3 — Brand colour background'); return;
    }
    if(brand.setup_state==='awaiting_background_style') {
      const styles:Record<string,string>={'1':'clean_white','2':'soft_neutral','3':'brand_color','clean white':'clean_white','soft neutral':'soft_neutral','brand colour background':'brand_color','brand color background':'brand_color'};
      const style=styles[text]; if(!style) { await whatsapp.sendText(sender,'Reply 1 for clean white, 2 for soft neutral, or 3 for brand colour.'); return; }
      await env.DB.prepare("UPDATE brand_profiles SET background_style=?,setup_state='awaiting_logo_enabled',updated_at=? WHERE business_id=?").bind(style,now(),businessId).run(); await whatsapp.sendText(sender,'Would you like your logo on every image?\n1 — Yes\n2 — No'); return;
    }
    if(brand.setup_state==='awaiting_logo_enabled') {
      if(!['1','2','yes','no'].includes(text)) { await whatsapp.sendText(sender,'Reply 1 for yes or 2 for no.'); return; }
      const enabled=['1','yes'].includes(text)?1:0;
      await env.DB.prepare("UPDATE brand_profiles SET logo_enabled=?,watermark_enabled=?,setup_state='complete',updated_at=? WHERE business_id=?").bind(enabled,enabled,now(),businessId).run(); await whatsapp.sendText(sender,'Your Growx Chitra brand profile is ready.'); return;
    }
  }
  if (text === 'credits') {
    const balance = await env.DB.prepare(`SELECT c.free_remaining+c.paid_remaining-COUNT(r.image_job_id) AS available
      FROM credits c LEFT JOIN credit_reservations r ON r.business_id=c.business_id WHERE c.business_id=? GROUP BY c.business_id`)
      .bind(businessId).first<{available:number}>();
    await whatsapp.sendText(sender, `You have ${Math.max(0,balance?.available ?? 0)} Growx Chitra image credits remaining.`);
    return;
  }
  if (text === 'plan' || text === 'plans' || text === 'buy') {
    await whatsapp.sendText(sender, `${plansMessage()}\n\nCustom: Contact GrowxLabs for a custom Growx Chitra plan.`);
    return;
  }
  if (text === 'payment' || text === 'payment status') {
    const payment = await env.DB.prepare('SELECT plan_id,status,credits_purchased FROM payments WHERE business_id=? ORDER BY created_at DESC LIMIT 1')
      .bind(businessId).first<{plan_id:string;status:string;credits_purchased:number}>();
    const message = !payment ? 'There is no Growx Chitra payment yet.' : payment.status === 'paid' ? `Your latest payment is complete. ${payment.credits_purchased} credits were added.` :
      payment.status === 'refunded' ? 'Your latest payment has a refund recorded and is under review.' :
      payment.status === 'failed' ? 'Your latest payment was not completed. You can try again whenever you are ready.' :
      payment.status === 'expired' ? 'Your latest payment link expired. Reply buy to choose a plan again.' :
      payment.status === 'cancelled' ? 'Your latest payment link was cancelled. Reply buy to choose a plan again.' : 'Your latest payment is still pending.';
    await whatsapp.sendText(sender, message);
    return;
  }
  const selected = selectPlan(text);
  if (selected === 'custom') {
    await whatsapp.sendText(sender, 'Contact GrowxLabs for a custom Growx Chitra plan.');
    return;
  }
  if (!selected) return;
  if(!await allowRate(env,businessId,'payment_link',messageId,Number(env.MAX_PAYMENT_LINKS_PER_HOUR??3),3_600_000)) { await whatsapp.sendText(sender,copy.rateLimit); return; }
  const plan = PLANS[selected];
  const existing = await env.DB.prepare(`SELECT id,payment_url,status FROM payments WHERE business_id=? AND plan_id=?
    AND status IN ('created','pending') ORDER BY created_at DESC LIMIT 1`)
    .bind(businessId, selected).first<{id:string;payment_url:string|null;status:string}>();
  if (existing?.status === 'pending' && existing.payment_url) {
    await whatsapp.sendText(sender, `${plan.name} — ${plan.credits} image credits\n₹${rupees(plan)}\n\nComplete your payment here:\n${existing.payment_url}${legalLines(env)}`);
    return;
  }
  if (existing?.status === 'created') {
    await whatsapp.sendText(sender, 'Your Growx Chitra payment link is being prepared. Please try again shortly.');
    return;
  }
  const repeated = await env.DB.prepare('SELECT id,payment_url,status FROM payments WHERE whatsapp_message_id=?')
    .bind(messageId).first<{id:string;payment_url:string|null;status:string}>();
  if (repeated) {
    if (repeated.status === 'pending' && repeated.payment_url) {
      await whatsapp.sendText(sender, `${plan.name} — ${plan.credits} image credits\n₹${rupees(plan)}\n\nComplete your payment here:\n${repeated.payment_url}${legalLines(env)}`);
    } else await whatsapp.sendText(sender, 'That payment request has already been handled. Reply buy to choose a plan again.');
    return;
  }
  const paymentId = crypto.randomUUID();
  const createdAt = now();
  await env.DB.prepare(`INSERT INTO payments(id,business_id,provider,plan_id,amount_minor,currency,credits_purchased,status,created_at,metadata,whatsapp_message_id)
    VALUES (?,?,'razorpay',?,?,?,?,'created',?,?,?) ON CONFLICT(whatsapp_message_id) DO NOTHING`)
    .bind(paymentId,businessId,plan.id,plan.priceMinor,plan.currency,plan.credits,createdAt,JSON.stringify({source:'whatsapp'}),messageId).run();
  const initiated = await env.DB.prepare('SELECT id,status,payment_url FROM payments WHERE whatsapp_message_id=?').bind(messageId)
    .first<{id:string;status:string;payment_url:string|null}>();
  if (!initiated || initiated.id !== paymentId) {
    if (initiated?.status === 'pending' && initiated.payment_url) await whatsapp.sendText(sender, `${plan.name} — ${plan.credits} image credits\n₹${rupees(plan)}\n\nComplete your payment here:\n${initiated.payment_url}${legalLines(env)}`);
    else await whatsapp.sendText(sender, 'That payment request has already been handled. Reply buy to choose a plan again.');
    return;
  }
  let link: {linkId:string;url:string};
  try {
    link = await new RazorpayService(env).createPaymentLink({paymentId,businessId,phone:sender,plan});
  } catch (error) {
    const code = error instanceof RazorpayError ? error.code : 'payment_provider_error';
    await env.DB.prepare("UPDATE payments SET status='failed',failed_at=? WHERE id=? AND status='created'").bind(now(),paymentId).run();
    logPayment('payment_link_creation_failed',{business_id:businessId,payment_internal_id:paymentId,plan_id:plan.id,amount:plan.priceMinor,status:'failed',credits:plan.credits,result:code});
    await whatsapp.sendText(sender, 'I could not create a payment link just now. Please try again later.');
    return;
  }
  await env.DB.prepare("UPDATE payments SET status='pending',provider_payment_link_id=?,payment_url=? WHERE id=? AND status='created'")
    .bind(link.linkId,link.url,paymentId).run();
  logPayment('payment_link_created',{business_id:businessId,payment_internal_id:paymentId,plan_id:plan.id,amount:plan.priceMinor,status:'pending',credits:plan.credits,result:'success'});
  await whatsapp.sendText(sender, `Growx Chitra ${plan.name}\n\n${plan.credits} image credits\n₹${rupees(plan)}\n\nComplete your payment here:\n${link.url}${legalLines(env)}`);
}

function resolvePayment(row: {id:string;business_id:string;provider_payment_link_id:string|null;provider_payment_id:string|null;plan_id:string;amount_minor:number;currency:string;credits_purchased:number;status:string}, event: RazorpayEvent): boolean {
  return (!event.paymentLinkId || row.provider_payment_link_id === event.paymentLinkId) &&
    (!event.internalPaymentId || row.id === event.internalPaymentId) &&
    (!event.paymentId || event.eventType === 'payment_link.paid' || event.eventType === 'payment.failed' || row.provider_payment_id === event.paymentId);
}

export async function handleRazorpayEvent(env: Env, whatsapp: WhatsAppService, event: RazorpayEvent): Promise<'processed'|'duplicate'|'not_found'|'invalid'> {
  const already = await env.DB.prepare('SELECT payment_id FROM payment_provider_events WHERE provider_event_id=?').bind(event.eventId).first<{payment_id:string|null}>();
  if (already) {
    if (already.payment_id) await sendPaymentConfirmation(env,whatsapp,already.payment_id);
    return 'duplicate';
  }
  const payment = await env.DB.prepare(`SELECT id,business_id,provider_payment_link_id,provider_payment_id,plan_id,amount_minor,currency,credits_purchased,status
    FROM payments WHERE (? IS NOT NULL AND provider_payment_link_id=?) OR (? IS NOT NULL AND id=?) OR (? IS NOT NULL AND provider_payment_id=?)
    ORDER BY created_at DESC LIMIT 1`)
    .bind(event.paymentLinkId,event.paymentLinkId,event.internalPaymentId,event.internalPaymentId,event.paymentId,event.paymentId)
    .first<{id:string;business_id:string;provider_payment_link_id:string|null;provider_payment_id:string|null;plan_id:string;amount_minor:number;currency:string;credits_purchased:number;status:string}>();
  if (!payment || !resolvePayment(payment,event)) {
    logPayment('payment_not_found',{provider_event_id:event.eventId,event_type:event.eventType,result:'not_found'});
    return 'not_found';
  }
  const createdAt = now();
  if (event.eventType === 'payment_link.paid') {
    const exactAmount = event.amountMinor === payment.amount_minor && event.amountPaid === payment.amount_minor && event.currency === payment.currency &&
      event.providerStatus === 'paid' && !!event.paymentId && !!event.paymentLinkId;
    if (!exactAmount) {
      await env.DB.prepare('INSERT INTO payment_provider_events(provider_event_id,payment_id,event_type,result,created_at) VALUES (?,?,?,\'amount_mismatch\',?) ON CONFLICT DO NOTHING')
        .bind(event.eventId,payment.id,event.eventType,createdAt).run();
      logPayment('payment_webhook_amount_mismatch',{business_id:payment.business_id,payment_internal_id:payment.id,provider_event_id:event.eventId,plan_id:payment.plan_id,amount:event.amountPaid,status:payment.status,credits:payment.credits_purchased,result:'reconciliation_required'});
      return 'invalid';
    }
    await env.DB.batch([
      env.DB.prepare(`UPDATE payments SET status='paid',provider_payment_id=?,provider_order_id=COALESCE(provider_order_id,?),paid_at=COALESCE(paid_at,?),failed_at=NULL
        WHERE id=? AND provider_payment_link_id=? AND amount_minor=? AND currency=?
        AND status IN ('created','pending','failed','expired','cancelled') AND (provider_payment_id IS NULL OR provider_payment_id=?)`)
        .bind(event.paymentId,event.providerOrderId,createdAt,payment.id,event.paymentLinkId,payment.amount_minor,payment.currency,event.paymentId),
      env.DB.prepare(`INSERT INTO credit_ledger(id,business_id,amount,type,reference_id,created_at)
        SELECT ?,business_id,credits_purchased,'purchase',provider_payment_id,? FROM payments
        WHERE id=? AND status='paid' AND provider_payment_id=? AND amount_minor=? AND currency=?
        ON CONFLICT DO NOTHING`)
        .bind(crypto.randomUUID(),createdAt,payment.id,event.paymentId,payment.amount_minor,payment.currency),
      env.DB.prepare("INSERT INTO payment_provider_events(provider_event_id,payment_id,event_type,result,created_at) VALUES (?,?,?,'processed',?) ON CONFLICT DO NOTHING")
        .bind(event.eventId,payment.id,event.eventType,createdAt)
    ]);
    const granted = !!await env.DB.prepare("SELECT 1 FROM credit_ledger WHERE type='purchase' AND reference_id=?").bind(event.paymentId).first();
    logPayment(granted?'payment_credits_granted':'payment_webhook_duplicate',{business_id:payment.business_id,payment_internal_id:payment.id,provider_event_id:event.eventId,plan_id:payment.plan_id,amount:payment.amount_minor,status:'paid',credits:granted?payment.credits_purchased:0,result:granted?'success':'duplicate'});
    if (granted) await sendPaymentConfirmation(env,whatsapp,payment.id);
    return granted?'processed':'duplicate';
  }
  if (event.eventType === 'payment_link.expired' || event.eventType === 'payment_link.cancelled' || event.eventType === 'payment.failed') {
    const status = event.eventType === 'payment_link.expired' ? 'expired' : event.eventType === 'payment_link.cancelled' ? 'cancelled' : 'failed';
    await env.DB.batch([
      env.DB.prepare(`UPDATE payments SET status=?,failed_at=? WHERE id=? AND status IN ('created','pending')`).bind(status,createdAt,payment.id),
      env.DB.prepare('INSERT INTO payment_provider_events(provider_event_id,payment_id,event_type,result,created_at) VALUES (?,?,?, ?,?) ON CONFLICT DO NOTHING')
        .bind(event.eventId,payment.id,event.eventType,status,createdAt)
    ]);
    logPayment(status==='failed'?'payment_failed':'payment_link_state_updated',{business_id:payment.business_id,payment_internal_id:payment.id,provider_event_id:event.eventId,plan_id:payment.plan_id,amount:payment.amount_minor,status,credits:payment.credits_purchased,result:status});
    return 'processed';
  }
  if (event.eventType === 'refund.created' || event.eventType === 'refund.processed') {
    if (!event.refundId || !event.paymentId) return 'invalid';
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO payment_refunds(provider_refund_id,payment_id,amount_minor,currency,status,created_at)
        SELECT ?,id,?,?,?,? FROM payments WHERE id=? AND provider_payment_id=? ON CONFLICT DO NOTHING`)
        .bind(event.refundId,event.amountMinor ?? 0,event.currency ?? payment.currency,event.providerStatus ?? event.eventType,createdAt,payment.id,event.paymentId),
      env.DB.prepare("UPDATE payments SET status=CASE WHEN ?='refund.processed' THEN 'refunded' ELSE status END,refund_review_required=1 WHERE id=? AND provider_payment_id=? AND status IN ('paid','refunded')")
        .bind(event.eventType,payment.id,event.paymentId),
      env.DB.prepare('INSERT INTO payment_provider_events(provider_event_id,payment_id,event_type,result,created_at) VALUES (?,?,?,\'manual_review\',?) ON CONFLICT DO NOTHING')
        .bind(event.eventId,payment.id,event.eventType,createdAt)
    ]);
    logPayment('payment_refund_manual_review',{business_id:payment.business_id,payment_internal_id:payment.id,provider_event_id:event.eventId,plan_id:payment.plan_id,amount:event.amountMinor,status:'refunded',credits:payment.credits_purchased,result:'manual_review'});
    return 'processed';
  }
  return 'invalid';
}

async function sendPaymentConfirmation(env:Env,whatsapp:WhatsAppService,paymentId:string):Promise<void> {
  const payment=await env.DB.prepare(`SELECT p.id,p.business_id,p.plan_id,p.amount_minor,p.credits_purchased,b.whatsapp_number
    FROM payments p JOIN businesses b ON b.id=p.business_id WHERE p.id=? AND p.status IN ('paid','refunded')
    AND p.confirmation_sent_at IS NULL AND EXISTS(SELECT 1 FROM credit_ledger l WHERE l.type='purchase' AND l.reference_id=p.provider_payment_id)`)
    .bind(paymentId).first<{id:string;business_id:string;plan_id:string;amount_minor:number;credits_purchased:number;whatsapp_number:string}>();
  if(!payment) return;
  const claim=await env.DB.prepare('UPDATE payments SET confirmation_sent_at=? WHERE id=? AND confirmation_sent_at IS NULL RETURNING id')
    .bind(now(),paymentId).first<{id:string}>();
  if(!claim) return;
  try {
    await whatsapp.sendText(payment.whatsapp_number,`Payment received.\n\n${payment.credits_purchased} Growx Chitra image credits have been added to your account.\n\nSend your next product photo.`);
  } catch {
    await env.DB.prepare('UPDATE payments SET confirmation_sent_at=NULL WHERE id=? AND confirmation_sent_at IS NOT NULL').bind(paymentId).run();
    logPayment('payment_confirmation_send_failed',{business_id:payment.business_id,payment_internal_id:payment.id,plan_id:payment.plan_id,amount:payment.amount_minor,status:'paid',credits:payment.credits_purchased,result:'whatsapp_send_failed'});
    throw new Error('payment_confirmation_send_failed');
  }
}

export function normalizeRazorpayEvent(payload: unknown, eventId: string): RazorpayEvent | null {
  return parseRazorpayEvent(payload,eventId);
}
