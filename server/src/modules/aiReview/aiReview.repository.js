import { query } from '../../config/database.js';

export async function insertReview({
  reviewType,
  rfqId,
  costingRevisionId,
  commercialReviewId,
  revisionNumber,
  actorId,
  status,
  summary,
  findings,
  recommendations,
  limitations,
  modelMetadata
}) {
  const result = await query(
    `INSERT INTO ai_reviews (
      review_type, rfq_id, costing_revision_id, commercial_review_id,
      revision_number, actor_id, status, summary, findings,
      recommendations, limitations, model_metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      reviewType,
      rfqId,
      costingRevisionId || null,
      commercialReviewId || null,
      revisionNumber || null,
      actorId,
      status,
      summary,
      JSON.stringify(findings || []),
      JSON.stringify(recommendations || []),
      JSON.stringify(limitations || []),
      JSON.stringify(modelMetadata || {})
    ]
  );
  return result.rows[0];
}

export async function findLatestReview({ reviewType, costingRevisionId, commercialReviewId, rfqId }) {
  if (costingRevisionId) {
    const res = await query(
      `SELECT ar.*, u.name AS actor_name, u.role AS actor_role
       FROM ai_reviews ar
       JOIN users u ON u.id = ar.actor_id
       WHERE ar.costing_revision_id = $1 AND ar.review_type = $2
       ORDER BY ar.created_at DESC LIMIT 1`,
      [costingRevisionId, reviewType]
    );
    return res.rows[0];
  }
  if (commercialReviewId) {
    const res = await query(
      `SELECT ar.*, u.name AS actor_name, u.role AS actor_role
       FROM ai_reviews ar
       JOIN users u ON u.id = ar.actor_id
       WHERE ar.commercial_review_id = $1 AND ar.review_type = $2
       ORDER BY ar.created_at DESC LIMIT 1`,
      [commercialReviewId, reviewType]
    );
    return res.rows[0];
  }
  if (rfqId) {
    const res = await query(
      `SELECT ar.*, u.name AS actor_name, u.role AS actor_role
       FROM ai_reviews ar
       JOIN users u ON u.id = ar.actor_id
       WHERE ar.rfq_id = $1 AND ar.review_type = $2
       ORDER BY ar.created_at DESC LIMIT 1`,
      [rfqId, reviewType]
    );
    return res.rows[0];
  }
  return null;
}

export async function listReviews({ rfqId, costingRevisionId, commercialReviewId }) {
  const conditions = [];
  const params = [];
  if (costingRevisionId) {
    params.push(costingRevisionId);
    conditions.push(`ar.costing_revision_id = $${params.length}`);
  } else if (commercialReviewId) {
    params.push(commercialReviewId);
    conditions.push(`ar.commercial_review_id = $${params.length}`);
  } else if (rfqId) {
    params.push(rfqId);
    conditions.push(`ar.rfq_id = $${params.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const res = await query(
    `SELECT ar.id, ar.review_type, ar.rfq_id, ar.costing_revision_id, ar.commercial_review_id,
            ar.revision_number, ar.status, ar.summary, ar.findings, ar.recommendations,
            ar.limitations, ar.model_metadata, ar.created_at,
            u.name AS actor_name, u.role AS actor_role
     FROM ai_reviews ar
     JOIN users u ON u.id = ar.actor_id
     ${whereClause}
     ORDER BY ar.created_at DESC LIMIT 50`,
    params
  );
  return res.rows;
}

