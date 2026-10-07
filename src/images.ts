import type { BrandProfile, Env, Job } from './types';
import { configuration } from './config';
import { boundedBody } from './binary';
import { PipelineError, validateImage } from './whatsapp';
import { getStorage } from './storage';

export class ImagesService {
  constructor(private env: Env) {}
  async validate(bytes: ArrayBuffer, mime: string): Promise<void> {
    await validateImage(bytes,mime,undefined,Number(this.env.MAX_UPLOAD_BYTES??5*1024*1024));
    let info: ImageInfoResponse;
    try { info=await this.env.IMAGES.info(new Blob([bytes]).stream()); }
    catch { throw new PipelineError('invalid_image',true); }
    const formats: Record<string,string>={jpeg:'image/jpeg',jpg:'image/jpeg',png:'image/png',webp:'image/webp'};
    const actual=formats[info.format] ?? info.format;
    const maxWidth=Number(this.env.MAX_IMAGE_WIDTH??8000), maxHeight=Number(this.env.MAX_IMAGE_HEIGHT??8000);
    if (actual!==mime || !('width' in info) || info.width<=0 || info.height<=0 ||
      !Number.isFinite(info.width) || !Number.isFinite(info.height) || info.width>maxWidth || info.height>maxHeight || info.width*info.height>40_000_000) {
      throw new PipelineError('invalid_image',true);
    }
  }
  async normalize(bytes: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      const size=configuration(this.env).workingSize;
      // Cloudflare decodes/orients the photograph and re-encodes without source metadata.
      const result=await this.env.IMAGES.input(new Blob([bytes]).stream())
        .transform({width:size,height:size,fit:'scale-down'})
        .output({format:'image/png',anim:false});
      return await boundedBody(result.response(),5*1024*1024,'image_too_large');
    } catch(error) { if(error instanceof PipelineError) throw error; throw new PipelineError('invalid_image',true); }
  }
  async brand(bytes: ArrayBuffer, profile: BrandProfile | null, job: Job): Promise<ArrayBuffer> {
    try {
      const styles:Record<string,string>={clean_white:'#ffffff',soft_neutral:'#f5f2ed',brand_color:/^#[0-9a-fA-F]{6}$/.test(profile?.primary_color??'')?profile!.primary_color!:'#f5f2ed'};
      const primary=styles[profile?.background_style??'clean_white']??'#ffffff';
      const secondary=/^#[0-9a-fA-F]{6}$/.test(profile?.secondary_color??'')?profile!.secondary_color:null;
      let chain=this.env.IMAGES.input(new Blob([bytes]).stream()).transform({width:1024,height:1024,fit:'contain',background:primary,
        ...(secondary?{border:{color:secondary,width:4}}:{})});
      if(profile?.logo_enabled && profile.logo_storage_key) {
        // A business can never point at another business's private logo.
        if(!profile.logo_storage_key.startsWith(`brands/${job.business_id}/`)) throw new PipelineError('branding_failure',true);
        const logo=await getStorage(this.env).get(profile.logo_storage_key);
        if(logo) {
          if(logo.size>1024*1024) throw new PipelineError('branding_failure',true);
          const logoBytes=await logo.arrayBuffer();
          const logoInfo=await this.env.IMAGES.info(new Blob([logoBytes]).stream());
          if(!('width' in logoInfo) || !['image/png','image/jpeg','image/webp','png','jpeg','webp'].includes(logoInfo.format)) throw new PipelineError('branding_failure',true);
          const overlay=this.env.IMAGES.input(new Blob([logoBytes]).stream()).transform({width:160,height:80,fit:'scale-down'});
          const pos=profile.logo_position??'bottom_right';
          const placement:Record<string,Record<string,number>>={top_left:{left:24,top:24},top_right:{right:24,top:24},bottom_left:{left:24,bottom:24},bottom_right:{right:24,bottom:24}};
          chain=chain.draw(overlay,{...placement[pos]??placement.bottom_right,opacity:profile.watermark_enabled?0.35:1});
        }
      }
      // Regular WhatsApp image messages support JPEG/PNG; WebP is reserved for stickers.
      return await boundedBody((await chain.output({format:'image/jpeg',quality:85,anim:false})).response(),5*1024*1024,'branding_failure');
    } catch(error) { if(error instanceof PipelineError) throw error; throw new PipelineError('branding_failure'); }
  }
}
