PRAGMA foreign_keys = ON;
CREATE TABLE businesses (
  id TEXT PRIMARY KEY,
  whatsapp_number TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE brand_profiles (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE REFERENCES businesses(id),
  logo_r2_key TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  background_style TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE credits (
  business_id TEXT PRIMARY KEY REFERENCES businesses(id),
  free_remaining INTEGER NOT NULL DEFAULT 5 CHECK (free_remaining >= 0),
  paid_remaining INTEGER NOT NULL DEFAULT 0 CHECK (paid_remaining >= 0),
  updated_at TEXT NOT NULL
);
CREATE TABLE image_jobs (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  whatsapp_message_id TEXT NOT NULL UNIQUE,
  original_r2_key TEXT NOT NULL,
  final_r2_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('received','queued','processing','completed','blocked','failed')),
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
  updated_at TEXT NOT NULL
);
CREATE INDEX image_jobs_recovery ON image_jobs(status, updated_at);
CREATE TABLE credit_ledger (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL REFERENCES businesses(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  image_job_id TEXT REFERENCES image_jobs(id),
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX one_lifetime_grant ON credit_ledger(business_id) WHERE type = 'free_grant';
CREATE TABLE abuse_events (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES businesses(id),
  whatsapp_number TEXT NOT NULL,
  event_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT NOT NULL
);
