import { pool, query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as rates from '../rateMasters/rateMasters.repository.js';
import * as audit from '../audit/audit.service.js';
import * as repository from './costing.repository.js';
import { calculateCost } from './costing.calculator.js';

async function rateFor(client, code, date) {
  const result = await client.query(`SELECT rm.code,rv.id AS version_id,rv.value,rm.unit
    FROM rate_masters rm JOIN rate_master_versions rv ON rv.rate_master_id=rm.id
    WHERE rm.code=$1 AND rv.status='active' AND rv.effective_from <= $2::date
      AND (rv.effective_to IS NULL OR rv.effective_to >= $2::date)
    ORDER BY rv.revision DESC LIMIT 1`, [code, date]);
  if (!result.rows[0]) throw new AppError(422, `No active rate found for ${code} on ${date}`);
  return result.rows[0];
}

async function resolvedInput(client, input) {
  const codes = ['materialRateCode', 'scrapRateCode', 'overheadRateCode', 'packingRateCode', 'freightRateCode', 'marginRateCode'];
  const resolved = {};
  for (const code of codes) resolved[code] = await rateFor(client, input[code], input.costingDate);
  return resolved;
}

export async function getForRfq(rfqId, user) {
  const part = await repository.partForRfq(rfqId);
  if (!part) throw new AppError(404, 'RFQ not found');
  if (user.role === 'estimator' && part.owner_id !== user.id) throw new AppError(403, 'You do not have permission to view this RFQ');
  const latest = (await query('SELECT id FROM costing_revisions WHERE rfq_part_id=$1 ORDER BY revision DESC LIMIT 1', [part.part_id])).rows[0];
  const revision = latest ? await repository.byId(latest.id) : null;
  return { part, revision };
}

export async function saveDraft(rfqId, input, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const part = await repository.partForRfq(rfqId);
    if (!part) throw new AppError(404, 'RFQ not found');
    if (user.role !== 'estimator' || part.owner_id !== user.id) throw new AppError(403, 'Only the assigned estimator can save costing');
    const resolved = await resolvedInput(client, input);
    const operations = [];
    for (const operation of input.operations) {
      const rate = await rateFor(client, operation.machineCode, input.costingDate);
      operations.push({ ...operation, rateVersionId: rate.version_id, rateValue: rate.value, rateUnit: rate.unit });
    }
    const calculations = calculateCost({
      materialRate: resolved.materialRateCode.value, scrapRate: resolved.scrapRateCode.value,
      overheadRate: resolved.overheadRateCode.value, packingRate: resolved.packingRateCode.value,
      freightRate: resolved.freightRateCode.value, marginRate: resolved.marginRateCode.value,
      materialWeight: input.materialWeight, annualVolume: part.annual_volume, operations
    });
    const latest = await repository.latest(client, part.part_id);
    if (latest?.status === 'pending_review' || latest?.status === 'approved') throw new AppError(409, 'Submitted costing revisions are immutable');
    const revision = (latest?.revision || 0) + 1;
    const created = await client.query(`INSERT INTO costing_revisions (rfq_part_id,revision,status,costing_date,inputs,calculations,created_by)
      VALUES ($1,$2,'draft',$3,$4,$5,$6) RETURNING *`,
      [part.part_id, revision, input.costingDate, JSON.stringify({ ...input, rates: Object.fromEntries(Object.entries(resolved).map(([key, rate]) => [key, { versionId: rate.version_id, value: rate.value, unit: rate.unit }]) )}), JSON.stringify(calculations), user.id]);
    for (const operation of operations) await client.query(`INSERT INTO costing_operations
      (costing_revision_id,sequence,operation_name,machine_code,cycle_time_minutes,rate_version_id,rate_value,rate_unit)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [created.rows[0].id, operation.sequence, operation.operationName, operation.machineCode, operation.cycleTimeMinutes, operation.rateVersionId, operation.rateValue, operation.rateUnit]);
    await audit.record(client, { actorId: user.id, entityType: 'costing', entityId: created.rows[0].id, action: 'draft_saved', metadata: { revision } });
    await client.query('COMMIT');
    return repository.byId(created.rows[0].id);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function submit(id, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE costing_revisions cr SET status='pending_review',updated_at=now(),row_version=row_version+1
      FROM rfq_parts p JOIN rfqs r ON r.id=p.rfq_id WHERE cr.id=$1 AND cr.status='draft' AND cr.rfq_part_id=p.id AND r.owner_id=$2 RETURNING cr.*`, [id, user.id]);
    if (!result.rowCount) throw new AppError(409, 'Only the assigned estimator can submit a draft costing revision');
    await audit.record(client, { actorId: user.id, entityType: 'costing', entityId: id, action: 'submitted_for_routing_review', metadata: {} });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export const get = async (id, user) => {
  const value = await repository.byId(id);
  if (!value) throw new AppError(404, 'Costing revision not found');
  if (user.role === 'estimator' && value.owner_id !== user.id) throw new AppError(403, 'You do not have permission to view this costing');
  return value;
};
export const queue = ({ status } = {}) => repository.pending({ status });
