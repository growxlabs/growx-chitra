import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { app } from '../src/index';
import { cleanupDeletions, cleanupRetention, enqueue, ensureBusiness, receiveImage, recoverJobs } from '../src/store';
import { consumeBatch, processJob } from '../src/pipeline';
import { parseImages, parseQueuePayload, verifySignature } from '../src/webhook';
import { PipelineError, validateImage, WhatsAppService } from '../src/whatsapp';
import type { ProcessingServices } from '../src/pipeline';
import { recordDelivery, reserveCredit } from '../src/credits';
import { handleRazorpayEvent, handleWhatsAppText } from '../src/payments';
import { PLANS } from '../src/plans';
import { RazorpayService, parseRazorpayEvent } from '../src/razorpay';
import { OpenAIService } from '../src/openai';
import { SafetyService } from '../src/safety';
import type { Env, ImageMessage, Job, PrivateStorage, StoredObject } from '../src/types';
import { productionConfigurationReady } from '../src/config';

let mf: Miniflare;
let env: Env;
const bytes = new Uint8Array([255,216,255,224,1,2,3,4]);
let hash: string;
class MemoryStorage implements PrivateStorage {
  readonly objects=new Map<string,{bytes:Uint8Array;contentType:string}>();
  async put(key:string,body:ArrayBuffer|Uint8Array,contentType='application/octet-stream') { this.objects.set(key,{bytes:new Uint8Array(body instanceof Uint8Array?body:new Uint8Array(body)),contentType}); }
  async get(key:string):Promise<StoredObject|null> { const stored=this.objects.get(key); if(!stored) return null; const bytes=stored.bytes.slice(); return {size:bytes.byteLength,arrayBuffer:async()=>bytes.buffer}; }
  async delete(keys:string|string[]) { for(const key of Array.isArray(keys)?keys:[keys]) this.objects.delete(key); }
  async list(prefix:string) { return [...this.objects.keys()].filter(key=>key.startsWith(prefix)); }
}
let storage:MemoryStorage;
const image: ImageMessage = { sender: '919876543210', messageId: 'wamid.test1', mediaId: '123456', mimeType: 'image/jpeg', timestamp: '1791234000', sha256: '' };
const generatedBytes = new Uint8Array([82,73,70,70,8,0,0,0,87,69,66,80,86,80,56,32]);
const finalBytes = new Uint8Array([255,216,255,224,1,2,3,4]);
function processingServices(overrides: Partial<ProcessingServices> = {}): ProcessingServices {
  return {
    images: {validate:vi.fn(async()=>{}),normalize:vi.fn(async()=>new Uint8Array(bytes).buffer),brand:vi.fn(async()=>new Uint8Array(finalBytes).buffer),...overrides.images},
    safety: {inputSafetyCheck:vi.fn(async()=>{}),outputSafetyCheck:vi.fn(async()=>{}),...overrides.safety},
    openai: {processProductImage:vi.fn(async()=>({bytes:new Uint8Array(generatedBytes).buffer,requestId:'req_test',usage:'{"total_tokens":123}',duration:250})),...overrides.openai}
  };
}
async function storeOriginal(job: Job) {
  await env.STORAGE!.put(job.original_storage_key,new Uint8Array(bytes),'image/jpeg');
}
function payload(type = 'image', phone = '123') {
  return { object: 'whatsapp_business_account', entry: [{ changes: [{ field: 'messages', value: {
    metadata: { phone_number_id: phone }, messages: [{ from: image.sender, id: image.messageId, timestamp: image.timestamp, type,
      image: { id: image.mediaId, mime_type: image.mimeType, sha256: image.sha256 } }]
  } }] }] };
}
async function signature(body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return `sha256=${Array.from(signed, n => n.toString(16).padStart(2,'0')).join('')}`;
}
async function post(body: string, signed = true) {
  return app.request('/webhooks/whatsapp', { method: 'POST', headers: { 'x-hub-signature-256': signed ? await signature(body) : 'invalid' }, body }, env);
}
async function razorSignature(body: string) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode('test-webhook'),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signed=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(body)));
  return Array.from(signed,b=>b.toString(16).padStart(2,'0')).join('');
}
async function postRazorpay(body:string,signed=true) {
  return app.request('/webhooks/razorpay',{method:'POST',headers:{'x-razorpay-signature':signed?await razorSignature(body):'invalid','x-razorpay-event-id':'evt_test'},body},env);
}
async function pendingPayment(planId:'starter'|'business'|'pro',businessId:string,internalId=crypto.randomUUID(),linkId=`plink_${crypto.randomUUID().replaceAll('-','')}`) {
  const plan=PLANS[planId];
  await env.DB.prepare(`INSERT INTO payments(id,business_id,provider,provider_payment_link_id,plan_id,amount_minor,currency,credits_purchased,status,created_at)
    VALUES (?,?,'razorpay',?,?,?,'INR',?,'pending',?)`).bind(internalId,businessId,linkId,planId,plan.priceMinor,plan.credits,new Date().toISOString()).run();
  return {internalId,linkId,plan};
}
function paidEvent(payment:{internalId:string;linkId:string;plan:typeof PLANS.starter|typeof PLANS.business|typeof PLANS.pro},paymentId=`pay_${crypto.randomUUID().replaceAll('-','')}`) {
  return {event:'payment_link.paid',payload:{payment_link:{entity:{id:payment.linkId,reference_id:payment.internalId,amount:payment.plan.priceMinor,amount_paid:payment.plan.priceMinor,currency:'INR',status:'paid',payments:[{payment_id:paymentId}]}},payment:{entity:{id:paymentId,status:'captured',amount:payment.plan.priceMinor,currency:'INR',notes:{payment_internal_id:payment.internalId}}}}};
}
beforeAll(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("test"); } }',
    compatibilityDate: '2026-10-01', d1Databases: { DB: 'test-db' } }));
  const db = await mf.getD1Database('DB');
  for(const file of ['0001_foundation.sql','0002_processing.sql','0003_final_delivery_metrics.sql','0004_payments.sql','0005_scope4.sql','0006_brand_logo_prompt.sql','0007_scope5_ops_console.sql']) {
    const sql = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
    const statements=sql.split(/;(?=\s*(?:PRAGMA|CREATE|INSERT|DROP|ALTER)\b)/i).map(s=>s.trim()).filter(s=>/\b(?:PRAGMA|CREATE|INSERT|DROP|ALTER)\b/i.test(s));
    await db.batch(statements.map(statement=>db.prepare(statement)));
  }
  hash = btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))));
  image.sha256 = hash;
  env = { DB: db as unknown as D1Database, SUPABASE_URL:'https://storage.example.test',SUPABASE_SERVICE_ROLE_KEY:'service-role-test',SUPABASE_STORAGE_BUCKET:'chitra-private',
    CHITRA_JOBS: { send: vi.fn(async () => {}) } as unknown as Env['CHITRA_JOBS'],
    AI: { run:vi.fn(async()=>[]) } as unknown as Ai,
    IMAGES: {} as ImagesBinding,
    WHATSAPP_VERIFY_TOKEN: 'verify', WHATSAPP_ACCESS_TOKEN: 'test', WHATSAPP_APP_SECRET: 'secret',
    WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_API_VERSION: 'v23.0',OPENAI_API_KEY:'test-key',OPENAI_IMAGE_MODEL:'gpt-image-2.5-flare',
    OPENAI_IMAGE_QUALITY:'low',PERSON_DETECTION_THRESHOLD:'0.5',MAX_GENERATION_ATTEMPTS:'2',WORKING_IMAGE_MAX_DIMENSION:'1024',
    IMAGE_RETENTION_DAYS:'7',ORIGINAL_IMAGE_RETENTION_DAYS:'30',GENERATED_IMAGE_RETENTION_DAYS:'30',BLOCKED_IMAGE_RETENTION_HOURS:'24',MAX_UPLOAD_BYTES:'5242880',MAX_IMAGE_WIDTH:'8000',MAX_IMAGE_HEIGHT:'8000',MAX_IMAGES_PER_HOUR:'12',MAX_COMMANDS_PER_MINUTE:'20',MAX_PAYMENT_LINKS_PER_HOUR:'3',MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR:'10',BUSINESS_IDENTITY_SECRET:'test-identity-secret',TERMS_VERSION:'v1',PRIVACY_VERSION:'v1',SUPPORT_CONTACT:'help@example.com',DELIVERY_TIMEOUT_HOURS:'24',RAZORPAY_KEY_ID:'rzp_test_key',RAZORPAY_KEY_SECRET:'test-secret',RAZORPAY_WEBHOOK_SECRET:'test-webhook',RAZORPAY_MODE:'test',
    TERMS_URL:'',PRIVACY_URL:'',REFUND_POLICY_URL:'',PAYMENT_SUPPORT_CONTACT:'' };
}, 30_000);
beforeEach(async () => {
  vi.unstubAllGlobals();
  storage=new MemoryStorage(); env.STORAGE=storage;
  await env.DB.batch(['internal_audit_logs','support_notes','payment_refunds','payment_provider_events','payments','whatsapp_delivery_events','brand_asset_jobs','rate_limit_events','deleted_identity_markers','credit_reservations','abuse_events','credit_ledger','image_jobs','brand_profiles','credits','businesses'].map(t => env.DB.prepare(`DELETE FROM ${t}`)));
  vi.clearAllMocks();
  vi.mocked(env.CHITRA_JOBS.send).mockResolvedValue(undefined);
});

