import type {
  OperatorUser,
  OverviewResponse,
  BusinessSummary,
  BusinessDetail,
  JobSummary,
  JobDetail,
  PaymentSummary,
  PaymentDetail,
  CreditLedgerEntry,
  SafetyOverview,
  DeletionRequestItem,
  SupportNoteItem,
  SettingsData,
  AuditLogItem
} from './types';

// ==========================================
// OPERATOR IDENTITY
// ==========================================
export const mockCurrentUser: OperatorUser = {
  email: 'lead-admin@growxlabs.tech',
  name: 'Vikram Malhotra',
  role: 'admin'
};

// ==========================================
// BUSINESSES
// ==========================================
export interface MockBusinessRecord {
  summary: BusinessSummary;
  detail: BusinessDetail;
}

export const mockBusinessesStore: MockBusinessRecord[] = [
  {
    summary: {
      id: 'biz_9a8b1c2d3e4f',
      name: 'Saree Sansar Silk Mills',
      whatsapp_number: '+919820123456',
      status: 'active',
      account_state: 'active',
      free_credits: 0,
      paid_credits: 42,
      total_remaining: 42,
      total_images_processed: 158,
      total_spend_minor: 479700,
      total_spend_inr: 4797,
      created_at: '2026-08-12T09:30:00.000Z',
      updated_at: '2026-10-06T10:15:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_9a8b1c2d3e4f',
        name: 'Saree Sansar Silk Mills',
        whatsapp_number: '+919820123456',
        status: 'active',
        account_state: 'active',
        created_at: '2026-08-12T09:30:00.000Z',
        updated_at: '2026-10-06T10:15:00.000Z',
        terms_version: 'v2.1',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-08-12T09:31:10.000Z',
        deletion_requested_at: null,
        deletion_confirmed_at: null,
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_9a8b1c2d3e4f',
        business_id: 'biz_9a8b1c2d3e4f',
        business_name: 'Saree Sansar Silk Mills',
        logo_r2_key: 'logos/biz_9a8b1c2d3e4f/saree_sansar_crest.png',
        primary_color: '#8B263E',
        secondary_color: '#D4AF37',
        background_style: 'warm_cream_studio',
        watermark_enabled: 1,
        logo_enabled: 1,
        logo_position: 'bottom_right',
        setup_state: 'completed'
      },
      usage: {
        total_images: 158,
        completed_images: 152,
        failed_images: 4,
        blocked_images: 2,
        avg_duration_ms: 14820
      },
      credits: {
        free_remaining: 0,
        paid_remaining: 42,
        total_remaining: 42,
        history: [
          {
            id: 'cld_01j9a8b_01',
            amount: -1,
            type: 'generation',
            image_job_id: 'job_01j9a8b1c201',
            reference_id: null,
            operator: null,
            reason: 'Kanjivaram silk saree product generation',
            created_at: '2026-10-06T10:15:00.000Z'
          },
          {
            id: 'cld_01j9a8b_02',
            amount: 50,
            type: 'purchase',
            image_job_id: null,
            reference_id: 'pay_01j9p203',
            operator: null,
            reason: 'Growth Pack payment captured',
            created_at: '2026-10-06T02:00:00.000Z'
          },
          {
            id: 'cld_01j9a8b_03',
            amount: 3,
            type: 'signup_bonus',
            image_job_id: null,
            reference_id: null,
            operator: null,
            reason: 'Welcome trial bonus',
            created_at: '2026-08-12T09:30:00.000Z'
          }
        ]
      },
      payments: [
        {
          id: 'pay_01j9p203',
          provider_payment_id: 'pay_P5zO21sD8dY63c',
          plan_id: 'growth',
          amount_minor: 79900,
          amount_inr: 799,
          status: 'paid',
          credits_purchased: 50,
          created_at: '2026-10-06T01:58:00.000Z',
          paid_at: '2026-10-06T02:00:00.000Z'
        },
        {
          id: 'pay_01j9p206',
          provider_payment_id: 'pay_P3bC09uB6fA45e',
          plan_id: 'starter',
          amount_minor: 29900,
          amount_inr: 299,
          status: 'refunded',
          credits_purchased: 15,
          created_at: '2026-10-03T11:20:00.000Z',
          paid_at: '2026-10-03T11:22:00.000Z'
        }
      ],
      safety: {
        blocked_count: 2,
        events: [
          {
            id: 'saf_01j9a8b_01',
            event_type: 'input_moderation_warning',
            details: 'Model face detected with low confidence 0.32; permitted with disclaimer',
            created_at: '2026-09-15T14:10:00.000Z'
          }
        ]
      },
      support_notes: [
        {
          id: 'sup_01j9a8b_01',
          issue: 'Watermark position guidance',
          note: 'Merchant requested assistance setting logo position to bottom_right for catalog uniformity.',
          operator: 'lead-admin@growxlabs.tech',
          resolved: 1,
          created_at: '2026-08-14T11:00:00.000Z',
          updated_at: '2026-08-14T11:30:00.000Z'
        }
      ],
      audit_logs: [
        {
          id: 'aud_01j9a8b_01',
          operator: 'lead-admin@growxlabs.tech',
          action: 'branding.updated',
          reason: 'Adjusted brand palette hex values upon merchant WhatsApp confirmation',
          metadata: '{"primary_color":"#8B263E","secondary_color":"#D4AF37"}',
          created_at: '2026-08-15T10:00:00.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'biz_7d6c5b4a3f2e',
      name: 'Royal Jewellers Jaipur',
      whatsapp_number: '+919811987654',
      status: 'active',
      account_state: 'active',
      free_credits: 2,
      paid_credits: 98,
      total_remaining: 100,
      total_images_processed: 324,
      total_spend_minor: 1199400,
      total_spend_inr: 11994,
      created_at: '2026-07-20T14:15:00.000Z',
      updated_at: '2026-10-06T10:20:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_7d6c5b4a3f2e',
        name: 'Royal Jewellers Jaipur',
        whatsapp_number: '+919811987654',
        status: 'active',
        account_state: 'active',
        created_at: '2026-07-20T14:15:00.000Z',
        updated_at: '2026-10-06T10:20:00.000Z',
        terms_version: 'v2.1',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-07-20T14:16:00.000Z',
        deletion_requested_at: null,
        deletion_confirmed_at: null,
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_7d6c5b4a3f2e',
        business_id: 'biz_7d6c5b4a3f2e',
        business_name: 'Royal Jewellers Jaipur',
        logo_r2_key: 'logos/biz_7d6c5b4a3f2e/royal_jewellers_gold.png',
        primary_color: '#1B365D',
        secondary_color: '#E5C158',
        background_style: 'soft_velvet_shadow',
        watermark_enabled: 1,
        logo_enabled: 1,
        logo_position: 'bottom_left',
        setup_state: 'completed'
      },
      usage: {
        total_images: 324,
        completed_images: 318,
        failed_images: 3,
        blocked_images: 3,
        avg_duration_ms: 18240
      },
      credits: {
        free_remaining: 2,
        paid_remaining: 98,
        total_remaining: 100,
        history: [
          {
            id: 'cld_7d6c_01',
            amount: 150,
            type: 'purchase',
            image_job_id: null,
            reference_id: 'pay_01j9p202',
            operator: null,
            reason: 'Professional Pack purchase',
            created_at: '2026-10-06T05:00:00.000Z'
          },
          {
            id: 'cld_7d6c_02',
            amount: -1,
            type: 'generation',
            image_job_id: 'job_01j9a8b1c208',
            reference_id: null,
            operator: null,
            reason: 'Kundan bridal choker jewellery generation',
            created_at: '2026-10-06T02:30:00.000Z'
          }
        ]
      },
      payments: [
        {
          id: 'pay_01j9p202',
          provider_payment_id: 'pay_P6yN32rE9cT72b',
          plan_id: 'pro',
          amount_minor: 199900,
          amount_inr: 1999,
          status: 'paid',
          credits_purchased: 150,
          created_at: '2026-10-06T04:58:00.000Z',
          paid_at: '2026-10-06T05:00:00.000Z'
        },
        {
          id: 'pay_01j9p207',
          provider_payment_id: 'pay_P2cD98vA5gB36f',
          plan_id: 'growth',
          amount_minor: 79900,
          amount_inr: 799,
          status: 'paid',
          credits_purchased: 50,
          created_at: '2026-10-02T16:00:00.000Z',
          paid_at: '2026-10-02T16:02:00.000Z'
        }
      ],
      safety: {
        blocked_count: 3,
        events: []
      },
      support_notes: [],
      audit_logs: [
        {
          id: 'aud_7d6c_01',
          operator: 'lead-admin@growxlabs.tech',
          action: 'credits.adjusted',
          reason: 'Compensated for timeout during Diwali rush',
          metadata: '{"amount":5,"previous_total":95}',
          created_at: '2026-09-28T12:00:00.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'biz_4e5d6c7b8a9f',
      name: 'Mehta Leather & Footwear',
      whatsapp_number: '+919876543210',
      status: 'active',
      account_state: 'active',
      free_credits: 0,
      paid_credits: 18,
      total_remaining: 18,
      total_images_processed: 84,
      total_spend_minor: 239700,
      total_spend_inr: 2397,
      created_at: '2026-09-01T11:00:00.000Z',
      updated_at: '2026-10-06T10:00:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_4e5d6c7b8a9f',
        name: 'Mehta Leather & Footwear',
        whatsapp_number: '+919876543210',
        status: 'active',
        account_state: 'active',
        created_at: '2026-09-01T11:00:00.000Z',
        updated_at: '2026-10-06T10:00:00.000Z',
        terms_version: 'v2.1',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-09-01T11:02:00.000Z',
        deletion_requested_at: null,
        deletion_confirmed_at: null,
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_4e5d6c7b8a9f',
        business_id: 'biz_4e5d6c7b8a9f',
        business_name: 'Mehta Footwear',
        logo_r2_key: 'logos/biz_4e5d6c7b8a9f/mehta_monogram.png',
        primary_color: '#3E2723',
        secondary_color: '#8D6E63',
        background_style: 'concrete_minimal',
        watermark_enabled: 0,
        logo_enabled: 1,
        logo_position: 'bottom_right',
        setup_state: 'completed'
      },
      usage: {
        total_images: 84,
        completed_images: 80,
        failed_images: 3,
        blocked_images: 1,
        avg_duration_ms: 13100
      },
      credits: {
        free_remaining: 0,
        paid_remaining: 18,
        total_remaining: 18,
        history: [
          {
            id: 'cld_4e5d_01',
            amount: -1,
            type: 'generation',
            image_job_id: 'job_01j9a8b1c204',
            reference_id: null,
            operator: null,
            reason: 'Oxford leather brogues studio shot (failed/refunded)',
            created_at: '2026-10-06T08:00:00.000Z'
          }
        ]
      },
      payments: [
        {
          id: 'pay_rec_01j9uncred',
          provider_payment_id: 'pay_P8xK29vL1aZ90q',
          plan_id: 'growth',
          amount_minor: 79900,
          amount_inr: 799,
          status: 'paid',
          credits_purchased: 50,
          created_at: '2026-10-06T09:15:00.000Z',
          paid_at: '2026-10-06T09:16:30.000Z'
        }
      ],
      safety: {
        blocked_count: 1,
        events: []
      },
      support_notes: [
        {
          id: 'sup_4e5d_01',
          issue: 'Missing credits after UPI payment confirmation',
          note: 'Payment pay_P8xK29vL1aZ90q webhook timed out. Flagged for one-click manual reconciliation in Payment Inspector.',
          operator: 'lead-admin@growxlabs.tech',
          resolved: 0,
          created_at: '2026-10-06T09:30:00.000Z',
          updated_at: '2026-10-06T09:30:00.000Z'
        }
      ],
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'biz_1f2e3d4c5b6a',
      name: 'Malabar Organic Spices',
      whatsapp_number: '+919447112233',
      status: 'active',
      account_state: 'active',
      free_credits: 3,
      paid_credits: 0,
      total_remaining: 3,
      total_images_processed: 12,
      total_spend_minor: 0,
      total_spend_inr: 0,
      created_at: '2026-10-04T08:00:00.000Z',
      updated_at: '2026-10-06T05:00:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_1f2e3d4c5b6a',
        name: 'Malabar Organic Spices',
        whatsapp_number: '+919447112233',
        status: 'active',
        account_state: 'active',
        created_at: '2026-10-04T08:00:00.000Z',
        updated_at: '2026-10-06T05:00:00.000Z',
        terms_version: 'v2.1',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-10-04T08:01:00.000Z',
        deletion_requested_at: null,
        deletion_confirmed_at: null,
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_1f2e3d4c5b6a',
        business_id: 'biz_1f2e3d4c5b6a',
        business_name: 'Malabar Organic Spices',
        logo_r2_key: null,
        primary_color: '#2E5A27',
        secondary_color: '#8FBC8F',
        background_style: 'rustic_wood_kitchen',
        watermark_enabled: 0,
        logo_enabled: 0,
        logo_position: 'top_right',
        setup_state: 'in_progress'
      },
      usage: {
        total_images: 12,
        completed_images: 11,
        failed_images: 1,
        blocked_images: 0,
        avg_duration_ms: 11450
      },
      credits: {
        free_remaining: 3,
        paid_remaining: 0,
        total_remaining: 3,
        history: [
          {
            id: 'cld_1f2e_01',
            amount: 3,
            type: 'signup_bonus',
            image_job_id: null,
            reference_id: null,
            operator: null,
            reason: 'Free trial allotment',
            created_at: '2026-10-04T08:00:00.000Z'
          }
        ]
      },
      payments: [
        {
          id: 'pay_01j9p204',
          provider_payment_id: null,
          plan_id: 'starter',
          amount_minor: 29900,
          amount_inr: 299,
          status: 'pending',
          credits_purchased: 15,
          created_at: '2026-10-06T09:40:00.000Z',
          paid_at: null
        }
      ],
      safety: {
        blocked_count: 0,
        events: []
      },
      support_notes: [],
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'biz_8c7b6a5f4e3d',
      name: 'Deccan Handicrafts Collective',
      whatsapp_number: '+919848099887',
      status: 'suspended',
      account_state: 'suspended',
      free_credits: 0,
      paid_credits: 15,
      total_remaining: 15,
      total_images_processed: 46,
      total_spend_minor: 159800,
      total_spend_inr: 1598,
      created_at: '2026-06-18T10:00:00.000Z',
      updated_at: '2026-10-06T07:00:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_8c7b6a5f4e3d',
        name: 'Deccan Handicrafts Collective',
        whatsapp_number: '+919848099887',
        status: 'suspended',
        account_state: 'suspended',
        created_at: '2026-06-18T10:00:00.000Z',
        updated_at: '2026-10-06T07:00:00.000Z',
        terms_version: 'v2.0',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-06-18T10:02:00.000Z',
        deletion_requested_at: null,
        deletion_confirmed_at: null,
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_8c7b6a5f4e3d',
        business_id: 'biz_8c7b6a5f4e3d',
        business_name: 'Deccan Handicrafts',
        logo_r2_key: 'logos/biz_8c7b6a5f4e3d/deccan_lotus.png',
        primary_color: '#5C4033',
        secondary_color: '#C19A6B',
        background_style: 'earthy_terracotta',
        watermark_enabled: 1,
        logo_enabled: 1,
        logo_position: 'bottom_right',
        setup_state: 'completed'
      },
      usage: {
        total_images: 46,
        completed_images: 39,
        failed_images: 2,
        blocked_images: 5,
        avg_duration_ms: 16900
      },
      credits: {
        free_remaining: 0,
        paid_remaining: 15,
        total_remaining: 15,
        history: []
      },
      payments: [
        {
          id: 'pay_01j9p205',
          provider_payment_id: 'pay_P4aB10tC7eZ54d',
          plan_id: 'growth',
          amount_minor: 79900,
          amount_inr: 799,
          status: 'failed',
          credits_purchased: 50,
          created_at: '2026-10-05T12:00:00.000Z',
          paid_at: null
        }
      ],
      safety: {
        blocked_count: 5,
        events: [
          {
            id: 'saf_8c7b_01',
            event_type: 'input_moderation_block',
            details: 'Human presence detected by Cloudflare DETR (confidence: 0.96). Repeated non-compliance triggered suspension.',
            created_at: '2026-10-06T07:00:00.000Z'
          }
        ]
      },
      support_notes: [],
      audit_logs: [
        {
          id: 'aud_8c7b_01',
          operator: 'lead-admin@growxlabs.tech',
          action: 'business.suspended',
          reason: 'Excessive human photo upload attempts after safety warnings',
          metadata: '{"violations_count":5}',
          created_at: '2026-10-06T07:00:00.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'biz_3a2b1c0d9e8f',
      name: 'Vogue Studio Bombay',
      whatsapp_number: '+919920334455',
      status: 'active',
      account_state: 'active',
      free_credits: 0,
      paid_credits: 142,
      total_remaining: 142,
      total_images_processed: 512,
      total_spend_minor: 1999000,
      total_spend_inr: 19990,
      created_at: '2026-05-10T16:00:00.000Z',
      updated_at: '2026-10-06T10:10:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_3a2b1c0d9e8f',
        name: 'Vogue Studio Bombay',
        whatsapp_number: '+919920334455',
        status: 'active',
        account_state: 'active',
        created_at: '2026-05-10T16:00:00.000Z',
        updated_at: '2026-10-06T10:10:00.000Z',
        terms_version: 'v2.1',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-05-10T16:01:00.000Z',
        deletion_requested_at: null,
        deletion_confirmed_at: null,
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_3a2b1c0d9e8f',
        business_id: 'biz_3a2b1c0d9e8f',
        business_name: 'Vogue Studio Bombay',
        logo_r2_key: 'logos/biz_3a2b1c0d9e8f/vogue_studio.svg',
        primary_color: '#0F0F0F',
        secondary_color: '#FAFAFA',
        background_style: 'pure_white_highkey',
        watermark_enabled: 0,
        logo_enabled: 1,
        logo_position: 'center_bottom',
        setup_state: 'completed'
      },
      usage: {
        total_images: 512,
        completed_images: 504,
        failed_images: 6,
        blocked_images: 2,
        avg_duration_ms: 15300
      },
      credits: {
        free_remaining: 0,
        paid_remaining: 142,
        total_remaining: 142,
        history: [
          {
            id: 'cld_3a2b_01',
            amount: 150,
            type: 'purchase',
            image_job_id: null,
            reference_id: 'pay_01j9p201',
            operator: null,
            reason: 'Professional Pack recharge',
            created_at: '2026-10-06T07:15:00.000Z'
          }
        ]
      },
      payments: [
        {
          id: 'pay_01j9p201',
          provider_payment_id: 'pay_P7xM45qW2bX81a',
          plan_id: 'pro',
          amount_minor: 199900,
          amount_inr: 1999,
          status: 'paid',
          credits_purchased: 150,
          created_at: '2026-10-06T07:14:00.000Z',
          paid_at: '2026-10-06T07:15:00.000Z'
        }
      ],
      safety: {
        blocked_count: 2,
        events: []
      },
      support_notes: [],
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'biz_6e5d4c3b2a1f',
      name: 'Kashmir Pashmina Heritage',
      whatsapp_number: '+919797001122',
      status: 'deletion_pending',
      account_state: 'deletion_pending',
      free_credits: 0,
      paid_credits: 0,
      total_remaining: 0,
      total_images_processed: 29,
      total_spend_minor: 79900,
      total_spend_inr: 799,
      created_at: '2026-06-01T12:00:00.000Z',
      updated_at: '2026-10-05T14:00:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_6e5d4c3b2a1f',
        name: 'Kashmir Pashmina Heritage',
        whatsapp_number: '+919797001122',
        status: 'deletion_pending',
        account_state: 'deletion_pending',
        created_at: '2026-06-01T12:00:00.000Z',
        updated_at: '2026-10-05T14:00:00.000Z',
        terms_version: 'v2.0',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-06-01T12:01:00.000Z',
        deletion_requested_at: '2026-10-04T10:00:00.000Z',
        deletion_confirmed_at: '2026-10-05T14:00:00.000Z',
        deleted_at: null
      },
      brand_profile: {
        id: 'brand_6e5d4c3b2a1f',
        business_id: 'biz_6e5d4c3b2a1f',
        business_name: 'Kashmir Pashmina Heritage',
        logo_r2_key: 'logos/biz_6e5d4c3b2a1f/chinar_leaf.png',
        primary_color: '#722F37',
        secondary_color: '#D4AF37',
        background_style: 'snow_mountain_soft',
        watermark_enabled: 1,
        logo_enabled: 0,
        logo_position: 'bottom_right',
        setup_state: 'completed'
      },
      usage: {
        total_images: 29,
        completed_images: 28,
        failed_images: 1,
        blocked_images: 0,
        avg_duration_ms: 14200
      },
      credits: {
        free_remaining: 0,
        paid_remaining: 0,
        total_remaining: 0,
        history: []
      },
      payments: [],
      safety: {
        blocked_count: 0,
        events: []
      },
      support_notes: [],
      audit_logs: [
        {
          id: 'aud_6e5d_01',
          operator: 'lead-admin@growxlabs.tech',
          action: 'deletion.confirmed',
          reason: 'DPDP statutory right-to-erasure requested by verified account holder',
          metadata: '{"financial_retained":true}',
          created_at: '2026-10-05T14:00:00.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'biz_2b3c4d5e6f7a',
      name: 'Aura Ayurvedic Cosmetics',
      whatsapp_number: '+919822003344',
      status: 'deleted',
      account_state: 'deleted',
      free_credits: 0,
      paid_credits: 0,
      total_remaining: 0,
      total_images_processed: 65,
      total_spend_minor: 239700,
      total_spend_inr: 2397,
      created_at: '2026-04-10T10:00:00.000Z',
      updated_at: '2026-10-01T18:00:00.000Z'
    },
    detail: {
      business: {
        id: 'biz_2b3c4d5e6f7a',
        name: 'Aura Ayurvedic Cosmetics',
        whatsapp_number: '+919822003344',
        status: 'deleted',
        account_state: 'deleted',
        created_at: '2026-04-10T10:00:00.000Z',
        updated_at: '2026-10-01T18:00:00.000Z',
        terms_version: 'v2.0',
        privacy_version: 'v2.0',
        legal_notice_shown_at: '2026-04-10T10:02:00.000Z',
        deletion_requested_at: '2026-09-28T09:00:00.000Z',
        deletion_confirmed_at: '2026-09-29T11:00:00.000Z',
        deleted_at: '2026-10-01T18:00:00.000Z'
      },
      brand_profile: null,
      usage: {
        total_images: 65,
        completed_images: 62,
        failed_images: 2,
        blocked_images: 1,
        avg_duration_ms: 12800
      },
      credits: {
        free_remaining: 0,
        paid_remaining: 0,
        total_remaining: 0,
        history: []
      },
      payments: [],
      safety: {
        blocked_count: 1,
        events: []
      },
      support_notes: [],
      audit_logs: [
        {
          id: 'aud_2b3c_01',
          operator: 'system-worker@growxlabs.tech',
          action: 'deletion.completed',
          reason: 'Purged R2 storage assets and anonymized phone number; preserved tax invoices',
          metadata: '{"purged_objects":65}',
          created_at: '2026-10-01T18:00:00.000Z'
        }
      ]
    }
  }
];

// ==========================================
// JOBS
// ==========================================
export interface MockJobRecord {
  summary: JobSummary;
  detail: JobDetail;
}

export const mockJobsStore: MockJobRecord[] = [
  {
    summary: {
      id: 'job_01j9a8b1c201',
      business_id: 'biz_9a8b1c2d3e4f',
      business_name: 'Saree Sansar Silk Mills',
      whatsapp_number: '+919820123456',
      status: 'completed',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 14350,
      failure_reason: null,
      created_at: '2026-10-06T10:15:00.000Z',
      updated_at: '2026-10-06T10:15:20.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c201',
        business_id: 'biz_9a8b1c2d3e4f',
        business_name: 'Saree Sansar Silk Mills',
        whatsapp_number: '+919820123456',
        status: 'completed',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 14350,
        failure_reason: null,
        created_at: '2026-10-06T10:15:00.000Z',
        updated_at: '2026-10-06T10:15:20.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5ODIwMTIzNDU2FQIAEhggNzRBRjEwQjU5MkUxRjEzNzc2',
        original_r2_key: 'uploads/biz_9a8b1c2d3e4f/raw_kanjivaram_silk_01.jpg',
        generated_r2_key: 'generated/biz_9a8b1c2d3e4f/gen_kanjivaram_silk_01.webp',
        final_r2_key: 'final/biz_9a8b1c2d3e4f/final_kanjivaram_silk_01.webp',
        mime_type: 'image/jpeg',
        input_bytes: 3420118,
        output_bytes: 2108440,
        final_bytes: 2114900,
        input_safety_passed: 1,
        output_safety_passed: 1,
        openai_request_id: 'req_01j9a8b_openai_94827',
        usage_data: '{"prompt_tokens":1280,"completion_tokens":4096,"total_tokens":5376}',
        final_message_id: 'wamid.HBgMOTE5ODIwMTIzNDU2FQIAERggOThERTMyQjFFMjA0RDJBMUIy',
        delivery_deadline: '2026-10-06T10:16:30.000Z',
        delivered_at: '2026-10-06T10:15:22.000Z',
        retention_until: '2026-11-05T10:15:00.000Z'
      },
      delivery_event: {
        status: 'delivered',
        created_at: '2026-10-06T10:15:20.000Z',
        updated_at: '2026-10-06T10:15:22.000Z'
      },
      credit_charge: {
        id: 'cld_01j9a8b_01',
        amount: -1,
        type: 'generation',
        created_at: '2026-10-06T10:15:00.000Z'
      },
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c202',
      business_id: 'biz_7d6c5b4a3f2e',
      business_name: 'Royal Jewellers Jaipur',
      whatsapp_number: '+919811987654',
      status: 'processing',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: null,
      failure_reason: null,
      created_at: '2026-10-06T10:46:15.000Z',
      updated_at: '2026-10-06T10:46:25.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c202',
        business_id: 'biz_7d6c5b4a3f2e',
        business_name: 'Royal Jewellers Jaipur',
        whatsapp_number: '+919811987654',
        status: 'processing',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: null,
        failure_reason: null,
        created_at: '2026-10-06T10:46:15.000Z',
        updated_at: '2026-10-06T10:46:25.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5ODExOTg3NjU0FQIAEhggMThERTMyQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_7d6c5b4a3f2e/raw_kundan_necklace_hd.jpg',
        generated_r2_key: null,
        final_r2_key: null,
        mime_type: 'image/jpeg',
        input_bytes: 4180290,
        output_bytes: null,
        final_bytes: null,
        input_safety_passed: 1,
        output_safety_passed: 0,
        openai_request_id: 'req_01j9_in_flight_8819',
        usage_data: null,
        final_message_id: null,
        delivery_deadline: '2026-10-06T10:48:00.000Z',
        delivered_at: null,
        retention_until: '2026-11-05T10:46:15.000Z'
      },
      delivery_event: null,
      credit_charge: {
        id: 'cld_7d6c_pending',
        amount: -1,
        type: 'generation_held',
        created_at: '2026-10-06T10:46:15.000Z'
      },
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c203',
      business_id: 'biz_3a2b1c0d9e8f',
      business_name: 'Vogue Studio Bombay',
      whatsapp_number: '+919920334455',
      status: 'queued',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: null,
      failure_reason: null,
      created_at: '2026-10-06T10:46:50.000Z',
      updated_at: '2026-10-06T10:46:50.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c203',
        business_id: 'biz_3a2b1c0d9e8f',
        business_name: 'Vogue Studio Bombay',
        whatsapp_number: '+919920334455',
        status: 'queued',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: null,
        failure_reason: null,
        created_at: '2026-10-06T10:46:50.000Z',
        updated_at: '2026-10-06T10:46:50.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5OTIwMzM0NDU1FQIAEhggNTJEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_3a2b1c0d9e8f/cotton_kurti_olive.jpg',
        generated_r2_key: null,
        final_r2_key: null,
        mime_type: 'image/jpeg',
        input_bytes: 2901400,
        output_bytes: null,
        final_bytes: null,
        input_safety_passed: 1,
        output_safety_passed: 0,
        openai_request_id: null,
        usage_data: null,
        final_message_id: null,
        delivery_deadline: '2026-10-06T10:48:30.000Z',
        delivered_at: null,
        retention_until: '2026-11-05T10:46:50.000Z'
      },
      delivery_event: null,
      credit_charge: null,
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c204',
      business_id: 'biz_4e5d6c7b8a9f',
      business_name: 'Mehta Leather & Footwear',
      whatsapp_number: '+919876543210',
      status: 'failed',
      model: 'gpt-image-2.5-flare',
      attempts: 2,
      attempt_count: 2,
      generation_duration_ms: 30120,
      failure_reason: 'UPSTREAM_TIMEOUT: OpenAI generation exceeded 30000ms deadline',
      created_at: '2026-10-06T08:00:00.000Z',
      updated_at: '2026-10-06T08:01:10.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c204',
        business_id: 'biz_4e5d6c7b8a9f',
        business_name: 'Mehta Leather & Footwear',
        whatsapp_number: '+919876543210',
        status: 'failed',
        model: 'gpt-image-2.5-flare',
        attempts: 2,
        attempt_count: 2,
        generation_duration_ms: 30120,
        failure_reason: 'UPSTREAM_TIMEOUT: OpenAI generation exceeded 30000ms deadline',
        created_at: '2026-10-06T08:00:00.000Z',
        updated_at: '2026-10-06T08:01:10.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhggNDRFMTExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_4e5d6c7b8a9f/oxford_brogue_raw.jpg',
        generated_r2_key: null,
        final_r2_key: null,
        mime_type: 'image/jpeg',
        input_bytes: 3840192,
        output_bytes: null,
        final_bytes: null,
        input_safety_passed: 1,
        output_safety_passed: 0,
        openai_request_id: 'req_01j9timeout_openai_4411',
        usage_data: null,
        final_message_id: null,
        delivery_deadline: '2026-10-06T08:02:00.000Z',
        delivered_at: null,
        retention_until: '2026-11-05T08:00:00.000Z'
      },
      delivery_event: {
        status: 'failed',
        created_at: '2026-10-06T08:01:10.000Z',
        updated_at: '2026-10-06T08:01:10.000Z'
      },
      credit_charge: {
        id: 'cld_4e5d_refunded',
        amount: 1,
        type: 'refund_failure',
        created_at: '2026-10-06T08:01:11.000Z'
      },
      audit_logs: [
        {
          id: 'aud_job_04',
          operator: 'system-worker@growxlabs.tech',
          action: 'job.auto_refunded',
          reason: 'Refunded 1 credit automatically due to upstream timeout error',
          created_at: '2026-10-06T08:01:11.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c205',
      business_id: 'biz_8c7b6a5f4e3d',
      business_name: 'Deccan Handicrafts Collective',
      whatsapp_number: '+919848099887',
      status: 'blocked_input',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 1420,
      failure_reason: 'SAFETY_BLOCKED: Human presence detected by Cloudflare DETR (confidence: 0.96). Only non-human product photography is permitted.',
      created_at: '2026-10-06T07:00:00.000Z',
      updated_at: '2026-10-06T07:00:02.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c205',
        business_id: 'biz_8c7b6a5f4e3d',
        business_name: 'Deccan Handicrafts Collective',
        whatsapp_number: '+919848099887',
        status: 'blocked_input',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 1420,
        failure_reason: 'SAFETY_BLOCKED: Human presence detected by Cloudflare DETR (confidence: 0.96). Only non-human product photography is permitted.',
        created_at: '2026-10-06T07:00:00.000Z',
        updated_at: '2026-10-06T07:00:02.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5ODQ4MDk5ODg3FQIAEhggODlEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_8c7b6a5f4e3d/blocked_portrait.jpg',
        generated_r2_key: null,
        final_r2_key: null,
        mime_type: 'image/jpeg',
        input_bytes: 4210980,
        output_bytes: null,
        final_bytes: null,
        input_safety_passed: 0,
        output_safety_passed: 0,
        openai_request_id: null,
        usage_data: null,
        final_message_id: null,
        delivery_deadline: null,
        delivered_at: null,
        retention_until: '2026-10-07T07:00:00.000Z'
      },
      delivery_event: null,
      credit_charge: null,
      audit_logs: [
        {
          id: 'aud_job_05',
          operator: 'safety-pipeline',
          action: 'safety.blocked_input',
          reason: 'DETR person detector confidence exceeded 0.90 threshold',
          created_at: '2026-10-06T07:00:02.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c206',
      business_id: 'biz_1f2e3d4c5b6a',
      business_name: 'Malabar Organic Spices',
      whatsapp_number: '+919447112233',
      status: 'blocked_output',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 15200,
      failure_reason: 'SAFETY_BLOCKED: Output contained generated phone number or personal contact overlay violating merchant safety guidelines.',
      created_at: '2026-10-06T05:00:00.000Z',
      updated_at: '2026-10-06T05:00:18.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c206',
        business_id: 'biz_1f2e3d4c5b6a',
        business_name: 'Malabar Organic Spices',
        whatsapp_number: '+919447112233',
        status: 'blocked_output',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 15200,
        failure_reason: 'SAFETY_BLOCKED: Output contained generated phone number or personal contact overlay violating merchant safety guidelines.',
        created_at: '2026-10-06T05:00:00.000Z',
        updated_at: '2026-10-06T05:00:18.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5NDQ3MTEyMjMzFQIAEhggMzFEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_1f2e3d4c5b6a/spices_cardamom_raw.jpg',
        generated_r2_key: 'generated/biz_1f2e3d4c5b6a/spices_cardamom_blocked.webp',
        final_r2_key: null,
        mime_type: 'image/jpeg',
        input_bytes: 2510340,
        output_bytes: 1840290,
        final_bytes: null,
        input_safety_passed: 1,
        output_safety_passed: 0,
        openai_request_id: 'req_01j9_cardamom_9182',
        usage_data: '{"prompt_tokens":1100,"completion_tokens":4096,"total_tokens":5196}',
        final_message_id: null,
        delivery_deadline: null,
        delivered_at: null,
        retention_until: '2026-10-07T05:00:00.000Z'
      },
      delivery_event: null,
      credit_charge: {
        id: 'cld_1f2e_refunded',
        amount: 1,
        type: 'refund_safety_block',
        created_at: '2026-10-06T05:00:19.000Z'
      },
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c207',
      business_id: 'biz_3a2b1c0d9e8f',
      business_name: 'Vogue Studio Bombay',
      whatsapp_number: '+919920334455',
      status: 'completed',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 12850,
      failure_reason: null,
      created_at: '2026-10-06T04:20:00.000Z',
      updated_at: '2026-10-06T04:20:15.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c207',
        business_id: 'biz_3a2b1c0d9e8f',
        business_name: 'Vogue Studio Bombay',
        whatsapp_number: '+919920334455',
        status: 'completed',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 12850,
        failure_reason: null,
        created_at: '2026-10-06T04:20:00.000Z',
        updated_at: '2026-10-06T04:20:15.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5OTIwMzM0NDU1FQIAEhggMjFEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_3a2b1c0d9e8f/denim_jacket_raw.jpg',
        generated_r2_key: 'generated/biz_3a2b1c0d9e8f/denim_jacket_gen.webp',
        final_r2_key: 'final/biz_3a2b1c0d9e8f/denim_jacket_final.webp',
        mime_type: 'image/jpeg',
        input_bytes: 3120400,
        output_bytes: 2210800,
        final_bytes: 2218400,
        input_safety_passed: 1,
        output_safety_passed: 1,
        openai_request_id: 'req_01j9_denim_4918',
        usage_data: '{"prompt_tokens":1310,"completion_tokens":4096,"total_tokens":5406}',
        final_message_id: 'wamid.HBgMOTE5OTIwMzM0NDU1FQIAERggNTFEMzExQjFFMjA0RDJBMUIy',
        delivery_deadline: '2026-10-06T04:22:00.000Z',
        delivered_at: '2026-10-06T04:20:18.000Z',
        retention_until: '2026-11-05T04:20:00.000Z'
      },
      delivery_event: {
        status: 'delivered',
        created_at: '2026-10-06T04:20:15.000Z',
        updated_at: '2026-10-06T04:20:18.000Z'
      },
      credit_charge: {
        id: 'cld_3a2b_job07',
        amount: -1,
        type: 'generation',
        created_at: '2026-10-06T04:20:00.000Z'
      },
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c208',
      business_id: 'biz_7d6c5b4a3f2e',
      business_name: 'Royal Jewellers Jaipur',
      whatsapp_number: '+919811987654',
      status: 'completed',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 16400,
      failure_reason: null,
      created_at: '2026-10-06T02:30:00.000Z',
      updated_at: '2026-10-06T02:30:20.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c208',
        business_id: 'biz_7d6c5b4a3f2e',
        business_name: 'Royal Jewellers Jaipur',
        whatsapp_number: '+919811987654',
        status: 'completed',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 16400,
        failure_reason: null,
        created_at: '2026-10-06T02:30:00.000Z',
        updated_at: '2026-10-06T02:30:20.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5ODExOTg3NjU0FQIAEhggMTFEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_7d6c5b4a3f2e/kundan_bangles.jpg',
        generated_r2_key: 'generated/biz_7d6c5b4a3f2e/kundan_bangles_gen.webp',
        final_r2_key: 'final/biz_7d6c5b4a3f2e/kundan_bangles_final.webp',
        mime_type: 'image/jpeg',
        input_bytes: 4501200,
        output_bytes: 2890100,
        final_bytes: 2895400,
        input_safety_passed: 1,
        output_safety_passed: 1,
        openai_request_id: 'req_01j9_bangles_9918',
        usage_data: '{"prompt_tokens":1400,"completion_tokens":4096,"total_tokens":5496}',
        final_message_id: 'wamid.HBgMOTE5ODExOTg3NjU0FQIAERggODFEMzExQjFFMjA0RDJBMUIy',
        delivery_deadline: '2026-10-06T02:32:00.000Z',
        delivered_at: '2026-10-06T02:30:23.000Z',
        retention_until: '2026-11-05T02:30:00.000Z'
      },
      delivery_event: {
        status: 'delivered',
        created_at: '2026-10-06T02:30:20.000Z',
        updated_at: '2026-10-06T02:30:23.000Z'
      },
      credit_charge: {
        id: 'cld_7d6c_job08',
        amount: -1,
        type: 'generation',
        created_at: '2026-10-06T02:30:00.000Z'
      },
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c209',
      business_id: 'biz_9a8b1c2d3e4f',
      business_name: 'Saree Sansar Silk Mills',
      whatsapp_number: '+919820123456',
      status: 'completed',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 13910,
      failure_reason: null,
      created_at: '2026-10-05T23:10:00.000Z',
      updated_at: '2026-10-05T23:10:18.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c209',
        business_id: 'biz_9a8b1c2d3e4f',
        business_name: 'Saree Sansar Silk Mills',
        whatsapp_number: '+919820123456',
        status: 'completed',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 13910,
        failure_reason: null,
        created_at: '2026-10-05T23:10:00.000Z',
        updated_at: '2026-10-05T23:10:18.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5ODIwMTIzNDU2FQIAEhggMDFEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_9a8b1c2d3e4f/banarasi_chiffon.jpg',
        generated_r2_key: 'generated/biz_9a8b1c2d3e4f/banarasi_chiffon_gen.webp',
        final_r2_key: 'final/biz_9a8b1c2d3e4f/banarasi_chiffon_final.webp',
        mime_type: 'image/jpeg',
        input_bytes: 3109400,
        output_bytes: 2014500,
        final_bytes: 2019800,
        input_safety_passed: 1,
        output_safety_passed: 1,
        openai_request_id: 'req_01j9_banarasi_4120',
        usage_data: '{"prompt_tokens":1240,"completion_tokens":4096,"total_tokens":5336}',
        final_message_id: 'wamid.HBgMOTE5ODIwMTIzNDU2FQIAERggOTFEMzExQjFFMjA0RDJBMUIy',
        delivery_deadline: '2026-10-05T23:12:00.000Z',
        delivered_at: '2026-10-05T23:10:20.000Z',
        retention_until: '2026-11-04T23:10:00.000Z'
      },
      delivery_event: {
        status: 'delivered',
        created_at: '2026-10-05T23:10:18.000Z',
        updated_at: '2026-10-05T23:10:20.000Z'
      },
      credit_charge: {
        id: 'cld_9a8b_job09',
        amount: -1,
        type: 'generation',
        created_at: '2026-10-05T23:10:00.000Z'
      },
      audit_logs: []
    }
  },
  {
    summary: {
      id: 'job_01j9a8b1c210',
      business_id: 'biz_1f2e3d4c5b6a',
      business_name: 'Malabar Organic Spices',
      whatsapp_number: '+919447112233',
      status: 'failed',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 820,
      failure_reason: 'DECODE_ERROR: Input stream contained truncated JPEG SOI/EOI markers',
      created_at: '2026-10-05T20:00:00.000Z',
      updated_at: '2026-10-05T20:00:01.000Z'
    },
    detail: {
      job: {
        id: 'job_01j9a8b1c210',
        business_id: 'biz_1f2e3d4c5b6a',
        business_name: 'Malabar Organic Spices',
        whatsapp_number: '+919447112233',
        status: 'failed',
        model: 'gpt-image-2.5-flare',
        attempts: 1,
        attempt_count: 1,
        generation_duration_ms: 820,
        failure_reason: 'DECODE_ERROR: Input stream contained truncated JPEG SOI/EOI markers',
        created_at: '2026-10-05T20:00:00.000Z',
        updated_at: '2026-10-05T20:00:01.000Z',
        whatsapp_message_id: 'wamid.HBgMOTE5NDQ3MTEyMjMzFQIAEhggNzFEMzExQjFFMjA0RDJBMUIy',
        original_r2_key: 'uploads/biz_1f2e3d4c5b6a/corrupt_file.jpg',
        generated_r2_key: null,
        final_r2_key: null,
        mime_type: 'image/jpeg',
        input_bytes: 14200,
        output_bytes: null,
        final_bytes: null,
        input_safety_passed: 0,
        output_safety_passed: 0,
        openai_request_id: null,
        usage_data: null,
        final_message_id: null,
        delivery_deadline: null,
        delivered_at: null,
        retention_until: '2026-10-06T20:00:00.000Z'
      },
      delivery_event: null,
      credit_charge: null,
      audit_logs: []
    }
  }
];

