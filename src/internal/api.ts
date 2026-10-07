import { Hono } from 'hono';
import type { Env, JobStatus } from '../types';
import { requireInternalAuth, requireRole, type InternalAuthContext } from './auth';
import { recordAuditLog } from './audit';
import { PLANS } from '../plans';
import { cleanupDeletions, confirmDeletion } from '../store';

async function parseBody<T extends Record<string, unknown>>(req: { json: () => Promise<unknown> }): Promise<Partial<T>> {
  try {
    const data = await req.json();
    return (data && typeof data === 'object' ? data : {}) as Partial<T>;
  } catch {
    return {};
  }
}

export const internalApi = new Hono<{ Bindings: Env; Variables: InternalAuthContext }>();

// Protect all /internal routes with Cloudflare Access auth
internalApi.use('*', requireInternalAuth);

// ----------------------------------------------------
// Operator Session / Identity
// ----------------------------------------------------
internalApi.get('/me', (c) => {
  const operator = c.get('operator');
  return c.json({
    email: operator.email,
    name: operator.name,
    role: operator.role
  });
});

// ----------------------------------------------------
// 1. Overview Dashboard
// ----------------------------------------------------
internalApi.get('/overview', async (c) => {
  const window = c.req.query('window') || 'today'; // 'today' | '7d' | '30d'
  const now = new Date();
  let windowStart: string;

  if (window === '7d') {
    windowStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  } else if (window === '30d') {
    windowStart = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  } else {
    // today UTC start
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    windowStart = today.toISOString();
  }

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  // Metrics
  const [
    totalBusinessesRes,
    activeBusinessesRes,
    newBusinessesWindowRes,
    jobsWindowRes,
    jobsMonthRes,
    creditsConsumedWindowRes,
    creditsPurchasedWindowRes,
    revenueWindowRes,
    revenueMonthRes,
    paymentFailuresRes,
    activeQueueFailuresRes,
    pendingDeletionsRes
  ] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM businesses').first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM businesses WHERE account_state = 'active'").first<{ count: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) AS count FROM businesses WHERE created_at >= ?').bind(windowStart).first<{ count: number }>(),
    c.env.DB.prepare(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN status IN ('blocked_input', 'blocked_output', 'blocked') THEN 1 ELSE 0 END) AS blocked,
        SUM(CASE WHEN status IN ('received', 'queued', 'processing') THEN 1 ELSE 0 END) AS queued
      FROM image_jobs WHERE created_at >= ?
    `).bind(windowStart).first<{ total: number; successful: number; failed: number; blocked: number; queued: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM image_jobs WHERE status = 'completed' AND created_at >= ?").bind(monthStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) AS count FROM credit_ledger WHERE type IN ('image_delivered', 'image_usage') AND created_at >= ?").bind(windowStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount), 0) AS count FROM credit_ledger WHERE type = 'purchase' AND created_at >= ?").bind(windowStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount_minor), 0) AS count FROM payments WHERE status = 'paid' AND paid_at >= ?").bind(windowStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount_minor), 0) AS count FROM payments WHERE status = 'paid' AND paid_at >= ?").bind(monthStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM payments WHERE status = 'failed' AND created_at >= ?").bind(windowStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM image_jobs WHERE status = 'failed' AND created_at >= ?").bind(windowStart).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM businesses WHERE account_state = 'deletion_pending'").first<{ count: number }>()
  ]);

  // Operational alerts
  const [uncreditedPaymentsRes, recentJobFailuresRes, failedDeletionsRes] = await Promise.all([
    c.env.DB.prepare(`
      SELECT p.id, p.business_id, p.plan_id, p.amount_minor, p.provider_payment_id, p.paid_at, b.whatsapp_number
      FROM payments p
      JOIN businesses b ON b.id = p.business_id
      WHERE p.status = 'paid' AND p.provider_payment_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM credit_ledger l WHERE l.type = 'purchase' AND l.reference_id = p.provider_payment_id
      )
      LIMIT 10
    `).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, business_id, status, failure_reason, created_at
      FROM image_jobs
      WHERE status = 'failed'
      ORDER BY created_at DESC LIMIT 5
    `).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, whatsapp_number, deletion_requested_at, deletion_confirmed_at
      FROM businesses
      WHERE account_state = 'deletion_pending' AND deletion_confirmed_at IS NOT NULL
      LIMIT 5
    `).all<Record<string, unknown>>()
  ]);

  // Recent activity
  const [latestJobs, latestPayments, latestBlockedEvents, latestBusinesses] = await Promise.all([
    c.env.DB.prepare(`
      SELECT j.id, j.business_id, b.name AS business_name, j.status, j.model, j.failure_reason, j.created_at
      FROM image_jobs j
      LEFT JOIN businesses b ON b.id = j.business_id
      ORDER BY j.created_at DESC LIMIT 5
    `).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT p.id, p.business_id, b.name AS business_name, p.plan_id, p.amount_minor, p.status, p.created_at, p.paid_at
      FROM payments p
      LEFT JOIN businesses b ON b.id = p.business_id
      ORDER BY p.created_at DESC LIMIT 5
    `).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT a.id, a.business_id, b.name AS business_name, a.event_type, a.details, a.created_at
      FROM abuse_events a
      LEFT JOIN businesses b ON b.id = a.business_id
      ORDER BY a.created_at DESC LIMIT 5
    `).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, name, whatsapp_number, account_state, created_at
      FROM businesses
      ORDER BY created_at DESC LIMIT 5
    `).all<Record<string, unknown>>()
  ]);

  return c.json({
    window,
    metrics: {
      total_businesses: totalBusinessesRes?.count ?? 0,
      active_businesses: activeBusinessesRes?.count ?? 0,
      new_businesses_window: newBusinessesWindowRes?.count ?? 0,
      images_processed_window: jobsWindowRes?.successful ?? 0,
      images_processed_month: jobsMonthRes?.count ?? 0,
      jobs_total: jobsWindowRes?.total ?? 0,
      jobs_successful: jobsWindowRes?.successful ?? 0,
      jobs_failed: jobsWindowRes?.failed ?? 0,
      jobs_blocked: jobsWindowRes?.blocked ?? 0,
      jobs_queued: jobsWindowRes?.queued ?? 0,
      credits_consumed_window: creditsConsumedWindowRes?.count ?? 0,
      credits_purchased_window: creditsPurchasedWindowRes?.count ?? 0,
      revenue_window_inr: (revenueWindowRes?.count ?? 0) / 100,
      revenue_month_inr: (revenueMonthRes?.count ?? 0) / 100,
      payment_failures_window: paymentFailuresRes?.count ?? 0,
      active_queue_failures: activeQueueFailuresRes?.count ?? 0,
      deletion_requests_pending: pendingDeletionsRes?.count ?? 0
    },
    alerts: {
      uncredited_payments: uncreditedPaymentsRes.results,
      recent_failures: recentJobFailuresRes.results,
      pending_deletions: failedDeletionsRes.results
    },
    activity: {
      latest_jobs: latestJobs.results,
      latest_payments: latestPayments.results,
      latest_blocked_events: latestBlockedEvents.results,
      latest_businesses: latestBusinesses.results
    }
  });
});

