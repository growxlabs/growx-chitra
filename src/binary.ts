import { PipelineError } from './whatsapp';

export function toBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let value = '';
  for (let i=0;i<bytes.length;i+=8192) value += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(value);
}
export async function boundedBody(response: Response, limit: number, code: string): Promise<ArrayBuffer> {
  if (!response.body) throw new PipelineError(code,true);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const {done,value}=await reader.read();
    if (done) break;
    size+=value.length;
    if(size>limit) { await reader.cancel(); throw new PipelineError(code,true); }
    chunks.push(value);
  }
  const bytes=new Uint8Array(size); let offset=0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset+=chunk.length; }
  return bytes.buffer;
}
