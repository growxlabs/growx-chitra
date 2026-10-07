
import type { BrandProfile, Env, JobStatus } from './types';
import { parseQueuePayload } from './webhook';
import { PipelineError, validateImage, WhatsAppService } from './whatsapp';
import { ImagesService } from './images';
import { OpenAIService } from './openai';
import { SafetyBlock, SafetyService } from './safety';
import { configuration } from './config';
import { releaseCredit, reserveCredit, settleDelivery } from './credits';
import { plansMessage } from './plans';
import { getStorage } from './storage';
import { toJob } from './store';

export interface ProcessingServices {
  images: Pick<ImagesService,'validate'|'normalize'|'brand'>;
  safety: Pick<SafetyService,'inputSafetyCheck'|'outputSafetyCheck'>;
  openai: Pick<OpenAIService,'processProductImage'>;
}
function services(env: Env): ProcessingServices {
  const images=new ImagesService(env); const openai=new OpenAIService(env);
  return {images,openai,safety:new SafetyService(env,images,openai)};
}
const active="'processing','input_safety','generating','branding','output_safety','sending'";
const neutral='Growx Chitra could not process this image. Please try another product-only photo.';
const noPeople='Growx Chitra currently processes product-only images. Images containing people cannot be processed.';

export async function processJob(env: Env,jobId: string,whatsapp=new WhatsAppService(env),processing=services(env)): Promise<boolean> {
  const now=new Date().toISOString();
  let lease=new Date(Date.now()+10*60_000).toISOString();
  const rawJob=await env.DB.prepare(`UPDATE image_jobs SET status='processing',lease_until=?,attempts=attempts+1,updated_at=?
    WHERE id=? AND final_send_started=0 AND (status IN ('received','queued') OR (status IN (${active}) AND lease_until<?)) RETURNING *`)
    .bind(lease,now,jobId,now).first<Record<string,unknown>>();
  const job=rawJob?toJob(rawJob):null;
  if(!job) {
    const raw=await env.DB.prepare('SELECT * FROM image_jobs WHERE id=?').bind(jobId).first<Record<string,unknown>>();
    const current=raw?toJob(raw):null;
    if(!current) throw new PipelineError('internal_error');
    return current.final_send_started===1 || !['processing','input_safety','generating','branding','output_safety','sending'].includes(current.status);
  }
  const state:{stage:JobStatus}={stage:'processing'}; let recipient:string|undefined;
  const start=Date.now(); let stageStart=start;
  const log=(result:string) => console.log(JSON.stringify({job_id:job.id,business_id:job.business_id,stage:state.stage,duration_ms:Date.now()-stageStart,model:job.model??env.OPENAI_IMAGE_MODEL,result,attempt:job.attempt_count}));
  const transition=async(next:JobStatus) => {
    log('stage_finished'); const newLease=new Date(Date.now()+10*60_000).toISOString();
    const result=await env.DB.prepare('UPDATE image_jobs SET status=?,lease_until=?,updated_at=? WHERE id=? AND lease_until=? AND status=?')
      .bind(next,newLease,new Date().toISOString(),job.id,lease,state.stage).run();
    if(result.meta.changes!==1) throw new PipelineError('lease_lost',true);
    lease=newLease; state.stage=next; stageStart=Date.now();
  };
  const patch=async(sql:string,...values:(string|number|null)[]) => {
    const result=await env.DB.prepare(`UPDATE image_jobs SET ${sql},updated_at=? WHERE id=? AND lease_until=?`)
      .bind(...values,new Date().toISOString(),job.id,lease).run();
    if(result.meta.changes!==1) throw new PipelineError('lease_lost',true);
  };
  const notify=async(text:string) => {
    if(!recipient || job.refusal_message_id) return;
    try { const id=await whatsapp.sendText(recipient,text); await env.DB.prepare('UPDATE image_jobs SET refusal_message_id=? WHERE id=? AND refusal_message_id IS NULL').bind(id,job.id).run(); }
    catch { console.error(JSON.stringify({job_id:job.id,business_id:job.business_id,stage:state.stage,result:'neutral_reply_failed',duration_ms:Date.now()-start,model:env.OPENAI_IMAGE_MODEL,attempt:job.attempt_count})); }
  };
  try {
    const config=configuration(env);
    const business=await env.DB.prepare('SELECT whatsapp_number,status,account_state FROM businesses WHERE id=?').bind(job.business_id)
      .first<{whatsapp_number:string;status:string;account_state:string}>();
    if(!business) throw new PipelineError('internal_error',true);
    recipient=business.whatsapp_number;
    if(business.status!=='active' || business.account_state!=='active') throw new PipelineError(business.account_state==='suspended'?'business_suspended':'business_blocked',true);
    if(!await reserveCredit(env,job.id,job.business_id)) throw new PipelineError('no_credits',true);
    const originalExpiry=new Date(Date.now()+Number(env.ORIGINAL_IMAGE_RETENTION_DAYS??30)*86_400_000).toISOString();
    const generatedExpiry=new Date(Date.now()+Number(env.GENERATED_IMAGE_RETENTION_DAYS??30)*86_400_000).toISOString();
    await patch('retention_until=COALESCE(retention_until,?),original_expires_at=COALESCE(original_expires_at,?),generated_expires_at=COALESCE(generated_expires_at,?)',originalExpiry,originalExpiry,generatedExpiry);
    const storage=getStorage(env);
    let original=await storage.get(job.original_storage_key);
    if(!original) {
      const bytes=await whatsapp.downloadMedia(job.media_id,job.mime_type,job.media_sha256);
      await storage.put(job.original_storage_key,bytes,job.mime_type);
      original=await storage.get(job.original_storage_key);
    }
    if(!original) throw new PipelineError('internal_error');
    if(original.size>5*1024*1024) throw new PipelineError('image_too_large',true);
    const source=await original.arrayBuffer(); await validateImage(source,job.mime_type,job.media_sha256,Number(env.MAX_UPLOAD_BYTES??5*1024*1024));
    await patch('input_bytes=?',source.byteLength);
    await transition('input_safety');
    if(!job.input_safety_passed) {
      await processing.safety.inputSafetyCheck(source,job.mime_type);
      await patch('input_safety_passed=1');
    }
    const normalized=await processing.images.normalize(source);
    const brand=await env.DB.prepare('SELECT *,logo_r2_key AS logo_storage_key FROM brand_profiles WHERE business_id=?').bind(job.business_id).first<BrandProfile>();
    await transition('generating');
    const generatedKey=job.generated_storage_key??`generated/${job.business_id}/${job.id}/clean.webp`;
    let generated=await storage.get(generatedKey);
    if(!generated) {
      const attempt=await env.DB.prepare(`UPDATE image_jobs SET attempt_count=attempt_count+1,model=?,generation_settings=?
        WHERE id=? AND lease_until=? AND attempt_count<? RETURNING attempt_count`)
        .bind(config.model,JSON.stringify({quality:config.quality,size:'1024x1024',n:1,output_format:'webp'}),job.id,lease,config.maxAttempts).first<{attempt_count:number}>();
      if(!attempt) throw new PipelineError('generation_retry_limit',true);
      job.attempt_count=attempt.attempt_count; job.model=config.model;
      const edited=await processing.openai.processProductImage(normalized,brand);
      await processing.images.validate(edited.bytes,'image/webp');
      await storage.put(generatedKey,edited.bytes,'image/webp');
      await patch('generated_r2_key=?,output_bytes=?,generation_duration_ms=?,openai_request_id=?,usage_data=?',generatedKey,edited.bytes.byteLength,edited.duration,edited.requestId,edited.usage);
      generated=await storage.get(generatedKey);
    }
    if(!generated||generated.size>5*1024*1024) throw new PipelineError('image_generation_failure',true);
    await transition('branding');
    const finalKey=`final/${job.business_id}/${job.id}/final.jpg`;
    let final=job.output_safety_passed?await storage.get(finalKey):null;
    if(!final) {
      const branded=await processing.images.brand(await generated.arrayBuffer(),brand,job);
      await transition('output_safety'); await processing.safety.outputSafetyCheck(branded,'image/jpeg');
      await storage.put(finalKey,branded,'image/jpeg');
      await patch('output_safety_passed=1,final_r2_key=?,final_bytes=?',finalKey,branded.byteLength);
      final=await storage.get(finalKey);
    } else { await transition('output_safety'); }
    if(!final||final.size>5*1024*1024) throw new PipelineError('internal_error',true);
    await transition('sending');
    const currentState=await env.DB.prepare('SELECT account_state FROM businesses WHERE id=?').bind(job.business_id).first<{account_state:string}>();
    if(currentState?.account_state!=='active') throw new PipelineError(currentState?.account_state==='suspended'?'business_suspended':'business_blocked',true);
    const mediaId=job.final_media_id??await whatsapp.uploadMedia(await final.arrayBuffer(),'image/jpeg');
    await patch('final_media_id=?',mediaId);
    const deadline=new Date(Date.now()+config.deliveryHours*3_600_000).toISOString();
    await patch('final_send_started=1,delivery_deadline=?',deadline); job.final_send_started=1;
    const messageId=await whatsapp.sendImage(recipient,mediaId,'Your Growx Chitra image is ready.',job.id);
    await env.DB.prepare("UPDATE image_jobs SET final_message_id=COALESCE(final_message_id,?),lease_until=NULL,updated_at=? WHERE id=? AND (lease_until=? OR status='completed')")
      .bind(messageId,new Date().toISOString(),job.id,lease).run();
    await settleDelivery(env,messageId); log('awaiting_delivery'); return true;
  } catch(error) {
    if(error instanceof PipelineError&&error.code==='lease_lost') return false;
    const reason=error instanceof PipelineError?error.code:'internal_error';
    if(job.final_send_started) {
      await env.DB.prepare("UPDATE image_jobs SET failure_reason='whatsapp_send_unconfirmed',lease_until=NULL,updated_at=? WHERE id=? AND status='sending'")
        .bind(new Date().toISOString(),job.id).run(); log('awaiting_send_confirmation'); return true;
    }
    const failedStage=state.stage;
    const blocked=error instanceof SafetyBlock||['invalid_image','unsupported_type','image_too_large','image_hash_mismatch'].includes(reason);
    const terminal=blocked||(error instanceof PipelineError&&error.permanent)||job.attempts>=5||
      (failedStage==='generating'&&job.attempt_count>=configuration(env).maxAttempts);
    const status:JobStatus=['business_blocked','business_suspended'].includes(reason)?'blocked':blocked?(failedStage==='output_safety'?'blocked_output':'blocked_input'):terminal?'failed':'queued';
    const blockedExpiry=blocked?new Date(Date.now()+Number(env.BLOCKED_IMAGE_RETENTION_HOURS??24)*3_600_000).toISOString():null;
    const statements=[env.DB.prepare('UPDATE image_jobs SET status=?,failure_reason=?,blocked_expires_at=COALESCE(?,blocked_expires_at),lease_until=NULL,updated_at=? WHERE id=? AND lease_until=?')
      .bind(status,reason,blockedExpiry,new Date().toISOString(),job.id,lease)];
    if(blocked) statements.push(env.DB.prepare(`INSERT INTO abuse_events(id,business_id,whatsapp_number,event_type,details,created_at)
      SELECT ?,id,'',?,NULL,? FROM businesses WHERE id=?`)
      .bind(crypto.randomUUID(),`${status}:${reason}`,new Date().toISOString(),job.business_id));
    await env.DB.batch(statements);
    if(terminal) {
      await releaseCredit(env,job.id);
      if(status==='blocked_output') {
        await getStorage(env).delete([`generated/${job.business_id}/${job.id}/clean.webp`,`final/${job.business_id}/${job.id}/final.jpg`]);
        await env.DB.prepare('UPDATE image_jobs SET generated_r2_key=NULL,final_r2_key=NULL,output_safety_passed=0 WHERE id=?').bind(job.id).run();
      }
      await notify(reason==='no_credits'?`You've used all available Growx Chitra image credits.\n\n${plansMessage()}\n\nCustom: Contact GrowxLabs for a custom Growx Chitra plan.`:reason==='person_detected'?noPeople:reason==='business_suspended'?`Growx Chitra is currently unavailable for this account. Please contact support${env.SUPPORT_CONTACT?`: ${env.SUPPORT_CONTACT}`:'.'}`:neutral);
    }
    if(!(error instanceof PipelineError) && !(error instanceof SafetyBlock)) console.error(JSON.stringify({job_id:job.id,business_id:job.business_id,stage:state.stage,result:'internal_failure',error_type:error instanceof Error?error.constructor.name:'unknown'}));
    log(`${status}:${reason}`); return terminal;
  }
}
export async function consumeBatch(batch: MessageBatch<unknown>,env: Env,processing=services(env),whatsapp=new WhatsAppService(env)): Promise<void> {
  for(const message of batch.messages) {
    let jobId:string;
    try { jobId=parseQueuePayload(message.body).job_id; }
    catch { console.error(JSON.stringify({event:'invalid_queue_payload'})); message.ack(); continue; }
    try { if(await processJob(env,jobId,whatsapp,processing)) message.ack(); else message.retry({delaySeconds:60}); }
    catch { console.error(JSON.stringify({event:'queue_operation_failed',job_id:jobId})); message.retry({delaySeconds:60}); }
  }
}