// ----------------------------------------------------
// 2. Businesses List & Detail & Actions
// ----------------------------------------------------
internalApi.get('/businesses', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;
  const search = c.req.query('search')?.trim();
  const filter = c.req.query('filter')?.trim(); // active, suspended, deletion_pending, deleted, has_paid, free_only

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (search) {
    whereClauses.push('(b.name LIKE ? OR b.whatsapp_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (filter === 'active') whereClauses.push("b.account_state = 'active'");
  else if (filter === 'suspended') whereClauses.push("b.account_state = 'suspended'");
  else if (filter === 'deletion_pending') whereClauses.push("b.account_state = 'deletion_pending'");
  else if (filter === 'deleted') whereClauses.push("b.account_state = 'deleted'");
  else if (filter === 'has_paid') whereClauses.push('(c.paid_remaining > 0 OR EXISTS (SELECT 1 FROM payments p WHERE p.business_id = b.id AND p.status = \'paid\'))');
  else if (filter === 'free_only') whereClauses.push('(c.paid_remaining = 0 AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.business_id = b.id AND p.status = \'paid\'))');

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM businesses b 
    LEFT JOIN credits c ON c.business_id = b.id
    ${whereSql}
  `;
  const countRes = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countRes?.total ?? 0;

  const dataQuery = `
    SELECT 
      b.id,
      b.name,
      b.whatsapp_number,
      b.status,
      b.account_state,
      COALESCE(c.free_remaining, 0) AS free_credits,
      COALESCE(c.paid_remaining, 0) AS paid_credits,
      COALESCE(c.free_remaining + c.paid_remaining, 0) AS total_remaining,
      (SELECT COUNT(*) FROM image_jobs j WHERE j.business_id = b.id AND j.status = 'completed') AS total_images_processed,
      (SELECT COALESCE(SUM(p.amount_minor), 0) FROM payments p WHERE p.business_id = b.id AND p.status = 'paid') AS total_spend_minor,
      b.created_at,
      b.updated_at
    FROM businesses b
    LEFT JOIN credits c ON c.business_id = b.id
    ${whereSql}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all<Record<string, unknown>>();

  return c.json({
    data: rows.results.map(r => ({
      ...r,
      total_spend_inr: ((r.total_spend_minor as number) || 0) / 100
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});

internalApi.get('/businesses/:id', async (c) => {
  const id = c.req.param('id');

  const business = await c.env.DB.prepare(`
    SELECT b.*, c.free_remaining, c.paid_remaining, (c.free_remaining + c.paid_remaining) AS total_remaining
    FROM businesses b
    LEFT JOIN credits c ON c.business_id = b.id
    WHERE b.id = ?
  `).bind(id).first<Record<string, unknown>>();

  if (!business) {
    return c.json({ error: 'BUSINESS_NOT_FOUND', message: 'Business record not found' }, 404);
  }

  const [brand, usageStats, recentLedger, recentPayments, safetyEvents, supportNotes, auditLogs] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM brand_profiles WHERE business_id = ?').bind(id).first<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT 
        COUNT(*) AS total_images,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_images,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_images,
        SUM(CASE WHEN status IN ('blocked_input', 'blocked_output', 'blocked') THEN 1 ELSE 0 END) AS blocked_images,
        AVG(CASE WHEN generation_duration_ms > 0 THEN generation_duration_ms ELSE NULL END) AS avg_duration_ms
      FROM image_jobs WHERE business_id = ?
    `).bind(id).first<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, amount, type, image_job_id, reference_id, operator, reason, created_at
      FROM credit_ledger WHERE business_id = ?
      ORDER BY created_at DESC LIMIT 20
    `).bind(id).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, provider_payment_id, plan_id, amount_minor, status, credits_purchased, created_at, paid_at
      FROM payments WHERE business_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).bind(id).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, event_type, details, created_at
      FROM abuse_events WHERE business_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).bind(id).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, issue, note, operator, resolved, created_at, updated_at
      FROM support_notes WHERE business_id = ?
      ORDER BY created_at DESC LIMIT 10
    `).bind(id).all<Record<string, unknown>>(),
    c.env.DB.prepare(`
      SELECT id, operator, action, reason, metadata, created_at
      FROM internal_audit_logs WHERE target_id = ? OR (target_type = 'business' AND target_id = ?)
      ORDER BY created_at DESC LIMIT 10
    `).bind(id, id).all<Record<string, unknown>>()
  ]);

  return c.json({
    business,
    brand_profile: brand || null,
    usage: usageStats || { total_images: 0, completed_images: 0, failed_images: 0, blocked_images: 0, avg_duration_ms: 0 },
    credits: {
      free_remaining: business.free_remaining ?? 0,
      paid_remaining: business.paid_remaining ?? 0,
      total_remaining: business.total_remaining ?? 0,
      history: recentLedger.results
    },
    payments: recentPayments.results.map(p => ({
      ...p,
      amount_inr: ((p.amount_minor as number) || 0) / 100
    })),
    safety: {
      blocked_count: (usageStats?.blocked_images as number) || 0,
      events: safetyEvents.results
    },
    support_notes: supportNotes.results,
    audit_logs: auditLogs.results
  });
});

// Operator manual credit adjustment (Source of truth: credit_ledger)
internalApi.post('/businesses/:id/credits', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ amount?: number; reason?: string }>(c.req);

  const amount = Number(body.amount);
  const reason = (body.reason || '').trim();

  if (!Number.isInteger(amount) || amount === 0) {
    return c.json({ error: 'INVALID_AMOUNT', message: 'Credit adjustment amount must be a non-zero integer' }, 400);
  }
  if (!reason) {
    return c.json({ error: 'REASON_REQUIRED', message: 'A reason is required for manual credit adjustments' }, 400);
  }

  const business = await c.env.DB.prepare('SELECT id, name FROM businesses WHERE id = ?').bind(id).first<{ id: string; name: string | null }>();
  if (!business) {
    return c.json({ error: 'BUSINESS_NOT_FOUND', message: 'Business record not found' }, 404);
  }

  const ledgerId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    // Insert into credit_ledger. The database triggers validate and atomically update credits.
    await c.env.DB.prepare(`
      INSERT INTO credit_ledger (id, business_id, amount, type, operator, reason, created_at)
      VALUES (?, ?, ?, 'manual_adjustment', ?, ?, ?)
    `).bind(ledgerId, id, amount, operator.email, reason, now).run();

    await recordAuditLog(c.env, {
      operator: operator.email,
      action: 'manual_credit_adjustment',
      target_type: 'business',
      target_id: id,
      reason,
      metadata: { amount, ledger_id: ledgerId }
    });

    const updated = await c.env.DB.prepare('SELECT free_remaining, paid_remaining FROM credits WHERE business_id = ?')
      .bind(id).first<{ free_remaining: number; paid_remaining: number }>();

    return c.json({
      success: true,
      amount,
      free_remaining: updated?.free_remaining ?? 0,
      paid_remaining: updated?.paid_remaining ?? 0,
      total_remaining: (updated?.free_remaining ?? 0) + (updated?.paid_remaining ?? 0)
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Credit adjustment failed';
    if (msg.includes('insufficient_credits')) {
      return c.json({ error: 'INSUFFICIENT_CREDITS', message: 'Cannot deduct more credits than the business currently has' }, 400);
    }
    return c.json({ error: 'CREDIT_ADJUSTMENT_FAILED', message: msg }, 500);
  }
});

// Operator suspend account (Admin role required)
internalApi.post('/businesses/:id/suspend', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ reason?: string }>(c.req);
  const reason = (body.reason || 'Operator suspended').trim();
  const now = new Date().toISOString();

  const business = await c.env.DB.prepare('SELECT id FROM businesses WHERE id = ?').bind(id).first<{ id: string }>();
  if (!business) return c.json({ error: 'BUSINESS_NOT_FOUND', message: 'Business not found' }, 404);

  await c.env.DB.prepare("UPDATE businesses SET account_state = 'suspended', status = 'blocked', updated_at = ? WHERE id = ?")
    .bind(now, id).run();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'account_suspend',
    target_type: 'business',
    target_id: id,
    reason
  });

  return c.json({ success: true, account_state: 'suspended', status: 'blocked' });
});

// Operator reactivate account (Admin role required)
internalApi.post('/businesses/:id/reactivate', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ reason?: string }>(c.req);
  const reason = (body.reason || 'Operator reactivated').trim();
  const now = new Date().toISOString();

  const business = await c.env.DB.prepare('SELECT id FROM businesses WHERE id = ?').bind(id).first<{ id: string }>();
  if (!business) return c.json({ error: 'BUSINESS_NOT_FOUND', message: 'Business not found' }, 404);

  await c.env.DB.prepare("UPDATE businesses SET account_state = 'active', status = 'active', updated_at = ? WHERE id = ?")
    .bind(now, id).run();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'account_reactivate',
    target_type: 'business',
    target_id: id,
    reason
  });

  return c.json({ success: true, account_state: 'active', status: 'active' });
});

// Operator modify brand settings
internalApi.post('/businesses/:id/branding', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{
    logo_enabled?: boolean;
    background_style?: string;
    primary_color?: string;
    secondary_color?: string;
    logo_position?: string;
    business_name?: string;
  }>(c.req);

  const brand = await c.env.DB.prepare('SELECT id FROM brand_profiles WHERE business_id = ?').bind(id).first<{ id: string }>();
  const now = new Date().toISOString();

  if (!brand) {
    const brandId = crypto.randomUUID();
    await c.env.DB.prepare(`
      INSERT INTO brand_profiles (id, business_id, business_name, logo_enabled, background_style, primary_color, secondary_color, logo_position, watermark_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      brandId,
      id,
      body.business_name ?? null,
      body.logo_enabled ? 1 : 0,
      body.background_style ?? null,
      body.primary_color ?? null,
      body.secondary_color ?? null,
      body.logo_position ?? 'bottom_right',
      now,
      now
    ).run();
  } else {
    await c.env.DB.prepare(`
      UPDATE brand_profiles SET
        logo_enabled = COALESCE(?, logo_enabled),
        background_style = COALESCE(?, background_style),
        primary_color = COALESCE(?, primary_color),
        secondary_color = COALESCE(?, secondary_color),
        logo_position = COALESCE(?, logo_position),
        business_name = COALESCE(?, business_name),
        updated_at = ?
      WHERE business_id = ?
    `).bind(
      body.logo_enabled !== undefined ? (body.logo_enabled ? 1 : 0) : null,
      body.background_style ?? null,
      body.primary_color ?? null,
      body.secondary_color ?? null,
      body.logo_position ?? null,
      body.business_name ?? null,
      now,
      id
    ).run();
  }

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'brand_modification',
    target_type: 'business',
    target_id: id,
    metadata: body
  });

  return c.json({ success: true });
});

