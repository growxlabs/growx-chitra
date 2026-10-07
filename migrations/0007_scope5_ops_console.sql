-- Migration 0007: Scope 5 Operations Console
-- Tables for support notes, operator roles, internal audit logs, and credit ledger manual adjustments.

ALTER TABLE credit_ledger ADD COLUMN operator TEXT;
ALTER TABLE credit_ledger ADD COLUMN reason TEXT;

CREATE TABLE support_notes (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  issue TEXT NOT NULL,
  note TEXT NOT NULL,
  operator TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX support_notes_business ON support_notes(business_id, created_at DESC);

CREATE TABLE internal_audit_logs (
  id TEXT PRIMARY KEY,
  operator TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX audit_logs_target ON internal_audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX audit_logs_created ON internal_audit_logs(created_at DESC);

CREATE TABLE internal_operators (
  email TEXT PRIMARY KEY,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('viewer','operator','admin')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO internal_operators(email, name, role, created_at, updated_at)
VALUES ('admin@growxlabs.tech', 'Default Administrator', 'admin', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z');

INSERT OR IGNORE INTO internal_operators(email, name, role, created_at, updated_at)
VALUES ('ops@growxlabs.tech', 'Operations Team', 'operator', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z');

INSERT OR IGNORE INTO internal_operators(email, name, role, created_at, updated_at)
VALUES ('viewer@growxlabs.tech', 'Operations Viewer', 'viewer', '2026-10-06T00:00:00Z', '2026-10-06T00:00:00Z');

CREATE TRIGGER validate_manual_adjustment BEFORE INSERT ON credit_ledger
WHEN NEW.type = 'manual_adjustment'
BEGIN
  SELECT CASE
    WHEN NEW.amount = 0 THEN RAISE(ABORT, 'invalid_adjustment_zero')
    WHEN NEW.reason IS NULL OR length(trim(NEW.reason)) = 0 THEN RAISE(ABORT, 'adjustment_reason_required')
    WHEN NEW.operator IS NULL OR length(trim(NEW.operator)) = 0 THEN RAISE(ABORT, 'adjustment_operator_required')
    WHEN NEW.amount < 0 AND (
      SELECT free_remaining + paid_remaining FROM credits WHERE business_id = NEW.business_id
    ) < (-NEW.amount) THEN RAISE(ABORT, 'insufficient_credits')
  END;
END;

CREATE TRIGGER apply_manual_adjustment AFTER INSERT ON credit_ledger
WHEN NEW.type = 'manual_adjustment'
BEGIN
  UPDATE credits SET
    paid_remaining = CASE
      WHEN NEW.amount >= 0 THEN paid_remaining + NEW.amount
      ELSE CASE
        WHEN paid_remaining >= (-NEW.amount) THEN paid_remaining + NEW.amount
        ELSE 0
      END
    END,
    free_remaining = CASE
      WHEN NEW.amount >= 0 THEN free_remaining
      ELSE CASE
        WHEN paid_remaining >= (-NEW.amount) THEN free_remaining
        ELSE free_remaining - ((-NEW.amount) - paid_remaining)
      END
    END,
    updated_at = NEW.created_at
  WHERE business_id = NEW.business_id;
END;
