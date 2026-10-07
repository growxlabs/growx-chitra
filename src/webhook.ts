import type { DeliveryEvent, ImageMessage, QueuePayload, TextMessage } from './types';

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function parseImages(payload: unknown, phoneNumberId: string): ImageMessage[] {
  const root = record(payload);
  if (root.object !== 'whatsapp_business_account') return [];
  const images: ImageMessage[] = [];
  for (const entry of Array.isArray(root.entry) ? root.entry : []) {
    for (const change of Array.isArray(record(entry).changes) ? record(entry).changes as unknown[] : []) {
      const c = record(change);
      const value = record(c.value);
      if (c.field !== 'messages' || record(value.metadata).phone_number_id !== phoneNumberId) continue;
      for (const message of Array.isArray(value.messages) ? value.messages : []) {
        const m = record(message);
        if (m.type !== 'image') continue;
        const img = record(m.image);
        if (typeof m.from !== 'string' || !/^\d{6,20}$/.test(m.from) ||
            typeof m.id !== 'string' || !m.id || m.id.length > 512 ||
            typeof m.timestamp !== 'string' || !/^\d{1,12}$/.test(m.timestamp) ||
            typeof img.id !== 'string' || !/^\d{1,100}$/.test(img.id) ||
            typeof img.sha256 !== 'string' || !/^[A-Za-z0-9+/]{43}=$/.test(img.sha256) ||
            typeof img.mime_type !== 'string' || img.mime_type.length>100) continue;
        images.push({ sender: m.from, messageId: m.id, timestamp: m.timestamp,
          mediaId: img.id, mimeType: img.mime_type, sha256: img.sha256 });
      }
    }
  }
  return images;
}
export function parseDeliveryEvents(payload: unknown, phoneNumberId: string): DeliveryEvent[] {
  const root=record(payload); const events:DeliveryEvent[]=[];
  if(root.object!=='whatsapp_business_account') return events;
  for(const entry of Array.isArray(root.entry)?root.entry:[]) {
    for(const change of Array.isArray(record(entry).changes)?record(entry).changes as unknown[]:[]) {
      const c=record(change); const value=record(c.value);
      if(c.field!=='messages' || record(value.metadata).phone_number_id!==phoneNumberId) continue;
      for(const raw of Array.isArray(value.statuses)?value.statuses:[]) {
        const status=record(raw);
        if(typeof status.id!=='string' || !status.id || status.id.length>512 ||
          typeof status.recipient_id!=='string' || !/^\d{6,20}$/.test(status.recipient_id) ||
          !['delivered','read','failed'].includes(String(status.status))) continue;
        events.push({messageId:status.id,recipient:status.recipient_id,status:status.status as DeliveryEvent['status'],
          jobId:typeof status.biz_opaque_callback_data==='string' && /^[0-9a-f-]{36}$/.test(status.biz_opaque_callback_data)?status.biz_opaque_callback_data:null});
      }
    }
  }
  return events;
}
export function parseTextMessages(payload: unknown, phoneNumberId: string): TextMessage[] {
  const root=record(payload); const messages:TextMessage[]=[];
  if(root.object!=='whatsapp_business_account') return messages;
  for(const entry of Array.isArray(root.entry)?root.entry:[]) {
    for(const change of Array.isArray(record(entry).changes)?record(entry).changes as unknown[]:[]) {
      const c=record(change); const value=record(c.value);
      if(c.field!=='messages' || record(value.metadata).phone_number_id!==phoneNumberId) continue;
      for(const raw of Array.isArray(value.messages)?value.messages:[]) {
        const message=record(raw); const text=record(message.text).body;
        if(message.type==='text' && typeof message.from==='string' && /^\d{6,20}$/.test(message.from) &&
          typeof message.id==='string' && message.id.length>0 && message.id.length<=512 && typeof text==='string' && text.length<=4096) {
          messages.push({sender:message.from,messageId:message.id,text});
        }
      }
    }
  }
  return messages;
}
export function parseQueuePayload(value: unknown): QueuePayload {
  const p = record(value);
  if (p.version !== 1 || typeof p.job_id !== 'string' || !/^[0-9a-f-]{36}$/.test(p.job_id)) {
    throw new Error('invalid_queue_payload');
  }
  return { version: 1, job_id: p.job_id, ...(p.kind==='brand_logo'?{kind:'brand_logo' as const}:{}) };
}
export async function verifySignature(body: ArrayBuffer, signature: string | null, secret: string): Promise<boolean> {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = new Uint8Array(signature.slice(7).match(/../g)!.map(h => parseInt(h, 16)));
  return crypto.subtle.verify('HMAC', key, bytes, body);
}
