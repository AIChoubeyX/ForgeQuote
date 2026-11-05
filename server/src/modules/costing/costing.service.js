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

    const latest = await repository.latest(client, part.part_id);
    if (latest?.status === 'pending_review' || latest?.status === 'approved') {
      throw new AppError(409, 'Submitted costing revisions are immutable and cannot be edited');
    }

    const resolved = await resolvedInput(client, input);
    const operations = [];
    for (const operation of (input.operations || [])) {
      const rate = await rateFor(client, operation.machineCode, input.costingDate);
      operations.push({ ...operation, rateVersionId: rate.version_id, rateValue: rate.value, rateUnit: rate.unit });
    }

    const calculations = calculateCost({
      materialRate: resolved.materialRateCode.value,
      scrapRate: resolved.scrapRateCode.value,
      overheadRate: resolved.overheadRateCode.value,
      packingRate: resolved.packingRateCode.value,
      freightRate: resolved.freightRateCode.value,
      marginRate: resolved.marginRateCode.value,
      materialWeight: input.materialWeight,
      annualVolume: part.annual_volume,
      operations
    });

    const ratesSnapshot = Object.fromEntries(
      Object.entries(resolved).map(([key, rate]) => [key, { versionId: rate.version_id, value: rate.value, unit: rate.unit }])
    );
    const serializedInputs = JSON.stringify({ ...input, rates: ratesSnapshot });
    const serializedCalcs = JSON.stringify(calculations);

    let revisionId;
    let revisionNumber;

    if (latest?.status === 'draft') {
      // Update existing draft in-place
      revisionId = latest.id;
      revisionNumber = latest.revision;
      await client.query(
        `UPDATE costing_revisions
         SET costing_date = $1, inputs = $2, calculations = $3, updated_at = now(), row_version = row_version + 1
         WHERE id = $4`,
        [input.costingDate, serializedInputs, serializedCalcs, revisionId]
      );
      await client.query(`DELETE FROM costing_operations WHERE costing_revision_id = $1`, [revisionId]);
    } else {
      // New revision draft (e.g. revision 1 or subsequent revision following changes_requested)
      revisionNumber = (latest?.revision || 0) + 1;
      const created = await client.query(
        `INSERT INTO costing_revisions (rfq_part_id, revision, status, costing_date, inputs, calculations, created_by)
         VALUES ($1, $2, 'draft', $3, $4, $5, $6) RETURNING id`,
        [part.part_id, revisionNumber, input.costingDate, serializedInputs, serializedCalcs, user.id]
      );
      revisionId = created.rows[0].id;
    }

    for (const operation of operations) {
      await client.query(
        `INSERT INTO costing_operations
         (costing_revision_id, sequence, operation_name, machine_code, cycle_time_minutes, rate_version_id, rate_value, rate_unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [revisionId, operation.sequence, operation.operationName, operation.machineCode, operation.cycleTimeMinutes, operation.rateVersionId, operation.rateValue, operation.rateUnit]
      );
    }

    // Transition RFQ status to 'in_progress'
    await client.query(
      `UPDATE rfqs SET status = 'in_progress', updated_at = now()
       WHERE id = $1 AND status IN ('draft', 'returned_for_revision', 'in_progress')`,
      [rfqId]
    );

    await audit.record(client, {
      actorId: user.id,
      entityType: 'costing',
      entityId: revisionId,
      action: 'draft_saved',
      metadata: { revision: revisionNumber }
    });

    await client.query('COMMIT');
    return repository.byId(revisionId);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function submit(id, user) {
  const client = await pool.connect();
  let rfqIdForAi = null;
  let rfqNumberForAi = null;
  let revisionNumForAi = null;

  try {
    await client.query('BEGIN');
    const revRes = await client.query(`
      SELECT cr.*, p.rfq_id, p.annual_volume, p.gross_weight, r.owner_id, r.rfq_number, r.status AS rfq_status
      FROM costing_revisions cr
      JOIN rfq_parts p ON p.id = cr.rfq_part_id
      JOIN rfqs r ON r.id = p.rfq_id
      WHERE cr.id = $1
    `, [id]);

    const cr = revRes.rows[0];
    if (!cr) throw new AppError(404, 'Costing revision not found');
    if (user.role !== 'estimator' || cr.owner_id !== user.id) {
      throw new AppError(403, 'Only the assigned estimator can finalize and submit costing');
    }
    if (cr.status !== 'draft') {
      throw new AppError(409, 'Only draft costing revisions can be submitted');
    }

    // Validate operations
    const opsRes = await client.query(
      `SELECT * FROM costing_operations WHERE costing_revision_id = $1 ORDER BY sequence ASC`,
      [id]
    );
    const operations = opsRes.rows;
    if (operations.length === 0) {
      throw new AppError(422, 'Cannot finalize costing: at least one manufacturing operation is required');
    }

    // Validate mandatory costing inputs
    const inputs = cr.inputs || {};
    const mandatoryCodes = ['materialRateCode', 'scrapRateCode', 'overheadRateCode', 'packingRateCode', 'freightRateCode', 'marginRateCode'];
    for (const codeKey of mandatoryCodes) {
      if (!inputs[codeKey]) {
        throw new AppError(422, `Cannot finalize costing: mandatory rate code ${codeKey} is missing`);
      }
    }
    const weight = Number(inputs.materialWeight || cr.gross_weight);
    if (!weight || weight <= 0) {
      throw new AppError(422, 'Cannot finalize costing: material gross weight must be greater than zero');
    }

    // Recalculate authoritative calculations on the backend
    const resolved = await resolvedInput(client, inputs);
    const resolvedOps = [];
    for (const op of operations) {
      const rate = await rateFor(client, op.machine_code, cr.costing_date);
      resolvedOps.push({
        sequence: op.sequence,
        operationName: op.operation_name,
        machineCode: op.machine_code,
        cycleTimeMinutes: op.cycle_time_minutes,
        rateVersionId: rate.version_id,
        rateValue: rate.value,
        rateUnit: rate.unit
      });
    }

    const calculations = calculateCost({
      materialRate: resolved.materialRateCode.value,
      scrapRate: resolved.scrapRateCode.value,
      overheadRate: resolved.overheadRateCode.value,
      packingRate: resolved.packingRateCode.value,
      freightRate: resolved.freightRateCode.value,
      marginRate: resolved.marginRateCode.value,
      materialWeight: weight,
      annualVolume: cr.annual_volume,
      operations: resolvedOps
    });

    const result = await client.query(
      `UPDATE costing_revisions
       SET status = 'pending_review',
           calculations = $2,
           reviewed_by = NULL,
           review_comment = NULL,
           reviewed_at = NULL,
           updated_at = now(),
           row_version = row_version + 1
       WHERE id = $1
       RETURNING *`,
      [id, JSON.stringify(calculations)]
    );

    // Update RFQ status to 'pending_plant_review'
    await client.query(
      `UPDATE rfqs SET status = 'pending_plant_review', updated_at = now() WHERE id = $1`,
      [cr.rfq_id]
    );

    await audit.record(client, {
      actorId: user.id,
      entityType: 'costing',
      entityId: id,
      action: 'submitted_for_routing_review',
      metadata: { revision: cr.revision, rfqId: cr.rfq_id }
    });

    await client.query('COMMIT');

    rfqIdForAi = cr.rfq_id;
    rfqNumberForAi = cr.rfq_number;
    revisionNumForAi = cr.revision;
    const submittedRevision = result.rows[0];

    // Trigger AI pre-review process (advisory pre-check before Plant Head review)
    try {
      const aiService = await import('../aiReview/aiReview.service.js');
      await aiService.executeReview({
        reviewType: 'routing_review',
        costingRevisionId: id,
        rfqId: rfqIdForAi
      }, user);
    } catch (aiErr) {
      console.warn(`[AI Review Pre-Check Advisory Notice] RFQ ${rfqNumberForAi} revision ${revisionNumForAi}: ${aiErr.message}`);
    }

    return submittedRevision;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const get = async (id, user) => {
  const value = await repository.byId(id);
  if (!value) throw new AppError(404, 'Costing revision not found');
  if (user.role === 'estimator' && value.owner_id !== user.id) throw new AppError(403, 'You do not have permission to view this costing');
  return value;
};

export async function aiContext(id, user) {
  const value = await get(id, user);
  return {
    rfq: {
      id: value.rfq_id,
      number: value.rfq_number,
      customer: value.customer_name,
      part: value.name,
      description: value.description,
      material: value.material,
      grossWeight: value.gross_weight,
      annualVolume: value.annual_volume
    },
    revision: {
      id: value.id,
      revision: value.revision,
      status: value.status,
      costingDate: value.costing_date,
      inputs: value.inputs,
      calculations: value.calculations,
      operations: value.operations
    }
  };
}

export const queue = ({ status } = {}) => repository.pending({ status });
