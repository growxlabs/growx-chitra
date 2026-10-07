import type { BrandProfile, Env } from './types';
import { configuration } from './config';
import { boundedBody, toBase64 } from './binary';
import { PipelineError } from './whatsapp';
import { productCleanupPrompt } from './prompts/product-cleanup';

export interface GeneratedImage {
  bytes: ArrayBuffer;
  requestId: string | null;
  usage: string | null;
  duration: number;
}
export class OpenAIService {
  constructor(private env: Env, private request: typeof fetch = fetch) {}
  private async post(path: string, body: unknown, timeout: number, code: string) {
    if (!this.env.OPENAI_API_KEY) throw new PipelineError('missing_openai_key',true);
    let response: Response;
    try {
      response=await this.request(`https://api.openai.com/v1/${path}`, {
        method:'POST', headers:{Authorization:`Bearer ${this.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify(body), signal:AbortSignal.timeout(timeout),redirect:'error'
      });
    } catch { throw new PipelineError(code); }
    if (!response.ok) throw new PipelineError(code, response.status>=400 && response.status<500 && response.status!==429);
    try {
      const bytes=await boundedBody(response,16*1024*1024,code);
      return { body:JSON.parse(new TextDecoder().decode(bytes)) as Record<string,unknown>,
        requestId: /^[a-zA-Z0-9_-]{1,128}$/.test(response.headers.get('x-request-id') ?? '') ? response.headers.get('x-request-id') : null };
    } catch { throw new PipelineError(code); }
  }
  async moderate(bytes: ArrayBuffer, mime: string): Promise<boolean> {
    const {body}=await this.post('moderations',{
      model:'omni-moderation-latest',input:[{type:'image_url',image_url:{url:`data:${mime};base64,${toBase64(bytes)}`}}]
    },30_000,'moderation_failure');
    const results=body.results as {flagged?:unknown;categories?:Record<string,unknown>}[] | undefined;
    if (!Array.isArray(results) || results.length!==1 || typeof results[0].flagged!=='boolean' ||
      typeof results[0].categories?.sexual!=='boolean' || typeof results[0].categories?.['sexual/minors']!=='boolean') {
      throw new PipelineError('moderation_failure');
    }
    // Conservative policy: block any flagged category, including sexual content.
    return results[0].flagged || Object.values(results[0].categories).some(value=>value===true);
  }
  async processProductImage(bytes: ArrayBuffer, brand: BrandProfile | null): Promise<GeneratedImage> {
    const config=configuration(this.env); const started=Date.now();
    const {body,requestId}=await this.post('images/edits',{
      model:config.model, images:[{image_url:`data:image/png;base64,${toBase64(bytes)}`}],
      prompt:productCleanupPrompt(brand),n:1,quality:config.quality,size:'1024x1024',
      output_format:'webp',output_compression:85,background:'opaque',moderation:'auto'
    },180_000,'image_generation_failure');
    const data=body.data as {b64_json?:unknown}[] | undefined;
    if (!Array.isArray(data) || data.length!==1 || typeof data[0].b64_json!=='string' || data[0].b64_json.length>14*1024*1024) {
      throw new PipelineError('image_generation_failure');
    }
    let output: Uint8Array;
    try { output=Uint8Array.from(atob(data[0].b64_json),c=>c.charCodeAt(0)); }
    catch { throw new PipelineError('image_generation_failure'); }
    // Whitelist cost counters; do not retain prompts, moderation scores or arbitrary response fields.
    const usage:Record<string,unknown>={};
    if (body.usage && typeof body.usage==='object') {
      const raw=body.usage as Record<string,unknown>;
      for (const field of ['input_tokens','output_tokens','total_tokens']) {
        if(typeof raw[field]==='number' && Number.isSafeInteger(raw[field]) && raw[field]>=0) usage[field]=raw[field];
      }
      if(raw.input_tokens_details && typeof raw.input_tokens_details==='object') {
        const details=raw.input_tokens_details as Record<string,unknown>; const filtered:Record<string,number>={};
        for(const field of ['image_tokens','text_tokens','cached_tokens']) {
          const n=details[field]; if(typeof n==='number' && Number.isSafeInteger(n) && n>=0) filtered[field]=n;
        }
        usage.input_tokens_details=filtered;
      }
    }
    const result=new Uint8Array(output.byteLength); result.set(output);
    return {bytes:result.buffer,requestId,usage:Object.keys(usage).length?JSON.stringify(usage):null,duration:Date.now()-started};
  }
}
