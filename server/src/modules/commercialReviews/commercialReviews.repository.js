import { query } from '../../config/database.js';

export async function queue(status = 'pending', highValue = false) {
  const result = await query(`SELECT cr.id,cr.status,cr.row_version,cr.comment,cr.created_at,
    cr.costing_revision_id,cr.reviewed_at,p.name,p.material,p.annual_volume,r.rfq_number,
    c.name AS customer_name,crv.calculations,crv.inputs,u.name AS reviewer_name,u.role AS reviewer_role
    FROM commercial_reviews cr JOIN costing_revisions crv ON crv.id=cr.costing_revision_id
    JOIN rfq_parts p ON p.id=crv.rfq_part_id JOIN rfqs r ON r.id=p.rfq_id
    JOIN customers c ON c.id=r.customer_id LEFT JOIN users u ON u.id=cr.reviewer_id
    WHERE ($1::text IS NULL OR cr.status=$1)
      AND ($2::boolean IS FALSE OR (cr.status='pending' AND (crv.calculations->'components'->>'sellingPrice')::numeric >= $3::numeric))
    ORDER BY cr.created_at DESC`, [status || null, highValue, process.env.QUOTATION_HIGH_VALUE_THRESHOLD || '100000']);
  return result.rows;
}

export async function find(id) {
  const result = await query(`SELECT cr.*,crv.revision,crv.status AS costing_status,crv.calculations,crv.inputs,
    p.name,p.description,p.material,p.gross_weight,p.annual_volume,r.rfq_number,c.name AS customer_name
    FROM commercial_reviews cr JOIN costing_revisions crv ON crv.id=cr.costing_revision_id
    JOIN rfq_parts p ON p.id=crv.rfq_part_id JOIN rfqs r ON r.id=p.rfq_id
    JOIN customers c ON c.id=r.customer_id WHERE cr.id=$1`, [id]);
  return result.rows[0];
}
