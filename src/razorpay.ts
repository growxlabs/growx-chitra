import type { Env } from './types';
import type { CreditPlan } from './plans';

export class RazorpayError extends Error {
  constructor(public readonly code: string) { super(code); }
}
type Fetcher = typeof fetch;
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export class RazorpayService {
  constructor(private env: Env, private request: Fetcher = fetch) {}

  async createPaymentLink(input: { paymentId: string; businessId: string; phone: string; plan: CreditPlan }): Promise<{ linkId: string; url: string }> {
    const mode=this.env.RAZORPAY_MODE ?? 'test';
    const expectedPrefix=mode==='test'?'rzp_test_':mode==='live'?'rzp_live_':null;
    if (!expectedPrefix || !this.env.RAZORPAY_KEY_ID?.startsWith(expectedPrefix) || !this.env.RAZORPAY_KEY_SECRET) throw new RazorpayError('payment_provider_mode_mismatch');
    const auth = btoa(`${this.env.RAZORPAY_KEY_ID}:${this.env.RAZORPAY_KEY_SECRET}`);
    let response: Response;
    try {
      response = await this.request('https://api.razorpay.com/v1/payment_links', {
        method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: input.plan.priceMinor, currency: input.plan.currency, accept_partial: false,
          reference_id: input.paymentId, description: `Growx Chitra ${input.plan.name} image credits`,
          customer: { contact: input.phone }, notify: { sms: false, email: false }, reminder_enable: false,
          notes: { payment_internal_id: input.paymentId, business_id: input.businessId, plan_id: input.plan.id, credits: String(input.plan.credits) }
        }), signal: AbortSignal.timeout(20_000), redirect: 'error'
      });
    } catch { throw new RazorpayError('payment_link_creation_failed'); }
    if (!response.ok) throw new RazorpayError('payment_link_creation_failed');
    let body: Record<string, unknown>;
    try { body = record(await response.json()); } catch { throw new RazorpayError('payment_link_creation_failed'); }
    const url = typeof body.short_url === 'string' ? body.short_url : '';
    let parsed: URL | null = null;
    try { parsed = new URL(url); } catch { /* malformed provider link */ }
    if (typeof body.id !== 'string' || !/^plink_[A-Za-z0-9]+$/.test(body.id) || !parsed || parsed.protocol !== 'https:' || parsed.hostname !== 'rzp.io') {
      throw new RazorpayError('payment_link_creation_failed');
    }
    return { linkId: body.id, url };
  }

  async verifyWebhookSignature(body: ArrayBuffer, signature: string | null): Promise<boolean> {
    if (!this.env.RAZORPAY_WEBHOOK_SECRET || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(this.env.RAZORPAY_WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const bytes = new Uint8Array(signature.match(/../g)!.map(hex => parseInt(hex, 16)));
    return crypto.subtle.verify('HMAC', key, bytes, body);
  }
}

export interface RazorpayEvent {
  eventId: string;
  eventType: string;
  paymentLinkId: string | null;
  paymentId: string | null;
  providerOrderId: string | null;
  internalPaymentId: string | null;
  amountMinor: number | null;
  amountPaid: number | null;
  currency: string | null;
  providerStatus: string | null;
  refundId: string | null;
}
export function parseRazorpayEvent(payload: unknown, eventId: string): RazorpayEvent | null {
  const root = record(payload); const eventType = typeof root.event === 'string' ? root.event : '';
  if (!['payment_link.paid', 'payment_link.expired', 'payment_link.cancelled', 'payment.failed', 'refund.created', 'refund.processed'].includes(eventType)) return null;
  const payloadRecord = record(root.payload);
  const link = record(record(payloadRecord.payment_link).entity);
  const payment = record(record(payloadRecord.payment).entity);
  const refund = record(record(payloadRecord.refund).entity);
  const notes = record(payment.notes);
  const paymentId = typeof payment.id === 'string' ? payment.id : null;
  const linkPayments = Array.isArray(link.payments) ? link.payments : [];
  const linkedPaymentId = typeof record(linkPayments[0]).payment_id === 'string' ? record(linkPayments[0]).payment_id as string : null;
  const internal = typeof notes.payment_internal_id === 'string' ? notes.payment_internal_id :
    typeof link.reference_id === 'string' && /^[0-9a-f-]{36}$/i.test(link.reference_id) ? link.reference_id : null;
  return {
    eventId, eventType,
    paymentLinkId: typeof link.id === 'string' ? link.id : typeof payment.payment_link_id === 'string' ? payment.payment_link_id : null,
    paymentId: paymentId ?? linkedPaymentId ?? (typeof refund.payment_id === 'string' ? refund.payment_id : null),
    providerOrderId: typeof payment.order_id === 'string' ? payment.order_id : typeof link.order_id === 'string' ? link.order_id : null,
    internalPaymentId: internal,
    amountMinor: Number.isSafeInteger(refund.amount) ? refund.amount as number : Number.isSafeInteger(link.amount) ? link.amount as number : Number.isSafeInteger(payment.amount) ? payment.amount as number : null,
    amountPaid: Number.isSafeInteger(link.amount_paid) ? link.amount_paid as number : null,
    currency: typeof refund.currency === 'string' ? refund.currency : typeof link.currency === 'string' ? link.currency : typeof payment.currency === 'string' ? payment.currency : null,
    providerStatus: typeof refund.status === 'string' ? refund.status : typeof link.status === 'string' ? link.status : typeof payment.status === 'string' ? payment.status : null,
    refundId: typeof refund.id === 'string' ? refund.id : null
  };
}
