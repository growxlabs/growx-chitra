import type { Env, ImageMessage, Job } from './types';
import { getStorage } from './storage';

export function toJob(value:Record<string,unknown>):Job {
  const row=value as Record<string,unknown> & {original_r2_key:string;generated_r2_key:string|null};
  const {original_r2_key,generated_r2_key,...rest}=row;
  return {...rest,original_storage_key:original_r2_key,generated_storage_key:generated_r2_key} as Job;
}

export async function ensureBusiness(env: Env, sender: string): Promise<string> {
  if (env.BUSINESS_IDENTITY_SECRET) {
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.BUSINESS_IDENTITY_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const digest=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(sender)));
    const identityHash=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
    if(await env.DB.prepare('SELECT 1 FROM deleted_identity_markers WHERE identity_hash=?').bind(identityHash).first()) throw new Error('deleted_identity');
  }
  const now = new Date().toISOString();
  const businessId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO businesses(id,whatsapp_number,created_at,updated_at) VALUES (?,?,?,?) ON CONFLICT(whatsapp_number) DO NOTHING')
      .bind(businessId, sender, now, now),
    env.DB.prepare('INSERT INTO credits(business_id,free_remaining,paid_remaining,updated_at) SELECT id,5,0,? FROM businesses WHERE whatsapp_number=? ON CONFLICT(business_id) DO NOTHING')
      .bind(now, sender),
    env.DB.prepare("INSERT INTO credit_ledger(id,business_id,amount,type,created_at) SELECT ?,id,5,'free_grant',? FROM businesses WHERE whatsapp_number=? AND NOT EXISTS (SELECT 1 FROM credit_ledger WHERE business_id=businesses.id AND type='free_grant')")
      .bind(crypto.randomUUID(), now, sender),
    env.DB.prepare('INSERT INTO brand_profiles(id,business_id,created_at,updated_at) SELECT ?,id,?,? FROM businesses WHERE whatsapp_number=? ON CONFLICT(business_id) DO NOTHING')
      .bind(crypto.randomUUID(), now, now, sender)
  ]);
  const business = await env.DB.prepare('SELECT id FROM businesses WHERE whatsapp_number=?').bind(sender).first<{id:string}>();
  if (!business) throw new Error('business_persistence_failed');
  return business.id;
}

export async function allowRate(env:Env,businessId:string,kind:string,messageId:string,limit:number,windowMs:number):Promise<boolean> {
  const now=Date.now(), stamp=new Date(now).toISOString(), cutoff=new Date(now-windowMs).toISOString();
  const inserted=await env.DB.prepare(`INSERT INTO rate_limit_events(id,business_id,kind,whatsapp_message_id,created_at)
    SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM rate_limit_events WHERE business_id=? AND kind=? AND created_at>=?) < ?
    ON CONFLICT(kind,whatsapp_message_id) DO NOTHING RETURNING id`).bind(crypto.randomUUID(),businessId,kind,messageId,stamp,businessId,kind,cutoff,limit).first<{id:string}>();
  if(inserted) return true;
  return !!await env.DB.prepare('SELECT 1 FROM rate_limit_events WHERE kind=? AND whatsapp_message_id=?').bind(kind,messageId).first();
}

export async function cleanupRetention(env:Env):Promise<void> {
  const now=new Date().toISOString();
  const storage=getStorage(env);
  interface ExpiringJob { id:string; business_id:string; original_storage_key:string; generated_storage_key:string|null; final_storage_key:string|null; original_expires_at:string|null; generated_expires_at:string|null; blocked_expires_at:string|null; status:string }
  const rows=await env.DB.prepare(`SELECT id,business_id,original_r2_key AS original_storage_key,generated_r2_key AS generated_storage_key,final_r2_key AS final_storage_key,original_expires_at,generated_expires_at,blocked_expires_at,status
    FROM image_jobs WHERE (original_expires_at IS NOT NULL AND original_expires_at<=?) OR (generated_expires_at IS NOT NULL AND generated_expires_at<=?) OR (blocked_expires_at IS NOT NULL AND blocked_expires_at<=?) LIMIT 100`).bind(now,now,now).all<ExpiringJob>();
  for(const row of rows.results) {
    try {
      const keys:string[]=[];
      if(row.original_expires_at && row.original_expires_at<=now) keys.push(row.original_storage_key);
      if(row.generated_expires_at && row.generated_expires_at<=now && row.generated_storage_key) keys.push(row.generated_storage_key);
      if(row.generated_expires_at && row.generated_expires_at<=now && row.final_storage_key) keys.push(row.final_storage_key);
      if(row.blocked_expires_at && row.blocked_expires_at<=now) { if(row.original_storage_key) keys.push(row.original_storage_key); if(row.generated_storage_key) keys.push(row.generated_storage_key); if(row.final_storage_key) keys.push(row.final_storage_key); }
      const tenantPrefix=`/${row.business_id}/`;
      const safe=keys.filter(key=>key.includes(tenantPrefix));
      if(safe.length) await storage.delete(safe);
      await env.DB.prepare(`UPDATE image_jobs SET original_r2_key=CASE WHEN original_expires_at<=? OR blocked_expires_at<=? THEN 'expired/'||id||'/source' ELSE original_r2_key END,
        generated_r2_key=CASE WHEN generated_expires_at<=? OR blocked_expires_at<=? THEN NULL ELSE generated_r2_key END,
        final_r2_key=CASE WHEN generated_expires_at<=? OR blocked_expires_at<=? THEN NULL ELSE final_r2_key END,
        original_expires_at=CASE WHEN original_expires_at<=? OR blocked_expires_at<=? THEN NULL ELSE original_expires_at END,
        generated_expires_at=CASE WHEN generated_expires_at<=? OR blocked_expires_at<=? THEN NULL ELSE generated_expires_at END,
        blocked_expires_at=NULL,updated_at=? WHERE id=?`).bind(now,now,now,now,now,now,now,now,now,now,now,row.id).run();
      console.log(JSON.stringify({event:'retention_cleanup',job_id:row.id,business_id:row.business_id,status:'deleted'}));
    } catch { console.error(JSON.stringify({event:'retention_cleanup',job_id:row.id,business_id:row.business_id,status:'retry'})); }
  }
  await env.DB.prepare('DELETE FROM rate_limit_events WHERE created_at<?').bind(new Date(Date.now()-86_400_000).toISOString()).run();
  await env.DB.prepare('DELETE FROM abuse_events WHERE created_at<?').bind(new Date(Date.now()-Number(env.SAFETY_EVENT_RETENTION_DAYS??30)*86_400_000).toISOString()).run();
}

