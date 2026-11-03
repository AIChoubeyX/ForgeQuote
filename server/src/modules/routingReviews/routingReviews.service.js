import { pool } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import * as repository from './routingReviews.repository.js';

export const queue = status => repository.queue(status);
export async function get(id) {
  const value = await repository.find(id);
  if (!value) throw new AppError(404, 'Routing review not found');
  return value;
}
export async function decide(id, input, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`UPDATE costing_revisions SET status=$1,review_comment=$2,reviewed_by=$3,
      reviewed_at=now(),updated_at=now(),row_version=row_version+1
      WHERE id=$4 AND status='pending_review' AND row_version=$5 RETURNING *`,
      [input.decision, input.comment, user.id, id, Number(input.rowVersion)]);
    if (!result.rowCount) throw new AppError(409, 'This route is no longer pending or has changed; reload it before deciding');
    await audit.record(client, { actorId: user.id, entityType: 'routing_review', entityId: id, action: input.decision, metadata: { comment: input.comment } });
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
