import { query } from '../../config/database.js';

export async function partForRfq(rfqId) {
  const result = await query(`SELECT p.id AS part_id,p.name,p.description,p.material,p.gross_weight,p.annual_volume,
    r.id AS rfq_id,r.rfq_number,r.owner_id,c.name AS customer_name FROM rfq_parts p
    JOIN rfqs r ON r.id=p.rfq_id JOIN customers c ON c.id=r.customer_id WHERE r.id=$1 ORDER BY p.id LIMIT 1`, [rfqId]);
  return result.rows[0];
}
export async function latest(client, partId) {
  const result = await client.query('SELECT * FROM costing_revisions WHERE rfq_part_id=$1 ORDER BY revision DESC LIMIT 1', [partId]);
  return result.rows[0];
}
export async function byId(id) {
  const result = await query(`SELECT cr.*,p.name,p.material,p.gross_weight,p.annual_volume,p.rfq_id,r.rfq_number,r.owner_id,c.name AS customer_name
    FROM costing_revisions cr JOIN rfq_parts p ON p.id=cr.rfq_part_id JOIN rfqs r ON r.id=p.rfq_id
    JOIN customers c ON c.id=r.customer_id WHERE cr.id=$1`, [id]);
  if (!result.rows[0]) return null;
  const operations = await query('SELECT * FROM costing_operations WHERE costing_revision_id=$1 ORDER BY sequence', [id]);
  return { ...result.rows[0], operations: operations.rows };
}
export async function pending({ status = 'pending_review' } = {}) {
  const result = await query(`SELECT cr.id,cr.revision,cr.status,cr.created_at,cr.row_version,p.name,r.rfq_number,c.name AS customer_name,
    r.owner_id FROM costing_revisions cr JOIN rfq_parts p ON p.id=cr.rfq_part_id JOIN rfqs r ON r.id=p.rfq_id
    JOIN customers c ON c.id=r.customer_id WHERE cr.status=$1 ORDER BY cr.created_at ASC`, [status]);
  return result.rows;
}