export async function confirmDeletion(env:Env,businessId:string):Promise<void> {
  const now=new Date().toISOString();
  await env.DB.prepare("UPDATE businesses SET account_state='deletion_pending',deletion_confirmed_at=?,updated_at=? WHERE id=? AND account_state IN ('active','suspended','deletion_pending')").bind(now,now,businessId).run();
}

export async function cleanupDeletions(env:Env):Promise<void> {
  const storage=getStorage(env);
  const rows=await env.DB.prepare("SELECT id,whatsapp_number FROM businesses WHERE account_state='deletion_pending' AND deletion_confirmed_at IS NOT NULL LIMIT 25").all<{id:string;whatsapp_number:string}>();
  for(const b of rows.results) {
    try {
      const prefixKeys:string[]=[];
      for(const prefix of [`originals/${b.id}/`,`generated/${b.id}/`,`final/${b.id}/`,`brands/${b.id}/`]) {
        prefixKeys.push(...await storage.list(prefix));
      }
      for(let i=0;i<prefixKeys.length;i+=100) await storage.delete(prefixKeys.slice(i,i+100));
      const markerSecret=env.BUSINESS_IDENTITY_SECRET;
      let hash:string|null=null;
      if(markerSecret) { const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(markerSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']); hash=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(b.whatsapp_number))),x=>x.toString(16).padStart(2,'0')).join(''); }
      await env.DB.batch([
        ...(hash?[env.DB.prepare('INSERT INTO deleted_identity_markers(identity_hash,created_at) VALUES (?,?) ON CONFLICT DO NOTHING').bind(hash,new Date().toISOString())]:[]),
        env.DB.prepare('DELETE FROM brand_profiles WHERE business_id=?').bind(b.id),
        env.DB.prepare('DELETE FROM rate_limit_events WHERE business_id=?').bind(b.id),
        env.DB.prepare('DELETE FROM abuse_events WHERE business_id=?').bind(b.id),
        env.DB.prepare('DELETE FROM whatsapp_delivery_events WHERE recipient=?').bind(b.whatsapp_number),
        env.DB.prepare("UPDATE payments SET status=CASE WHEN status IN ('created','pending') THEN 'cancelled' ELSE status END,payment_url=NULL,whatsapp_message_id=NULL,metadata=NULL WHERE business_id=?").bind(b.id),
        env.DB.prepare('DELETE FROM brand_asset_jobs WHERE business_id=?').bind(b.id),
        env.DB.prepare('DELETE FROM credit_reservations WHERE business_id=?').bind(b.id),
        env.DB.prepare("UPDATE image_jobs SET original_r2_key='deleted/'||id||'/source',generated_r2_key=NULL,final_r2_key=NULL,media_id='',media_sha256='',whatsapp_message_id='deleted:'||id,final_media_id=NULL,final_message_id=NULL,failure_reason='account_deleted',lease_until=NULL,original_expires_at=NULL,generated_expires_at=NULL,blocked_expires_at=NULL,status='failed',updated_at=? WHERE business_id=?").bind(new Date().toISOString(),b.id),
        env.DB.prepare("UPDATE businesses SET whatsapp_number='deleted:'||id,name=NULL,account_state='deleted',status='blocked',deleted_at=?,updated_at=? WHERE id=? AND account_state='deletion_pending'").bind(new Date().toISOString(),new Date().toISOString(),b.id)
      ]);
    } catch(error) { console.error(JSON.stringify({event:'account_deletion',business_id:b.id,status:'retry',error_type:error instanceof Error?error.constructor.name:'unknown'})); }
  }
  await env.DB.prepare("UPDATE businesses SET account_state=CASE WHEN status='blocked' THEN 'suspended' ELSE 'active' END,deletion_requested_at=NULL,deletion_confirmation_expires_at=NULL WHERE account_state='deletion_pending' AND deletion_confirmed_at IS NULL AND deletion_confirmation_expires_at<?").bind(new Date().toISOString()).run();
}

export async function tryReceiveImage(env: Env, message: ImageMessage): Promise<Job | null> {
  const now = new Date().toISOString();
  const businessId = await ensureBusiness(env, message.sender);
  const jobId = crypto.randomUUID();
  const ext = message.mimeType === 'image/png' ? 'png' : message.mimeType==='image/webp'?'webp':message.mimeType==='image/jpeg'?'jpg':'bin';
  // D1 batch is a transaction. UNIQUE constraints handle concurrent first contact and delivery.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO image_jobs(id,business_id,whatsapp_message_id,original_r2_key,status,media_id,mime_type,message_timestamp,media_sha256,created_at,updated_at)
      SELECT ?,b.id,?,'originals/' || b.id || '/' || ? || '/source.${ext}',CASE WHEN b.status='blocked' THEN 'blocked' ELSE 'received' END,?,?,?,?,?,?
      FROM businesses b JOIN credits c ON c.business_id=b.id WHERE b.id=?
      AND c.free_remaining+c.paid_remaining>(SELECT COUNT(*) FROM credit_reservations r WHERE r.business_id=b.id)
      ON CONFLICT(whatsapp_message_id) DO NOTHING`)
      .bind(jobId, message.messageId, jobId, message.mediaId, message.mimeType, message.timestamp, message.sha256, now, now, businessId)
  ]);
  const raw = await env.DB.prepare('SELECT * FROM image_jobs WHERE whatsapp_message_id=?').bind(message.messageId).first<Record<string,unknown>>();
  const job=raw?toJob(raw):null;
  if (!job) {
    const existing = await env.DB.prepare('SELECT * FROM image_jobs WHERE whatsapp_message_id=?').bind(message.messageId).first<Record<string,unknown>>();
    if (existing) return toJob(existing);
    const available = await env.DB.prepare(`SELECT c.free_remaining+c.paid_remaining-COUNT(r.image_job_id) AS amount
      FROM credits c LEFT JOIN credit_reservations r ON r.business_id=c.business_id WHERE c.business_id=? GROUP BY c.business_id`)
      .bind(businessId).first<{amount:number}>();
    if ((available?.amount ?? 0) <= 0) return null;
    throw new Error('job_persistence_failed');
  }
  if (job.status === 'blocked') {
    await env.DB.prepare("UPDATE image_jobs SET failure_reason='business_blocked' WHERE id=? AND status='blocked'").bind(job.id).run();
  }
  return job;
}
export async function receiveImage(env: Env, message: ImageMessage): Promise<Job> {
  const job = await tryReceiveImage(env, message);
  if (!job) throw new Error('no_credits');
  return job;
}
export async function enqueue(env: Env, job: Job): Promise<void> {
  if (job.status !== 'received') return;
  try {
    await env.CHITRA_JOBS.send({ version: 1, job_id: job.id });
    // A fast consumer can already have claimed the job. Never overwrite its state.
    await env.DB.prepare("UPDATE image_jobs SET status='queued',failure_reason=NULL,updated_at=? WHERE id=? AND status='received'")
      .bind(new Date().toISOString(), job.id).run();
  } catch {
    await env.DB.prepare("UPDATE image_jobs SET failure_reason='queue_submission_failed',updated_at=? WHERE id=? AND status='received'")
      .bind(new Date().toISOString(), job.id).run();
    console.error(JSON.stringify({ event: 'queue_submission_failed', job_id: job.id, business_id: job.business_id }));
    throw new Error('queue_submission_failed');
  }
}
export async function recoverJobs(env: Env): Promise<void> {
  const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
  const result = await env.DB.prepare(`SELECT * FROM image_jobs WHERE
    status='received' OR (status='queued' AND updated_at<?) OR
    (status IN ('processing','input_safety','generating','branding','output_safety','sending') AND lease_until<? AND final_send_started=0)
    ORDER BY updated_at LIMIT 100`)
    .bind(cutoff, new Date().toISOString()).all<Record<string,unknown>>();
  for (const raw of result.results) {
    const job=toJob(raw);
    try { await env.CHITRA_JOBS.send({ version: 1, job_id: job.id }); }
    catch { console.error(JSON.stringify({ event: 'recovery_enqueue_failed', job_id: job.id, business_id: job.business_id })); }
  }
  const logoJobs=await env.DB.prepare("SELECT id FROM brand_asset_jobs WHERE status='queued' AND created_at<? ORDER BY created_at LIMIT 100").bind(cutoff).all<{id:string}>();
  for(const job of logoJobs.results) { try { await env.CHITRA_JOBS.send({version:1,job_id:job.id,kind:'brand_logo'}); } catch { console.error(JSON.stringify({event:'brand_asset_recovery_failed',brand_asset_job_id:job.id})); } }
}
