import { Hono } from 'hono';
import type { Env } from './types';
import { parseDeliveryEvents, parseImages, parseQueuePayload, parseTextMessages, verifySignature } from './webhook';
import { enqueue, tryReceiveImage, recoverJobs, allowRate, cleanupRetention, cleanupDeletions, ensureBusiness } from './store';
import { consumeBatch } from './pipeline';
import { expirePendingDelivery, recordDelivery } from './credits';
import { handleWhatsAppText, handleRazorpayEvent, normalizeRazorpayEvent } from './payments';
import { RazorpayService } from './razorpay';
import { WhatsAppService } from './whatsapp';
import { plansMessage } from './plans';
import { copy } from './messages/copy';
import { processBrandLogo } from './brand-assets';
import { productionConfigurationReady } from './config';
import { internalApi } from './internal/api';

export const app = new Hono<{ Bindings: Env }>();
app.get('/health', c => c.json({ status: 'ok' }));
app.route('/internal', internalApi);
app.use('/webhooks/*',async(c,next)=>{ if(!productionConfigurationReady(c.env)) { console.error(JSON.stringify({event:'production_configuration_missing'})); return c.text('Service unavailable',503); } await next(); });
app.get('/webhooks/whatsapp', c => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');
  if (mode !== 'subscribe' || !c.env.WHATSAPP_VERIFY_TOKEN || token !== c.env.WHATSAPP_VERIFY_TOKEN || !challenge) return c.text('Forbidden', 403);
  return c.text(challenge, 200);
});
app.post('/webhooks/whatsapp', async c => {
  if (!c.env.WHATSAPP_APP_SECRET || !c.env.WHATSAPP_PHONE_NUMBER_ID) return c.text('Service unavailable', 503);
  const length = Number(c.req.header('content-length') ?? 0);
  if (length > 1024 * 1024) return c.text('Payload too large', 413);
  const reader = c.req.raw.body?.getReader();
  if (!reader) return c.text('Invalid payload', 400);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1024 * 1024) { await reader.cancel(); return c.text('Payload too large', 413); }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
  if (!await verifySignature(body.buffer, c.req.header('x-hub-signature-256') ?? null, c.env.WHATSAPP_APP_SECRET)) return c.text('Forbidden', 403);
  let payload: unknown;
  try { payload = JSON.parse(new TextDecoder().decode(body)); }
  catch { return c.text('Invalid JSON', 400); }
  try {
    for (const event of parseDeliveryEvents(payload,c.env.WHATSAPP_PHONE_NUMBER_ID)) await recordDelivery(c.env,event);
    const whatsapp = new WhatsAppService(c.env);
    for (const image of parseImages(payload, c.env.WHATSAPP_PHONE_NUMBER_ID)) {
      let businessId:string;
      try { businessId=await ensureBusiness(c.env,image.sender); }
      catch(error) { if(error instanceof Error&&error.message==='deleted_identity') { await whatsapp.sendText(image.sender,'This number was previously used for a deleted Growx Chitra account. Contact support if you need help.'); continue; } throw error; }
      const state=await c.env.DB.prepare('SELECT account_state,legal_notice_shown_at FROM businesses WHERE id=?').bind(businessId).first<{account_state:string;legal_notice_shown_at:string|null}>();
      if(state?.account_state==='suspended') { await whatsapp.sendText(image.sender,copy.suspended(c.env)); continue; }
      if(state?.account_state!=='active') continue;
      const showWelcome=!state?.legal_notice_shown_at;
      if(showWelcome) {
        const shown=await c.env.DB.prepare('UPDATE businesses SET terms_version=?,privacy_version=?,legal_notice_shown_at=?,updated_at=? WHERE id=? AND legal_notice_shown_at IS NULL RETURNING id')
          .bind(c.env.TERMS_VERSION??'v1',c.env.PRIVACY_VERSION??'v1',new Date().toISOString(),new Date().toISOString(),businessId).first<{id:string}>();
        if(!shown) Object.assign(state,{legal_notice_shown_at:'already_shown'});
      }
      if(!await allowRate(c.env,businessId,'image',image.messageId,Number(c.env.MAX_IMAGES_PER_HOUR??12),3_600_000)) { await whatsapp.sendText(image.sender,copy.rateLimit); continue; }
      const brandState=await c.env.DB.prepare('SELECT setup_state FROM brand_profiles WHERE business_id=?').bind(businessId).first<{setup_state:string}>();
      if(brandState?.setup_state==='awaiting_logo') {
        if(!await allowRate(c.env,businessId,'brand_setup',image.messageId,Number(c.env.MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR??10),3_600_000)) { await whatsapp.sendText(image.sender,copy.rateLimit); continue; }
        const id=crypto.randomUUID();
        const inserted=await c.env.DB.prepare(`INSERT INTO brand_asset_jobs(id,business_id,whatsapp_message_id,media_id,mime_type,media_sha256,created_at)
          VALUES (?,?,?,?,?,?,?) ON CONFLICT(whatsapp_message_id) DO NOTHING RETURNING id`).bind(id,businessId,image.messageId,image.mediaId,image.mimeType,image.sha256,new Date().toISOString()).first<{id:string}>();
        const assetId=inserted?.id??(await c.env.DB.prepare("SELECT id FROM brand_asset_jobs WHERE whatsapp_message_id=? AND status='queued'").bind(image.messageId).first<{id:string}>())?.id;
        if(assetId) await c.env.CHITRA_JOBS.send({version:1,job_id:assetId,kind:'brand_logo'});
        await whatsapp.sendText(image.sender,'Got it. I’m checking your logo now.');
        continue;
      }
      const job = await tryReceiveImage(c.env, image);
      if (job) await enqueue(c.env,job);
      if(showWelcome && job && state?.legal_notice_shown_at!=='already_shown') { try { await whatsapp.sendText(image.sender,copy.welcome(c.env)); } catch { console.warn(JSON.stringify({event:'welcome_send_failed',business_id:businessId})); } }
      else if (!job) await whatsapp.sendText(image.sender, `${showWelcome&&state?.legal_notice_shown_at!=='already_shown'?`${copy.welcome(c.env)}\n\n`:''}You've used all available Growx Chitra image credits.\n\n${plansMessage()}\n\nCustom: Contact GrowxLabs for a custom Growx Chitra plan.`);
    }
    for (const message of parseTextMessages(payload,c.env.WHATSAPP_PHONE_NUMBER_ID))
      await handleWhatsAppText(c.env,whatsapp,message.sender,message.text,message.messageId);
    // Text and unrelated content are acknowledged without image jobs.
    return c.text('EVENT_RECEIVED', 200);
  } catch (error) {
    console.error(JSON.stringify({ event: 'webhook_persistence_or_queue_failed', error_type:error instanceof Error?error.constructor.name:'unknown', error_code:error instanceof Error?error.message:'unknown' }));
    return c.text('Please retry', 503);
  }
});
app.post('/webhooks/razorpay',async c=>{
  if(!c.env.RAZORPAY_WEBHOOK_SECRET) return c.text('Service unavailable',503);
  const length=Number(c.req.header('content-length')??0);
  if(length>1024*1024) return c.text('Payload too large',413);
  const reader=c.req.raw.body?.getReader();
  if(!reader) return c.text('Invalid payload',400);
  const chunks:Uint8Array[]=[]; let size=0;
  for(;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>1024*1024) { await reader.cancel(); return c.text('Payload too large',413); } chunks.push(value); }
  const body=new Uint8Array(size); let offset=0; for(const chunk of chunks) { body.set(chunk,offset); offset+=chunk.length; }
  if(!await new RazorpayService(c.env).verifyWebhookSignature(body.buffer,c.req.header('x-razorpay-signature')??null)) {
    console.warn(JSON.stringify({event:'payment_webhook_invalid_signature',result:'rejected'})); return c.text('Forbidden',401);
  }
  let payload:unknown;
  try { payload=JSON.parse(new TextDecoder().decode(body)); } catch { return c.text('Invalid payload',400); }
  const suppliedId=c.req.header('x-razorpay-event-id');
  const eventId=suppliedId && /^[A-Za-z0-9_-]{1,200}$/.test(suppliedId) ? suppliedId : Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),b=>b.toString(16).padStart(2,'0')).join('');
  const event=normalizeRazorpayEvent(payload,eventId);
  if(!event) return c.text('Unsupported event',200);
  try {
    await handleRazorpayEvent(c.env,new WhatsAppService(c.env),event);
    return c.text('EVENT_RECEIVED',200);
  } catch {
    console.error(JSON.stringify({event:'payment_webhook_processing_failed',provider_event_id:eventId,event_type:event.eventType,result:'retryable_failure'}));
    return c.text('Please retry',503);
  }
});
app.get('*', async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not found', 404);
});
app.onError((_error, c) => {
  console.error(JSON.stringify({ event: 'request_failed' }));
  return c.text('Service unavailable', 503);
});
export default {
  fetch: app.fetch,
  queue: async (batch:MessageBatch<unknown>,env:Env):Promise<void> => {
    for(const msg of batch.messages) {
      try { const payload=parseQueuePayload(msg.body); if(payload.kind==='brand_logo') { if(await processBrandLogo(env,payload.job_id)) msg.ack(); else msg.retry({delaySeconds:60}); }
        else { const done=await consumeBatch({ ...batch, messages:[msg] } as MessageBatch<unknown>,env); void done; } }
      catch { msg.retry({delaySeconds:60}); }
    }
  },
  scheduled: async (_controller: ScheduledController, env: Env): Promise<void> => {
    await expirePendingDelivery(env);
    await recoverJobs(env);
    await cleanupRetention(env);
    await cleanupDeletions(env);
  }
} satisfies ExportedHandler<Env>;
