import { z } from 'zod';

export const reviewTypeSchema = z.enum([
  'costing_review',
  'routing_review',
  'commercial_review',
  'costing',
  'routing',
  'commercial'
]);

export function canonicalReviewType(type) {
  if (type === 'costing') return 'costing_review';
  if (type === 'routing') return 'routing_review';
  if (type === 'commercial') return 'commercial_review';
  return type;
}

export const findingSchema = z.object({
  code: z.string().min(1).max(100),
  severity: z.enum(['critical', 'warning', 'info']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  affectedRecord: z.string().max(200).optional(),
  evidence: z.string().max(2000).optional(),
  recommendation: z.string().max(2000).optional(),
  source: z.enum(['deterministic', 'ai_analysis'])
});

export const reviewRequestSchema = z.object({
  reviewType: reviewTypeSchema.optional(),
  feature: reviewTypeSchema.optional(), // compatibility with older UI
  costingRevisionId: z.string().uuid().optional(),
  commercialReviewId: z.string().uuid().optional(),
  rfqId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional()
}).refine(data => data.reviewType || data.feature, {
  message: 'reviewType is required',
  path: ['reviewType']
});

const stringOrJsonSchema = z
  .union([z.string(), z.array(z.unknown()), z.record(z.unknown())])
  .transform(val => (typeof val === 'string' ? val : JSON.stringify(val)))
  .optional();

export const aiModelFindingSchema = z.object({
  code: z.string().optional(),
  severity: z.string().optional(),
  title: z.string().optional(),
  message: z.string().optional(),
  explanation: z.string().optional(),
  affectedRecord: stringOrJsonSchema,
  affectedField: stringOrJsonSchema,
  evidence: stringOrJsonSchema,
  basis: stringOrJsonSchema,
  recommendation: z.string().optional()
});

export const aiModelResponseSchema = z.object({
  summary: z.string().min(1),
  findings: z.array(aiModelFindingSchema).default([]),
  recommendations: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([])
});

export const reviewResponseSchema = z.object({
  reviewType: z.string(),
  status: z.enum(['completed', 'insufficient_evidence', 'failed']),
  summary: z.string().min(1).max(5000),
  findings: z.array(findingSchema),
  recommendations: z.array(z.string().max(1000)),
  limitations: z.array(z.string().max(1000)),
  metadata: z.record(z.unknown())
});

