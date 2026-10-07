import type { DeliveryEvent, Env } from './types';

export async function reserveCredit(env: Env,jobId: string,businessId: string): Promise<boolean> {
  await env.DB.prepare(`INSERT INTO credit_reservations(image_job_id,business_id,created_at)
    SELECT ?,business_id,? FROM credits WHERE business_id=? AND
    free_remaining+paid_remaining>(SELECT COUNT(*) FROM credit_reservations WHERE business_id=?)
    ON CONFLICT(image_job_id) DO NOTHING`).bind(jobId,new Date().toISOString(),businessId,businessId).run();
  return !!await env.DB.prepare('SELECT 1 FROM credit_reservations WHERE image_job_id=? AND business_id=?').bind(jobId,businessId).first();
}
export async function releaseCredit(env: Env,jobId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM credit_reservations WHERE image_job_id=?').bind(jobId).run();
}
export async function settleDelivery(env: Env,messageId: string): Promise<void> {
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO credit_ledger(id,business_id,amount,type,image_job_id,created_at)
      SELECT ?,j.business_id,-1,'image_delivered',j.id,? FROM image_jobs j
      JOIN whatsapp_delivery_events e ON e.message_id=j.final_message_id
      JOIN businesses b ON b.id=j.business_id JOIN credit_reservations r ON r.image_job_id=j.id
      WHERE j.final_message_id=? AND (j.status='sending' OR (j.status='failed' AND j.failure_reason='whatsapp_delivery_timeout')) AND j.output_safety_passed=1
      AND j.final_r2_key IS NOT NULL AND e.recipient=b.whatsapp_number AND e.status IN ('delivered','read')
      AND EXISTS(SELECT 1 FROM credits c WHERE c.business_id=j.business_id AND c.free_remaining+c.paid_remaining>0)
      ON CONFLICT DO NOTHING`).bind(crypto.randomUUID(),now,messageId),
    env.DB.prepare(`UPDATE image_jobs SET status='failed',failure_reason='whatsapp_delivery_failure',lease_until=NULL,updated_at=?
      WHERE final_message_id=? AND status='sending' AND EXISTS (
      SELECT 1 FROM whatsapp_delivery_events e JOIN businesses b ON b.whatsapp_number=e.recipient
      WHERE e.message_id=image_jobs.final_message_id AND e.status='failed' AND b.id=image_jobs.business_id)`)
      .bind(now,messageId),
    env.DB.prepare("DELETE FROM credit_reservations WHERE image_job_id IN (SELECT id FROM image_jobs WHERE final_message_id=? AND status='failed')").bind(messageId)
  ]);
}
export async function recordDelivery(env: Env,event: DeliveryEvent): Promise<void> {
  const now=new Date().toISOString();
  const match=await env.DB.prepare(`SELECT j.id FROM image_jobs j JOIN businesses b ON b.id=j.business_id
    WHERE b.whatsapp_number=? AND (j.final_message_id=? OR (j.id=? AND j.final_send_started=1))`)
    .bind(event.recipient,event.messageId,event.jobId).first<{id:string}>();
  if(!match) return;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO whatsapp_delivery_events(message_id,recipient,status,job_id,created_at,updated_at)
      VALUES (?,?,?,?,?,?) ON CONFLICT(message_id) DO UPDATE SET
      status=CASE WHEN whatsapp_delivery_events.status IN ('delivered','read') THEN whatsapp_delivery_events.status ELSE excluded.status END,
      updated_at=excluded.updated_at WHERE whatsapp_delivery_events.recipient=excluded.recipient`)
      .bind(event.messageId,event.recipient,event.status,match.id,now,now),
    env.DB.prepare(`UPDATE image_jobs SET final_message_id=? WHERE id=? AND final_message_id IS NULL
      AND (status='sending' OR (status='failed' AND failure_reason='whatsapp_delivery_timeout'))
      AND final_send_started=1 AND output_safety_passed=1 AND ? IS NOT NULL`)
      .bind(event.messageId,match.id,event.jobId)
  ]);
  await settleDelivery(env,event.messageId);
}
export async function expirePendingDelivery(env: Env): Promise<void> {
  const now=new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE image_jobs SET status='failed',failure_reason='whatsapp_delivery_timeout',lease_until=NULL,updated_at=?
      WHERE status='sending' AND final_send_started=1 AND delivery_deadline<?`).bind(now,now),
    env.DB.prepare(`DELETE FROM credit_reservations WHERE image_job_id IN (SELECT id FROM image_jobs
      WHERE status IN ('failed','blocked_input','blocked_output','blocked','completed')
      AND (failure_reason IS NULL OR failure_reason!='whatsapp_delivery_timeout' OR created_at<?))`)
      .bind(new Date(Date.now()-7*86_400_000).toISOString()),
    env.DB.prepare('DELETE FROM whatsapp_delivery_events WHERE updated_at<?').bind(new Date(Date.now()-7*86_400_000).toISOString())
  ]);
}