// ==========================================
// PAYMENTS
// ==========================================
export interface MockPaymentRecord {
  summary: PaymentSummary;
  detail: PaymentDetail;
}

export const mockPaymentsStore: MockPaymentRecord[] = [
  {
    summary: {
      id: 'pay_rec_01j9uncred',
      business_id: 'biz_4e5d6c7b8a9f',
      business_name: 'Mehta Leather & Footwear',
      whatsapp_number: '+919876543210',
      provider_payment_id: 'pay_P8xK29vL1aZ90q',
      plan_id: 'growth',
      amount_minor: 79900,
      amount_inr: 799,
      currency: 'INR',
      credits_purchased: 50,
      status: 'paid',
      created_at: '2026-10-06T09:15:00.000Z',
      paid_at: '2026-10-06T09:16:30.000Z',
      failed_at: null,
      credits_granted: false,
      missing_credits: true
    },
    detail: {
      payment: {
        id: 'pay_rec_01j9uncred',
        business_id: 'biz_4e5d6c7b8a9f',
        business_name: 'Mehta Leather & Footwear',
        whatsapp_number: '+919876543210',
        provider_payment_id: 'pay_P8xK29vL1aZ90q',
        plan_id: 'growth',
        amount_minor: 79900,
        amount_inr: 799,
        currency: 'INR',
        credits_purchased: 50,
        status: 'paid',
        created_at: '2026-10-06T09:15:00.000Z',
        paid_at: '2026-10-06T09:16:30.000Z',
        failed_at: null,
        credits_granted: false,
        missing_credits: true,
        provider_payment_link_id: 'plink_P8xK29vL1aZ90q',
        provider_order_id: 'order_P8xK29vL1aZ90q',
        payment_url: 'https://rzp.io/i/growx_mehta_50cr',
        refund_review_required: 0,
        metadata: '{"plan_id":"growth","whatsapp_number":"+919876543210","payment_mode":"upi"}'
      },
      credits_granted: false,
      missing_credits: true,
      credit_ledger_entry: null,
      provider_events: [
        {
          provider_event_id: 'evt_P8xK_01',
          event_type: 'payment.captured',
          result: '200_OK_PROCESSED',
          created_at: '2026-10-06T09:16:30.000Z'
        },
        {
          provider_event_id: 'evt_P8xK_02',
          event_type: 'order.paid',
          result: 'WEBHOOK_TIMEOUT_RETRY_PENDING',
          created_at: '2026-10-06T09:16:35.000Z'
        }
      ],
      refunds: []
    }
  },
  {
    summary: {
      id: 'pay_01j9p201',
      business_id: 'biz_3a2b1c0d9e8f',
      business_name: 'Vogue Studio Bombay',
      whatsapp_number: '+919920334455',
      provider_payment_id: 'pay_P7xM45qW2bX81a',
      plan_id: 'pro',
      amount_minor: 199900,
      amount_inr: 1999,
      currency: 'INR',
      credits_purchased: 150,
      status: 'paid',
      created_at: '2026-10-06T07:14:00.000Z',
      paid_at: '2026-10-06T07:15:00.000Z',
      failed_at: null,
      credits_granted: true,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p201',
        business_id: 'biz_3a2b1c0d9e8f',
        business_name: 'Vogue Studio Bombay',
        whatsapp_number: '+919920334455',
        provider_payment_id: 'pay_P7xM45qW2bX81a',
        plan_id: 'pro',
        amount_minor: 199900,
        amount_inr: 1999,
        currency: 'INR',
        credits_purchased: 150,
        status: 'paid',
        created_at: '2026-10-06T07:14:00.000Z',
        paid_at: '2026-10-06T07:15:00.000Z',
        failed_at: null,
        credits_granted: true,
        missing_credits: false,
        provider_payment_link_id: 'plink_P7xM45qW2bX81a',
        provider_order_id: 'order_P7xM45qW2bX81a',
        payment_url: 'https://rzp.io/i/growx_vogue_150cr',
        refund_review_required: 0,
        metadata: '{"plan_id":"pro","method":"netbanking_hdfc"}'
      },
      credits_granted: true,
      missing_credits: false,
      credit_ledger_entry: {
        id: 'cld_3a2b_01',
        amount: 150,
        type: 'purchase',
        reference_id: 'pay_01j9p201',
        created_at: '2026-10-06T07:15:00.000Z'
      },
      provider_events: [
        {
          provider_event_id: 'evt_P7xM_01',
          event_type: 'payment.captured',
          result: '200_OK',
          created_at: '2026-10-06T07:15:00.000Z'
        }
      ],
      refunds: []
    }
  },
  {
    summary: {
      id: 'pay_01j9p202',
      business_id: 'biz_7d6c5b4a3f2e',
      business_name: 'Royal Jewellers Jaipur',
      whatsapp_number: '+919811987654',
      provider_payment_id: 'pay_P6yN32rE9cT72b',
      plan_id: 'pro',
      amount_minor: 199900,
      amount_inr: 1999,
      currency: 'INR',
      credits_purchased: 150,
      status: 'paid',
      created_at: '2026-10-06T04:58:00.000Z',
      paid_at: '2026-10-06T05:00:00.000Z',
      failed_at: null,
      credits_granted: true,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p202',
        business_id: 'biz_7d6c5b4a3f2e',
        business_name: 'Royal Jewellers Jaipur',
        whatsapp_number: '+919811987654',
        provider_payment_id: 'pay_P6yN32rE9cT72b',
        plan_id: 'pro',
        amount_minor: 199900,
        amount_inr: 1999,
        currency: 'INR',
        credits_purchased: 150,
        status: 'paid',
        created_at: '2026-10-06T04:58:00.000Z',
        paid_at: '2026-10-06T05:00:00.000Z',
        failed_at: null,
        credits_granted: true,
        missing_credits: false,
        provider_payment_link_id: 'plink_P6yN32rE9cT72b',
        provider_order_id: 'order_P6yN32rE9cT72b',
        payment_url: 'https://rzp.io/i/growx_royal_150cr',
        refund_review_required: 0,
        metadata: '{"plan_id":"pro","method":"card_corporate"}'
      },
      credits_granted: true,
      missing_credits: false,
      credit_ledger_entry: {
        id: 'cld_7d6c_01',
        amount: 150,
        type: 'purchase',
        reference_id: 'pay_01j9p202',
        created_at: '2026-10-06T05:00:00.000Z'
      },
      provider_events: [
        {
          provider_event_id: 'evt_P6yN_01',
          event_type: 'payment.captured',
          result: '200_OK',
          created_at: '2026-10-06T05:00:00.000Z'
        }
      ],
      refunds: []
    }
  },
  {
    summary: {
      id: 'pay_01j9p203',
      business_id: 'biz_9a8b1c2d3e4f',
      business_name: 'Saree Sansar Silk Mills',
      whatsapp_number: '+919820123456',
      provider_payment_id: 'pay_P5zO21sD8dY63c',
      plan_id: 'growth',
      amount_minor: 79900,
      amount_inr: 799,
      currency: 'INR',
      credits_purchased: 50,
      status: 'paid',
      created_at: '2026-10-06T01:58:00.000Z',
      paid_at: '2026-10-06T02:00:00.000Z',
      failed_at: null,
      credits_granted: true,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p203',
        business_id: 'biz_9a8b1c2d3e4f',
        business_name: 'Saree Sansar Silk Mills',
        whatsapp_number: '+919820123456',
        provider_payment_id: 'pay_P5zO21sD8dY63c',
        plan_id: 'growth',
        amount_minor: 79900,
        amount_inr: 799,
        currency: 'INR',
        credits_purchased: 50,
        status: 'paid',
        created_at: '2026-10-06T01:58:00.000Z',
        paid_at: '2026-10-06T02:00:00.000Z',
        failed_at: null,
        credits_granted: true,
        missing_credits: false,
        provider_payment_link_id: 'plink_P5zO21sD8dY63c',
        provider_order_id: 'order_P5zO21sD8dY63c',
        payment_url: 'https://rzp.io/i/growx_saree_50cr',
        refund_review_required: 0,
        metadata: '{"plan_id":"growth","method":"upi_gpay"}'
      },
      credits_granted: true,
      missing_credits: false,
      credit_ledger_entry: {
        id: 'cld_01j9a8b_02',
        amount: 50,
        type: 'purchase',
        reference_id: 'pay_01j9p203',
        created_at: '2026-10-06T02:00:00.000Z'
      },
      provider_events: [
        {
          provider_event_id: 'evt_P5zO_01',
          event_type: 'payment.captured',
          result: '200_OK',
          created_at: '2026-10-06T02:00:00.000Z'
        }
      ],
      refunds: []
    }
  },
  {
    summary: {
      id: 'pay_01j9p204',
      business_id: 'biz_1f2e3d4c5b6a',
      business_name: 'Malabar Organic Spices',
      whatsapp_number: '+919447112233',
      provider_payment_id: null,
      plan_id: 'starter',
      amount_minor: 29900,
      amount_inr: 299,
      currency: 'INR',
      credits_purchased: 15,
      status: 'pending',
      created_at: '2026-10-06T09:40:00.000Z',
      paid_at: null,
      failed_at: null,
      credits_granted: false,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p204',
        business_id: 'biz_1f2e3d4c5b6a',
        business_name: 'Malabar Organic Spices',
        whatsapp_number: '+919447112233',
        provider_payment_id: null,
        plan_id: 'starter',
        amount_minor: 29900,
        amount_inr: 299,
        currency: 'INR',
        credits_purchased: 15,
        status: 'pending',
        created_at: '2026-10-06T09:40:00.000Z',
        paid_at: null,
        failed_at: null,
        credits_granted: false,
        missing_credits: false,
        provider_payment_link_id: 'plink_P4xPending11',
        provider_order_id: 'order_P4xPending11',
        payment_url: 'https://rzp.io/i/growx_spices_15cr',
        refund_review_required: 0,
        metadata: '{"plan_id":"starter"}'
      },
      credits_granted: false,
      missing_credits: false,
      credit_ledger_entry: null,
      provider_events: [],
      refunds: []
    }
  },
  {
    summary: {
      id: 'pay_01j9p205',
      business_id: 'biz_8c7b6a5f4e3d',
      business_name: 'Deccan Handicrafts Collective',
      whatsapp_number: '+919848099887',
      provider_payment_id: 'pay_P4aB10tC7eZ54d',
      plan_id: 'growth',
      amount_minor: 79900,
      amount_inr: 799,
      currency: 'INR',
      credits_purchased: 50,
      status: 'failed',
      created_at: '2026-10-05T12:00:00.000Z',
      paid_at: null,
      failed_at: '2026-10-05T12:02:10.000Z',
      credits_granted: false,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p205',
        business_id: 'biz_8c7b6a5f4e3d',
        business_name: 'Deccan Handicrafts Collective',
        whatsapp_number: '+919848099887',
        provider_payment_id: 'pay_P4aB10tC7eZ54d',
        plan_id: 'growth',
        amount_minor: 79900,
        amount_inr: 799,
        currency: 'INR',
        credits_purchased: 50,
        status: 'failed',
        created_at: '2026-10-05T12:00:00.000Z',
        paid_at: null,
        failed_at: '2026-10-05T12:02:10.000Z',
        credits_granted: false,
        missing_credits: false,
        provider_payment_link_id: 'plink_P4aB10tC7eZ54d',
        provider_order_id: 'order_P4aB10tC7eZ54d',
        payment_url: 'https://rzp.io/i/growx_deccan_50cr',
        refund_review_required: 0,
        metadata: '{"failure_code":"BAD_REQUEST_ERROR","failure_reason":"Transaction declined by issuing bank"}'
      },
      credits_granted: false,
      missing_credits: false,
      credit_ledger_entry: null,
      provider_events: [
        {
          provider_event_id: 'evt_P4aB_01',
          event_type: 'payment.failed',
          result: 'DECLINED_INSUFFICIENT_FUNDS',
          created_at: '2026-10-05T12:02:10.000Z'
        }
      ],
      refunds: []
    }
  },
  {
    summary: {
      id: 'pay_01j9p206',
      business_id: 'biz_9a8b1c2d3e4f',
      business_name: 'Saree Sansar Silk Mills',
      whatsapp_number: '+919820123456',
      provider_payment_id: 'pay_P3bC09uB6fA45e',
      plan_id: 'starter',
      amount_minor: 29900,
      amount_inr: 299,
      currency: 'INR',
      credits_purchased: 15,
      status: 'refunded',
      created_at: '2026-10-03T11:20:00.000Z',
      paid_at: '2026-10-03T11:22:00.000Z',
      failed_at: null,
      credits_granted: true,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p206',
        business_id: 'biz_9a8b1c2d3e4f',
        business_name: 'Saree Sansar Silk Mills',
        whatsapp_number: '+919820123456',
        provider_payment_id: 'pay_P3bC09uB6fA45e',
        plan_id: 'starter',
        amount_minor: 29900,
        amount_inr: 299,
        currency: 'INR',
        credits_purchased: 15,
        status: 'refunded',
        created_at: '2026-10-03T11:20:00.000Z',
        paid_at: '2026-10-03T11:22:00.000Z',
        failed_at: null,
        credits_granted: true,
        missing_credits: false,
        provider_payment_link_id: 'plink_P3bC09uB6fA45e',
        provider_order_id: 'order_P3bC09uB6fA45e',
        payment_url: 'https://rzp.io/i/growx_saree_15cr',
        refund_review_required: 0,
        metadata: '{"refund_reason":"accidental_double_purchase"}'
      },
      credits_granted: true,
      missing_credits: false,
      credit_ledger_entry: {
        id: 'cld_01j9a8b_ref',
        amount: -15,
        type: 'refund_reversal',
        reference_id: 'pay_01j9p206',
        created_at: '2026-10-03T14:00:00.000Z'
      },
      provider_events: [
        {
          provider_event_id: 'evt_P3bC_01',
          event_type: 'payment.captured',
          result: '200_OK',
          created_at: '2026-10-03T11:22:00.000Z'
        },
        {
          provider_event_id: 'evt_P3bC_02',
          event_type: 'refund.processed',
          result: '200_OK',
          created_at: '2026-10-03T14:00:00.000Z'
        }
      ],
      refunds: [
        {
          provider_refund_id: 'rfnd_P3bC09_full',
          amount_minor: 29900,
          currency: 'INR',
          status: 'processed',
          created_at: '2026-10-03T14:00:00.000Z'
        }
      ]
    }
  },
  {
    summary: {
      id: 'pay_01j9p207',
      business_id: 'biz_7d6c5b4a3f2e',
      business_name: 'Royal Jewellers Jaipur',
      whatsapp_number: '+919811987654',
      provider_payment_id: 'pay_P2cD98vA5gB36f',
      plan_id: 'growth',
      amount_minor: 79900,
      amount_inr: 799,
      currency: 'INR',
      credits_purchased: 50,
      status: 'paid',
      created_at: '2026-10-02T16:00:00.000Z',
      paid_at: '2026-10-02T16:02:00.000Z',
      failed_at: null,
      credits_granted: true,
      missing_credits: false
    },
    detail: {
      payment: {
        id: 'pay_01j9p207',
        business_id: 'biz_7d6c5b4a3f2e',
        business_name: 'Royal Jewellers Jaipur',
        whatsapp_number: '+919811987654',
        provider_payment_id: 'pay_P2cD98vA5gB36f',
        plan_id: 'growth',
        amount_minor: 79900,
        amount_inr: 799,
        currency: 'INR',
        credits_purchased: 50,
        status: 'paid',
        created_at: '2026-10-02T16:00:00.000Z',
        paid_at: '2026-10-02T16:02:00.000Z',
        failed_at: null,
        credits_granted: true,
        missing_credits: false,
        provider_payment_link_id: 'plink_P2cD98vA5gB36f',
        provider_order_id: 'order_P2cD98vA5gB36f',
        payment_url: 'https://rzp.io/i/growx_royal_50cr',
        refund_review_required: 0,
        metadata: '{"plan_id":"growth"}'
      },
      credits_granted: true,
      missing_credits: false,
      credit_ledger_entry: {
        id: 'cld_7d6c_03',
        amount: 50,
        type: 'purchase',
        reference_id: 'pay_01j9p207',
        created_at: '2026-10-02T16:02:00.000Z'
      },
      provider_events: [
        {
          provider_event_id: 'evt_P2cD_01',
          event_type: 'payment.captured',
          result: '200_OK',
          created_at: '2026-10-02T16:02:00.000Z'
        }
      ],
      refunds: []
    }
  }
];

