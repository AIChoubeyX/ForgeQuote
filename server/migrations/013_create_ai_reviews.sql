CREATE TABLE IF NOT EXISTS ai_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_type TEXT NOT NULL CHECK (review_type IN ('costing_review', 'routing_review', 'commercial_review')),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  costing_revision_id UUID REFERENCES costing_revisions(id) ON DELETE SET NULL,
  commercial_review_id UUID REFERENCES commercial_reviews(id) ON DELETE SET NULL,
  revision_number INTEGER,
  actor_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('completed', 'insufficient_evidence', 'failed')),
  summary TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  limitations JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_reviews_costing_rev_idx ON ai_reviews(costing_revision_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_reviews_commercial_idx ON ai_reviews(commercial_review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_reviews_rfq_idx ON ai_reviews(rfq_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_reviews_actor_idx ON ai_reviews(actor_id, created_at DESC);

