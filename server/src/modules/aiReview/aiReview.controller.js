import { reviewRequestSchema } from './aiReview.validation.js';
import * as service from './aiReview.service.js';

export async function review(req, res) {
  const input = reviewRequestSchema.parse({
    ...req.body,
    reviewType: req.body.reviewType || req.params.type
  });
  const data = await service.executeReview({ ...input, correlationId: req.correlationId }, req.user);
  res.json({ data });
}

export async function history(req, res) {
  const { rfqId, costingRevisionId, commercialReviewId } = req.query;
  const data = await service.getReviewHistory({
    rfqId,
    costingRevisionId,
    commercialReviewId,
    user: req.user
  });
  res.json({ data });
}