// ==========================================
// CREDIT LEDGER ENTRIES
// ==========================================
export const mockCreditsStore: CreditLedgerEntry[] = [
  {
    id: 'cld_01j9a8b_01',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    amount: -1,
    type: 'generation',
    image_job_id: 'job_01j9a8b1c201',
    reference_id: null,
    operator: null,
    reason: 'Kanjivaram silk saree product generation',
    created_at: '2026-10-06T10:15:00.000Z'
  },
  {
    id: 'cld_3a2b_01',
    business_id: 'biz_3a2b1c0d9e8f',
    business_name: 'Vogue Studio Bombay',
    whatsapp_number: '+919920334455',
    amount: 150,
    type: 'purchase',
    image_job_id: null,
    reference_id: 'pay_01j9p201',
    operator: null,
    reason: 'Professional Pack recharge',
    created_at: '2026-10-06T07:15:00.000Z'
  },
  {
    id: 'cld_7d6c_01',
    business_id: 'biz_7d6c5b4a3f2e',
    business_name: 'Royal Jewellers Jaipur',
    whatsapp_number: '+919811987654',
    amount: 150,
    type: 'purchase',
    image_job_id: null,
    reference_id: 'pay_01j9p202',
    operator: null,
    reason: 'Professional Pack purchase',
    created_at: '2026-10-06T05:00:00.000Z'
  },
  {
    id: 'cld_1f2e_refunded',
    business_id: 'biz_1f2e3d4c5b6a',
    business_name: 'Malabar Organic Spices',
    whatsapp_number: '+919447112233',
    amount: 1,
    type: 'refund_safety_block',
    image_job_id: 'job_01j9a8b1c206',
    reference_id: null,
    operator: null,
    reason: 'Auto refund on blocked output generation',
    created_at: '2026-10-06T05:00:19.000Z'
  },
  {
    id: 'cld_3a2b_job07',
    business_id: 'biz_3a2b1c0d9e8f',
    business_name: 'Vogue Studio Bombay',
    whatsapp_number: '+919920334455',
    amount: -1,
    type: 'generation',
    image_job_id: 'job_01j9a8b1c207',
    reference_id: null,
    operator: null,
    reason: 'Denim jacket editorial shot generation',
    created_at: '2026-10-06T04:20:00.000Z'
  },
  {
    id: 'cld_7d6c_02',
    business_id: 'biz_7d6c5b4a3f2e',
    business_name: 'Royal Jewellers Jaipur',
    whatsapp_number: '+919811987654',
    amount: -1,
    type: 'generation',
    image_job_id: 'job_01j9a8b1c208',
    reference_id: null,
    operator: null,
    reason: 'Kundan bridal choker jewellery generation',
    created_at: '2026-10-06T02:30:00.000Z'
  },
  {
    id: 'cld_01j9a8b_02',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    amount: 50,
    type: 'purchase',
    image_job_id: null,
    reference_id: 'pay_01j9p203',
    operator: null,
    reason: 'Growth Pack payment captured',
    created_at: '2026-10-06T02:00:00.000Z'
  },
  {
    id: 'cld_9a8b_job09',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    amount: -1,
    type: 'generation',
    image_job_id: 'job_01j9a8b1c209',
    reference_id: null,
    operator: null,
    reason: 'Banarasi chiffon product generation',
    created_at: '2026-10-05T23:10:00.000Z'
  },
  {
    id: 'cld_4e5d_refunded',
    business_id: 'biz_4e5d6c7b8a9f',
    business_name: 'Mehta Leather & Footwear',
    whatsapp_number: '+919876543210',
    amount: 1,
    type: 'refund_failure',
    image_job_id: 'job_01j9a8b1c204',
    reference_id: null,
    operator: null,
    reason: 'Auto refund on upstream model timeout',
    created_at: '2026-10-06T08:01:11.000Z'
  },
  {
    id: 'cld_1f2e_01',
    business_id: 'biz_1f2e3d4c5b6a',
    business_name: 'Malabar Organic Spices',
    whatsapp_number: '+919447112233',
    amount: 3,
    type: 'signup_bonus',
    image_job_id: null,
    reference_id: null,
    operator: null,
    reason: 'Welcome trial bonus allotment',
    created_at: '2026-10-04T08:00:00.000Z'
  },
  {
    id: 'cld_01j9a8b_ref',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    amount: -15,
    type: 'refund_reversal',
    image_job_id: null,
    reference_id: 'pay_01j9p206',
    operator: 'lead-admin@growxlabs.tech',
    reason: 'Reversed unconsumed credits upon Razorpay refund processing',
    created_at: '2026-10-03T14:00:00.000Z'
  },
  {
    id: 'cld_7d6c_03',
    business_id: 'biz_7d6c5b4a3f2e',
    business_name: 'Royal Jewellers Jaipur',
    whatsapp_number: '+919811987654',
    amount: 50,
    type: 'purchase',
    image_job_id: null,
    reference_id: 'pay_01j9p207',
    operator: null,
    reason: 'Growth Pack payment captured',
    created_at: '2026-10-02T16:02:00.000Z'
  },
  {
    id: 'cld_manual_adj_01',
    business_id: 'biz_7d6c5b4a3f2e',
    business_name: 'Royal Jewellers Jaipur',
    whatsapp_number: '+919811987654',
    amount: 5,
    type: 'manual_adjustment',
    image_job_id: null,
    reference_id: null,
    operator: 'lead-admin@growxlabs.tech',
    reason: 'Compensated for timeout during festival catalog upload rush',
    created_at: '2026-09-28T12:00:00.000Z'
  },
  {
    id: 'cld_01j9a8b_03',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    amount: 3,
    type: 'signup_bonus',
    image_job_id: null,
    reference_id: null,
    operator: null,
    reason: 'Welcome trial bonus',
    created_at: '2026-08-12T09:30:00.000Z'
  }
];

