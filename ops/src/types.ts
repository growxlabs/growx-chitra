export type OperatorRole = 'viewer' | 'operator' | 'admin';

export interface OperatorUser {
  email: string;
  name: string;
  role: OperatorRole;
}

export interface OverviewMetrics {
  total_businesses: number;
  active_businesses: number;
  new_businesses_window: number;
  images_processed_window: number;
  images_processed_month: number;
  jobs_total: number;
  jobs_successful: number;
  jobs_failed: number;
  jobs_blocked: number;
  jobs_queued: number;
  credits_consumed_window: number;
  credits_purchased_window: number;
  revenue_window_inr: number;
  revenue_month_inr: number;
  payment_failures_window: number;
  active_queue_failures: number;
  deletion_requests_pending: number;
}

export interface OverviewAlerts {
  uncredited_payments: Array<{
    id: string;
    business_id: string;
    plan_id: string;
    amount_minor: number;
    provider_payment_id: string;
    paid_at: string;
    whatsapp_number: string;
  }>;
  recent_failures: Array<{
    id: string;
    business_id: string;
    status: string;
    failure_reason: string;
    created_at: string;
  }>;
  pending_deletions: Array<{
    id: string;
    whatsapp_number: string;
    deletion_requested_at: string;
    deletion_confirmed_at: string;
  }>;
}

export interface OverviewActivity {
  latest_jobs: Array<{
    id: string;
    business_id: string;
    business_name: string | null;
    status: string;
    model: string | null;
    failure_reason: string | null;
    created_at: string;
  }>;
  latest_payments: Array<{
    id: string;
    business_id: string;
    business_name: string | null;
    plan_id: string;
    amount_minor: number;
    status: string;
    created_at: string;
    paid_at: string | null;
  }>;
  latest_blocked_events: Array<{
    id: string;
    business_id: string;
    business_name: string | null;
    event_type: string;
    details: string | null;
    created_at: string;
  }>;
  latest_businesses: Array<{
    id: string;
    name: string | null;
    whatsapp_number: string;
    account_state: string;
    created_at: string;
  }>;
}

export interface OverviewResponse {
  window: 'today' | '7d' | '30d';
  metrics: OverviewMetrics;
  alerts: OverviewAlerts;
  activity: OverviewActivity;
}

