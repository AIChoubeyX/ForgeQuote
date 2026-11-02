CREATE TABLE IF NOT EXISTS rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  owner_id UUID NOT NULL REFERENCES users(id),
  received_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_progress','ready_for_quote','quoted','closed')),
  source_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (due_date >= received_date)
);
CREATE INDEX IF NOT EXISTS rfqs_due_date_idx ON rfqs(due_date);
CREATE INDEX IF NOT EXISTS rfqs_status_idx ON rfqs(status);
