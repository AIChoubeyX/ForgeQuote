CREATE TABLE IF NOT EXISTS costing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_part_id UUID NOT NULL REFERENCES rfq_parts(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision > 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','changes_requested')),
  costing_date DATE NOT NULL DEFAULT current_date,
  formula_version TEXT NOT NULL DEFAULT 'v1',
  inputs JSONB NOT NULL,
  calculations JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  review_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rfq_part_id, revision)
);

CREATE TABLE IF NOT EXISTS costing_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costing_revision_id UUID NOT NULL REFERENCES costing_revisions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  operation_name TEXT NOT NULL,
  machine_code TEXT NOT NULL,
  cycle_time_minutes NUMERIC(12,4) NOT NULL CHECK (cycle_time_minutes > 0),
  rate_version_id UUID NOT NULL REFERENCES rate_master_versions(id) ON DELETE RESTRICT,
  rate_value NUMERIC(18,6) NOT NULL CHECK (rate_value >= 0),
  rate_unit TEXT NOT NULL,
  UNIQUE (costing_revision_id, sequence)
);

CREATE INDEX IF NOT EXISTS costing_revisions_review_idx ON costing_revisions(status, created_at);
CREATE INDEX IF NOT EXISTS costing_revisions_part_idx ON costing_revisions(rfq_part_id, revision DESC);
