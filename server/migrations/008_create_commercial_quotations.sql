CREATE TABLE IF NOT EXISTS commercial_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  costing_revision_id UUID NOT NULL REFERENCES costing_revisions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','changes_requested')),
  reviewer_id UUID REFERENCES users(id),
  comment TEXT,
  reviewed_at TIMESTAMPTZ,
  row_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (costing_revision_id)
);
CREATE SEQUENCE IF NOT EXISTS forgequote_quotation_number_seq;

CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commercial_review_id UUID NOT NULL UNIQUE REFERENCES commercial_reviews(id) ON DELETE RESTRICT,
  quotation_number TEXT NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL UNIQUE REFERENCES quotations(id) ON DELETE RESTRICT,
  content_type TEXT NOT NULL DEFAULT 'application/pdf',
  content BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS commercial_reviews_status_idx ON commercial_reviews(status, created_at);