describe('Scope 4 onboarding, privacy and retention',()=>{
  it('returns safe health and requires production configuration without exposing diagnostics',async()=>{
    expect(await (await app.request('/health',{},env)).json()).toEqual({status:'ok'});
    expect(productionConfigurationReady({...env,APP_ENV:'production',WHATSAPP_ACCESS_TOKEN:''})).toBe(false);
    expect(productionConfigurationReady({...env,APP_ENV:'local',WHATSAPP_ACCESS_TOKEN:''})).toBe(true);
  });
  it('serves concise help, privacy and terms commands with configured links',async()=>{
    const texts:string[]=[]; const wa=new WhatsAppService(env,vi.fn<typeof fetch>().mockImplementation(async(_input,init)=>{texts.push(JSON.parse(init!.body as string).text.body);return Response.json({messages:[{id:'wamid.reply'}]});}));
    await handleWhatsAppText({...env,PRIVACY_URL:'https://example.test/privacy',TERMS_URL:'https://example.test/terms'},wa,image.sender,'privacy','wamid.p1');
    await handleWhatsAppText({...env,TERMS_URL:'https://example.test/terms'},wa,image.sender,'terms','wamid.p2'); await handleWhatsAppText(env,wa,image.sender,'help','wamid.p3');
    expect(texts[0]).toContain('https://example.test/privacy'); expect(texts[0]).toContain('DELETE MY DATA');
    expect(texts[1]).toContain('https://example.test/terms'); expect(texts[2]).toContain('Send a product photo');
  });
  it('runs deterministic brand setup, validates colour and stores style and logo preference',async()=>{
    const texts:string[]=[]; const wa=new WhatsAppService(env,vi.fn<typeof fetch>().mockImplementation(async(_input,init)=>{texts.push(JSON.parse(init!.body as string).text.body);return Response.json({messages:[{id:'wamid.brand'}]});}));
    await handleWhatsAppText(env,wa,image.sender,'setup brand','wamid.b1');
    expect((await env.DB.prepare('SELECT setup_state FROM brand_profiles').first()).setup_state).toBe('awaiting_logo');
    await handleWhatsAppText(env,wa,image.sender,'skip','wamid.b2');
    await handleWhatsAppText(env,wa,image.sender,'Corner Store','wamid.b3');
    await handleWhatsAppText(env,wa,image.sender,'not-a-colour','wamid.b4');
    expect((await env.DB.prepare('SELECT primary_color FROM brand_profiles').first()).primary_color).toBeNull();
    await handleWhatsAppText(env,wa,image.sender,'#123abc','wamid.b5');
    await handleWhatsAppText(env,wa,image.sender,'2','wamid.b6');
    await handleWhatsAppText(env,wa,image.sender,'no','wamid.b7');
    expect(await env.DB.prepare('SELECT business_name,primary_color,background_style,logo_enabled,setup_state FROM brand_profiles').first()).toEqual({business_name:'Corner Store',primary_color:'#123abc',background_style:'soft_neutral',logo_enabled:0,setup_state:'complete'});
    expect(texts.some(t=>t.includes('That colour is not supported'))).toBe(true);
  });
  it('requires confirmation before deletion and preserves reconciliation rows after confirmed deletion',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const pay=await pendingPayment('starter',businessId);
    const texts:string[]=[]; const wa=new WhatsAppService(env,vi.fn<typeof fetch>().mockImplementation(async(_input,init)=>{texts.push(JSON.parse(init!.body as string).text.body);return Response.json({messages:[{id:'wamid.reply'}]});}));
    await env.STORAGE!.put(`brands/${businessId}/logo/test.png`,bytes.buffer,'image/png');
    await handleWhatsAppText(env,wa,image.sender,'delete my data','wamid.del1');
    expect((await env.DB.prepare('SELECT account_state FROM businesses WHERE id=?').bind(businessId).first()).account_state).toBe('deletion_pending');
    expect(await env.STORAGE!.get(`brands/${businessId}/logo/test.png`)).not.toBeNull();
    await handleWhatsAppText(env,wa,image.sender,'confirm delete','wamid.del2'); await cleanupDeletions(env);
    expect((await env.DB.prepare('SELECT account_state,whatsapp_number FROM businesses WHERE id=?').bind(businessId).first()).account_state).toBe('deleted');
    expect(await env.STORAGE!.get(`brands/${businessId}/logo/test.png`)).toBeNull();
    expect((await env.DB.prepare('SELECT status,payment_url FROM payments WHERE id=?').bind(pay.internalId).first()).status).toBe('cancelled');
    expect(await env.DB.prepare('SELECT 1 FROM deleted_identity_markers').first()).not.toBeNull();
    await expect(ensureBusiness(env,image.sender)).rejects.toThrow('deleted_identity');
    await cleanupDeletions(env); // repeat is harmless
  });
  it('cleans expired product images without touching an active brand logo',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const job=await receiveImage(env,image);
    const original=job.original_storage_key, logo=`brands/${businessId}/logo/live.png`;
    await env.STORAGE!.put(original,bytes.buffer); await env.STORAGE!.put(logo,bytes.buffer);
    await env.DB.prepare('UPDATE image_jobs SET original_expires_at=?,generated_expires_at=? WHERE id=?').bind('2000-01-01T00:00:00.000Z','2000-01-01T00:00:00.000Z',job.id).run();
    await cleanupRetention(env);
    expect(await env.STORAGE!.get(original)).toBeNull(); expect(await env.STORAGE!.get(logo)).not.toBeNull();
    expect((await env.DB.prepare('SELECT original_expires_at,original_r2_key FROM image_jobs WHERE id=?').bind(job.id).first()).original_expires_at).toBeNull();
  });
});
afterAll(async () => { await mf?.dispose(); });

