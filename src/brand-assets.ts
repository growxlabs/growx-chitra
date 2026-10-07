import type { Env } from './types';
import { ImagesService } from './images';
import { SafetyService } from './safety';
import { WhatsAppService } from './whatsapp';
import { getStorage } from './storage';

export async function processBrandLogo(env:Env,jobId:string):Promise<boolean> {
  const job=await env.DB.prepare("SELECT j.*,j.brand_r2_key AS storage_key,b.whatsapp_number FROM brand_asset_jobs j JOIN businesses b ON b.id=j.business_id WHERE j.id=?").bind(jobId)
    .first<{id:string;business_id:string;whatsapp_number:string;media_id:string;mime_type:string;media_sha256:string;status:string;storage_key:string|null}>();
  if(!job) return true;
  if(job.status==='complete') {
    const prompt=await env.DB.prepare('SELECT prompt_sent_at FROM brand_asset_jobs WHERE id=?').bind(job.id).first<{prompt_sent_at:string|null}>();
    if(!prompt?.prompt_sent_at) { await new WhatsAppService(env).sendText(job.whatsapp_number,"Logo saved. What's your business name?"); await env.DB.prepare('UPDATE brand_asset_jobs SET prompt_sent_at=? WHERE id=? AND prompt_sent_at IS NULL').bind(new Date().toISOString(),job.id).run(); }
    return true;
  }
  if(job.status!=='queued') return true;
  try {
    const previous=await env.DB.prepare('SELECT logo_r2_key AS logo_storage_key FROM brand_profiles WHERE business_id=?').bind(job.business_id).first<{logo_storage_key:string|null}>();
    const wa=new WhatsAppService(env), bytes=await wa.downloadMedia(job.media_id,job.mime_type,job.media_sha256);
    await new SafetyService(env,new ImagesService(env)).inputSafetyCheck(bytes,job.mime_type);
    const key=`brands/${job.business_id}/logo/${job.id}.${job.mime_type==='image/png'?'png':job.mime_type==='image/webp'?'webp':'jpg'}`;
    await getStorage(env).put(key,bytes,job.mime_type);
    await env.DB.batch([
      env.DB.prepare("UPDATE brand_profiles SET logo_r2_key=?,setup_state='awaiting_business_name',updated_at=? WHERE business_id=?").bind(key,new Date().toISOString(),job.business_id),
      env.DB.prepare("UPDATE brand_asset_jobs SET status='complete',brand_r2_key=? WHERE id=? AND status='queued'").bind(key,job.id)
    ]);
    if(previous?.logo_storage_key && previous.logo_storage_key!==key && previous.logo_storage_key.startsWith(`brands/${job.business_id}/`)) {
      try { await getStorage(env).delete(previous.logo_storage_key); } catch { console.warn(JSON.stringify({event:'previous_brand_logo_cleanup_failed',business_id:job.business_id})); }
    }
    await wa.sendText(job.whatsapp_number,"Logo saved. What's your business name?");
    await env.DB.prepare('UPDATE brand_asset_jobs SET prompt_sent_at=? WHERE id=? AND prompt_sent_at IS NULL').bind(new Date().toISOString(),job.id).run();
    return true;
  } catch(error) {
    const permanent=error instanceof Error && 'permanent' in error && (error as {permanent:boolean}).permanent;
    if(permanent) {
      await env.DB.prepare("UPDATE brand_asset_jobs SET status='rejected' WHERE id=?").bind(job.id).run();
      await new WhatsAppService(env).sendText(job.whatsapp_number,'This logo image cannot be used. Please send a different business logo or reply SKIP.');
      return true;
    }
    console.error(JSON.stringify({event:'brand_logo_processing_failed',business_id:job.business_id,error_type:error instanceof Error?error.constructor.name:'unknown'}));
    return false;
  }
}