export interface BusinessSummary {
  id: string;
  name: string | null;
  whatsapp_number: string;
  status: string;
  account_state: 'active' | 'suspended' | 'deletion_pending' | 'deleted';
  free_credits: number;
  paid_credits: number;
  total_remaining: number;
  total_images_processed: number;
  total_spend_minor: number;
  total_spend_inr: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessDetail {
  business: {
    id: string;
    name: string | null;
    whatsapp_number: string;
    status: string;
    account_state: 'active' | 'suspended' | 'deletion_pending' | 'deleted';
    created_at: string;
    updated_at: string;
    terms_version: string | null;
    privacy_version: string | null;
    legal_notice_shown_at: string | null;
    deletion_requested_at: string | null;
    deletion_confirmed_at: string | null;
    deleted_at: string | null;
  };
  brand_profile: {
    id: string;
    business_id: string;
    business_name: string | null;
    logo_r2_key: string | null;
    primary_color: string | null;
    secondary_color: string | null;
    background_style: string | null;
    watermark_enabled: number;
    logo_enabled: number;
    logo_position: string;
    setup_state: string;
  } | null;
  usage: {
    total_images: number;
    completed_images: number;
    failed_images: number;
    blocked_images: number;
    avg_duration_ms: number | null;
  };
  credits: {
    free_remaining: number;
    paid_remaining: number;
    total_remaining: number;
    history: Array<{
      id: string;
      amount: number;
      type: string;
      image_job_id: string | null;
      reference_id: string | null;
      operator: string | null;
      reason: string | null;
      created_at: string;
    }>;
  };
  payments: Array<{
    id: string;
    provider_payment_id: string | null;
    plan_id: string;
    amount_minor: number;
    amount_inr: number;
    status: string;
    credits_purchased: number;
    created_at: string;
    paid_at: string | null;
  }>;
  safety: {
    blocked_count: number;
    events: Array<{
      id: string;
      event_type: string;
      details: string | null;
      created_at: string;
    }>;
  };
  support_notes: Array<{
    id: string;
    issue: string;
    note: string;
    operator: string;
    resolved: number;
    created_at: string;
    updated_at: string;
  }>;
  audit_logs: Array<{
    id: string;
    operator: string;
    action: string;
    reason: string | null;
    metadata: string | null;
    created_at: string;
  }>;
}

export interface JobSummary {
  id: string;
  business_id: string;
  business_name: string | null;
  whatsapp_number: string;
  status: string;
  model: string | null;
  attempts: number;
  attempt_count: number;
  generation_duration_ms: number | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobDetail {
  job: JobSummary & {
    whatsapp_message_id: string;
    original_r2_key: string;
    generated_r2_key: string | null;
    final_r2_key: string | null;
    mime_type: string;
    input_bytes: number | null;
    output_bytes: number | null;
    final_bytes: number | null;
    input_safety_passed: number;
    output_safety_passed: number;
    openai_request_id: string | null;
    usage_data: string | null;
    final_message_id: string | null;
    delivery_deadline: string | null;
    delivered_at: string | null;
    retention_until: string | null;
  };
  delivery_event: {
    status: string;
    created_at: string;
    updated_at: string;
  } | null;
  credit_charge: {
    id: string;
    amount: number;
    type: string;
    created_at: string;
  } | null;
  audit_logs: Array<{
    id: string;
    operator: string;
    action: string;
    reason: string | null;
    created_at: string;
  }>;
}

export interface PaymentSummary {
  id: string;
  business_id: string;
  business_name: string | null;
  whatsapp_number: string;
  provider_payment_id: string | null;
  plan_id: string;
  amount_minor: number;
  amount_inr: number;
  currency: string;
  credits_purchased: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  failed_at: string | null;
  credits_granted: number | boolean;
  missing_credits: boolean;
}

export interface PaymentDetail {
  payment: PaymentSummary & {
    provider_payment_link_id: string | null;
    provider_order_id: string | null;
    payment_url: string | null;
    refund_review_required: number;
    metadata: string | null;
  };
  credits_granted: boolean;
  missing_credits: boolean;
  credit_ledger_entry: {
    id: string;
    amount: number;
    type: string;
    reference_id: string;
    created_at: string;
  } | null;
  provider_events: Array<{
    provider_event_id: string;
    event_type: string;
    result: string;
    created_at: string;
  }>;
  refunds: Array<{
    provider_refund_id: string;
    amount_minor: number;
    currency: string;
    status: string;
    created_at: string;
  }>;
}

export interface CreditLedgerEntry {
  id: string;
  business_id: string;
  business_name: string | null;
  whatsapp_number: string;
  amount: number;
  type: string;
  image_job_id: string | null;
  reference_id: string | null;
  operator: string | null;
  reason: string | null;
  created_at: string;
}

export interface SafetyOverview {
  metrics: {
    total_blocked_inputs: number;
    total_blocked_outputs: number;
    person_detected_events: number;
    sexual_explicit_events: number;
    repeated_abuse_accounts: number;
    suspended_accounts: number;
  };
  events: Array<{
    id: string;
    business_id: string | null;
    business_name: string | null;
    whatsapp_number: string;
    event_type: string;
    details: string | null;
    created_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface DeletionRequestItem {
  business_id: string;
  business_name: string | null;
  whatsapp_number: string;
  status: 'requested' | 'confirmed' | 'processing' | 'completed' | 'failed';
  request_time: string | null;
  confirmation_time: string | null;
  completion_time: string | null;
  financial_records_preserved: boolean;
  failure_reason: string | null;
}

export interface SupportNoteItem {
  id: string;
  business_id: string;
  business_name: string | null;
  whatsapp_number: string;
  issue: string;
  note: string;
  operator: string;
  resolved: number;
  created_at: string;
  updated_at: string;
}

export interface SettingsData {
  configuration: {
    image_model: string;
    image_quality: string;
    free_trial_credits: number;
    plans: Record<string, { id: string; name: string; credits: number; priceMinor: number }>;
    retention: {
      original_image_days: string;
      generated_image_days: string;
      blocked_image_hours: string;
      safety_event_days: string;
    };
    limits: {
      max_upload_bytes: string;
      max_image_width: string;
      max_image_height: string;
      max_images_per_hour: string;
      max_commands_per_minute: string;
      max_payment_links_per_hour: string;
      max_brand_setup_attempts_per_hour: string;
    };
    legal_and_support: {
      support_contact: string;
      terms_url: string;
      privacy_url: string;
      refund_policy_url: string;
    };
  };
  secrets_status: Record<string, string>;
}

export interface AuditLogItem {
  id: string;
  operator: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  metadata: string | null;
  created_at: string;
}
