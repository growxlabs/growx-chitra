import type { Env } from './types';
import { configuration } from './config';
import { ImagesService } from './images';
import { OpenAIService } from './openai';
import { PipelineError } from './whatsapp';

export class SafetyBlock extends PipelineError {
  constructor(code: string, public readonly source: 'input' | 'output') { super(code,true); }
}
export class SafetyService {
  constructor(private env: Env, private images=new ImagesService(env),private openai=new OpenAIService(env)) {}
  private async check(bytes: ArrayBuffer,mime: string,source: 'input'|'output'): Promise<void> {
    await this.images.validate(bytes,mime);
    if(await this.openai.moderate(bytes,mime)) throw new SafetyBlock(source==='input'?'unsafe_input':'unsafe_output',source);
    let detected: unknown;
    try { detected=await this.env.AI.run('@cf/facebook/detr-resnet-50',{image:Array.from(new Uint8Array(bytes))}); }
    catch { throw new PipelineError('person_detection_failure'); }
    if(!Array.isArray(detected) || !detected.every(item=>item && typeof item==='object' &&
      typeof item.label==='string' && typeof item.score==='number' && Number.isFinite(item.score) && item.score>=0 && item.score<=1)) {
      throw new PipelineError('person_detection_failure');
    }
    if(detected.some(item=>item.label.trim().toLowerCase()==='person' && item.score>=configuration(this.env).threshold)) {
      throw new SafetyBlock('person_detected',source);
    }
  }
  inputSafetyCheck(bytes: ArrayBuffer,mime: string): Promise<void> { return this.check(bytes,mime,'input'); }
  outputSafetyCheck(bytes: ArrayBuffer,mime: string): Promise<void> { return this.check(bytes,mime,'output'); }
}
