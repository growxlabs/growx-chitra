export interface CreditPlan {
  id: 'free' | 'starter' | 'business' | 'pro';
  name: string;
  credits: number;
  priceMinor: number;
  currency: 'INR';
  type: 'lifetime_free' | 'credit_pack';
}

export const PLANS: Record<CreditPlan['id'], CreditPlan> = {
  free: { id: 'free', name: 'Free', credits: 5, priceMinor: 0, currency: 'INR', type: 'lifetime_free' },
  starter: { id: 'starter', name: 'Starter', credits: 50, priceMinor: 99_900, currency: 'INR', type: 'credit_pack' },
  business: { id: 'business', name: 'Business', credits: 150, priceMinor: 249_900, currency: 'INR', type: 'credit_pack' },
  pro: { id: 'pro', name: 'Pro', credits: 350, priceMinor: 499_900, currency: 'INR', type: 'credit_pack' }
};

export function selectPlan(value: string): Exclude<CreditPlan['id'], 'free'> | 'custom' | null {
  const normalized = value.trim().toLowerCase();
  if (['starter', '1'].includes(normalized)) return 'starter';
  if (['business', '2'].includes(normalized)) return 'business';
  if (['pro', '3'].includes(normalized)) return 'pro';
  if (['custom', '4'].includes(normalized)) return 'custom';
  return null;
}

export function rupees(plan: CreditPlan): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(plan.priceMinor / 100);
}

export function plansMessage(): string {
  return `Your free tier includes 5 lifetime images.\n\nChoose a plan to continue:\n\n1 — Starter: ₹${rupees(PLANS.starter)} / ${PLANS.starter.credits} images\n2 — Business: ₹${rupees(PLANS.business)} / ${PLANS.business.credits} images\n3 — Pro: ₹${rupees(PLANS.pro)} / ${PLANS.pro.credits} images\n4 — Custom\n\nReply 1, 2, 3, or 4.`;
}