// ==========================================
// SAFETY & MODERATION
// ==========================================
export const mockSafetyEventsStore: Array<{
  id: string;
  business_id: string | null;
  business_name: string | null;
  whatsapp_number: string;
  event_type: string;
  details: string | null;
  created_at: string;
}> = [
  {
    id: 'saf_evt_01',
    business_id: 'biz_8c7b6a5f4e3d',
    business_name: 'Deccan Handicrafts Collective',
    whatsapp_number: '+919848099887',
    event_type: 'input_blocked_person_detected',
    details: 'Cloudflare DETR model identified person (face/upper_body) confidence: 0.96. Commercial policy strictly requires unpopulated product photos.',
    created_at: '2026-10-06T07:00:00.000Z'
  },
  {
    id: 'saf_evt_02',
    business_id: 'biz_1f2e3d4c5b6a',
    business_name: 'Malabar Organic Spices',
    whatsapp_number: '+919447112233',
    event_type: 'output_blocked_contact_info',
    details: 'Omni-moderation OCR scanner detected generated WhatsApp phone number overlay on packaging texture.',
    created_at: '2026-10-06T05:00:00.000Z'
  },
  {
    id: 'saf_evt_03',
    business_id: 'biz_8c7b6a5f4e3d',
    business_name: 'Deccan Handicrafts Collective',
    whatsapp_number: '+919848099887',
    event_type: 'input_blocked_person_detected',
    details: 'DETR person detector confidence: 0.92 on brass sculpture photo showing artisan holding workpiece.',
    created_at: '2026-10-05T18:30:00.000Z'
  },
  {
    id: 'saf_evt_04',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    event_type: 'input_warning_face_artifact',
    details: 'Facial detection confidence 0.32 below 0.70 threshold. Image processed with soft advisory log.',
    created_at: '2026-09-15T14:10:00.000Z'
  },
  {
    id: 'saf_evt_05',
    business_id: 'biz_8c7b6a5f4e3d',
    business_name: 'Deccan Handicrafts Collective',
    whatsapp_number: '+919848099887',
    event_type: 'input_blocked_person_detected',
    details: 'DETR person detector confidence: 0.94. Repeated violation count reached threshold 3.',
    created_at: '2026-09-10T11:20:00.000Z'
  }
];

