ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
    CHECK (status IN ('approved', 'issued')),
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS quotations_status_idx ON quotations(status, created_at);

UPDATE rfqs r
SET status = 'quoted', updated_at = now()
WHERE r.status <> 'quoted'
  AND EXISTS (
    SELECT 1
    FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id AND cr.status = 'approved'
    JOIN commercial_reviews cv ON cv.costing_revision_id = cr.id AND cv.status = 'approved'
    JOIN quotations q ON q.commercial_review_id = cv.id AND q.status = 'issued'
    JOIN quotation_documents qd ON qd.quotation_id = q.id
    WHERE p.rfq_id = r.id
  );
