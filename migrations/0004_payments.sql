ALTER TABLE credit_ledger ADD COLUMN reference_id TEXT;
CREATE UNIQUE INDEX unique_purchase_reference ON credit_ledger(reference_id) WHERE type='purchase' AND reference_id IS NOT NULL;
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  provider TEXT NOT NULL CHECK (provider='razorpay'),
  provider_payment_link_id TEXT UNIQUE,
  provider_payment_id TEXT UNIQUE,
  provider_order_id TEXT,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('starter','business','pro')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor>0),
  currency TEXT NOT NULL CHECK (currency='INR'),
  credits_purchased INTEGER NOT NULL CHECK (credits_purchased>0),
  status TEXT NOT NULL CHECK (status IN ('created','pending','paid','failed','expired','cancelled','refunded')),
  payment_url TEXT,
  whatsapp_message_id TEXT UNIQUE,
  refund_review_required INTEGER NOT NULL DEFAULT 0 CHECK (refund_review_required IN (0,1)),
  confirmation_sent_at TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  failed_at TEXT,
  metadata TEXT
);
CREATE INDEX payments_business_recent ON payments(business_id,created_at DESC);
CREATE INDEX payments_reconcile ON payments(status,created_at);
CREATE TABLE payment_provider_events (
  provider_event_id TEXT PRIMARY KEY,
  payment_id TEXT REFERENCES payments(id),
  event_type TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE payment_refunds (
  provider_refund_id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL REFERENCES payments(id),
  amount_minor INTEGER NOT NULL CHECK (amount_minor>=0),
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TRIGGER validate_purchase_ledger BEFORE INSERT ON credit_ledger
WHEN NEW.type='purchase'
BEGIN
  SELECT CASE WHEN NEW.amount<=0 OR NEW.image_job_id IS NOT NULL OR NEW.reference_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM payments p WHERE p.provider='razorpay' AND p.provider_payment_id=NEW.reference_id
      AND p.business_id=NEW.business_id AND p.status='paid'
      AND p.credits_purchased=NEW.amount
  ) THEN RAISE(ABORT,'invalid_purchase_credit_grant') END;
END;
CREATE TRIGGER apply_purchase_ledger AFTER INSERT ON credit_ledger
WHEN NEW.type='purchase'
BEGIN
  UPDATE credits SET paid_remaining=paid_remaining+NEW.amount,updated_at=NEW.created_at WHERE business_id=NEW.business_id;
END;