// ==========================================
// DELETIONS
// ==========================================
export const mockDeletionsStore: DeletionRequestItem[] = [
  {
    business_id: 'biz_6e5d4c3b2a1f',
    business_name: 'Kashmir Pashmina Heritage',
    whatsapp_number: '+919797001122',
    status: 'confirmed',
    request_time: '2026-10-04T10:00:00.000Z',
    confirmation_time: '2026-10-05T14:00:00.000Z',
    completion_time: null,
    financial_records_preserved: true,
    failure_reason: null
  },
  {
    business_id: 'biz_2b3c4d5e6f7a',
    business_name: 'Aura Ayurvedic Cosmetics',
    whatsapp_number: '+919822003344',
    status: 'completed',
    request_time: '2026-09-28T09:00:00.000Z',
    confirmation_time: '2026-09-29T11:00:00.000Z',
    completion_time: '2026-10-01T18:00:00.000Z',
    financial_records_preserved: true,
    failure_reason: null
  },
  {
    business_id: 'biz_5f4e3d2c1b0a',
    business_name: 'Tribal Art Gallery',
    whatsapp_number: '+919871100223',
    status: 'requested',
    request_time: '2026-10-06T08:15:00.000Z',
    confirmation_time: null,
    completion_time: null,
    financial_records_preserved: true,
    failure_reason: null
  },
  {
    business_id: 'biz_0a9b8c7d6e5f',
    business_name: 'Coastal Spices Hub',
    whatsapp_number: '+919845011223',
    status: 'failed',
    request_time: '2026-10-05T09:00:00.000Z',
    confirmation_time: '2026-10-05T10:00:00.000Z',
    completion_time: null,
    financial_records_preserved: true,
    failure_reason: 'R2_PURGE_TIMEOUT: Bulk delete partition exceeded 60000ms deadline. Manual retry required.'
  }
];

