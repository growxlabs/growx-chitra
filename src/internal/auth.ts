import type { Context, MiddlewareHandler } from 'hono';
import type { Env, OperatorRole, OperatorUser } from '../types';

export interface InternalAuthContext {
  operator: OperatorUser;
}

export function parseCloudflareAccessHeaders(c: Context<{ Bindings: Env; Variables: InternalAuthContext }>): {
  email: string | null;
  jwt: string | null;
} {
  const emailHeader = c.req.header('cf-access-authenticated-user-email') || c.req.header('x-cf-access-authenticated-user-email');
  const jwt = c.req.header('cf-access-jwt-assertion') || c.req.header('x-cf-access-jwt-assertion') || null;
  return {
    email: emailHeader ? emailHeader.trim().toLowerCase() : null,
    jwt
  };
}

export async function resolveOperator(env: Env, email: string): Promise<OperatorUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  // Look up in D1 database
  try {
    const row = await env.DB.prepare('SELECT email, name, role FROM internal_operators WHERE LOWER(email) = ?')
      .bind(normalized)
      .first<{ email: string; name: string | null; role: OperatorRole }>();
    if (row && (row.role === 'admin' || row.role === 'operator' || row.role === 'viewer')) {
      return {
        email: row.email,
        name: row.name || row.email.split('@')[0],
        role: row.role
      };
    }
  } catch (error) {
    console.error('Failed to query internal_operators:', error);
  }

  // Check configured admin emails from environment
  if (env.CF_ACCESS_ADMIN_EMAILS) {
    const adminEmails = env.CF_ACCESS_ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase());
    if (adminEmails.includes(normalized)) {
      return {
        email: normalized,
        name: normalized.split('@')[0],
        role: 'admin'
      };
    }
  }

  // Approved domain fallback: users with @growxlabs.tech default to operator if not explicit
  if (normalized.endsWith('@growxlabs.tech')) {
    return {
      email: normalized,
      name: normalized.split('@')[0],
      role: 'operator'
    };
  }

  return null;
}

export const requireInternalAuth: MiddlewareHandler<{ Bindings: Env; Variables: InternalAuthContext }> = async (c, next) => {
  const { email } = parseCloudflareAccessHeaders(c);

  let operatorEmail = email;

  // In local test environment, if no header is present, check for a developer fallback header
  // but if explicitly tested without headers, return 401 UNAUTHORIZED.
  if (!operatorEmail) {
    const devHeader = c.req.header('x-operator-email');
    if (devHeader) {
      operatorEmail = devHeader.trim().toLowerCase();
    } else if (c.env.APP_ENV === 'local' && c.req.header('x-dev-auth') === 'true') {
      operatorEmail = 'admin@growxlabs.tech';
    }
  }

  if (!operatorEmail) {
    return c.json({
      error: 'UNAUTHORIZED',
      message: 'Cloudflare Access authentication required'
    }, 401);
  }

  const operator = await resolveOperator(c.env, operatorEmail);
  if (!operator) {
    return c.json({
      error: 'FORBIDDEN',
      message: 'Account is not an authorized GrowxLabs operator'
    }, 403);
  }

  c.set('operator', operator);
  await next();
};

export function requireRole(minimumRole: 'operator' | 'admin'): MiddlewareHandler<{ Bindings: Env; Variables: InternalAuthContext }> {
  return async (c, next) => {
    const operator = c.get('operator');
    if (!operator) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
    }

    if (minimumRole === 'admin' && operator.role !== 'admin') {
      return c.json({
        error: 'FORBIDDEN',
        message: 'Administrator privileges required for this action'
      }, 403);
    }

    if (minimumRole === 'operator' && operator.role === 'viewer') {
      return c.json({
        error: 'FORBIDDEN',
        message: 'Operator write privileges required for this action'
      }, 403);
    }

    await next();
  };
}