// Operator remove brand logo
internalApi.delete('/businesses/:id/logo', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const now = new Date().toISOString();

  await c.env.DB.prepare('UPDATE brand_profiles SET logo_r2_key = NULL, updated_at = ? WHERE business_id = ?')
    .bind(now, id).run();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'remove_brand_logo',
    target_type: 'business',
    target_id: id
  });

  return c.json({ success: true });
});

// Operator start deletion workflow
internalApi.post('/businesses/:id/delete', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ reason?: string }>(c.req);
  const reason = (body.reason || 'Operator requested deletion').trim();

  await confirmDeletion(c.env, id);

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'start_deletion',
    target_type: 'business',
    target_id: id,
    reason
  });

  return c.json({ success: true, message: 'Deletion workflow initiated' });
});

// ----------------------------------------------------
// 3. Image Jobs List, Detail & Actions
// ----------------------------------------------------
internalApi.get('/jobs', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;

  const status = c.req.query('status')?.trim();
  const businessId = c.req.query('business_id')?.trim();
  const model = c.req.query('model')?.trim();
  const filter = c.req.query('filter')?.trim(); // blocked, failed
  const search = c.req.query('search')?.trim();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (status) {
    whereClauses.push('j.status = ?');
    params.push(status);
  }
  if (businessId) {
    whereClauses.push('j.business_id = ?');
    params.push(businessId);
  }
  if (model) {
    whereClauses.push('j.model = ?');
    params.push(model);
  }
  if (filter === 'blocked') {
    whereClauses.push("j.status IN ('blocked_input', 'blocked_output', 'blocked')");
  } else if (filter === 'failed') {
    whereClauses.push("j.status = 'failed'");
  }
  if (search) {
    whereClauses.push('(j.id LIKE ? OR b.name LIKE ? OR b.whatsapp_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM image_jobs j
    LEFT JOIN businesses b ON b.id = j.business_id
    ${whereSql}
  `;
  const countRes = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countRes?.total ?? 0;

  const dataQuery = `
    SELECT 
      j.id,
      j.business_id,
      b.name AS business_name,
      b.whatsapp_number,
      j.status,
      j.model,
      j.attempts,
      j.attempt_count,
      j.generation_duration_ms,
      j.failure_reason,
      j.created_at,
      j.updated_at
    FROM image_jobs j
    LEFT JOIN businesses b ON b.id = j.business_id
    ${whereSql}
    ORDER BY j.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all<Record<string, unknown>>();

  return c.json({
    data: rows.results,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});

internalApi.get('/jobs/:id', async (c) => {
  const id = c.req.param('id');

  const job = await c.env.DB.prepare(`
    SELECT j.*, b.name AS business_name, b.whatsapp_number
    FROM image_jobs j
    LEFT JOIN businesses b ON b.id = j.business_id
    WHERE j.id = ?
  `).bind(id).first<Record<string, unknown>>();

  if (!job) {
    return c.json({ error: 'JOB_NOT_FOUND', message: 'Job not found' }, 404);
  }

  // Delivery status event
  let deliveryEvent: Record<string, unknown> | null = null;
  if (job.final_message_id) {
    deliveryEvent = await c.env.DB.prepare('SELECT status, created_at, updated_at FROM whatsapp_delivery_events WHERE message_id = ?')
      .bind(job.final_message_id).first<Record<string, unknown>>();
  }

  // Related ledger charge
  const ledgerCharge = await c.env.DB.prepare("SELECT * FROM credit_ledger WHERE image_job_id = ? AND type = 'image_delivered'")
    .bind(id).first<Record<string, unknown>>();

  // Audit logs for this job
  const auditLogs = await c.env.DB.prepare(`
    SELECT id, operator, action, reason, created_at
    FROM internal_audit_logs WHERE target_id = ?
    ORDER BY created_at DESC
  `).bind(id).all<Record<string, unknown>>();

  return c.json({
    job,
    delivery_event: deliveryEvent,
    credit_charge: ledgerCharge,
    audit_logs: auditLogs.results
  });
});

// Operator retry failed job
// ABSOLUTE RULE: Do not allow retrying blocked prohibited-content jobs, bypassing safety, or manually overriding moderation
internalApi.post('/jobs/:id/retry', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ reason?: string }>(c.req);
  const reason = (body.reason || 'Operator manual retry').trim();

  const job = await c.env.DB.prepare('SELECT id, business_id, status FROM image_jobs WHERE id = ?')
    .bind(id).first<{ id: string; business_id: string; status: JobStatus }>();

  if (!job) {
    return c.json({ error: 'JOB_NOT_FOUND', message: 'Job not found' }, 404);
  }

  // ENFORCE ABSOLUTE SAFETY RULES
  if (['blocked_input', 'blocked_output', 'blocked'].includes(job.status)) {
    return c.json({
      error: 'SAFETY_VIOLATION',
      message: 'Blocked jobs containing prohibited or unsafe content cannot be retried or overridden.'
    }, 400);
  }

  if (job.status !== 'failed' && job.status !== 'received' && job.status !== 'queued') {
    return c.json({
      error: 'INVALID_JOB_STATE',
      message: `Only failed or pending jobs can be retried (current state: ${job.status})`
    }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(`
    UPDATE image_jobs SET
      status = 'queued',
      failure_reason = NULL,
      lease_until = NULL,
      updated_at = ?
    WHERE id = ?
  `).bind(now, id).run();

  try {
    await c.env.CHITRA_JOBS.send({ version: 1, job_id: id });
  } catch (err) {
    console.error('Failed to re-enqueue job:', err);
  }

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'job_retry',
    target_type: 'job',
    target_id: id,
    reason
  });

  return c.json({ success: true, message: 'Job re-queued for processing' });
});

// Operator cancel queued job
internalApi.post('/jobs/:id/cancel', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ reason?: string }>(c.req);
  const reason = (body.reason || 'Operator cancelled').trim();

  const job = await c.env.DB.prepare('SELECT id, status FROM image_jobs WHERE id = ?')
    .bind(id).first<{ id: string; status: JobStatus }>();

  if (!job) return c.json({ error: 'JOB_NOT_FOUND', message: 'Job not found' }, 404);

  if (!['received', 'queued'].includes(job.status)) {
    return c.json({ error: 'INVALID_STATE', message: 'Only queued or received jobs can be cancelled' }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE image_jobs SET status = 'failed', failure_reason = 'cancelled_by_operator', updated_at = ? WHERE id = ?").bind(now, id),
    c.env.DB.prepare('DELETE FROM credit_reservations WHERE image_job_id = ?').bind(id)
  ]);

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'job_cancel',
    target_type: 'job',
    target_id: id,
    reason
  });

  return c.json({ success: true });
});