// ==========================================
// SUPPORT NOTES / REGISTER
// ==========================================
export const mockSupportNotesStore: SupportNoteItem[] = [
  {
    id: 'sup_01',
    business_id: 'biz_4e5d6c7b8a9f',
    business_name: 'Mehta Leather & Footwear',
    whatsapp_number: '+919876543210',
    issue: 'Missing credits after UPI payment confirmation',
    note: 'Payment pay_P8xK29vL1aZ90q webhook timed out. Flagged for one-click manual reconciliation in Payment Inspector.',
    operator: 'lead-admin@growxlabs.tech',
    resolved: 0,
    created_at: '2026-10-06T09:30:00.000Z',
    updated_at: '2026-10-06T09:30:00.000Z'
  },
  {
    id: 'sup_02',
    business_id: 'biz_9a8b1c2d3e4f',
    business_name: 'Saree Sansar Silk Mills',
    whatsapp_number: '+919820123456',
    issue: 'WhatsApp image delivery receipt delayed',
    note: 'Merchant reported 120s delay on Jio cellular network. Investigated R2 presigned CDN latency; Meta webhook delivered after retry.',
    operator: 'lead-admin@growxlabs.tech',
    resolved: 1,
    created_at: '2026-10-06T06:10:00.000Z',
    updated_at: '2026-10-06T06:30:00.000Z'
  },
  {
    id: 'sup_03',
    business_id: 'biz_7d6c5b4a3f2e',
    business_name: 'Royal Jewellers Jaipur',
    whatsapp_number: '+919811987654',
    issue: 'Watermark position obscuring necklace pendant',
    note: 'Operator manually repositioned logo from bottom-right to bottom-left via brand profile editor. Merchant confirmed satisfactory layout.',
    operator: 'support-ops@growxlabs.tech',
    resolved: 1,
    created_at: '2026-10-05T16:00:00.000Z',
    updated_at: '2026-10-05T16:25:00.000Z'
  },
  {
    id: 'sup_04',
    business_id: 'biz_3a2b1c0d9e8f',
    business_name: 'Vogue Studio Bombay',
    whatsapp_number: '+919920334455',
    issue: 'GST invoice requirement for FY26 Q3',
    note: 'Merchant requested B2B tax invoice with GSTIN 27AABCS1429B1Z8. Generated invoice sent via registered email.',
    operator: 'finance-ops@growxlabs.tech',
    resolved: 1,
    created_at: '2026-10-04T14:00:00.000Z',
    updated_at: '2026-10-04T15:00:00.000Z'
  },
  {
    id: 'sup_05',
    business_id: 'biz_8c7b6a5f4e3d',
    business_name: 'Deccan Handicrafts Collective',
    whatsapp_number: '+919848099887',
    issue: 'DETR false positive on mannequin torso',
    note: 'Apparel displayed on wooden tailors mannequin triggered human body detection confidence 0.88. Manually reviewed and advised on angle.',
    operator: 'safety-lead@growxlabs.tech',
    resolved: 1,
    created_at: '2026-10-02T11:00:00.000Z',
    updated_at: '2026-10-02T11:45:00.000Z'
  },
  {
    id: 'sup_06',
    business_id: 'biz_1f2e3d4c5b6a',
    business_name: 'Malabar Organic Spices',
    whatsapp_number: '+919447112233',
    issue: 'Request for custom transparent PNG logo upload assistance',
    note: 'Merchant provided JPEG with white background. Ops converted to transparent PNG and uploaded to R2 bucket.',
    operator: 'support-ops@growxlabs.tech',
    resolved: 0,
    created_at: '2026-10-06T08:00:00.000Z',
    updated_at: '2026-10-06T08:00:00.000Z'
  }
];

// ==========================================
// SYSTEM SETTINGS
// ==========================================
export const mockSettingsStore: SettingsData = {
  configuration: {
    image_model: 'gpt-image-2.5-flare',
    image_quality: 'hd',
    free_trial_credits: 3,
    plans: {
      starter: {
        id: 'starter',
        name: 'Starter Pack',
        credits: 15,
        priceMinor: 29900
      },
      growth: {
        id: 'growth',
        name: 'Growth Pack',
        credits: 50,
        priceMinor: 79900
      },
      pro: {
        id: 'pro',
        name: 'Professional Pack',
        credits: 150,
        priceMinor: 199900
      }
    },
    retention: {
      original_image_days: '14',
      generated_image_days: '30',
      blocked_image_hours: '24',
      safety_event_days: '90'
    },
    limits: {
      max_upload_bytes: '10485760',
      max_image_width: '4096',
      max_image_height: '4096',
      max_images_per_hour: '60',
      max_commands_per_minute: '12',
      max_payment_links_per_hour: '5',
      max_brand_setup_attempts_per_hour: '10'
    },
    legal_and_support: {
      support_contact: '+91 80 4718 2900 / ops@growxlabs.tech',
      terms_url: 'https://chitra.growxlabs.tech/terms',
      privacy_url: 'https://chitra.growxlabs.tech/privacy',
      refund_policy_url: 'https://chitra.growxlabs.tech/refund-policy'
    }
  },
  secrets_status: {
    OPENAI_API_KEY: 'Configured (Active)',
    RAZORPAY_KEY_ID: 'Configured (Active)',
    RAZORPAY_KEY_SECRET: 'Configured (Active)',
    RAZORPAY_WEBHOOK_SECRET: 'Configured (Active)',
    WHATSAPP_ACCESS_TOKEN: 'Configured (Active)',
    WHATSAPP_PHONE_NUMBER_ID: 'Configured (Active)',
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: 'Configured (Active)',
    CLOUDFLARE_R2_BUCKET: 'Configured (Active - growx-chitra-media)',
    CLOUDFLARE_D1_DATABASE: 'Configured (Active - growx-chitra-db)',
    INTERNAL_ADMIN_KEY: 'Configured (Active)'
  }
};

// ==========================================
// AUDIT LOGS
// ==========================================
export const mockAuditLogsStore: AuditLogItem[] = [
  {
    id: 'aud_01j9_01',
    operator: 'lead-admin@growxlabs.tech',
    action: 'credits.adjusted',
    target_type: 'business',
    target_id: 'biz_7d6c5b4a3f2e',
    reason: 'Compensated for festival traffic timeout',
    metadata: '{"amount":5,"previous_total":95,"new_total":100}',
    created_at: '2026-09-28T12:00:00.000Z'
  },
  {
    id: 'aud_01j9_02',
    operator: 'lead-admin@growxlabs.tech',
    action: 'business.suspended',
    target_type: 'business',
    target_id: 'biz_8c7b6a5f4e3d',
    reason: 'Exceeded safety threshold for human photo uploads',
    metadata: '{"violations_count":5,"flagged_at":"2026-10-06T07:00:00.000Z"}',
    created_at: '2026-10-06T07:00:00.000Z'
  },
  {
    id: 'aud_01j9_03',
    operator: 'lead-admin@growxlabs.tech',
    action: 'branding.updated',
    target_type: 'business',
    target_id: 'biz_9a8b1c2d3e4f',
    reason: 'Adjusted brand palette hex values upon merchant confirmation',
    metadata: '{"primary_color":"#8B263E","secondary_color":"#D4AF37"}',
    created_at: '2026-08-15T10:00:00.000Z'
  },
  {
    id: 'aud_01j9_04',
    operator: 'lead-admin@growxlabs.tech',
    action: 'deletion.confirmed',
    target_type: 'business',
    target_id: 'biz_6e5d4c3b2a1f',
    reason: 'DPDP statutory right-to-erasure confirmed by owner',
    metadata: '{"financial_retained":true}',
    created_at: '2026-10-05T14:00:00.000Z'
  },
  {
    id: 'aud_01j9_05',
    operator: 'system-worker@growxlabs.tech',
    action: 'deletion.completed',
    target_type: 'business',
    target_id: 'biz_2b3c4d5e6f7a',
    reason: 'Purged R2 storage assets and anonymized phone number; preserved tax invoices',
    metadata: '{"purged_objects":65}',
    created_at: '2026-10-01T18:00:00.000Z'
  },
  {
    id: 'aud_01j9_06',
    operator: 'system-worker@growxlabs.tech',
    action: 'job.auto_refunded',
    target_type: 'job',
    target_id: 'job_01j9a8b1c204',
    reason: 'Refunded 1 credit automatically due to upstream timeout error',
    metadata: '{"amount":1,"job_id":"job_01j9a8b1c204"}',
    created_at: '2026-10-06T08:01:11.000Z'
  },
  {
    id: 'aud_01j9_07',
    operator: 'lead-admin@growxlabs.tech',
    action: 'settings.updated',
    target_type: 'configuration',
    target_id: 'retention.original_image_days',
    reason: 'Aligned retention with cloud storage optimization schedule',
    metadata: '{"old_value":"30","new_value":"14"}',
    created_at: '2026-09-20T10:00:00.000Z'
  }
];

