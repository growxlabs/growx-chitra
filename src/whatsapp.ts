import type { Env } from './types';

export class PipelineError extends Error {
  constructor(public readonly code: string, public readonly permanent = false) { super(code); }
}
const DEFAULT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
type Fetcher = typeof fetch;
export class WhatsAppService {
  constructor(private env: Env, private request: Fetcher = fetch) {}
  private get maxImageBytes():number { const n=Number(this.env.MAX_UPLOAD_BYTES??DEFAULT_MAX_IMAGE_BYTES); return Number.isInteger(n)&&n>=1024&&n<=20*1024*1024?n:DEFAULT_MAX_IMAGE_BYTES; }
  private endpoint(path: string): string {
    if (!/^v\d+\.\d+$/.test(this.env.WHATSAPP_API_VERSION)) throw new PipelineError('invalid_api_version', true);
    return `https://graph.facebook.com/${this.env.WHATSAPP_API_VERSION}/${path}`;
  }
  private async graph(path: string, body?: unknown): Promise<Record<string, unknown>> {
    const res = await this.request(this.endpoint(path), {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000), redirect: 'error'
    });
    // Never persist/log Meta response bodies, which may contain personal data or credentials.
    if (!res.ok) throw new PipelineError(`meta_http_${res.status}`);
    return await res.json() as Record<string, unknown>;
  }
  async downloadMedia(mediaId: string, mimeType: string, expectedHash: string): Promise<ArrayBuffer> {
    const metadata = await this.graph(`${encodeURIComponent(mediaId)}?phone_number_id=${encodeURIComponent(this.env.WHATSAPP_PHONE_NUMBER_ID)}`);
    if (metadata.mime_type !== mimeType || metadata.sha256 !== expectedHash || typeof metadata.url !== 'string' ||
        typeof metadata.file_size !== 'number' || metadata.file_size <= 0 || metadata.file_size > this.maxImageBytes) {
      throw new PipelineError('invalid_media_metadata', true);
    }
    const url = new URL(metadata.url);
    if (url.protocol !== 'https:' || url.username || url.password ||
        !(url.hostname === 'lookaside.fbsbx.com' || url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com') || url.hostname.endsWith('.fbcdn.net'))) {
      throw new PipelineError('untrusted_media_url', true);
    }
    const res = await this.request(url.toString(), {
      headers: { Authorization: `Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(30_000), redirect: 'error'
    });
    if (!res.ok) throw new PipelineError(`media_http_${res.status}`);
    if (!res.body) throw new PipelineError('empty_media', true);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > this.maxImageBytes) { await reader.cancel(); throw new PipelineError('image_too_large', true); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    if (size !== metadata.file_size) throw new PipelineError('media_size_mismatch', true);
    await validateImage(bytes.buffer, mimeType, expectedHash,this.maxImageBytes);
    return bytes.buffer;
  }
  private async send(to: string, content: Record<string, unknown>): Promise<string> {
    const result = await this.graph(`${encodeURIComponent(this.env.WHATSAPP_PHONE_NUMBER_ID)}/messages`, {
      messaging_product: 'whatsapp', recipient_type: 'individual', to, ...content
    });
    const messages = result.messages as { id?: string }[] | undefined;
    if (!Array.isArray(messages) || typeof messages[0]?.id !== 'string') throw new PipelineError('invalid_send_response');
    return messages[0].id;
  }
  sendText(to: string, text: string): Promise<string> { return this.send(to, { type: 'text', text: { body: text } }); }
  // Use a Meta-uploaded media ID, never a permanent storage URL.
  sendImage(to: string, mediaId: string, caption?: string, jobId?: string): Promise<string> {
    return this.send(to, { type: 'image', image: { id: mediaId, ...(caption ? { caption } : {}) },
      ...(jobId ? {biz_opaque_callback_data:jobId} : {}) });
  }
  async uploadMedia(bytes: ArrayBuffer, mime='image/jpeg'): Promise<string> {
    if(!['image/jpeg','image/png'].includes(mime) || bytes.byteLength>this.maxImageBytes) throw new PipelineError('whatsapp_send_failure',true);
    const form=new FormData(); form.set('messaging_product','whatsapp'); form.set('type',mime);
    form.set('file',new Blob([bytes],{type:mime}),mime==='image/png'?'final.png':'final.jpg');
    let res:Response;
    try {
      res=await this.request(this.endpoint(`${encodeURIComponent(this.env.WHATSAPP_PHONE_NUMBER_ID)}/media`),{
        method:'POST',headers:{Authorization:`Bearer ${this.env.WHATSAPP_ACCESS_TOKEN}`},body:form,
        signal:AbortSignal.timeout(30_000),redirect:'error'
      });
    } catch { throw new PipelineError('whatsapp_upload_failure'); }
    if(!res.ok) throw new PipelineError('whatsapp_upload_failure',res.status>=400 && res.status<500 && res.status!==429);
    const body=await res.json() as {id?:unknown};
    if(typeof body.id!=='string' || !/^\d{1,100}$/.test(body.id)) throw new PipelineError('whatsapp_upload_failure');
    return body.id;
  }
}
export async function validateImage(data: ArrayBuffer, mime: string, hash?: string, maxBytes=DEFAULT_MAX_IMAGE_BYTES): Promise<void> {
  const bytes = new Uint8Array(data);
  const isJpeg = bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isPng = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  const isWebp=bytes.length>=16 && String.fromCharCode(...bytes.subarray(0,4))==='RIFF' && String.fromCharCode(...bytes.subarray(8,12))==='WEBP';
  if(!['image/jpeg','image/png','image/webp'].includes(mime)) throw new PipelineError('unsupported_type',true);
  if(data.byteLength>maxBytes) throw new PipelineError('image_too_large',true);
  if (data.byteLength === 0 || !(mime === 'image/jpeg' ? isJpeg : mime === 'image/png' ? isPng : isWebp)) throw new PipelineError('invalid_image', true);
  if(!hash) return;
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
  const actual = btoa(String.fromCharCode(...digest));
  if (actual !== hash) throw new PipelineError('image_hash_mismatch', true);
}
