-- Migration 015: Add indexes for Estimator dashboard and Quotation History performance
CREATE INDEX IF NOT EXISTS rfqs_owner_id_idx ON rfqs(owner_id);
CREATE INDEX IF NOT EXISTS quotations_issued_at_idx ON quotations(issued_at);