// Operator mark job for investigation
internalApi.post('/jobs/:id/investigate', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ note?: string }>(c.req);
  const note = (body.note || 'Marked for investigation').trim();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'job_investigate',
    target_type: 'job',
    target_id: id,
    reason: note
  });

  return c.json({ success: true });
});

// ----------------------------------------------------
// 4. Payments List, Detail & Reconcile
// ----------------------------------------------------
internalApi.get('/payments', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;

  const status = c.req.query('status')?.trim();
  const plan = c.req.query('plan')?.trim();
  const search = c.req.query('search')?.trim();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (status) {
    whereClauses.push('p.status = ?');
    params.push(status);
  }
  if (plan) {
    whereClauses.push('p.plan_id = ?');
    params.push(plan);
  }
  if (search) {
    whereClauses.push('(p.id LIKE ? OR p.provider_payment_id LIKE ? OR b.name LIKE ? OR b.whatsapp_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM payments p
    LEFT JOIN businesses b ON b.id = p.business_id
    ${whereSql}
  `;
  const countRes = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countRes?.total ?? 0;

  const dataQuery = `
    SELECT 
      p.id,
      p.business_id,
      b.name AS business_name,
      b.whatsapp_number,
      p.provider_payment_id,
      p.plan_id,
      p.amount_minor,
      p.currency,
      p.credits_purchased,
      p.status,
      p.created_at,
      p.paid_at,
      p.failed_at,
      EXISTS (
        SELECT 1 FROM credit_ledger l 
        WHERE l.type = 'purchase' AND l.reference_id = p.provider_payment_id
      ) AS credits_granted
    FROM payments p
    LEFT JOIN businesses b ON b.id = p.business_id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all<Record<string, unknown>>();

  return c.json({
    data: rows.results.map(r => ({
      ...r,
      amount_inr: ((r.amount_minor as number) || 0) / 100,
      missing_credits: r.status === 'paid' && !r.credits_granted
    })),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});

internalApi.get('/payments/:id', async (c) => {
  const id = c.req.param('id');

  const payment = await c.env.DB.prepare(`
    SELECT p.*, b.name AS business_name, b.whatsapp_number
    FROM payments p
    LEFT JOIN businesses b ON b.id = p.business_id
    WHERE p.id = ?
  `).bind(id).first<Record<string, unknown>>();

  if (!payment) {
    return c.json({ error: 'PAYMENT_NOT_FOUND', message: 'Payment record not found' }, 404);
  }

  const [ledgerRow, providerEvents, refunds] = await Promise.all([
    payment.provider_payment_id
      ? c.env.DB.prepare("SELECT * FROM credit_ledger WHERE type = 'purchase' AND reference_id = ?")
          .bind(payment.provider_payment_id).first<Record<string, unknown>>()
      : Promise.resolve(null),
    c.env.DB.prepare('SELECT * FROM payment_provider_events WHERE payment_id = ? ORDER BY created_at DESC')
      .bind(id).all<Record<string, unknown>>(),
    c.env.DB.prepare('SELECT * FROM payment_refunds WHERE payment_id = ? ORDER BY created_at DESC')
      .bind(id).all<Record<string, unknown>>()
  ]);

  const creditsGranted = !!ledgerRow;
  const missingCredits = payment.status === 'paid' && !creditsGranted;

  return c.json({
    payment: {
      ...payment,
      amount_inr: ((payment.amount_minor as number) || 0) / 100
    },
    credits_granted: creditsGranted,
    missing_credits: missingCredits,
    credit_ledger_entry: ledgerRow,
    provider_events: providerEvents.results,
    refunds: refunds.results
  });
});

// Operator reconcile payment credits (Idempotent, requires verified payment)
// RULE: Do not allow manually marking unpaid payments as paid. Do not bypass Razorpay verification.
internalApi.post('/payments/:id/reconcile', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ reason?: string }>(c.req);
  const reason = (body.reason || 'Manual payment reconciliation').trim();

  const payment = await c.env.DB.prepare(`
    SELECT id, business_id, status, provider_payment_id, credits_purchased, amount_minor, currency
    FROM payments WHERE id = ?
  `).bind(id).first<{
    id: string;
    business_id: string;
    status: string;
    provider_payment_id: string | null;
    credits_purchased: number;
    amount_minor: number;
    currency: string;
  }>();

  if (!payment) return c.json({ error: 'PAYMENT_NOT_FOUND', message: 'Payment not found' }, 404);

  // ENFORCE: Only verified paid payments can grant credits
  if (payment.status !== 'paid' || !payment.provider_payment_id) {
    return c.json({
      error: 'CANNOT_RECONCILE',
      message: 'Only payments with status "paid" and a verified Razorpay payment ID can be reconciled.'
    }, 400);
  }

  // Check if credit was already granted
  const existingLedger = await c.env.DB.prepare("SELECT id FROM credit_ledger WHERE type = 'purchase' AND reference_id = ?")
    .bind(payment.provider_payment_id).first<{ id: string }>();

  if (existingLedger) {
    return c.json({
      success: true,
      message: 'Payment was already reconciled. Credits are already granted.',
      already_granted: true
    });
  }

  const now = new Date().toISOString();
  const ledgerId = crypto.randomUUID();

  // Insert purchase ledger. DB trigger validate_purchase_ledger and apply_purchase_ledger handle validation & credit addition.
  await c.env.DB.prepare(`
    INSERT INTO credit_ledger (id, business_id, amount, type, reference_id, operator, reason, created_at)
    VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?)
  `).bind(
    ledgerId,
    payment.business_id,
    payment.credits_purchased,
    payment.provider_payment_id,
    operator.email,
    reason,
    now
  ).run();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'payment_reconciliation',
    target_type: 'payment',
    target_id: id,
    reason,
    metadata: {
      provider_payment_id: payment.provider_payment_id,
      credits_granted: payment.credits_purchased
    }
  });

  return c.json({
    success: true,
    message: `Successfully reconciled payment and granted ${payment.credits_purchased} credits.`,
    credits_granted: payment.credits_purchased
  });
});

