-- Migration 014: Update RFQ lifecycle statuses and reconcile existing data

-- 1. Drop legacy check constraint on rfqs.status
ALTER TABLE rfqs DROP CONSTRAINT IF EXISTS rfqs_status_check;

-- 2. Add comprehensive lifecycle status check constraint
ALTER TABLE rfqs ADD CONSTRAINT rfqs_status_check CHECK (
  status IN (
    'draft',
    'in_progress',
    'pending_plant_review',
    'returned_for_revision',
    'pending_sales_approval',
    'ready_for_quote',
    'quoted',
    'closed',
    'cancelled'
  )
);

-- 3. Reconcile existing RFQ records based on actual workflow stage
-- Step A: If issued quotation exists, RFQ is 'quoted'
UPDATE rfqs r
SET status = 'quoted', updated_at = now()
WHERE r.status <> 'quoted'
  AND EXISTS (
    SELECT 1 FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id
    JOIN commercial_reviews cv ON cv.costing_revision_id = cr.id
    JOIN quotations q ON q.commercial_review_id = cv.id AND q.status = 'issued'
    WHERE p.rfq_id = r.id
  );

-- Step B: If approved quotation or approved commercial review exists (without issued quotation), RFQ is 'ready_for_quote'
UPDATE rfqs r
SET status = 'ready_for_quote', updated_at = now()
WHERE r.status <> 'ready_for_quote'
  AND r.status <> 'quoted'
  AND EXISTS (
    SELECT 1 FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id
    JOIN commercial_reviews cv ON cv.costing_revision_id = cr.id AND cv.status = 'approved'
    WHERE p.rfq_id = r.id
  );

-- Step C: If commercial review is pending and costing is plant-approved, RFQ is 'pending_sales_approval'
UPDATE rfqs r
SET status = 'pending_sales_approval', updated_at = now()
WHERE r.status NOT IN ('quoted', 'ready_for_quote')
  AND EXISTS (
    SELECT 1 FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id AND cr.status = 'approved'
    JOIN commercial_reviews cv ON cv.costing_revision_id = cr.id AND cv.status = 'pending'
    WHERE p.rfq_id = r.id
  );

-- Step D: If latest costing or commercial review has changes requested, RFQ is 'returned_for_revision'
UPDATE rfqs r
SET status = 'returned_for_revision', updated_at = now()
WHERE r.status NOT IN ('quoted', 'ready_for_quote', 'pending_sales_approval')
  AND (
    EXISTS (
      SELECT 1 FROM rfq_parts p
      JOIN costing_revisions cr ON cr.rfq_part_id = p.id AND cr.status = 'changes_requested'
      WHERE p.rfq_id = r.id
    )
    OR EXISTS (
      SELECT 1 FROM rfq_parts p
      JOIN costing_revisions cr ON cr.rfq_part_id = p.id
      JOIN commercial_reviews cv ON cv.costing_revision_id = cr.id AND cv.status = 'changes_requested'
      WHERE p.rfq_id = r.id
    )
  );

-- Step E: If latest costing is pending review, RFQ is 'pending_plant_review'
UPDATE rfqs r
SET status = 'pending_plant_review', updated_at = now()
WHERE r.status NOT IN ('quoted', 'ready_for_quote', 'pending_sales_approval', 'returned_for_revision')
  AND EXISTS (
    SELECT 1 FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id AND cr.status = 'pending_review'
    WHERE p.rfq_id = r.id
  );

-- Step F: If a draft costing revision exists, RFQ is 'in_progress'
UPDATE rfqs r
SET status = 'in_progress', updated_at = now()
WHERE r.status NOT IN ('quoted', 'ready_for_quote', 'pending_sales_approval', 'returned_for_revision', 'pending_plant_review')
  AND EXISTS (
    SELECT 1 FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id AND cr.status = 'draft'
    WHERE p.rfq_id = r.id
  );

-- Step G: Reconcile demo RFQ-2026-002 if it was seeded as ready_for_quote without any costing
UPDATE rfqs r
SET status = 'draft', updated_at = now()
WHERE r.rfq_number = 'RFQ-2026-002'
  AND NOT EXISTS (
    SELECT 1 FROM rfq_parts p
    JOIN costing_revisions cr ON cr.rfq_part_id = p.id
    WHERE p.rfq_id = r.id
  );

