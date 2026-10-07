import type { Env } from '../types';

export interface AuditLogEntry {
  operator: string;
  action: string;
  target_type: string;
  target_id: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function recordAuditLog(env: Env, entry: AuditLogEntry): Promise<void> {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;

  try {
    await env.DB.prepare(`
      INSERT INTO internal_audit_logs (id, operator, action, target_type, target_id, reason, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.operator,
      entry.action,
      entry.target_type,
      entry.target_id,
      entry.reason || null,
      metadataJson,
      createdAt
    ).run();

    console.log(JSON.stringify({
      event: 'internal_operator_action',
      audit_id: id,
      operator: entry.operator,
      action: entry.action,
      target_type: entry.target_type,
      target_id: entry.target_id,
      reason: entry.reason
    }));
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
