import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertV4MiniflareOptions, Miniflare } from 'miniflare';
import { app } from '../src/index';
import { ensureBusiness } from '../src/store';
import { confirmDeletion } from '../src/store';
import type { Env, PrivateStorage, StoredObject } from '../src/types';

let mf: Miniflare;
let env: Env;

class MemoryStorage implements PrivateStorage {
  readonly objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
  async put(key: string, body: ArrayBuffer | Uint8Array, contentType = 'application/octet-stream') {
    this.objects.set(key, { bytes: new Uint8Array(body instanceof Uint8Array ? body : new Uint8Array(body)), contentType });
  }
  async get(key: string): Promise<StoredObject | null> {
    const stored = this.objects.get(key);
    if (!stored) return null;
    const bytes = stored.bytes.slice();
    return { size: bytes.byteLength, arrayBuffer: async () => bytes.buffer };
  }
  async delete(keys: string | string[]) {
    for (const key of Array.isArray(keys) ? keys : [keys]) this.objects.delete(key);
  }
  async list(prefix: string) {
    return [...this.objects.keys()].filter(key => key.startsWith(prefix));
  }
}

beforeAll(async () => {
  mf = new Miniflare(convertV4MiniflareOptions({
    modules: true,
    script: 'export default { fetch() { return new Response("test"); } }',
    compatibilityDate: '2026-10-01',
    d1Databases: { DB: 'test-db' }
  }));
  const db = await mf.getD1Database('DB');
  for (const file of [
    '0001_foundation.sql',
    '0002_processing.sql',
    '0003_final_delivery_metrics.sql',
    '0004_payments.sql',
    '0005_scope4.sql',
    '0006_brand_logo_prompt.sql',
    '0007_scope5_ops_console.sql'
  ]) {
    const sql = readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8');
    const statements = sql
      .split(/;(?=\s*(?:PRAGMA|CREATE|INSERT|DROP|ALTER)\b)/i)
      .map(s => s.trim())
      .filter(s => /\b(?:PRAGMA|CREATE|INSERT|DROP|ALTER)\b/i.test(s));
    await db.batch(statements.map(statement => db.prepare(statement)));
  }

  env = {
    DB: db as unknown as D1Database,
    SUPABASE_URL: 'https://storage.example.test',
    SUPABASE_SERVICE_ROLE_KEY: 'secret-service-role-super-confidential',
    SUPABASE_STORAGE_BUCKET: 'chitra-private',
    STORAGE: new MemoryStorage(),
    CHITRA_JOBS: { send: vi.fn(async () => {}) } as unknown as Env['CHITRA_JOBS'],
    AI: { run: vi.fn(async () => []) } as unknown as Ai,
    IMAGES: {} as ImagesBinding,
    WHATSAPP_VERIFY_TOKEN: 'secret-verify-token',
    WHATSAPP_ACCESS_TOKEN: 'secret-whatsapp-access-token',
    WHATSAPP_APP_SECRET: 'secret-whatsapp-app-secret',
    WHATSAPP_PHONE_NUMBER_ID: '123',
    WHATSAPP_API_VERSION: 'v23.0',
    OPENAI_API_KEY: 'secret-openai-api-key',
    OPENAI_IMAGE_MODEL: 'gpt-image-2.5-flare',
    OPENAI_IMAGE_QUALITY: 'low',
    PERSON_DETECTION_THRESHOLD: '0.5',
    MAX_GENERATION_ATTEMPTS: '2',
    WORKING_IMAGE_MAX_DIMENSION: '1024',
    IMAGE_RETENTION_DAYS: '7',
    ORIGINAL_IMAGE_RETENTION_DAYS: '30',
    GENERATED_IMAGE_RETENTION_DAYS: '30',
    BLOCKED_IMAGE_RETENTION_HOURS: '24',
    MAX_UPLOAD_BYTES: '5242880',
    MAX_IMAGE_WIDTH: '8000',
    MAX_IMAGE_HEIGHT: '8000',
    MAX_IMAGES_PER_HOUR: '12',
    MAX_COMMANDS_PER_MINUTE: '20',
    MAX_PAYMENT_LINKS_PER_HOUR: '3',
    MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR: '10',
    BUSINESS_IDENTITY_SECRET: 'secret-business-identity',
    TERMS_VERSION: 'v1',
    PRIVACY_VERSION: 'v1',
    SUPPORT_CONTACT: 'help@example.com',
    DELIVERY_TIMEOUT_HOURS: '24',
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'secret-razorpay-key',
    RAZORPAY_WEBHOOK_SECRET: 'secret-razorpay-webhook',
    RAZORPAY_MODE: 'test',
    TERMS_URL: 'https://chitra.growxlabs.tech/terms',
    PRIVACY_URL: 'https://chitra.growxlabs.tech/privacy',
    REFUND_POLICY_URL: 'https://chitra.growxlabs.tech/refund',
    PAYMENT_SUPPORT_CONTACT: 'help@growxlabs.tech'
  };
}, 30_000);