describe('webhooks', () => {
  it('verifies the Meta challenge', async () => {
    const response = await app.request('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=1234', {}, env);
    expect(response.status).toBe(200); expect(await response.text()).toBe('1234');
    expect((await app.request('/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1234', {}, env)).status).toBe(403);
  });
  it('parses image fields and excludes unrelated phone numbers and unsupported messages', () => {
    expect(parseImages(payload(), '123')).toEqual([image]);
    expect(parseImages(payload('text'), '123')).toEqual([]);
    expect(parseImages(payload('image','456'), '123')).toEqual([]);
    expect(parseImages(null, '123')).toEqual([]);
  });
  it('authenticates raw bytes and rejects tampering', async () => {
    const body = JSON.stringify(payload());
    expect(await verifySignature(new TextEncoder().encode(body).buffer, await signature(body), 'secret')).toBe(true);
    expect(await verifySignature(new TextEncoder().encode(body + ' ').buffer, await signature(body), 'secret')).toBe(false);
    expect((await post(body, false)).status).toBe(403);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM image_jobs').first<{n:number}>())?.n).toBe(0);
  });
  it('acknowledges unsupported messages and status notifications without jobs', async () => {
    expect((await post(JSON.stringify(payload('text')))).status).toBe(200);
    expect((await post(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }))).status).toBe(200);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM image_jobs').first<{n:number}>())?.n).toBe(0);
  });
  it('rejects signed malformed JSON', async () => { expect((await post('{bad')).status).toBe(400); });
  it('persists and queues images, deduplicating webhook retries', async () => {
    expect((await post(JSON.stringify(payload()))).status).toBe(200);
    expect((await post(JSON.stringify(payload()))).status).toBe(200);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM image_jobs').first<{n:number}>())?.n).toBe(1);
    expect(env.CHITRA_JOBS.send).toHaveBeenCalledTimes(1);
  });
});
describe('D1 persistence', () => {
  it('grants exactly 5 free credits and zero paid credits once', async () => {
    const first = await receiveImage(env, image);
    expect(first.original_storage_key).toBe(`originals/${first.business_id}/${first.id}/source.jpg`);
    expect(first.original_storage_key).not.toContain(image.sender);
    await env.DB.prepare('UPDATE credits SET free_remaining=2 WHERE business_id=?').bind(first.business_id).run();
    const second = await receiveImage(env, { ...image, messageId: 'wamid.test2' });
    expect(second.business_id).toBe(first.business_id);
    const credits = await env.DB.prepare('SELECT * FROM credits WHERE business_id=?').bind(first.business_id).first();
    expect(credits?.free_remaining).toBe(2); expect(credits?.paid_remaining).toBe(0);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM credit_ledger').first<{n:number}>())?.n).toBe(1);
  });
  it('starts new businesses with 5 credits', async () => {
    await receiveImage(env, image);
    const credits = await env.DB.prepare('SELECT * FROM credits').first();
    expect(credits?.free_remaining).toBe(5); expect(credits?.paid_remaining).toBe(0);
  });
  it('creates only one job and grant under concurrent duplicate delivery', async () => {
    const jobs = await Promise.all(Array.from({length: 4}, () => receiveImage(env, image)));
    expect(new Set(jobs.map(j => j.id)).size).toBe(1);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM businesses').first<{n:number}>())?.n).toBe(1);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM credit_ledger').first<{n:number}>())?.n).toBe(1);
  });
  it('retains a recoverable job when queue submission fails', async () => {
    vi.mocked(env.CHITRA_JOBS.send).mockRejectedValueOnce(new Error('private token must not be logged'));
    expect((await post(JSON.stringify(payload()))).status).toBe(503);
    const job = await env.DB.prepare('SELECT * FROM image_jobs').first<Job>();
    expect(job?.failure_reason).toBe('queue_submission_failed'); expect(job?.status).toBe('received');
    await recoverJobs(env);
    expect(env.CHITRA_JOBS.send).toHaveBeenCalledTimes(2);
  });
});
describe('queue and media', () => {
  it('validates the versioned queue payload', () => {
    const id = crypto.randomUUID();
    expect(parseQueuePayload({version:1,job_id:id})).toEqual({version:1,job_id:id});
    for (const value of [null, {}, {version:2,job_id:id}, {version:1,job_id:'oops'}]) expect(() => parseQueuePayload(value)).toThrow('invalid_queue_payload');
  });
  it('downloads, validates, stores, moderates, edits, brands and waits for WhatsApp delivery before charging', async () => {
    const job = await receiveImage(env, image); await enqueue(env, job);
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments', mime_type: 'image/jpeg', sha256: hash, file_size: bytes.length }))
      .mockResolvedValueOnce(new Response(bytes)).mockResolvedValueOnce(Response.json({id:'456'}))
      .mockResolvedValueOnce(Response.json({messages:[{id:'wamid.final'}]}));
    // Meta's attachment download host is explicitly tested.
    const service = new WhatsAppService(env, request);
    const stages=processingServices();
    expect(await processJob(env, job.id, service,stages)).toBe(true);
    let storedJob=await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(job.id).first<Job>();
    expect(storedJob?.status).toBe('sending');
    const stored = await env.STORAGE!.get(job.original_storage_key);
    expect(new Uint8Array(await stored!.arrayBuffer())).toEqual(bytes);
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(5);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM credit_reservations').first<{n:number}>())?.n).toBe(1);
    await recordDelivery(env,{messageId:'wamid.final',recipient:image.sender,status:'delivered',jobId:job.id});
    await recordDelivery(env,{messageId:'wamid.final',recipient:image.sender,status:'delivered',jobId:job.id});
    storedJob=await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(job.id).first<Job>();
    expect(storedJob?.status).toBe('completed');
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(4);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='image_delivered'").first<{n:number}>())?.n).toBe(1);
    expect((await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(job.id).first<{model:string;attempt_count:number;input_bytes:number;output_bytes:number;openai_request_id:string}>())?.model).toBe('gpt-image-2.5-flare');
    expect(stages.openai.processProductImage).toHaveBeenCalledOnce(); expect(request).toHaveBeenCalledTimes(4);
  });
  it('runs a signed webhook through queue processing and returns a real WhatsApp image message', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ url: 'https://lookaside.fbsbx.com/whatsapp_business/attachments', mime_type: 'image/jpeg', sha256: hash, file_size: bytes.length }))
      .mockResolvedValueOnce(new Response(bytes)).mockResolvedValueOnce(Response.json({id:'456'})).mockResolvedValueOnce(Response.json({messages:[{id:'wamid.loop'}]}));
    expect((await post(JSON.stringify(payload()))).status).toBe(200);
    const queueBody = vi.mocked(env.CHITRA_JOBS.send).mock.calls[0][0];
    const ack = vi.fn(); const retry = vi.fn();
    await consumeBatch({messages:[{body:queueBody,ack,retry}]} as unknown as MessageBatch<unknown>,env,
      processingServices(),new WhatsAppService(env,request));
    expect(ack).toHaveBeenCalledOnce(); expect(retry).not.toHaveBeenCalled();
    const job = await env.DB.prepare('SELECT * FROM image_jobs').first<Job>();
    expect(job?.status).toBe('sending'); expect(job?.final_message_id).toBe('wamid.loop');
    const sent = JSON.parse(request.mock.calls[3][1]!.body as string);
    expect(sent.type).toBe('image'); expect(sent.image.id).toBe('456'); expect(sent.to).toBe(image.sender);
  });
  it('records permanent failure reasons', async () => {
    const job = await receiveImage(env, image);
    const service = new WhatsAppService(env);
    vi.spyOn(service,'downloadMedia').mockRejectedValue(new PipelineError('image_hash_mismatch',true));
    expect(await processJob(env,job.id,service,processingServices())).toBe(true);
    const stored = await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(job.id).first<Job>();
    expect(stored?.status).toBe('blocked_input'); expect(stored?.failure_reason).toBe('image_hash_mismatch');
  });
  it('prevents concurrent processing while a live lease exists', async () => {
    const job = await receiveImage(env,image);
    await env.DB.prepare("UPDATE image_jobs SET status='processing',lease_until=? WHERE id=?")
      .bind(new Date(Date.now()+60_000).toISOString(),job.id).run();
    const service = new WhatsAppService(env);
    const download = vi.spyOn(service,'downloadMedia');
    expect(await processJob(env,job.id,service,processingServices())).toBe(false);
    expect(download).not.toHaveBeenCalled();
  });
  it('blocks an existing business before any download or reply', async () => {
    const job = await receiveImage(env,image);
    await env.DB.prepare("UPDATE businesses SET status='blocked' WHERE id=?").bind(job.business_id).run();
    const service = new WhatsAppService(env);
    const download = vi.spyOn(service,'downloadMedia');
    expect(await processJob(env,job.id,service,processingServices())).toBe(true);
    const stored = await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(job.id).first<Job>();
    expect(stored?.status).toBe('blocked'); expect(stored?.failure_reason).toBe('business_blocked');
    expect(download).not.toHaveBeenCalled();
  });
  it('retries transient failures and eventually marks failed', async () => {
    const job = await receiveImage(env,image);
    const service = new WhatsAppService(env);
    vi.spyOn(service,'downloadMedia').mockRejectedValue(new PipelineError('meta_http_503'));
    for(let i=0;i<4;i++) expect(await processJob(env,job.id,service,processingServices())).toBe(false);
    expect(await processJob(env,job.id,service,processingServices())).toBe(true);
    expect((await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(job.id).first<Job>())?.status).toBe('failed');
  });
  it('rejects corrupt bytes and unsafe download destinations', async () => {
    await expect(validateImage(new Uint8Array([1,2,3]).buffer,'image/jpeg',hash)).rejects.toThrow('invalid_image');
    const request = vi.fn<typeof fetch>().mockResolvedValue(Response.json({url:'https://evil.example/image',mime_type:'image/jpeg',sha256:hash,file_size:bytes.length}));
    await expect(new WhatsAppService(env,request).downloadMedia(image.mediaId,image.mimeType,hash)).rejects.toThrow('untrusted_media_url');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('acknowledges poison queue payloads without attempting processing', async () => {
    const ack = vi.fn(); const retry = vi.fn();
    await consumeBatch({ messages: [{body:{},ack,retry}] } as unknown as MessageBatch<unknown>,env);
    expect(ack).toHaveBeenCalledOnce(); expect(retry).not.toHaveBeenCalled();
  });
  it('blocks input people before OpenAI edit, saves an abuse event, and releases credit', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job); const whatsapp=new WhatsAppService(env), stages=processingServices({
      safety:{inputSafetyCheck:vi.fn(async()=>{throw new (await import('../src/safety')).SafetyBlock('person_detected','input');}),outputSafetyCheck:vi.fn(async()=>{})}
    });
    const send=vi.spyOn(whatsapp,'sendText').mockResolvedValue('wamid.refusal');
    expect(await processJob(env,job.id,whatsapp,stages)).toBe(true);
    expect(stages.openai.processProductImage).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(image.sender,'Growx Chitra currently processes product-only images. Images containing people cannot be processed.');
    expect((await env.DB.prepare('SELECT status,failure_reason FROM image_jobs WHERE id=?').bind(job.id).first<{status:string;failure_reason:string}>())?.status).toBe('blocked_input');
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(5);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM abuse_events').first<{n:number}>())?.n).toBe(1);
  });
  it('blocks explicit moderation results without generation or credit', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job); const stages=processingServices({
      safety:{inputSafetyCheck:vi.fn(async()=>{throw new (await import('../src/safety')).SafetyBlock('unsafe_input','input');}),outputSafetyCheck:vi.fn(async()=>{})}
    });
    expect(await processJob(env,job.id,new WhatsAppService(env),stages)).toBe(true);
    expect(stages.openai.processProductImage).not.toHaveBeenCalled();
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(5);
  });
  it('fails closed on moderation service errors without generation or credit', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job); const stages=processingServices({
      safety:{inputSafetyCheck:vi.fn(async()=>{throw new PipelineError('moderation_failure');}),outputSafetyCheck:vi.fn(async()=>{})}
    });
    expect(await processJob(env,job.id,new WhatsAppService(env),stages)).toBe(false);
    expect(stages.openai.processProductImage).not.toHaveBeenCalled();
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(5);
  });
  it('does not charge for image generation failure', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job); const stages=processingServices({openai:{processProductImage:vi.fn(async()=>{throw new PipelineError('image_generation_failure',true);})}});
    expect(await processJob(env,job.id,new WhatsAppService(env),stages)).toBe(true);
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(5);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM credit_reservations').first<{n:number}>())?.n).toBe(0);
  });
  it('blocks unsafe generated output and removes the unsafe candidate', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job); const stages=processingServices({
      safety:{inputSafetyCheck:vi.fn(async()=>{}),outputSafetyCheck:vi.fn(async()=>{throw new (await import('../src/safety')).SafetyBlock('unsafe_output','output');})}
    });
    expect(await processJob(env,job.id,new WhatsAppService(env),stages)).toBe(true);
    expect((await env.DB.prepare('SELECT status,output_safety_passed FROM image_jobs WHERE id=?').bind(job.id).first<{status:string;output_safety_passed:number}>())?.status).toBe('blocked_output');
    expect(await env.STORAGE!.get(`generated/${job.business_id}/${job.id}/clean.webp`)).toBeNull();
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(5);
  });
  it('reserves credits atomically so concurrent processing cannot overspend', async () => {
    const jobs=await Promise.all(Array.from({length:6},(_,i)=>receiveImage(env,{...image,messageId:`wamid.credit${i}`})));
    const results=await Promise.all(jobs.map(job=>reserveCredit(env,job.id,job.business_id)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM credit_reservations').first<{n:number}>())?.n).toBe(5);
  });
  it('deducts paid credits after free credits are gone', async () => {
    const job=await receiveImage(env,image);
    await env.DB.prepare('UPDATE credits SET free_remaining=0,paid_remaining=2 WHERE business_id=?').bind(job.business_id).run();
    await reserveCredit(env,job.id,job.business_id);
    await env.DB.prepare("UPDATE image_jobs SET status='sending',final_message_id='wamid.paid',final_r2_key='final/test.jpg',output_safety_passed=1,final_send_started=1 WHERE id=?").bind(job.id).run();
    await env.DB.prepare("INSERT INTO whatsapp_delivery_events(message_id,recipient,status,job_id,created_at,updated_at) VALUES ('wamid.paid',?,'delivered',?,?,?)").bind(image.sender,job.id,new Date().toISOString(),new Date().toISOString()).run();
    await recordDelivery(env,{messageId:'wamid.paid',recipient:image.sender,status:'delivered',jobId:job.id});
    const credits=await env.DB.prepare('SELECT free_remaining,paid_remaining FROM credits').first<{free_remaining:number;paid_remaining:number}>();
    expect(credits).toEqual({free_remaining:0,paid_remaining:1});
  });
  it('stops at two generation attempts', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job); const stages=processingServices({openai:{processProductImage:vi.fn(async()=>{throw new PipelineError('image_generation_failure');})}});
    for(let i=0;i<2;i++) await processJob(env,job.id,new WhatsAppService(env),stages);
    expect(stages.openai.processProductImage).toHaveBeenCalledTimes(2);
    expect((await env.DB.prepare('SELECT status,attempt_count FROM image_jobs WHERE id=?').bind(job.id).first<{status:string;attempt_count:number}>())?.attempt_count).toBe(2);
    expect((await env.DB.prepare('SELECT status FROM image_jobs WHERE id=?').bind(job.id).first<{status:string}>())?.status).toBe('failed');
  });
  it('refuses work without credits and never calls moderation or generation', async () => {
    const job=await receiveImage(env,image), stages=processingServices();
    await env.DB.prepare('UPDATE credits SET free_remaining=0 WHERE business_id=?').bind(job.business_id).run();
    const whatsapp=new WhatsAppService(env), send=vi.spyOn(whatsapp,'sendText').mockResolvedValue('wamid.no-credit');
    expect(await processJob(env,job.id,whatsapp,stages)).toBe(true);
    expect(stages.safety.inputSafetyCheck).not.toHaveBeenCalled(); expect(stages.openai.processProductImage).not.toHaveBeenCalled();
    expect(send.mock.calls[0][1]).toContain('Choose a plan to continue');
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM credit_reservations').first<{n:number}>())?.n).toBe(0);
  });
  it('sends image only to omni moderation', async () => {
    const request=vi.fn<typeof fetch>().mockResolvedValue(Response.json({results:[{flagged:false,categories:{sexual:false,'sexual/minors':false,violence:false}}]}));
    const service=new OpenAIService(env,request);
    expect(await service.moderate(new Uint8Array(bytes).buffer,'image/jpeg')).toBe(false);
    const body=JSON.parse(request.mock.calls[0][1]!.body as string);
    expect(request.mock.calls[0][0]).toBe('https://api.openai.com/v1/moderations');
    expect(body.model).toBe('omni-moderation-latest'); expect(body.input[0].type).toBe('image_url');
    expect(body.input[0].image_url.url).toMatch(/^data:image\/jpeg;base64,/);
  });
  it('calls the configured model through the image edit API with one source image and system prompt', async () => {
    const request=vi.fn<typeof fetch>().mockResolvedValue(Response.json({data:[{b64_json:btoa(String.fromCharCode(...generatedBytes))}]}));
    const service=new OpenAIService({...env,OPENAI_IMAGE_MODEL:'gpt-image-2.5-flare'},request);
    const result=await service.processProductImage(new Uint8Array(bytes).buffer,null);
    expect(new Uint8Array(result.bytes)).toEqual(generatedBytes);
    expect(request.mock.calls[0][0]).toBe('https://api.openai.com/v1/images/edits');
    const body=JSON.parse(request.mock.calls[0][1]!.body as string);
    expect(body.model).toBe('gpt-image-2.5-flare'); expect(body.n).toBe(1); expect(body.quality).toBe('low');
    expect(body.images).toHaveLength(1); expect(body.images[0].image_url).toMatch(/^data:image\/png;base64,/);
    expect(body.prompt).toContain('Preserve the actual product'); expect(body.prompt).not.toContain('undefined');
  });
  it('fails closed when omni moderation flags sexual content', async () => {
    const request=vi.fn<typeof fetch>().mockResolvedValue(Response.json({results:[{flagged:true,categories:{sexual:true,'sexual/minors':false}}]}));
    expect(await new OpenAIService(env,request).moderate(new Uint8Array(bytes).buffer,'image/jpeg')).toBe(true);
  });
  it('uses the configured person threshold for input and output detection', async () => {
    const images={validate:vi.fn(async()=>{}),info:vi.fn(async()=>({format:'image/jpeg',width:1,height:1}))};
    const openai={moderate:vi.fn(async()=>false)};
    (env.AI.run as ReturnType<typeof vi.fn>).mockResolvedValue([{label:'person',score:0.8}]);
    const safety=new SafetyService(env,images as unknown as import('../src/images').ImagesService,openai as unknown as OpenAIService);
    await expect(safety.inputSafetyCheck(new Uint8Array(bytes).buffer,'image/jpeg')).rejects.toMatchObject({code:'person_detected'});
    await expect(safety.outputSafetyCheck(new Uint8Array(bytes).buffer,'image/jpeg')).rejects.toMatchObject({code:'person_detected'});
    expect(env.AI.run).toHaveBeenCalledWith('@cf/facebook/detr-resnet-50',{image:Array.from(bytes)});
  });
  it('settles a delivered callback that races ahead of the send response', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job);
    const request=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({id:'456'}))
      .mockImplementationOnce(async(_input,init)=>{
        const body=JSON.parse(init!.body as string);
        await recordDelivery(env,{messageId:'wamid.early',recipient:image.sender,status:'delivered',jobId:body.biz_opaque_callback_data});
        return Response.json({messages:[{id:'wamid.early'}]});
      });
    expect(await processJob(env,job.id,new WhatsAppService(env,request),processingServices())).toBe(true);
    expect((await env.DB.prepare('SELECT status FROM image_jobs WHERE id=?').bind(job.id).first<{status:string}>())?.status).toBe('completed');
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(4);
    await recordDelivery(env,{messageId:'wamid.early',recipient:image.sender,status:'delivered',jobId:job.id});
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='image_delivered'").first<{n:number}>())?.n).toBe(1);
  });
  it('charges a full signed Meta delivery status webhook once', async () => {
    const job=await receiveImage(env,image); await storeOriginal(job);
    const request=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({id:'456'})).mockResolvedValueOnce(Response.json({messages:[{id:'wamid.webhook'}]}));
    await processJob(env,job.id,new WhatsAppService(env,request),processingServices());
    const event={object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'123'},statuses:[{
      id:'wamid.webhook',status:'delivered',timestamp:'1791234001',recipient_id:image.sender,biz_opaque_callback_data:job.id
    }]}}]}]};
    expect((await post(JSON.stringify(event))).status).toBe(200);
    expect((await post(JSON.stringify(event))).status).toBe(200);
    expect((await env.DB.prepare('SELECT status FROM image_jobs WHERE id=?').bind(job.id).first<{status:string}>())?.status).toBe('completed');
    expect((await env.DB.prepare('SELECT free_remaining FROM credits').first())?.free_remaining).toBe(4);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='image_delivered'").first<{n:number}>())?.n).toBe(1);
  });
});

