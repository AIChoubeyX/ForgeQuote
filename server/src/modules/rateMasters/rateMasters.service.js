import { pool, query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import * as repository from './rateMasters.repository.js';

export const list = input => repository.list(input);
export async function getHistory(id) {
  const rows = await repository.history(id);
  if (!rows.length) throw new AppError(404, 'Rate master not found');
  return rows;
}

export async function create(input, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let parent = await client.query('SELECT id FROM rate_masters WHERE category=$1 AND code=$2', [input.category, input.code]);
    if (!parent.rowCount) {
      parent = await client.query(`INSERT INTO rate_masters (code,name,category,unit,machine_or_operation) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [input.code, input.name, input.category, input.unit, input.machineOrOperation || null]);
    } else {
      await client.query('UPDATE rate_masters SET name=$1,unit=$2,machine_or_operation=$3 WHERE id=$4',
        [input.name, input.unit, input.machineOrOperation || null, parent.rows[0].id]);
    }
    const rateMasterId = parent.rows[0].id;
    if (await repository.findOverlap(client, rateMasterId, input.effectiveFrom, input.effectiveTo)) {
      throw new AppError(409, 'Effective period overlaps an existing rate revision');
    }
    const revision = await client.query('SELECT COALESCE(max(revision),0)+1 AS next FROM rate_master_versions WHERE rate_master_id=$1', [rateMasterId]);
    const version = await client.query(`INSERT INTO rate_master_versions
      (rate_master_id,revision,value,effective_from,effective_to,created_by)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [rateMasterId, revision.rows[0].next, input.value, input.effectiveFrom, input.effectiveTo || null, user.id]);
    await audit.record(client, { actorId: user.id, entityType: 'rate_master', entityId: version.rows[0].id, action: 'created', metadata: { code: input.code, revision: version.rows[0].revision } });
    await client.query('COMMIT');
    return version.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw new AppError(409, 'Rate identity or revision already exists');
    throw error;
  } finally { client.release(); }
}

export async function applicable(id, date) {
  const result = await query(`SELECT rm.code,rm.name,rm.category,rm.unit,rv.id,rv.rate_master_id,rv.revision,rv.value,
    to_char(rv.effective_from,'YYYY-MM-DD') AS effective_from,to_char(rv.effective_to,'YYYY-MM-DD') AS effective_to,rv.status,rv.created_by,rv.created_at FROM rate_masters rm
    JOIN rate_master_versions rv ON rv.rate_master_id=rm.id
    WHERE rm.id=$1 AND rv.status='active' AND rv.effective_from <= $2::date
      AND (rv.effective_to IS NULL OR rv.effective_to >= $2::date)`, [id, date]);
  if (!result.rows[0]) throw new AppError(404, 'No rate applies on that date');
  return result.rows[0];
}