internalApi.post('/payments/:id/investigate', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ note?: string }>(c.req);
  const note = (body.note || 'Marked for payment investigation').trim();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'payment_investigate',
    target_type: 'payment',
    target_id: id,
    reason: note
  });

  return c.json({ success: true });
});

// ----------------------------------------------------
// 5. Credits Ledger Source of Truth
// ----------------------------------------------------
internalApi.get('/credits', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;

  const type = c.req.query('type')?.trim();
  const businessId = c.req.query('business_id')?.trim();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (type) {
    if (type === 'image_usage') {
      whereClauses.push("l.type IN ('image_usage', 'image_delivered')");
    } else {
      whereClauses.push('l.type = ?');
      params.push(type);
    }
  }
  if (businessId) {
    whereClauses.push('l.business_id = ?');
    params.push(businessId);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total 
    FROM credit_ledger l
    LEFT JOIN businesses b ON b.id = l.business_id
    ${whereSql}
  `;
  const countRes = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countRes?.total ?? 0;

  const dataQuery = `
    SELECT 
      l.id,
      l.business_id,
      b.name AS business_name,
      b.whatsapp_number,
      l.amount,
      CASE WHEN l.type = 'image_delivered' THEN 'image_usage' ELSE l.type END AS type,
      l.image_job_id,
      l.reference_id,
      l.operator,
      l.reason,
      l.created_at
    FROM credit_ledger l
    LEFT JOIN businesses b ON b.id = l.business_id
    ${whereSql}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all<Record<string, unknown>>();

  return c.json({
    data: rows.results,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});

// ----------------------------------------------------
// 6. Safety Section
// ----------------------------------------------------
internalApi.get('/safety', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;

  const [
    blockedInputsRes,
    blockedOutputsRes,
    personEventsRes,
    sexualEventsRes,
    repeatedAbuseRes,
    suspendedAccountsRes
  ] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM image_jobs WHERE status = 'blocked_input'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM image_jobs WHERE status = 'blocked_output'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM abuse_events WHERE event_type = 'person_detected'").first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM abuse_events WHERE event_type LIKE '%sexual%' OR event_type LIKE '%explicit%'").first<{ count: number }>(),
    c.env.DB.prepare(`
      SELECT COUNT(*) AS count FROM (
        SELECT business_id FROM abuse_events GROUP BY business_id HAVING COUNT(*) > 1
      )
    `).first<{ count: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS count FROM businesses WHERE account_state = 'suspended'").first<{ count: number }>()
  ]);

  const countEvents = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM abuse_events').first<{ total: number }>();
  const total = countEvents?.total ?? 0;

  const events = await c.env.DB.prepare(`
    SELECT 
      a.id,
      a.business_id,
      b.name AS business_name,
      a.whatsapp_number,
      a.event_type,
      a.details,
      a.created_at
    FROM abuse_events a
    LEFT JOIN businesses b ON b.id = a.business_id
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all<Record<string, unknown>>();

  return c.json({
    metrics: {
      total_blocked_inputs: blockedInputsRes?.count ?? 0,
      total_blocked_outputs: blockedOutputsRes?.count ?? 0,
      person_detected_events: personEventsRes?.count ?? 0,
      sexual_explicit_events: sexualEventsRes?.count ?? 0,
      repeated_abuse_accounts: repeatedAbuseRes?.count ?? 0,
      suspended_accounts: suspendedAccountsRes?.count ?? 0
    },
    events: events.results,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});

internalApi.post('/safety/notes', requireRole('operator'), async (c) => {
  const operator = c.get('operator');
  const body = await parseBody<{ business_id?: string; note?: string }>(c.req);

  if (!body.business_id || !body.note) {
    return c.json({ error: 'MISSING_FIELDS', message: 'business_id and note are required' }, 400);
  }

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'add_safety_note',
    target_type: 'business',
    target_id: body.business_id,
    reason: body.note
  });

  return c.json({ success: true });
});

// ----------------------------------------------------
// 7. Deletion Requests Queue & Actions
// ----------------------------------------------------
internalApi.get('/deletions', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT 
      id AS business_id,
      name AS business_name,
      whatsapp_number,
      account_state,
      deletion_requested_at,
      deletion_confirmation_expires_at,
      deletion_confirmed_at,
      deleted_at,
      created_at
    FROM businesses
    WHERE deletion_requested_at IS NOT NULL OR account_state IN ('deletion_pending', 'deleted')
    ORDER BY COALESCE(deletion_confirmed_at, deletion_requested_at) DESC
  `).all<Record<string, unknown>>();

  const mapped = rows.results.map(r => {
    let status = 'requested';
    if (r.account_state === 'deleted' || r.deleted_at) {
      status = 'completed';
    } else if (r.deletion_confirmed_at) {
      status = 'confirmed';
    }

    return {
      business_id: r.business_id,
      business_name: r.business_name,
      whatsapp_number: r.whatsapp_number,
      status,
      request_time: r.deletion_requested_at,
      confirmation_time: r.deletion_confirmed_at,
      completion_time: r.deleted_at,
      financial_records_preserved: true,
      failure_reason: null
    };
  });

  return c.json({ data: mapped });
});

