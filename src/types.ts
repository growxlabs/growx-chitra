export interface QueuePayload { version: 1; job_id: string; kind?: 'product'|'brand_logo' }
export interface Env {
  DB: D1Database;
  CHITRA_JOBS: Queue<QueuePayload>;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET: string;
  STORAGE?: PrivateStorage;
  WHATSAPP_VERIFY_TOKEN: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_APP_SECRET: string;
  WHATSAPP_API_VERSION: string;
  AI: Ai;
  IMAGES: ImagesBinding;
  OPENAI_API_KEY: string;
  OPENAI_IMAGE_MODEL: string;
  OPENAI_IMAGE_QUALITY: string;
  PERSON_DETECTION_THRESHOLD: string;
  MAX_GENERATION_ATTEMPTS: string;
  WORKING_IMAGE_MAX_DIMENSION: string;
  IMAGE_RETENTION_DAYS: string;
  DELIVERY_TIMEOUT_HOURS: string;
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;
  RAZORPAY_MODE: string;
  TERMS_URL?: string;
  PRIVACY_URL?: string;
  REFUND_POLICY_URL?: string;
  PAYMENT_SUPPORT_CONTACT?: string;
  APP_ENV?: string;
  SUPPORT_CONTACT?: string;
  BUSINESS_IDENTITY_SECRET?: string;
  TERMS_VERSION?: string;
  PRIVACY_VERSION?: string;
  ORIGINAL_IMAGE_RETENTION_DAYS?: string;
  GENERATED_IMAGE_RETENTION_DAYS?: string;
  BLOCKED_IMAGE_RETENTION_HOURS?: string;
  SAFETY_EVENT_RETENTION_DAYS?: string;
  MAX_UPLOAD_BYTES?: string;
  MAX_IMAGE_WIDTH?: string;
  MAX_IMAGE_HEIGHT?: string;
  MAX_IMAGES_PER_HOUR?: string;
  MAX_COMMANDS_PER_MINUTE?: string;
  MAX_PAYMENT_LINKS_PER_HOUR?: string;
  MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_ADMIN_EMAILS?: string;
  ASSETS?: Fetcher;
}

export type OperatorRole = 'viewer' | 'operator' | 'admin';

export interface OperatorUser {
  email: string;
  name: string;
  role: OperatorRole;
}
export interface StoredObject { size:number; arrayBuffer():Promise<ArrayBuffer> }
export interface PrivateStorage {
  put(key:string,body:ArrayBuffer|Uint8Array,contentType?:string):Promise<void>;
  get(key:string):Promise<StoredObject|null>;
  delete(keys:string|string[]):Promise<void>;
  list(prefix:string):Promise<string[]>;
}
export interface ImageMessage {
  sender: string;
  messageId: string;
  mediaId: string;
  mimeType: string;
  timestamp: string;
  sha256: string;
}
export interface Job {
  id: string;
  business_id: string;
  whatsapp_message_id: string;
  original_storage_key: string;
  status: JobStatus;
  media_id: string;
  mime_type: string;
  media_sha256: string;
  attempts: number;
  lease_until: string | null;
  acknowledgement_message_id: string | null;
  failure_reason: string | null;
  generated_storage_key: string | null;
  attempt_count: number;
  input_safety_passed: number;
  output_safety_passed: number;
  final_bytes: number | null;
  final_media_id: string | null;
  final_message_id: string | null;
  final_send_started: number;
  delivery_deadline: string | null;
  refusal_message_id: string | null;
  retention_until: string | null;
  generation_settings: string | null;
  model: string | null;
}
export type JobStatus = 'received' | 'queued' | 'processing' | 'input_safety' | 'blocked_input' |
  'generating' | 'branding' | 'output_safety' | 'blocked_output' | 'sending' | 'completed' | 'blocked' | 'failed';
export interface BrandProfile {
  business_name?: string | null;
  logo_storage_key: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  background_style: string | null;
  watermark_enabled: number;
  logo_enabled?: number;
  logo_position?: 'top_left'|'top_right'|'bottom_left'|'bottom_right';
  setup_state?: string;
}
export interface DeliveryEvent {
  messageId: string;
  recipient: string;
  status: 'delivered' | 'read' | 'failed';
  jobId: string | null;
}
export interface TextMessage { sender: string; text: string; messageId: string }
