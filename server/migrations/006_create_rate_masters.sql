CREATE TABLE IF NOT EXISTS rate_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('material_price','machine_hour','scrap_percent','overhead_percent','packing_cost','freight_rate','margin_percent')),
  unit TEXT NOT NULL,
  machine_or_operation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, code)
);

CREATE TABLE IF NOT EXISTS rate_master_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_master_id UUID NOT NULL REFERENCES rate_masters(id) ON DELETE RESTRICT,
  revision INTEGER NOT NULL CHECK (revision > 0),
  value NUMERIC(18,6) NOT NULL CHECK (value >= 0),
  effective_from DATE NOT NULL,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','superseded','retired')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE (rate_master_id, revision)
);

CREATE INDEX IF NOT EXISTS rate_master_versions_lookup_idx
  ON rate_master_versions(rate_master_id, effective_from, effective_to);

CREATE UNIQUE INDEX IF NOT EXISTS rate_master_versions_no_overlap_idx
  ON rate_master_versions(rate_master_id, effective_from);