internalApi.post('/deletions/:id/retry', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');

  // Trigger cleanupDeletions in store
  await cleanupDeletions(c.env);

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'retry_deletion',
    target_type: 'deletion',
    target_id: id,
    reason: 'Operator retried deletion batch'
  });

  return c.json({ success: true, message: 'Deletion processing executed' });
});

internalApi.post('/deletions/:id/review', requireRole('admin'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ note?: string }>(c.req);

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'review_deletion',
    target_type: 'deletion',
    target_id: id,
    reason: body.note || 'Marked deletion for review'
  });

  return c.json({ success: true });
});

// ----------------------------------------------------
// 8. Lightweight Support Notes
// ----------------------------------------------------
internalApi.get('/support', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;
  const businessId = c.req.query('business_id')?.trim();
  const resolved = c.req.query('resolved')?.trim();

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (businessId) {
    whereClauses.push('s.business_id = ?');
    params.push(businessId);
  }
  if (resolved !== undefined && resolved !== '') {
    whereClauses.push('s.resolved = ?');
    params.push(resolved === 'true' || resolved === '1' ? 1 : 0);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) AS total FROM support_notes s ${whereSql}`;
  const countRes = await c.env.DB.prepare(countQuery).bind(...params).first<{ total: number }>();
  const total = countRes?.total ?? 0;

  const dataQuery = `
    SELECT 
      s.id,
      s.business_id,
      b.name AS business_name,
      b.whatsapp_number,
      s.issue,
      s.note,
      s.operator,
      s.resolved,
      s.created_at,
      s.updated_at
    FROM support_notes s
    LEFT JOIN businesses b ON b.id = s.business_id
    ${whereSql}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await c.env.DB.prepare(dataQuery).bind(...params, limit, offset).all<Record<string, unknown>>();

  return c.json({
    data: rows.results,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});

internalApi.post('/support', requireRole('operator'), async (c) => {
  const operator = c.get('operator');
  const body = await parseBody<{ business_id?: string; issue?: string; note?: string }>(c.req);

  const businessId = (body.business_id || '').trim();
  const issue = (body.issue || '').trim();
  const note = (body.note || '').trim();

  if (!businessId || !issue || !note) {
    return c.json({ error: 'MISSING_FIELDS', message: 'business_id, issue, and note are required' }, 400);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.prepare(`
    INSERT INTO support_notes (id, business_id, issue, note, operator, resolved, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?)
  `).bind(id, businessId, issue, note, operator.email, now, now).run();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'add_support_note',
    target_type: 'business',
    target_id: businessId,
    reason: issue,
    metadata: { note_id: id }
  });

  return c.json({ success: true, id });
});

