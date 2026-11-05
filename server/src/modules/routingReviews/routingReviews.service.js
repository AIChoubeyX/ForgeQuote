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
  if (user.role !== 'plant_head') {
    throw new AppError(403, 'Only Plant Head can make routing review decisions');
  }
  if (!['approved', 'changes_requested'].includes(input.decision)) {
    throw new AppError(400, 'Invalid decision; must be approved or changes_requested');
  }
  if (input.decision === 'changes_requested' && !input.comment?.trim()) {
    throw new AppError(400, 'A reason/explanation is mandatory when returning a route for revision');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE costing_revisions
       SET status=$1, review_comment=$2, reviewed_by=$3,
           reviewed_at=now(), updated_at=now(), row_version=row_version+1
       WHERE id=$4 AND status='pending_review' AND row_version=$5
       RETURNING *`,
      [input.decision, input.comment, user.id, id, Number(input.rowVersion)]
    );
    if (!result.rowCount) {
      throw new AppError(409, 'This route is no longer pending or has changed; reload it before deciding');
    }

    await audit.record(client, {
      actorId: user.id,
      entityType: 'routing_review',
      entityId: id,
      action: input.decision,
      metadata: { comment: input.comment }
    });

    if (input.decision === 'approved') {
      // Plant Head approved: record moves to 'pending_sales_approval' for commercial sign-off
      await client.query(
        `UPDATE rfqs r SET status='pending_sales_approval', updated_at=now()
         FROM rfq_parts p WHERE p.rfq_id=r.id AND p.id=(SELECT rfq_part_id FROM costing_revisions WHERE id=$1)`,
        [id]
      );
      await client.query(
        `INSERT INTO commercial_reviews (costing_revision_id)
         VALUES ($1) ON CONFLICT (costing_revision_id) DO UPDATE SET status='pending',
         reviewer_id=NULL, comment=NULL, reviewed_at=NULL, row_version=commercial_reviews.row_version+1`,
        [id]
      );
    } else {
      // Plant Head requested changes: record moves to 'returned_for_revision'
      await client.query(
        `UPDATE rfqs r SET status='returned_for_revision', updated_at=now()
         FROM rfq_parts p WHERE p.rfq_id=r.id AND p.id=(SELECT rfq_part_id FROM costing_revisions WHERE id=$1)`,
        [id]
      );
    }

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
