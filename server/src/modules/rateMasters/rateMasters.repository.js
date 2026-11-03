import { query } from '../../config/database.js';

export async function list({ search = '', category, status, effective }) {
  const result = await query(`SELECT rm.id,rm.code,rm.name,rm.category,rm.unit,rm.machine_or_operation,
    rv.id AS version_id,rv.revision,rv.value,to_char(rv.effective_from,'YYYY-MM-DD') AS effective_from,to_char(rv.effective_to,'YYYY-MM-DD') AS effective_to,
    CASE WHEN rv.status='retired' THEN 'retired' WHEN rv.effective_from > current_date THEN 'future'
      WHEN rv.effective_to IS NOT NULL AND rv.effective_to < current_date THEN 'superseded' ELSE 'current' END AS display_status
    FROM rate_masters rm JOIN rate_master_versions rv ON rv.rate_master_id=rm.id
    WHERE ($1='' OR rm.code ILIKE $2 OR rm.name ILIKE $2) AND ($3::text IS NULL OR rm.category=$3)
      AND ($4::text IS NULL OR rv.status=$4)
      AND ($5::text IS NULL OR ($5='current' AND rv.effective_from <= current_date AND (rv.effective_to IS NULL OR rv.effective_to >= current_date))
        OR ($5='upcoming' AND rv.effective_from > current_date))
    ORDER BY rm.category,rm.code,rv.revision DESC`, [search, `%${search}%`, category || null, status || null, effective || null]);
  return result.rows;
}

export async function history(id) {
  const result = await query(`SELECT rm.id,rm.code,rm.name,rm.category,rm.unit,rm.machine_or_operation,
    rv.id AS version_id,rv.revision,rv.value,to_char(rv.effective_from,'YYYY-MM-DD') AS effective_from,to_char(rv.effective_to,'YYYY-MM-DD') AS effective_to,rv.status,rv.created_at,rv.created_by,
    u.name AS created_by_name FROM rate_masters rm JOIN rate_master_versions rv ON rv.rate_master_id=rm.id
    JOIN users u ON u.id=rv.created_by WHERE rm.id=$1 ORDER BY rv.revision DESC`, [id]);
  return result.rows;
}

export async function findOverlap(client, rateMasterId, from, to) {
  const result = await client.query(`SELECT id FROM rate_master_versions WHERE rate_master_id=$1
    AND status <> 'retired' AND effective_from <= COALESCE($3::date,'9999-12-31')
    AND COALESCE(effective_to,'9999-12-31') >= $2::date LIMIT 1`, [rateMasterId, from, to || null]);
  return result.rows[0];
}