internalApi.patch('/support/:id', requireRole('operator'), async (c) => {
  const id = c.req.param('id');
  const operator = c.get('operator');
  const body = await parseBody<{ resolved?: boolean }>(c.req);

  if (body.resolved === undefined) {
    return c.json({ error: 'MISSING_FIELDS', message: 'resolved field is required' }, 400);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE support_notes SET resolved = ?, updated_at = ? WHERE id = ?')
    .bind(body.resolved ? 1 : 0, now, id).run();

  await recordAuditLog(c.env, {
    operator: operator.email,
    action: 'update_support_note',
    target_type: 'support_note',
    target_id: id,
    metadata: { resolved: body.resolved }
  });

  return c.json({ success: true });
});

// ----------------------------------------------------
// 9. Settings (Read-Only & Secret Presence Check)
// CRITICAL: NEVER EXPOSE SECRET VALUES!
// ----------------------------------------------------
internalApi.get('/settings', (c) => {
  const env = c.env;

  const isConfigured = (val: string | undefined): string => {
    return val && val.trim().length > 0 ? 'Configured' : 'Not configured';
  };

  return c.json({
    configuration: {
      image_model: env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare',
      image_quality: env.OPENAI_IMAGE_QUALITY || 'low',
      free_trial_credits: 5,
      plans: PLANS,
      retention: {
        original_image_days: env.ORIGINAL_IMAGE_RETENTION_DAYS || '30',
        generated_image_days: env.GENERATED_IMAGE_RETENTION_DAYS || '30',
        blocked_image_hours: env.BLOCKED_IMAGE_RETENTION_HOURS || '24',
        safety_event_days: env.SAFETY_EVENT_RETENTION_DAYS || '30'
      },
      limits: {
        max_upload_bytes: env.MAX_UPLOAD_BYTES || '5242880',
        max_image_width: env.MAX_IMAGE_WIDTH || '8000',
        max_image_height: env.MAX_IMAGE_HEIGHT || '8000',
        max_images_per_hour: env.MAX_IMAGES_PER_HOUR || '12',
        max_commands_per_minute: env.MAX_COMMANDS_PER_MINUTE || '20',
        max_payment_links_per_hour: env.MAX_PAYMENT_LINKS_PER_HOUR || '3',
        max_brand_setup_attempts_per_hour: env.MAX_BRAND_SETUP_ATTEMPTS_PER_HOUR || '10'
      },
      legal_and_support: {
        support_contact: env.PAYMENT_SUPPORT_CONTACT || env.SUPPORT_CONTACT || '',
        terms_url: env.TERMS_URL || '',
        privacy_url: env.PRIVACY_URL || '',
        refund_policy_url: env.REFUND_POLICY_URL || ''
      }
    },
    // Secrets status: STRICTLY boolean presence indicators
    secrets_status: {
      OPENAI_API_KEY: isConfigured(env.OPENAI_API_KEY),
      WHATSAPP_ACCESS_TOKEN: isConfigured(env.WHATSAPP_ACCESS_TOKEN),
      WHATSAPP_APP_SECRET: isConfigured(env.WHATSAPP_APP_SECRET),
      WHATSAPP_VERIFY_TOKEN: isConfigured(env.WHATSAPP_VERIFY_TOKEN),
      RAZORPAY_KEY_ID: isConfigured(env.RAZORPAY_KEY_ID),
      RAZORPAY_KEY_SECRET: isConfigured(env.RAZORPAY_KEY_SECRET),
      RAZORPAY_WEBHOOK_SECRET: isConfigured(env.RAZORPAY_WEBHOOK_SECRET),
      SUPABASE_SERVICE_ROLE_KEY: isConfigured(env.SUPABASE_SERVICE_ROLE_KEY),
      BUSINESS_IDENTITY_SECRET: isConfigured(env.BUSINESS_IDENTITY_SECRET)
    }
  });
});

// ----------------------------------------------------
// 10. Audit Logs List
// ----------------------------------------------------
internalApi.get('/audit-logs', async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(c.req.query('limit') || 25)));
  const offset = (page - 1) * limit;

  const countRes = await c.env.DB.prepare('SELECT COUNT(*) AS total FROM internal_audit_logs').first<{ total: number }>();
  const total = countRes?.total ?? 0;

  const rows = await c.env.DB.prepare(`
    SELECT id, operator, action, target_type, target_id, reason, metadata, created_at
    FROM internal_audit_logs
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all<Record<string, unknown>>();

  return c.json({
    data: rows.results,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  });
});