beforeEach(async () => {
  vi.unstubAllGlobals();
  env.STORAGE = new MemoryStorage();
  await env.DB.batch([
    'internal_audit_logs',
    'support_notes',
    'payment_refunds',
    'payment_provider_events',
    'payments',
    'whatsapp_delivery_events',
    'brand_asset_jobs',
    'rate_limit_events',
    'deleted_identity_markers',
    'credit_reservations',
    'abuse_events',
    'credit_ledger',
    'image_jobs',
    'brand_profiles',
    'credits',
    'businesses'
  ].map(t => env.DB.prepare(`DELETE FROM ${t}`)));
  vi.clearAllMocks();
  vi.mocked(env.CHITRA_JOBS.send).mockResolvedValue(undefined);
});

describe('Scope 5 Operations Console API & Security', () => {
  // Helper for internal requests
  async function internalReq(path: string, options: { method?: string; email?: string | null; body?: unknown } = {}) {
    const headers: Record<string, string> = {
      'content-type': 'application/json'
    };
    if (options.email !== null) {
      headers['cf-access-authenticated-user-email'] = options.email ?? 'ops@growxlabs.tech';
    }

    return app.request(`/internal${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    }, env);
  }

  it('rejects unauthenticated internal requests with 401 UNAUTHORIZED', async () => {
    const res = await internalReq('/overview', { email: null });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('rejects unauthorized role for restricted operations with 403 FORBIDDEN', async () => {
    const bId = await ensureBusiness(env, '919876543210');

    // viewer tries to manually adjust credits (requires operator or admin)
    const res = await internalReq(`/businesses/${bId}/credits`, {
      method: 'POST',
      email: 'viewer@growxlabs.tech',
      body: { amount: 10, reason: 'Test adjustment' }
    });
    expect(res.status).toBe(403);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('FORBIDDEN');

    // operator tries to suspend account (requires admin)
    const suspendRes = await internalReq(`/businesses/${bId}/suspend`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { reason: 'Violation' }
    });
    expect(suspendRes.status).toBe(403);
  });

  it('loads businesses list and individual business detail with metrics', async () => {
    const bId = await ensureBusiness(env, '919876543210');
    await env.DB.prepare("UPDATE businesses SET name = 'ABC Traders' WHERE id = ?").bind(bId).run();

    const listRes = await internalReq('/businesses');
    expect(listRes.status).toBe(200);
    const listBody = await listRes.json() as { data: Array<{ id: string; name: string }>; pagination: { total: number } };
    expect(listBody.data.length).toBe(1);
    expect(listBody.data[0].name).toBe('ABC Traders');
    expect(listBody.pagination.total).toBe(1);

    const detailRes = await internalReq(`/businesses/${bId}`);
    expect(detailRes.status).toBe(200);
    const detailBody = await detailRes.json() as { business: { id: string; name: string }; credits: { free_remaining: number } };
    expect(detailBody.business.name).toBe('ABC Traders');
    expect(detailBody.credits.free_remaining).toBe(5);
  });

  it('writes manual credit adjustment to credit_ledger and updates balance atomically with reason and operator', async () => {
    const bId = await ensureBusiness(env, '919876543210');

    const res = await internalReq(`/businesses/${bId}/credits`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { amount: 25, reason: 'Customer support compensation' }
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { success: boolean; paid_remaining: number; total_remaining: number };
    expect(body.success).toBe(true);
    expect(body.paid_remaining).toBe(25);
    expect(body.total_remaining).toBe(30); // 5 free + 25 paid

    // Verify credit_ledger entry
    const ledger = await env.DB.prepare("SELECT * FROM credit_ledger WHERE business_id = ? AND type = 'manual_adjustment'")
      .bind(bId).first<{ amount: number; operator: string; reason: string }>();
    expect(ledger?.amount).toBe(25);
    expect(ledger?.operator).toBe('ops@growxlabs.tech');
    expect(ledger?.reason).toBe('Customer support compensation');

    // Verify audit log entry was created
    const audit = await env.DB.prepare("SELECT * FROM internal_audit_logs WHERE action = 'manual_credit_adjustment' AND target_id = ?")
      .bind(bId).first<{ operator: string; action: string }>();
    expect(audit?.operator).toBe('ops@growxlabs.tech');
  });

  it('rejects credit adjustment with missing reason or invalid zero amount', async () => {
    const bId = await ensureBusiness(env, '919876543210');

    const resNoReason = await internalReq(`/businesses/${bId}/credits`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { amount: 10, reason: '' }
    });
    expect(resNoReason.status).toBe(400);

    const resZero = await internalReq(`/businesses/${bId}/credits`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { amount: 0, reason: 'None' }
    });
    expect(resZero.status).toBe(400);
  });

  it('allows deducting credits but prevents deducting more than available credits', async () => {
    const bId = await ensureBusiness(env, '919876543210'); // starts with 5 free credits

    // Try to deduct 10 credits when only 5 exist
    const resOver = await internalReq(`/businesses/${bId}/credits`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { amount: -10, reason: 'Deduct too much' }
    });
    expect(resOver.status).toBe(400);
    const overBody = await resOver.json() as { error: string };
    expect(overBody.error).toBe('INSUFFICIENT_CREDITS');

    // Deduct 2 credits
    const resOk = await internalReq(`/businesses/${bId}/credits`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { amount: -2, reason: 'Deduct 2' }
    });
    expect(resOk.status).toBe(200);
    const okBody = await resOk.json() as { free_remaining: number; total_remaining: number };
    expect(okBody.total_remaining).toBe(3);
  });

  it('updates failed job safely on retry but ABSOLUTELY blocks retrying prohibited/unsafe jobs', async () => {
    const bId = await ensureBusiness(env, '919876543210');
    const failedJobId = 'job_failed_1';
    const blockedJobId = 'job_blocked_1';
    const now = new Date().toISOString();

    // Create a failed job
    await env.DB.prepare(`
      INSERT INTO image_jobs (id, business_id, whatsapp_message_id, original_r2_key, status, failure_reason, media_id, mime_type, message_timestamp, media_sha256, created_at, updated_at)
      VALUES (?, ?, 'wamid.fail1', 'orig/1', 'failed', 'openai_api_timeout', 'm1', 'image/jpeg', '17000', 'h1', ?, ?)
    `).bind(failedJobId, bId, now, now).run();

    // Create a blocked prohibited-content job
    await env.DB.prepare(`
      INSERT INTO image_jobs (id, business_id, whatsapp_message_id, original_r2_key, status, failure_reason, media_id, mime_type, message_timestamp, media_sha256, created_at, updated_at)
      VALUES (?, ?, 'wamid.block1', 'orig/2', 'blocked_input', 'person_detected', 'm2', 'image/jpeg', '17000', 'h2', ?, ?)
    `).bind(blockedJobId, bId, now, now).run();

    // Attempt to retry the BLOCKED job -> MUST BE REJECTED
    const blockedRetry = await internalReq(`/jobs/${blockedJobId}/retry`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { reason: 'Try overriding safety' }
    });
    expect(blockedRetry.status).toBe(400);
    const blockedBody = await blockedRetry.json() as { error: string };
    expect(blockedBody.error).toBe('SAFETY_VIOLATION');

    // Verify blocked job was NOT touched
    const blockedCheck = await env.DB.prepare('SELECT status FROM image_jobs WHERE id = ?').bind(blockedJobId).first<{ status: string }>();
    expect(blockedCheck?.status).toBe('blocked_input');

    // Retry the FAILED job -> ALLOWED
    const failedRetry = await internalReq(`/jobs/${failedJobId}/retry`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { reason: 'Network glitch cleared' }
    });
    expect(failedRetry.status).toBe(200);

    // Verify failed job was re-queued and re-enqueued
    const failedCheck = await env.DB.prepare('SELECT status, failure_reason FROM image_jobs WHERE id = ?').bind(failedJobId).first<{ status: string; failure_reason: string | null }>();
    expect(failedCheck?.status).toBe('queued');
    expect(failedCheck?.failure_reason).toBeNull();
    expect(env.CHITRA_JOBS.send).toHaveBeenCalled();
  });

  it('reconciles payment credits idempotently without double-granting credits', async () => {
    const bId = await ensureBusiness(env, '919876543210');
    const paymentId = 'pay_internal_1';
    const razorpayPayId = 'pay_rzp_12345';
    const now = new Date().toISOString();

    // Create a paid payment where webhook credit grant was missed
    await env.DB.prepare(`
      INSERT INTO payments (id, business_id, provider, provider_payment_link_id, provider_payment_id, plan_id, amount_minor, currency, credits_purchased, status, paid_at, created_at)
      VALUES (?, ?, 'razorpay', 'plink_1', ?, 'starter', 99900, 'INR', 50, 'paid', ?, ?)
    `).bind(paymentId, bId, razorpayPayId, now, now).run();

    // First reconciliation: should grant 50 credits
    const rec1 = await internalReq(`/payments/${paymentId}/reconcile`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { reason: 'Missing webhook grant' }
    });
    expect(rec1.status).toBe(200);
    const rec1Body = await rec1.json() as { success: boolean; credits_granted: number };
    expect(rec1Body.success).toBe(true);
    expect(rec1Body.credits_granted).toBe(50);

    // Verify credits in D1
    const creditRow = await env.DB.prepare('SELECT paid_remaining FROM credits WHERE business_id = ?').bind(bId).first<{ paid_remaining: number }>();
    expect(creditRow?.paid_remaining).toBe(50);

    // Second reconciliation attempt: MUST be idempotent and not double-grant credits
    const rec2 = await internalReq(`/payments/${paymentId}/reconcile`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { reason: 'Duplicate retry' }
    });
    expect(rec2.status).toBe(200);
    const rec2Body = await rec2.json() as { already_granted: boolean };
    expect(rec2Body.already_granted).toBe(true);

    // Verify credits were NOT added a second time
    const creditRow2 = await env.DB.prepare('SELECT paid_remaining FROM credits WHERE business_id = ?').bind(bId).first<{ paid_remaining: number }>();
    expect(creditRow2?.paid_remaining).toBe(50);
  });

  it('refuses to reconcile payments that are not in verified paid status', async () => {
    const bId = await ensureBusiness(env, '919876543210');
    const paymentId = 'pay_pending_1';
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO payments (id, business_id, provider, plan_id, amount_minor, currency, credits_purchased, status, created_at)
      VALUES (?, ?, 'razorpay', 'starter', 99900, 'INR', 50, 'pending', ?)
    `).bind(paymentId, bId, now).run();

    const res = await internalReq(`/payments/${paymentId}/reconcile`, {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: { reason: 'Force credit' }
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('CANNOT_RECONCILE');
  });

  it('supports account suspension and reactivation with audit trail', async () => {
    const bId = await ensureBusiness(env, '919876543210');

    // Admin suspends account
    const suspendRes = await internalReq(`/businesses/${bId}/suspend`, {
      method: 'POST',
      email: 'admin@growxlabs.tech',
      body: { reason: 'Terms violation investigation' }
    });
    expect(suspendRes.status).toBe(200);

    const suspendedBusiness = await env.DB.prepare('SELECT account_state, status FROM businesses WHERE id = ?').bind(bId).first<{ account_state: string; status: string }>();
    expect(suspendedBusiness?.account_state).toBe('suspended');
    expect(suspendedBusiness?.status).toBe('blocked');

    // Admin reactivates account
    const reactivateRes = await internalReq(`/businesses/${bId}/reactivate`, {
      method: 'POST',
      email: 'admin@growxlabs.tech',
      body: { reason: 'Identity verified' }
    });
    expect(reactivateRes.status).toBe(200);

    const activeBusiness = await env.DB.prepare('SELECT account_state, status FROM businesses WHERE id = ?').bind(bId).first<{ account_state: string; status: string }>();
    expect(activeBusiness?.account_state).toBe('active');
    expect(activeBusiness?.status).toBe('active');

    // Verify audit logs exist for both
    const logs = await env.DB.prepare("SELECT action FROM internal_audit_logs WHERE target_id = ? ORDER BY created_at ASC").bind(bId).all<{ action: string }>();
    expect(logs.results.map(l => l.action)).toEqual(['account_suspend', 'account_reactivate']);
  });

  it('handles deletion requests queue and idempotent deletion retry', async () => {
    const bId = await ensureBusiness(env, '919876543210');
    await confirmDeletion(env, bId);

    const listRes = await internalReq('/deletions');
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as { data: Array<{ business_id: string; status: string }> };
    expect(list.data.some(d => d.business_id === bId)).toBe(true);

    // Retry deletion
    const retryRes = await internalReq(`/deletions/${bId}/retry`, {
      method: 'POST',
      email: 'admin@growxlabs.tech'
    });
    expect(retryRes.status).toBe(200);
  });

  it('records support notes and allows updating resolved status', async () => {
    const bId = await ensureBusiness(env, '919876543210');

    const addRes = await internalReq('/support', {
      method: 'POST',
      email: 'ops@growxlabs.tech',
      body: {
        business_id: bId,
        issue: 'Credit pack balance query',
        note: 'Customer contacted on WhatsApp asking about pack expiry. Clarified no expiry.'
      }
    });
    expect(addRes.status).toBe(200);
    const addBody = await addRes.json() as { success: boolean; id: string };
    expect(addBody.id).toBeDefined();

    // Mark resolved
    const patchRes = await internalReq(`/support/${addBody.id}`, {
      method: 'PATCH',
      email: 'ops@growxlabs.tech',
      body: { resolved: true }
    });
    expect(patchRes.status).toBe(200);

    const note = await env.DB.prepare('SELECT resolved FROM support_notes WHERE id = ?').bind(addBody.id).first<{ resolved: number }>();
    expect(note?.resolved).toBe(1);
  });

  it('NEVER returns raw secrets through the settings API (only Configured/Not configured status)', async () => {
    const res = await internalReq('/settings');
    expect(res.status).toBe(200);
    const rawText = await res.text();

    // Verify none of the secret tokens appear anywhere in the response text
    expect(rawText).not.toContain('secret-service-role-super-confidential');
    expect(rawText).not.toContain('secret-verify-token');
    expect(rawText).not.toContain('secret-whatsapp-access-token');
    expect(rawText).not.toContain('secret-whatsapp-app-secret');
    expect(rawText).not.toContain('secret-openai-api-key');
    expect(rawText).not.toContain('secret-business-identity');
    expect(rawText).not.toContain('secret-razorpay-key');
    expect(rawText).not.toContain('secret-razorpay-webhook');

    const json = JSON.parse(rawText) as { secrets_status: Record<string, string> };
    expect(json.secrets_status.OPENAI_API_KEY).toBe('Configured');
    expect(json.secrets_status.SUPABASE_SERVICE_ROLE_KEY).toBe('Configured');
    expect(json.secrets_status.RAZORPAY_KEY_SECRET).toBe('Configured');
  });
});