describe('Scope 3 plans and Razorpay payments',()=>{
  it('keeps stable plan IDs, INR paise, and exact credit packs centrally configured',()=>{
    expect(PLANS.free).toMatchObject({id:'free',credits:5,priceMinor:0,currency:'INR',type:'lifetime_free'});
    expect(PLANS.starter).toMatchObject({id:'starter',credits:50,priceMinor:99900,currency:'INR'});
    expect(PLANS.business).toMatchObject({id:'business',credits:150,priceMinor:249900,currency:'INR'});
    expect(PLANS.pro).toMatchObject({id:'pro',credits:350,priceMinor:499900,currency:'INR'});
  });
  it('preserves the one-time five free credit grant across repeated business setup',async()=>{
    const id=await ensureBusiness(env,image.sender); await ensureBusiness(env,image.sender);
    const balance=await env.DB.prepare('SELECT free_remaining,paid_remaining FROM credits WHERE business_id=?').bind(id).first();
    expect(balance).toEqual({free_remaining:5,paid_remaining:0});
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='free_grant'").first<{n:number}>())?.n).toBe(1);
  });
  it('does not create an image job or download media for a zero-credit sender',async()=>{
    const businessId=await ensureBusiness(env,image.sender);
    await env.DB.prepare('UPDATE credits SET free_remaining=0 WHERE business_id=?').bind(businessId).run();
    const before=(await env.STORAGE!.list('')).length;
    vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.plans'}]})));
    const response=await post(JSON.stringify(payload()));
    expect(response.status).toBe(200); expect(env.CHITRA_JOBS.send).not.toHaveBeenCalled();
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM image_jobs').first<{n:number}>())?.n).toBe(0);
    expect((await env.STORAGE!.list('')).length).toBe(before);
  });
  it('offers plan choices when an image arrives after all credits are spent',async()=>{
    const businessId=await ensureBusiness(env,image.sender);
    await env.DB.prepare('UPDATE credits SET free_remaining=0 WHERE business_id=?').bind(businessId).run();
    const sent=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.plans'}]})); vi.stubGlobal('fetch',sent);
    const response=await post(JSON.stringify(payload()));
    expect(response.status).toBe(200); expect(sent).toHaveBeenCalledOnce();
    const message=JSON.parse(sent.mock.calls[0][1]!.body as string).text.body as string;
    expect(message).toContain('1 — Starter'); expect(message).toContain('2 — Business'); expect(message).toContain('3 — Pro');
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM image_jobs').first<{n:number}>())?.n).toBe(0);
  });
  it('creates exact Razorpay payment links for each pack without trusting user amounts',async()=>{
    const api=vi.fn<typeof fetch>().mockImplementation(async(input,init)=>{
      const request=JSON.parse(init!.body as string); return Response.json({id:`plink_${request.reference_id.replaceAll('-','')}`,short_url:'https://rzp.io/i/test'});
    }); vi.stubGlobal('fetch',api);
    const wa=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.sent'}]}));
    const whatsapp=new WhatsAppService(env,wa);
    for(const [i,planId] of (['starter','business','pro'] as const).entries())
      await handleWhatsAppText(env,whatsapp,`9198765432${i}0`,planId,`wamid.buy${i}`);
    const amounts=api.mock.calls.map(([,init])=>JSON.parse(init!.body as string).amount);
    expect(amounts).toEqual([99900,249900,499900]);
    expect(api.mock.calls.map(([,init])=>JSON.parse(init!.body as string).currency)).toEqual(['INR','INR','INR']);
    expect((await env.DB.prepare('SELECT plan_id,amount_minor,credits_purchased FROM payments ORDER BY created_at').all()).results)
      .toEqual([{plan_id:'starter',amount_minor:99900,credits_purchased:50},{plan_id:'business',amount_minor:249900,credits_purchased:150},{plan_id:'pro',amount_minor:499900,credits_purchased:350}]);
    expect((await env.DB.prepare('SELECT SUM(paid_remaining) AS total FROM credits').first<{total:number}>())?.total).toBe(0);
    expect(JSON.parse(api.mock.calls[0][1]!.body as string).notes.credits).toBe('50');
    expect(JSON.parse(api.mock.calls[0][1]!.body as string).amount).not.toBe(1);
  });
  it('keeps test mode as the default and refuses a live key unless mode is explicitly changed',async()=>{
    const api=vi.fn<typeof fetch>();
    const incorrect=new RazorpayService({...env,RAZORPAY_MODE:'test',RAZORPAY_KEY_ID:'rzp_live_secret'},api);
    await expect(incorrect.createPaymentLink({paymentId:crypto.randomUUID(),businessId:crypto.randomUUID(),phone:image.sender,plan:PLANS.starter}))
      .rejects.toMatchObject({code:'payment_provider_mode_mismatch'});
    expect(api).not.toHaveBeenCalled();
    api.mockImplementation(async()=>Response.json({id:'plink_test123',short_url:'https://rzp.io/i/test'}));
    const defaultMode=new RazorpayService({...env,RAZORPAY_MODE:undefined},api);
    expect((await defaultMode.createPaymentLink({paymentId:crypto.randomUUID(),businessId:crypto.randomUUID(),phone:image.sender,plan:PLANS.starter})).url)
      .toBe('https://rzp.io/i/test');
  });
  it('reuses a pending pack link instead of creating repeated payment links',async()=>{
    const api=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({id:'plink_once123',short_url:'https://rzp.io/i/once'})); vi.stubGlobal('fetch',api);
    const wa=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.link'}]})); const whatsapp=new WhatsAppService(env,wa);
    await handleWhatsAppText(env,whatsapp,image.sender,'starter','wamid.first-buy');
    await handleWhatsAppText(env,whatsapp,image.sender,'starter','wamid.second-buy');
    expect(api).toHaveBeenCalledOnce();
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM payments').first<{n:number}>())?.n).toBe(1);
    expect(wa).toHaveBeenCalledTimes(2);
  });
  it('rejects arbitrary/invalid plan text and cannot accept user-entered prices or credits',async()=>{
    const api=vi.fn<typeof fetch>(); vi.stubGlobal('fetch',api);
    const wa=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.sent'}]}));
    await handleWhatsAppText(env,new WhatsAppService(env,wa),image.sender,'starter 1 ₹1 for 350 credits','wamid.invalid-plan');
    await handleWhatsAppText(env,new WhatsAppService(env,wa),image.sender,'premium','wamid.invalid-plan2');
    expect(api).not.toHaveBeenCalled(); expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM payments').first<{n:number}>())?.n).toBe(0);
  });
  it('returns payment links through WhatsApp and includes only configured policy URLs',async()=>{
    vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({id:'plink_abc123',short_url:'https://rzp.io/i/abc'})));
    const wa=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.reply'}]}));
    await handleWhatsAppText({...env,TERMS_URL:'https://growxlabs.example/terms',PRIVACY_URL:'',REFUND_POLICY_URL:'https://growxlabs.example/refunds'},new WhatsAppService(env,wa),image.sender,'1','wamid.starter');
    const outgoing=JSON.parse(wa.mock.calls[0][1]!.body as string).text.body as string;
    expect(outgoing).toContain('Growx Chitra Starter'); expect(outgoing).toContain('50 image credits'); expect(outgoing).toContain('₹999');
    expect(outgoing).toContain('https://rzp.io/i/abc'); expect(outgoing).toContain('https://growxlabs.example/terms'); expect(outgoing).not.toContain('localhost');
  });
  it('verifies Razorpay signatures over exact raw bytes and rejects an invalid signature',async()=>{
    const body=' {"event":"payment_link.paid"}';
    const signature=await razorSignature(body);
    expect(await new RazorpayService(env).verifyWebhookSignature(new TextEncoder().encode(body).buffer,signature)).toBe(true);
    expect(await new RazorpayService(env).verifyWebhookSignature(new TextEncoder().encode(body.trim()).buffer,signature)).toBe(false);
    expect((await postRazorpay(body,false)).status).toBe(401);
  });
  it('grants exact credits from a verified paid webhook and not from an invalid signature',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const payment=await pendingPayment('starter',businessId);
    const body=JSON.stringify(paidEvent(payment));
    expect((await postRazorpay(body,false)).status).toBe(401);
    const wa=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.paid'}]})); vi.stubGlobal('fetch',wa);
    expect((await postRazorpay(body)).status).toBe(200);
    const stored=await env.DB.prepare('SELECT status,provider_payment_id FROM payments WHERE id=?').bind(payment.internalId).first();
    expect(stored?.status).toBe('paid');
    expect((await env.DB.prepare('SELECT free_remaining,paid_remaining FROM credits WHERE business_id=?').bind(businessId).first()).paid_remaining).toBe(50);
    expect((await env.DB.prepare("SELECT amount,type,reference_id FROM credit_ledger WHERE type='purchase'").first()).amount).toBe(50);
    expect(JSON.parse(wa.mock.calls[0][1]!.body as string).text.body).toContain('50 Growx Chitra image credits have been added');
  });
  it('does not grant credits for forged amounts, unknown plans, or payment-link creation alone',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const payment=await pendingPayment('starter',businessId);
    const wrong=paidEvent(payment); wrong.payload.payment_link.entity.amount_paid=1;
    await handleRazorpayEvent(env,new WhatsAppService(env,vi.fn()),parseRazorpayEvent(wrong,'evt_wrong')!);
    expect((await env.DB.prepare('SELECT paid_remaining FROM credits WHERE business_id=?').bind(businessId).first()).paid_remaining).toBe(0);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='purchase'").first<{n:number}>())?.n).toBe(0);
    expect((await env.DB.prepare('SELECT status FROM payments WHERE id=?').bind(payment.internalId).first()).status).toBe('pending');
  });
  it('makes successful credit grants exactly once for concurrent and duplicate webhooks',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const payment=await pendingPayment('starter',businessId);
    const event=parseRazorpayEvent(paidEvent(payment),'evt_dupe')!; const wa=new WhatsAppService(env,vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.x'}]})));
    await Promise.all([handleRazorpayEvent(env,wa,event),handleRazorpayEvent(env,wa,event)]);
    expect((await env.DB.prepare('SELECT paid_remaining FROM credits WHERE business_id=?').bind(businessId).first()).paid_remaining).toBe(50);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='purchase'").first<{n:number}>())?.n).toBe(1);
  });
  it('accumulates two legitimate different purchases while retaining the free balance',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const first=await pendingPayment('starter',businessId);
    const second=await pendingPayment('pro',businessId);
    const whatsapp=new WhatsAppService(env,vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.confirm'}]})));
    await handleRazorpayEvent(env,whatsapp,parseRazorpayEvent(paidEvent(first),'evt_first')!);
    await handleRazorpayEvent(env,whatsapp,parseRazorpayEvent(paidEvent(second),'evt_second')!);
    expect(await env.DB.prepare('SELECT free_remaining,paid_remaining FROM credits WHERE business_id=?').bind(businessId).first()).toEqual({free_remaining:5,paid_remaining:400});
  });
  it('updates failed and expired payment states without granting credits',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const failed=await pendingPayment('starter',businessId);
    const expired=await pendingPayment('business',businessId);
    const failure=parseRazorpayEvent({event:'payment.failed',payload:{payment:{entity:{id:'pay_failed',status:'failed',amount:99900,currency:'INR',notes:{payment_internal_id:failed.internalId}}}}},'evt_failed')!;
    const expiry=parseRazorpayEvent({event:'payment_link.expired',payload:{payment_link:{entity:{id:expired.linkId,reference_id:expired.internalId,status:'expired',amount:249900,currency:'INR'}}}},'evt_expired')!;
    await handleRazorpayEvent(env,new WhatsAppService(env,vi.fn()),failure); await handleRazorpayEvent(env,new WhatsAppService(env,vi.fn()),expiry);
    expect((await env.DB.prepare('SELECT status FROM payments WHERE id=?').bind(failed.internalId).first()).status).toBe('failed');
    expect((await env.DB.prepare('SELECT status FROM payments WHERE id=?').bind(expired.internalId).first()).status).toBe('expired');
    expect((await env.DB.prepare('SELECT paid_remaining FROM credits WHERE business_id=?').bind(businessId).first()).paid_remaining).toBe(0);
  });
  it('records refund state for manual review without subtracting already-used credits',async()=>{
    const businessId=await ensureBusiness(env,image.sender); const purchase=await pendingPayment('starter',businessId);
    const whatsapp=new WhatsAppService(env,vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({messages:[{id:'wamid.confirm'}]})));
    await handleRazorpayEvent(env,whatsapp,parseRazorpayEvent(paidEvent(purchase,'pay_refund'),'evt_paid')!);
    await env.DB.prepare('UPDATE credits SET paid_remaining=10 WHERE business_id=?').bind(businessId).run();
    const refund=parseRazorpayEvent({event:'refund.processed',payload:{refund:{entity:{id:'rfnd_test',payment_id:'pay_refund',amount:99900,currency:'INR',status:'processed'}}}},'evt_refund')!;
    await handleRazorpayEvent(env,whatsapp,refund);
    expect((await env.DB.prepare('SELECT status,refund_review_required FROM payments WHERE id=?').bind(purchase.internalId).first()).status).toBe('refunded');
    expect((await env.DB.prepare('SELECT paid_remaining FROM credits WHERE business_id=?').bind(businessId).first()).paid_remaining).toBe(10);
    expect((await env.DB.prepare('SELECT COUNT(*) AS n FROM payment_refunds').first<{n:number}>())?.n).toBe(1);
  });
  it('reports credits, plans, buy and latest payment status in customer language',async()=>{
    const businessId=await ensureBusiness(env,image.sender); await pendingPayment('starter',businessId);
    const calls:string[]=[]; const wa=vi.fn<typeof fetch>().mockImplementation(async(_input,init)=>{calls.push(JSON.parse(init!.body as string).text.body); return Response.json({messages:[{id:'wamid.reply'}]});});
    const whatsapp=new WhatsAppService(env,wa);
    await handleWhatsAppText(env,whatsapp,image.sender,'credits','wamid.cmd1');
    await handleWhatsAppText(env,whatsapp,image.sender,'plans','wamid.cmd2');
    await handleWhatsAppText(env,whatsapp,image.sender,'buy','wamid.cmd3');
    await handleWhatsAppText(env,whatsapp,image.sender,'payment status','wamid.cmd4');
    expect(calls[0]).toContain('5 Growx Chitra image credits remaining'); expect(calls[1]).toContain('₹2,499');
    expect(calls[2]).toContain('Choose a plan'); expect(calls[3]).toContain('still pending');
  });
  it('marks link-creation errors failed without changing credits and never calls OpenAI or charges Razorpay in tests',async()=>{
    vi.stubGlobal('fetch',vi.fn<typeof fetch>().mockResolvedValue(new Response('error',{status:500})));
    const wa=vi.fn<typeof fetch>().mockResolvedValue(Response.json({messages:[{id:'wamid.failure'}]}));
    await handleWhatsAppText(env,new WhatsAppService(env,wa),image.sender,'starter','wamid.link-error');
    const payment=await env.DB.prepare('SELECT status FROM payments').first();
    expect(payment?.status).toBe('failed');
    expect((await env.DB.prepare('SELECT free_remaining,paid_remaining FROM credits').first()).paid_remaining).toBe(0);
    expect((await env.DB.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE type='purchase'").first<{n:number}>())?.n).toBe(0);
  });
});
