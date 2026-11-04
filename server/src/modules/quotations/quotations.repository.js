import { query } from '../../config/database.js';

export async function list(status, user) {
  const result = await query(`SELECT q.id,q.quotation_number,q.status,q.approved_at,q.issued_at,
    cr.status AS commercial_status,cr.comment,cr.reviewed_at,cr.costing_revision_id,
    crv.revision,crv.calculations,p.name AS part_name,r.id AS rfq_id,r.rfq_number,
    c.name AS customer_name
    FROM quotations q
    JOIN commercial_reviews cr ON cr.id=q.commercial_review_id
    JOIN costing_revisions crv ON crv.id=cr.costing_revision_id
    JOIN rfq_parts p ON p.id=crv.rfq_part_id
    JOIN rfqs r ON r.id=p.rfq_id
    JOIN customers c ON c.id=r.customer_id
    WHERE ($2::uuid IS NULL OR r.owner_id=$2)
      AND ($1::text IS NULL OR q.status = $1)
    ORDER BY q.created_at DESC`, [status || null, user.role === 'estimator' ? user.id : null]);
  return result.rows;
}
