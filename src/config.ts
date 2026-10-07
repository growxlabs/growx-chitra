import type { Env } from './types';
import { PipelineError } from './whatsapp';

export function productionConfigurationReady(env:Env):boolean {
  if(env.APP_ENV!=='production') return true;
  const required=[env.WHATSAPP_VERIFY_TOKEN,env.WHATSAPP_ACCESS_TOKEN,env.WHATSAPP_PHONE_NUMBER_ID,env.WHATSAPP_APP_SECRET,
    env.OPENAI_API_KEY,env.OPENAI_IMAGE_MODEL,env.RAZORPAY_KEY_ID,env.RAZORPAY_KEY_SECRET,env.RAZORPAY_WEBHOOK_SECRET,
    env.TERMS_URL,env.PRIVACY_URL,env.REFUND_POLICY_URL,env.SUPPORT_CONTACT,env.BUSINESS_IDENTITY_SECRET,
    env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,env.SUPABASE_STORAGE_BUCKET,
    env.ORIGINAL_IMAGE_RETENTION_DAYS,env.GENERATED_IMAGE_RETENTION_DAYS,env.BLOCKED_IMAGE_RETENTION_HOURS,
    env.SAFETY_EVENT_RETENTION_DAYS,env.MAX_IMAGES_PER_HOUR,env.MAX_COMMANDS_PER_MINUTE,env.MAX_PAYMENT_LINKS_PER_HOUR,
    env.MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR,env.MAX_UPLOAD_BYTES,env.MAX_IMAGE_WIDTH,env.MAX_IMAGE_HEIGHT];
  return required.every(value=>typeof value==='string'&&value.trim().length>0);
}

export function configuration(env: Env) {
  const number = (name: string, raw: string, min: number, max: number, integer = false) => {
    const n = Number(raw);
    if (!raw || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw new PipelineError(`invalid_config_${name}`, true);
    }
    return n;
  };
  if (!env.OPENAI_IMAGE_MODEL || !['low','medium','high'].includes(env.OPENAI_IMAGE_QUALITY)) throw new PipelineError('invalid_generation_config', true);
  return {
    threshold: number('person_threshold', env.PERSON_DETECTION_THRESHOLD, 0.01, 1),
    maxAttempts: number('generation_attempts', env.MAX_GENERATION_ATTEMPTS, 1, 2, true),
    workingSize: number('working_size', env.WORKING_IMAGE_MAX_DIMENSION, 256, 2048, true),
    retentionDays: number('retention_days', env.IMAGE_RETENTION_DAYS, 1, 365, true),
    deliveryHours: number('delivery_hours', env.DELIVERY_TIMEOUT_HOURS, 1, 72, true),
    model: env.OPENAI_IMAGE_MODEL,
    quality: env.OPENAI_IMAGE_QUALITY
  };
}