// ==========================================
// MOCK DATA APIS & MUTATION HANDLERS
// ==========================================

export function getMockMe(): OperatorUser {
  return mockCurrentUser;
}

export function getMockOverview(window: 'today' | '7d' | '30d'): OverviewResponse {
  let metrics = {
    total_businesses: 142,
    active_businesses: 128,
    new_businesses_window: 6,
    images_processed_window: 87,
    images_processed_month: 1940,
    jobs_total: 94,
    jobs_successful: 87,
    jobs_failed: 4,
    jobs_blocked: 3,
    jobs_queued: 1,
    credits_consumed_window: 87,
    credits_purchased_window: 265,
    revenue_window_inr: 4796,
    revenue_month_inr: 84320,
    payment_failures_window: 1,
    active_queue_failures: 1,
    deletion_requests_pending: 1
  };

  if (window === '7d') {
    metrics = {
      ...metrics,
      new_businesses_window: 28,
      images_processed_window: 540,
      jobs_total: 582,
      jobs_successful: 540,
      jobs_failed: 24,
      jobs_blocked: 18,
      credits_consumed_window: 540,
      credits_purchased_window: 1450,
      revenue_window_inr: 28450,
      payment_failures_window: 4
    };
  } else if (window === '30d') {
    metrics = {
      ...metrics,
      new_businesses_window: 94,
      images_processed_window: 1940,
      jobs_total: 2085,
      jobs_successful: 1940,
      jobs_failed: 85,
      jobs_blocked: 60,
      credits_consumed_window: 1940,
      credits_purchased_window: 4200,
      revenue_window_inr: 84320,
      payment_failures_window: 12
    };
  }

  // Alerts
  const uncredited = mockPaymentsStore
    .filter((p) => p.summary.missing_credits)
    .map((p) => ({
      id: p.summary.id,
      business_id: p.summary.business_id,
      plan_id: p.summary.plan_id,
      amount_minor: p.summary.amount_minor,
      provider_payment_id: p.summary.provider_payment_id || 'UNKNOWN',
      paid_at: p.summary.paid_at || p.summary.created_at,
      whatsapp_number: p.summary.whatsapp_number
    }));

  const recentFailures = mockJobsStore
    .filter((j) => j.summary.status === 'failed')
    .slice(0, 5)
    .map((j) => ({
      id: j.summary.id,
      business_id: j.summary.business_id,
      status: j.summary.status,
      failure_reason: j.summary.failure_reason || 'Unknown failure',
      created_at: j.summary.created_at
    }));

  const pendingDeletions = mockDeletionsStore
    .filter((d) => d.status === 'requested' || d.status === 'confirmed')
    .map((d) => ({
      id: d.business_id,
      whatsapp_number: d.whatsapp_number,
      deletion_requested_at: d.request_time || new Date().toISOString(),
      deletion_confirmed_at: d.confirmation_time || new Date().toISOString()
    }));

  // Activity
  const latestJobs = mockJobsStore.slice(0, 6).map((j) => ({
    id: j.summary.id,
    business_id: j.summary.business_id,
    business_name: j.summary.business_name,
    status: j.summary.status,
    model: j.summary.model,
    failure_reason: j.summary.failure_reason,
    created_at: j.summary.created_at
  }));

  const latestPayments = mockPaymentsStore.slice(0, 5).map((p) => ({
    id: p.summary.id,
    business_id: p.summary.business_id,
    business_name: p.summary.business_name,
    plan_id: p.summary.plan_id,
    amount_minor: p.summary.amount_minor,
    status: p.summary.status,
    created_at: p.summary.created_at,
    paid_at: p.summary.paid_at
  }));

  const latestBlocked = mockSafetyEventsStore.slice(0, 4).map((s) => ({
    id: s.id,
    business_id: s.business_id || '',
    business_name: s.business_name,
    event_type: s.event_type,
    details: s.details,
    created_at: s.created_at
  }));

  const latestBusinesses = mockBusinessesStore.slice(0, 4).map((b) => ({
    id: b.summary.id,
    name: b.summary.name,
    whatsapp_number: b.summary.whatsapp_number,
    account_state: b.summary.account_state,
    created_at: b.summary.created_at
  }));

  return {
    window,
    metrics,
    alerts: {
      uncredited_payments: uncredited,
      recent_failures: recentFailures,
      pending_deletions: pendingDeletions
    },
    activity: {
      latest_jobs: latestJobs,
      latest_payments: latestPayments,
      latest_blocked_events: latestBlocked,
      latest_businesses: latestBusinesses
    }
  };
}

