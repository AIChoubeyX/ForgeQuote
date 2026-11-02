CREATE TABLE IF NOT EXISTS rfq_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  material TEXT NOT NULL,
  gross_weight NUMERIC(12,3) NOT NULL CHECK (gross_weight > 0),
  annual_volume INTEGER NOT NULL CHECK (annual_volume > 0)
);
CREATE INDEX IF NOT EXISTS rfq_parts_rfq_id_idx ON rfq_parts(rfq_id);
