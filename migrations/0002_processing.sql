-- D1 applies a migration transactionally; keep references valid at transaction end.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE image_jobs_v2 (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  whatsapp_message_id TEXT NOT NULL UNIQUE,
  original_r2_key TEXT NOT NULL,
  final_r2_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('received','queued','processing','input_safety','blocked_input','generating','branding','output_safety','blocked_output','sending','completed','blocked','failed')),
  model TEXT,
  failure_reason TEXT,
  media_id TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  message_timestamp TEXT NOT NULL,
  media_sha256 TEXT NOT NULL,
  acknowledgement_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  lease_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  generated_r2_key TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 2),
  input_safety_passed INTEGER NOT NULL DEFAULT 0,
  output_safety_passed INTEGER NOT NULL DEFAULT 0,
  final_media_id TEXT,
  final_message_id TEXT UNIQUE,
  final_send_started INTEGER NOT NULL DEFAULT 0,
  delivery_deadline TEXT,
  delivered_at TEXT,
  refusal_message_id TEXT,
  retention_until TEXT,
  input_bytes INTEGER,
  output_bytes INTEGER,
  generation_duration_ms INTEGER,
  openai_request_id TEXT,
  generation_settings TEXT,
  usage_data TEXT
);
INSERT INTO image_jobs_v2(id,business_id,whatsapp_message_id,original_r2_key,final_r2_key,status,model,failure_reason,media_id,mime_type,message_timestamp,media_sha256,acknowledgement_message_id,attempts,lease_until,created_at,updated_at)
SELECT id,business_id,whatsapp_message_id,original_r2_key,final_r2_key,status,model,failure_reason,media_id,mime_type,message_timestamp,media_sha256,acknowledgement_message_id,attempts,lease_until,created_at,updated_at FROM image_jobs;
DROP TABLE image_jobs;
ALTER TABLE image_jobs_v2 RENAME TO image_jobs;
CREATE INDEX image_jobs_recovery ON image_jobs(status,updated_at);
CREATE INDEX image_jobs_retention ON image_jobs(retention_until);
ALTER TABLE brand_profiles ADD COLUMN watermark_enabled INTEGER NOT NULL DEFAULT 0 CHECK (watermark_enabled IN (0,1));
CREATE TABLE credit_reservations (
  image_job_id TEXT PRIMARY KEY REFERENCES image_jobs(id),
  business_id TEXT NOT NULL REFERENCES businesses(id),
  created_at TEXT NOT NULL
);
CREATE INDEX credit_reservations_business ON credit_reservations(business_id);
CREATE UNIQUE INDEX one_delivery_charge ON credit_ledger(image_job_id) WHERE type='image_delivered';
CREATE TABLE whatsapp_delivery_events (
  message_id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered','read','failed')),
  job_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Enforce charging at the DB boundary, including duplicate/concurrent receipts.
CREATE TRIGGER charge_only_delivered BEFORE INSERT ON credit_ledger
WHEN NEW.type='image_delivered'
BEGIN
  SELECT CASE WHEN NEW.amount != -1 OR NOT EXISTS (
    SELECT 1 FROM image_jobs j JOIN credit_reservations r ON r.image_job_id=j.id
    JOIN credits c ON c.business_id=j.business_id
    JOIN whatsapp_delivery_events e ON e.message_id=j.final_message_id
    JOIN businesses b ON b.id=j.business_id
    WHERE j.id=NEW.image_job_id AND j.business_id=NEW.business_id
    AND (j.status='sending' OR (j.status='failed' AND j.failure_reason='whatsapp_delivery_timeout'))
    AND j.output_safety_passed=1 AND j.final_r2_key IS NOT NULL
    AND e.recipient=b.whatsapp_number AND e.status IN ('delivered','read')
    AND c.free_remaining+c.paid_remaining>0
  ) THEN RAISE(ABORT,'invalid_delivery_charge') END;
END;
CREATE TRIGGER apply_delivery_charge AFTER INSERT ON credit_ledger
WHEN NEW.type='image_delivered'
BEGIN
  UPDATE credits SET
    paid_remaining=paid_remaining-CASE WHEN free_remaining=0 THEN 1 ELSE 0 END,
    free_remaining=free_remaining-CASE WHEN free_remaining>0 THEN 1 ELSE 0 END,
    updated_at=NEW.created_at WHERE business_id=NEW.business_id;
  UPDATE image_jobs SET status='completed',delivered_at=NEW.created_at,lease_until=NULL,failure_reason=NULL,updated_at=NEW.created_at
    WHERE id=NEW.image_job_id;
  DELETE FROM credit_reservations WHERE image_job_id=NEW.image_job_id;
END;
