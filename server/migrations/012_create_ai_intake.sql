CREATE TABLE IF NOT EXISTS ai_intake_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id),
  source_type TEXT NOT NULL CHECK (source_type IN ('email_text','pdf','spreadsheet')),
  original_filename TEXT,
  source_size_bytes INTEGER CHECK (source_size_bytes IS NULL OR source_size_bytes > 0),
  source_sha256 TEXT,
  source_text TEXT NOT NULL,
  result JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'review'
    CHECK (status IN ('review','confirmed','failed')),
  rfq_id UUID REFERENCES rfqs(id) ON DELETE SET NULL,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ai_intake_actor_idx ON ai_intake_extractions(actor_id, created_at DESC);
