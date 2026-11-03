import { pool } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import * as repository from './rfqs.repository.js';
export async function list(input) { return repository.list(input); }
export async function get(id, user) { const value = await repository.findById(id); if (!value) throw new AppError(404, 'RFQ not found'); if (user.role === 'estimator' && value.owner_id !== user.id) throw new AppError(403, 'You do not have permission to view this RFQ'); return value; }
export async function save(input, user, id) {
  if (user.role !== 'estimator') throw new AppError(403, 'Only estimators can create or edit RFQs');
  if (user.role === 'estimator' && input.assignedEstimatorId !== user.id) throw new AppError(403, 'Estimators may only assign RFQs to themselves');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = id ? await repository.findById(id, client) : null;
    if (id && !existing) throw new AppError(404, 'RFQ not found');
    if (existing && user.role === 'estimator' && existing.owner_id !== user.id) throw new AppError(403, 'You do not have permission to edit this RFQ');
    const duplicate = await repository.findByNumber(input.rfqNumber, client);
    if (duplicate && duplicate.id !== id) throw new AppError(409, 'RFQ number already exists');
    const rfq = existing ? await repository.update(client, id, input) : await repository.insert(client, input);
    await repository.savePart(client, rfq.id, input.part, Boolean(existing));
    await audit.recordRfqEvent(client, { actorId: user.id, entityId: rfq.id, action: existing ? 'updated' : 'created', metadata: { rfqNumber: input.rfqNumber } });
    await client.query('COMMIT');
    return rfq;
  } catch (error) { await client.query('ROLLBACK'); if (error.code === '23505') throw new AppError(409, 'RFQ number already exists'); throw error; } finally { client.release(); }
}
