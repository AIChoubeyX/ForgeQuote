import { pool } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import * as repository from './commercialReviews.repository.js';

export const queue = (status, highValue) => repository.queue(status, highValue);
export async function get(id) {
  const value = await repository.find(id);
  if (!value) throw new AppError(404, 'Commercial review not found');
  return value;
}

function companyConfig() {
  if (!env.companyName || !env.companyAddress || !env.quotationTaxRate || !env.quotationValidityDays) {
    throw new AppError(422, 'Quotation company details, tax rate, and validity days must be configured');
  }
  const taxRate = Number(env.quotationTaxRate);
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) throw new AppError(422, 'Quotation tax rate is invalid');
  return { name: env.companyName, address: env.companyAddress, taxRate, validityDays: env.quotationValidityDays };
}

async function createQuotation(client, review, user) {
  const existing = await client.query('SELECT * FROM quotations WHERE commercial_review_id=$1', [review.id]);
  if (existing.rows[0]) return existing.rows[0];
  const next = await client.query(`SELECT 'FQ-' || to_char(current_date,'YYYY') || '-' ||
    lpad(nextval('forgequote_quotation_number_seq')::text, 5, '0') AS number`);
  const calculations = review.calculations;
  const config = companyConfig();
  const snapshot = {
    company: config, quotationNumber: next.rows[0].number, rfqNumber: review.rfq_number,
    customerName: review.customer_name, partName: review.name, description: review.description,
    material: review.material, annualVolume: review.annual_volume, calculations,
    costingRevisionId: review.costing_revision_id, costingRevision: review.revision,
    approvedBy: user.id, approvedAt: new Date().toISOString()
  };
  const inserted = await client.query(`INSERT INTO quotations (commercial_review_id,quotation_number,snapshot)
    VALUES ($1,$2,$3) RETURNING *`, [review.id, next.rows[0].number, JSON.stringify(snapshot)]);
  return inserted.rows[0];
}

export async function decide(id, input, user) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const review = await repository.find(id);
    if (!review || review.status !== 'pending') throw new AppError(409, 'Commercial review is no longer pending');
    if (input.decision === 'approved' && review.costing_status !== 'approved') throw new AppError(409, 'Only plant-approved costing can receive commercial approval');
    const updated = await client.query(`UPDATE commercial_reviews SET status=$1,comment=$2,reviewer_id=$3,
      reviewed_at=now(),row_version=row_version+1 WHERE id=$4 AND status='pending' AND row_version=$5 RETURNING *`,
      [input.decision, input.comment, user.id, id, input.rowVersion]);
    if (!updated.rowCount) throw new AppError(409, 'Review changed; reload before deciding');
    if (input.decision === 'changes_requested') {
      await client.query(`UPDATE costing_revisions SET status='changes_requested',updated_at=now(),row_version=row_version+1
        WHERE id=$1 AND status='approved'`, [review.costing_revision_id]);
      await client.query(`UPDATE rfqs r SET status='in_progress',updated_at=now()
        FROM rfq_parts p JOIN costing_revisions cr ON cr.rfq_part_id=p.id
        WHERE p.rfq_id=r.id AND cr.id=$1`, [review.costing_revision_id]);
    }
    let quotation = null;
    if (input.decision === 'approved') {
      quotation = await createQuotation(client, { ...review, id }, user);
      await client.query(`UPDATE rfqs r SET status='ready_for_quote',updated_at=now()
        FROM rfq_parts p JOIN costing_revisions cr ON cr.rfq_part_id=p.id
        WHERE p.rfq_id=r.id AND cr.id=$1`, [review.costing_revision_id]);
    }
    await audit.record(client, { actorId: user.id, entityType: 'commercial_review', entityId: id, action: input.decision, metadata: { costingRevisionId: review.costing_revision_id } });
    await client.query('COMMIT');
    return { review: updated.rows[0], quotation };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
