import { query } from '../../config/database.js';

export const queue = async status => {
  const result = await query(`SELECT cr.id,cr.revision,cr.status,cr.review_comment,cr.reviewed_at,cr.row_version,
    cr.created_at,p.name,p.material,p.gross_weight,p.annual_volume,p.rfq_id,r.rfq_number,c.name AS customer_name,
    u.name AS estimator_name,reviewer.name AS reviewer_name,reviewer.role AS reviewer_role FROM costing_revisions cr JOIN rfq_parts p ON p.id=cr.rfq_part_id
    JOIN rfqs r ON r.id=p.rfq_id JOIN customers c ON c.id=r.customer_id JOIN users u ON u.id=cr.created_by
    LEFT JOIN users reviewer ON reviewer.id=cr.reviewed_by
    WHERE ($1::text IS NULL OR ($1='overdue' AND cr.status='pending_review' AND cr.created_at < now() - interval '7 days')
      OR ($1<>'overdue' AND cr.status=$1)) ORDER BY cr.created_at DESC`, [status || null]);
  return result.rows;
};
export const find = async id => {
  const result = await query(`SELECT cr.*,p.name,p.material,p.gross_weight,p.annual_volume,r.rfq_number,c.name AS customer_name
    FROM costing_revisions cr JOIN rfq_parts p ON p.id=cr.rfq_part_id JOIN rfqs r ON r.id=p.rfq_id
    JOIN customers c ON c.id=r.customer_id WHERE cr.id=$1`, [id]);
  if (!result.rows[0]) return null;
  const operations = await query('SELECT * FROM costing_operations WHERE costing_revision_id=$1 ORDER BY sequence', [id]);
  return { ...result.rows[0], operations: operations.rows };
};
