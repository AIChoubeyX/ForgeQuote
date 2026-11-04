import { pool, query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import * as repository from './rfqs.repository.js';

export async function list(input) { return repository.list(input); }
export async function get(id, user) {
  const value = await repository.findById(id);
  if (!value) throw new AppError(404, 'RFQ not found');
  if (user.role === 'estimator' && value.owner_id !== user.id) throw new AppError(403, 'You do not have permission to view this RFQ');
  return value;
}

export async function save(input, user, id) {
  if (user.role !== 'estimator') throw new AppError(403, 'Only estimators can create or edit RFQs');
  if (user.role === 'estimator' && input.assignedEstimatorId !== user.id) throw new AppError(403, 'Estimators may only assign RFQs to themselves');

  // Business rule: newly created RFQs cannot start in quoted or ready_for_quote status
  let sanitizedInput = { ...input };
  if (!id) {
    if (['quoted', 'ready_for_quote'].includes(sanitizedInput.status)) {
      sanitizedInput.status = 'draft';
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = id ? await repository.findById(id, client) : null;
    if (id && !existing) throw new AppError(404, 'RFQ not found');
    if (existing && user.role === 'estimator' && existing.owner_id !== user.id) throw new AppError(403, 'You do not have permission to edit this RFQ');
    
    // If editing existing, cannot jump to quoted without an actual issued quotation
    if (existing && sanitizedInput.status === 'quoted' && existing.status !== 'quoted') {
      const quotationCheck = await client.query(`
        SELECT q.id FROM quotations q
        JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
        JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
        JOIN rfq_parts p ON p.id = crv.rfq_part_id
        WHERE p.rfq_id = $1 AND q.status = 'issued' LIMIT 1
      `, [id]);
      if (!quotationCheck.rows[0]) {
        throw new AppError(409, 'An RFQ cannot be marked as quoted without an authoritative issued quotation');
      }
    }

    const duplicate = await repository.findByNumber(sanitizedInput.rfqNumber, client);
    if (duplicate && duplicate.id !== id) throw new AppError(409, 'RFQ number already exists');
    const rfq = existing ? await repository.update(client, id, sanitizedInput) : await repository.insert(client, sanitizedInput);
    await repository.savePart(client, rfq.id, sanitizedInput.part, Boolean(existing));
    await audit.recordRfqEvent(client, { actorId: user.id, entityId: rfq.id, action: existing ? 'updated' : 'created', metadata: { rfqNumber: sanitizedInput.rfqNumber } });
    await client.query('COMMIT');
    return rfq;
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') throw new AppError(409, 'RFQ number already exists'); throw error; } finally { client.release(); }
}