export function getMockBusinesses(params: {
  page?: number;
  limit?: number;
  search?: string;
  filter?: string;
}): { data: BusinessSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const search = (params.search || '').trim().toLowerCase();
  const filter = (params.filter || '').trim().toLowerCase();

  let list = mockBusinessesStore.map((b) => b.summary);

  if (search) {
    list = list.filter(
      (b) =>
        b.id.toLowerCase().includes(search) ||
        (b.name && b.name.toLowerCase().includes(search)) ||
        b.whatsapp_number.includes(search)
    );
  }

  if (filter) {
    list = list.filter((b) => b.account_state === filter);
  }

  const total = list.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

export function getMockBusinessDetail(id: string): BusinessDetail {
  const found = mockBusinessesStore.find((b) => b.summary.id === id);
  if (found) {
    return found.detail;
  }
  // Fallback realistic template
  return {
    business: {
      id,
      name: 'Merchant Account',
      whatsapp_number: '+919800000000',
      status: 'active',
      account_state: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      terms_version: 'v2.1',
      privacy_version: 'v2.0',
      legal_notice_shown_at: new Date().toISOString(),
      deletion_requested_at: null,
      deletion_confirmed_at: null,
      deleted_at: null
    },
    brand_profile: null,
    usage: {
      total_images: 0,
      completed_images: 0,
      failed_images: 0,
      blocked_images: 0,
      avg_duration_ms: null
    },
    credits: {
      free_remaining: 3,
      paid_remaining: 0,
      total_remaining: 3,
      history: []
    },
    payments: [],
    safety: {
      blocked_count: 0,
      events: []
    },
    support_notes: [],
    audit_logs: []
  };
}

export function mockAdjustCredits(businessId: string, amount: number, reason: string) {
  const found = mockBusinessesStore.find((b) => b.summary.id === businessId);
  const now = new Date().toISOString();

  if (found) {
    found.summary.paid_credits += amount;
    found.summary.total_remaining += amount;
    found.detail.credits.paid_remaining += amount;
    found.detail.credits.total_remaining += amount;

    const ledgerEntry: CreditLedgerEntry = {
      id: `cld_manual_${Date.now()}`,
      business_id: businessId,
      business_name: found.summary.name,
      whatsapp_number: found.summary.whatsapp_number,
      amount,
      type: 'manual_adjustment',
      image_job_id: null,
      reference_id: null,
      operator: mockCurrentUser.email,
      reason,
      created_at: now
    };

    found.detail.credits.history.unshift(ledgerEntry);
    mockCreditsStore.unshift(ledgerEntry);

    const auditEntry: AuditLogItem = {
      id: `aud_adj_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'credits.adjusted',
      target_type: 'business',
      target_id: businessId,
      reason,
      metadata: JSON.stringify({ amount, total_remaining: found.summary.total_remaining }),
      created_at: now
    };
    found.detail.audit_logs.unshift(auditEntry);
    mockAuditLogsStore.unshift(auditEntry);

    return {
      success: true,
      amount,
      total_remaining: found.summary.total_remaining,
      free_remaining: found.summary.free_credits,
      paid_remaining: found.summary.paid_credits
    };
  }

  return {
    success: true,
    amount,
    total_remaining: 10 + amount,
    free_remaining: 0,
    paid_remaining: 10 + amount
  };
}

export function mockSuspendBusiness(businessId: string, reason: string) {
  const found = mockBusinessesStore.find((b) => b.summary.id === businessId);
  if (found) {
    found.summary.account_state = 'suspended';
    found.summary.status = 'suspended';
    found.detail.business.account_state = 'suspended';
    found.detail.business.status = 'suspended';

    const auditEntry: AuditLogItem = {
      id: `aud_susp_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'business.suspended',
      target_type: 'business',
      target_id: businessId,
      reason,
      metadata: null,
      created_at: new Date().toISOString()
    };
    found.detail.audit_logs.unshift(auditEntry);
    mockAuditLogsStore.unshift(auditEntry);
  }
  return { success: true };
}

export function mockReactivateBusiness(businessId: string, reason?: string) {
  const found = mockBusinessesStore.find((b) => b.summary.id === businessId);
  if (found) {
    found.summary.account_state = 'active';
    found.summary.status = 'active';
    found.detail.business.account_state = 'active';
    found.detail.business.status = 'active';

    const auditEntry: AuditLogItem = {
      id: `aud_react_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'business.reactivated',
      target_type: 'business',
      target_id: businessId,
      reason: reason || 'Operator manual reactivation',
      metadata: null,
      created_at: new Date().toISOString()
    };
    found.detail.audit_logs.unshift(auditEntry);
    mockAuditLogsStore.unshift(auditEntry);
  }
  return { success: true };
}

export function mockUpdateBranding(
  businessId: string,
  updates: {
    logo_enabled?: boolean;
    background_style?: string;
    primary_color?: string;
    secondary_color?: string;
    logo_position?: string;
    business_name?: string;
  }
) {
  const found = mockBusinessesStore.find((b) => b.summary.id === businessId);
  if (found && found.detail.brand_profile) {
    if (updates.business_name !== undefined) {
      found.summary.name = updates.business_name;
      found.detail.business.name = updates.business_name;
      found.detail.brand_profile.business_name = updates.business_name;
    }
    if (updates.primary_color !== undefined) found.detail.brand_profile.primary_color = updates.primary_color;
    if (updates.secondary_color !== undefined) found.detail.brand_profile.secondary_color = updates.secondary_color;
    if (updates.background_style !== undefined) found.detail.brand_profile.background_style = updates.background_style;
    if (updates.logo_position !== undefined) found.detail.brand_profile.logo_position = updates.logo_position;
    if (updates.logo_enabled !== undefined) found.detail.brand_profile.logo_enabled = updates.logo_enabled ? 1 : 0;

    const auditEntry: AuditLogItem = {
      id: `aud_brand_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'branding.updated',
      target_type: 'business',
      target_id: businessId,
      reason: 'Brand profile manual edit',
      metadata: JSON.stringify(updates),
      created_at: new Date().toISOString()
    };
    found.detail.audit_logs.unshift(auditEntry);
    mockAuditLogsStore.unshift(auditEntry);
  }
  return { success: true };
}

export function mockRemoveLogo(businessId: string) {
  const found = mockBusinessesStore.find((b) => b.summary.id === businessId);
  if (found && found.detail.brand_profile) {
    found.detail.brand_profile.logo_r2_key = null;
    found.detail.brand_profile.logo_enabled = 0;
  }
  return { success: true };
}

export function mockDeleteBusiness(businessId: string, reason: string) {
  const found = mockBusinessesStore.find((b) => b.summary.id === businessId);
  if (found) {
    found.summary.account_state = 'deletion_pending';
    found.detail.business.account_state = 'deletion_pending';
    found.detail.business.deletion_requested_at = new Date().toISOString();

    mockDeletionsStore.unshift({
      business_id: businessId,
      business_name: found.summary.name,
      whatsapp_number: found.summary.whatsapp_number,
      status: 'requested',
      request_time: new Date().toISOString(),
      confirmation_time: null,
      completion_time: null,
      financial_records_preserved: true,
      failure_reason: null
    });

    const auditEntry: AuditLogItem = {
      id: `aud_del_req_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'deletion.requested',
      target_type: 'business',
      target_id: businessId,
      reason,
      metadata: null,
      created_at: new Date().toISOString()
    };
    found.detail.audit_logs.unshift(auditEntry);
    mockAuditLogsStore.unshift(auditEntry);
  }
  return { success: true };
}

export function getMockJobs(params: {
  page?: number;
  limit?: number;
  status?: string;
  business_id?: string;
  model?: string;
  filter?: string;
  search?: string;
}): { data: JobSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const search = (params.search || '').trim().toLowerCase();
  const status = (params.status || params.filter || '').trim().toLowerCase();
  const businessId = (params.business_id || '').trim();

  let list = mockJobsStore.map((j) => j.summary);

  if (businessId) {
    list = list.filter((j) => j.business_id === businessId);
  }

  if (status) {
    list = list.filter((j) => j.status === status);
  }

  if (search) {
    list = list.filter(
      (j) =>
        j.id.toLowerCase().includes(search) ||
        (j.business_name && j.business_name.toLowerCase().includes(search)) ||
        j.whatsapp_number.includes(search)
    );
  }

  const total = list.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

export function getMockJobDetail(id: string): JobDetail {
  const found = mockJobsStore.find((j) => j.summary.id === id);
  if (found) {
    return found.detail;
  }
  return {
    job: {
      id,
      business_id: 'biz_unknown',
      business_name: 'Unknown Business',
      whatsapp_number: '+919800000000',
      status: 'completed',
      model: 'gpt-image-2.5-flare',
      attempts: 1,
      attempt_count: 1,
      generation_duration_ms: 12000,
      failure_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      whatsapp_message_id: 'wamid.HBgMOTE5ODAwMDAwMDAwFQIA',
      original_r2_key: 'uploads/unknown/sample.jpg',
      generated_r2_key: 'generated/unknown/sample.webp',
      final_r2_key: 'final/unknown/sample.webp',
      mime_type: 'image/jpeg',
      input_bytes: 2000000,
      output_bytes: 1500000,
      final_bytes: 1510000,
      input_safety_passed: 1,
      output_safety_passed: 1,
      openai_request_id: 'req_sample_id',
      usage_data: '{"tokens":1200}',
      final_message_id: 'wamid.HBgMOTE5ODAwMDAwMDAwFQIA_OUT',
      delivery_deadline: null,
      delivered_at: new Date().toISOString(),
      retention_until: new Date().toISOString()
    },
    delivery_event: {
      status: 'delivered',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    credit_charge: {
      id: 'cld_sample',
      amount: -1,
      type: 'generation',
      created_at: new Date().toISOString()
    },
    audit_logs: []
  };
}

export function mockRetryJob(id: string, reason?: string) {
  const found = mockJobsStore.find((j) => j.summary.id === id);
  if (found) {
    found.summary.status = 'queued';
    found.summary.attempts += 1;
    found.summary.attempt_count += 1;
    found.summary.failure_reason = null;
    found.detail.job.status = 'queued';
    found.detail.job.attempts += 1;
    found.detail.job.attempt_count += 1;
    found.detail.job.failure_reason = null;

    const auditEntry = {
      id: `aud_retry_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'job.retried',
      reason: reason || 'Operator manual retry trigger',
      created_at: new Date().toISOString()
    };
    found.detail.audit_logs.unshift(auditEntry);
  }
  return { success: true, message: 'Job re-queued successfully for pipeline processing' };
}

export function mockCancelJob(id: string, reason?: string) {
  const found = mockJobsStore.find((j) => j.summary.id === id);
  if (found) {
    found.summary.status = 'failed';
    found.summary.failure_reason = reason || 'Cancelled manually by operator';
    found.detail.job.status = 'failed';
    found.detail.job.failure_reason = reason || 'Cancelled manually by operator';
  }
  return { success: true };
}

export function mockInvestigateJob(id: string, note: string) {
  const found = mockJobsStore.find((j) => j.summary.id === id);
  if (found) {
    found.detail.audit_logs.unshift({
      id: `aud_inv_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'job.investigated',
      reason: note,
      created_at: new Date().toISOString()
    });
  }
  return { success: true };
}

export function getMockPayments(params: {
  page?: number;
  limit?: number;
  status?: string;
  plan?: string;
  search?: string;
}): { data: PaymentSummary[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const search = (params.search || '').trim().toLowerCase();
  const status = (params.status || '').trim().toLowerCase();
  const plan = (params.plan || '').trim().toLowerCase();

  let list = mockPaymentsStore.map((p) => p.summary);

  if (status) {
    list = list.filter((p) => p.status === status);
  }

  if (plan) {
    list = list.filter((p) => p.plan_id === plan);
  }

  if (search) {
    list = list.filter(
      (p) =>
        p.id.toLowerCase().includes(search) ||
        (p.provider_payment_id && p.provider_payment_id.toLowerCase().includes(search)) ||
        (p.business_name && p.business_name.toLowerCase().includes(search)) ||
        p.whatsapp_number.includes(search)
    );
  }

  const total = list.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

export function getMockPaymentDetail(id: string): PaymentDetail {
  const found = mockPaymentsStore.find((p) => p.summary.id === id);
  if (found) {
    return found.detail;
  }
  return {
    payment: {
      id,
      business_id: 'biz_unknown',
      business_name: 'Unknown Business',
      whatsapp_number: '+919800000000',
      provider_payment_id: 'pay_sample',
      plan_id: 'growth',
      amount_minor: 79900,
      amount_inr: 799,
      currency: 'INR',
      credits_purchased: 50,
      status: 'paid',
      created_at: new Date().toISOString(),
      paid_at: new Date().toISOString(),
      failed_at: null,
      credits_granted: true,
      missing_credits: false,
      provider_payment_link_id: null,
      provider_order_id: null,
      payment_url: null,
      refund_review_required: 0,
      metadata: null
    },
    credits_granted: true,
    missing_credits: false,
    credit_ledger_entry: null,
    provider_events: [],
    refunds: []
  };
}

export function mockReconcilePayment(id: string, reason?: string) {
  const found = mockPaymentsStore.find((p) => p.summary.id === id);
  if (found) {
    found.summary.missing_credits = false;
    found.summary.credits_granted = true;
    found.detail.missing_credits = false;
    found.detail.credits_granted = true;

    const creditsToAdd = found.summary.credits_purchased || 50;

    // Credit the merchant
    const biz = mockBusinessesStore.find((b) => b.summary.id === found.summary.business_id);
    if (biz) {
      biz.summary.paid_credits += creditsToAdd;
      biz.summary.total_remaining += creditsToAdd;
      biz.detail.credits.paid_remaining += creditsToAdd;
      biz.detail.credits.total_remaining += creditsToAdd;
    }

    const ledgerEntry: CreditLedgerEntry = {
      id: `cld_reconciled_${Date.now()}`,
      business_id: found.summary.business_id,
      business_name: found.summary.business_name,
      whatsapp_number: found.summary.whatsapp_number,
      amount: creditsToAdd,
      type: 'purchase_reconciled',
      image_job_id: null,
      reference_id: found.summary.id,
      operator: mockCurrentUser.email,
      reason: reason || 'Manual operator credit reconciliation',
      created_at: new Date().toISOString()
    };

    mockCreditsStore.unshift(ledgerEntry);
    found.detail.credit_ledger_entry = {
      id: ledgerEntry.id,
      amount: ledgerEntry.amount,
      type: ledgerEntry.type,
      reference_id: found.summary.id,
      created_at: ledgerEntry.created_at
    };

    const auditEntry: AuditLogItem = {
      id: `aud_recon_${Date.now()}`,
      operator: mockCurrentUser.email,
      action: 'payment.reconciled',
      target_type: 'payment',
      target_id: id,
      reason: reason || 'Manual credit grant after webhook failure verified',
      metadata: JSON.stringify({ credits_granted: creditsToAdd }),
      created_at: new Date().toISOString()
    };
    mockAuditLogsStore.unshift(auditEntry);

    // Also mark any open support note for this as resolved
    const note = mockSupportNotesStore.find(
      (n) => n.business_id === found.summary.business_id && n.issue.includes('Missing credits')
    );
    if (note) {
      note.resolved = 1;
      note.updated_at = new Date().toISOString();
    }

    return {
      success: true,
      message: `Successfully granted ${creditsToAdd} credits to ${found.summary.business_name || 'business'}`,
      credits_granted: creditsToAdd
    };
  }
  return { success: true, message: 'Reconciled successfully', credits_granted: 50 };
}

export function mockInvestigatePayment(id: string, note: string) {
  mockAuditLogsStore.unshift({
    id: `aud_pinv_${Date.now()}`,
    operator: mockCurrentUser.email,
    action: 'payment.investigated',
    target_type: 'payment',
    target_id: id,
    reason: note,
    metadata: null,
    created_at: new Date().toISOString()
  });
  return { success: true };
}

export function getMockCredits(params: {
  page?: number;
  limit?: number;
  type?: string;
  business_id?: string;
}): { data: CreditLedgerEntry[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const type = (params.type || '').trim().toLowerCase();
  const businessId = (params.business_id || '').trim();

  let list = [...mockCreditsStore];

  if (businessId) {
    list = list.filter((c) => c.business_id === businessId);
  }

  if (type) {
    list = list.filter((c) => c.type === type);
  }

  const total = list.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

export function getMockSafety(page = 1, limit = 25): SafetyOverview {
  const total = mockSafetyEventsStore.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const events = mockSafetyEventsStore.slice(start, start + limit);

  return {
    metrics: {
      total_blocked_inputs: 14,
      total_blocked_outputs: 4,
      person_detected_events: 11,
      sexual_explicit_events: 2,
      repeated_abuse_accounts: 1,
      suspended_accounts: 1
    },
    events,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

export function mockAddSafetyNote(business_id: string, note: string) {
  const biz = mockBusinessesStore.find((b) => b.summary.id === business_id);
  const event = {
    id: `saf_note_${Date.now()}`,
    business_id,
    business_name: biz ? biz.summary.name : 'Merchant',
    whatsapp_number: biz ? biz.summary.whatsapp_number : '+919800000000',
    event_type: 'operator_safety_note',
    details: note,
    created_at: new Date().toISOString()
  };
  mockSafetyEventsStore.unshift(event);
  return { success: true };
}

export function getMockDeletions(): { data: DeletionRequestItem[] } {
  return {
    data: [...mockDeletionsStore]
  };
}

export function mockRetryDeletion(businessId: string) {
  const found = mockDeletionsStore.find((d) => d.business_id === businessId);
  if (found) {
    found.status = 'completed';
    found.completion_time = new Date().toISOString();
    found.failure_reason = null;
  }
  return { success: true, message: 'Deletion workflow completed successfully' };
}

export function mockReviewDeletion(businessId: string, note?: string) {
  mockAuditLogsStore.unshift({
    id: `aud_del_rev_${Date.now()}`,
    operator: mockCurrentUser.email,
    action: 'deletion.reviewed',
    target_type: 'deletion',
    target_id: businessId,
    reason: note || 'Reviewed DPDP statutory erasure requirements',
    metadata: null,
    created_at: new Date().toISOString()
  });
  return { success: true };
}

export function getMockSupportNotes(params: {
  page?: number;
  limit?: number;
  business_id?: string;
  resolved?: string;
}): { data: SupportNoteItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const businessId = (params.business_id || '').trim();
  const resolved = params.resolved;

  let list = [...mockSupportNotesStore];

  if (businessId) {
    list = list.filter((s) => s.business_id === businessId);
  }

  if (resolved !== undefined && resolved !== '') {
    const isResolved = resolved === '1' || resolved === 'true' ? 1 : 0;
    list = list.filter((s) => s.resolved === isResolved);
  }

  const total = list.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = list.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}

export function mockAddSupportNote(business_id: string, issue: string, note: string) {
  const biz = mockBusinessesStore.find((b) => b.summary.id === business_id);
  const newNote: SupportNoteItem = {
    id: `sup_${Date.now()}`,
    business_id,
    business_name: biz ? biz.summary.name : 'Merchant',
    whatsapp_number: biz ? biz.summary.whatsapp_number : '+919800000000',
    issue,
    note,
    operator: mockCurrentUser.email,
    resolved: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  mockSupportNotesStore.unshift(newNote);
  return { success: true, id: newNote.id };
}

export function mockUpdateSupportNote(id: string, resolved: boolean) {
  const found = mockSupportNotesStore.find((s) => s.id === id);
  if (found) {
    found.resolved = resolved ? 1 : 0;
    found.updated_at = new Date().toISOString();
  }
  return { success: true };
}

export function getMockSettings(): SettingsData {
  return mockSettingsStore;
}

export function getMockAuditLogs(
  page = 1,
  limit = 25
): { data: AuditLogItem[]; pagination: { page: number; limit: number; total: number; total_pages: number } } {
  const total = mockAuditLogsStore.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const data = mockAuditLogsStore.slice(start, start + limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages
    }
  };
}
