import { query } from '../../config/database.js';

export async function insert(input) {
  const result = await query(`INSERT INTO ai_intake_extractions
    (actor_id,source_type,original_filename,source_size_bytes,source_sha256,source_text,result,status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'review') RETURNING id,status,result,created_at`,
    [input.actorId, input.sourceType, input.filename || null, input.size || null, input.sha256, input.sourceText, JSON.stringify(input.result)]);
  return result.rows[0];
}

export async function findForActor(id, actorId) {
  const result = await query('SELECT * FROM ai_intake_extractions WHERE id=$1 AND actor_id=$2', [id, actorId]);
  return result.rows[0];
}

export async function findCustomerByName(name) {
  const result = await query('SELECT id,name FROM customers WHERE lower(regexp_replace(name, \'[^a-zA-Z0-9]\', \'\', \'g\')) = lower(regexp_replace($1, \'[^a-zA-Z0-9]\', \'\', \'g\')) LIMIT 2', [name]);
  return result.rows;
}

export async function findCustomerById(id) {
  const result = await query('SELECT id,name FROM customers WHERE id=$1', [id]);
  return result.rows[0];
}

export async function confirm(id, actorId, rfqId) {
  const result = await query(`UPDATE ai_intake_extractions
    SET status='confirmed',rfq_id=$3,confirmed_at=now()
    WHERE id=$1 AND actor_id=$2 AND status='review'
    RETURNING id,status,rfq_id`, [id, actorId, rfqId]);
  return result.rows[0];
}

export async function historicalParts(part, actorId) {
  const result = await query(`SELECT p.name,p.material,p.gross_weight,p.annual_volume,r.rfq_number,
      co.id AS operation_id,co.operation_name,co.machine_code
    FROM rfq_parts p JOIN rfqs r ON r.id=p.rfq_id
    JOIN costing_revisions cr ON cr.rfq_part_id=p.id
    JOIN costing_operations co ON co.costing_revision_id=cr.id
    WHERE r.owner_id=$1 AND cr.status IN ('approved','pending_review')
      AND (lower(p.material)=lower($2) OR lower(p.name) LIKE lower($3) OR lower(p.description) LIKE lower($3))
    ORDER BY CASE WHEN lower(p.material)=lower($2) THEN 0 ELSE 1 END, p.gross_weight ASC
    LIMIT 20`, [actorId, part.material, `%${part.name}%`]);
  return result.rows;
}
