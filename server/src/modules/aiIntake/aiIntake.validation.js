import { z } from 'zod';

const fieldStatus = z.enum(['extracted', 'needs_review', 'missing', 'conflicting']);
const evidence = z.object({
  source: z.string().min(1).max(5000),
  quote: z.string().max(500)
});

export const extractedField = z.object({
  value: z.union([z.string().max(1000), z.number(), z.null()]),
  status: fieldStatus,
  evidence: z.array(evidence).max(10),
  note: z.string().max(500).default('')
});

export const extractionResult = z.object({
  fields: z.object({
    customerName: extractedField,
    customerRfqReference: extractedField,
    receivedDate: extractedField,
    partName: extractedField,
    description: extractedField,
    partNumber: extractedField,
    material: extractedField,
    grossWeight: extractedField,
    grossWeightUnit: extractedField,
    annualVolume: extractedField,
    annualVolumeUnit: extractedField,
    drawingReference: extractedField,
    dueDate: extractedField
  }),
  missingFields: z.array(z.string().max(80)).max(20),
  conflicts: z.array(z.string().max(300)).max(20),
  warnings: z.array(z.string().max(300)).max(20),
  extractionStatus: z.enum(['review', 'insufficient_evidence'])
});

export const confirmInput = z.object({
  extractionId: z.string().uuid(),
  rfqNumber: z.string().trim().min(1, 'RFQ number is required').max(80),
  customerId: z.string().uuid().optional(),
  customerName: z.string().trim().min(1, 'Customer name is required').max(200),
  receivedDate: z.string().date(),
  dueDate: z.string().date(),
  assignedEstimatorId: z.string().uuid().optional(),
  sourceNotes: z.string().max(2000).default(''),
  part: z.object({
    name: z.string().trim().min(1, 'Part name is required').max(160),
    description: z.string().max(2000).default(''),
    material: z.string().trim().min(1, 'Material is required').max(120),
    grossWeight: z.number().positive('Gross weight must be positive'),
    annualVolume: z.number().int().positive('Annual volume must be a positive integer')
  })
}).refine(value => value.dueDate >= value.receivedDate, {
  message: 'Due date cannot be before received date',
  path: ['dueDate']
});

export const routingSuggestionResult = z.object({
  status: z.enum(['suggestions', 'insufficient_evidence']),
  suggestions: z.array(z.object({
    sequence: z.number().int().positive(),
    operationName: z.string().min(1).max(160),
    machineCode: z.string().min(1).max(80),
    rationale: z.string().min(1).max(500),
    historicalParts: z.array(z.object({ rfqNumber: z.string(), partName: z.string(), sourceOperationId: z.string().uuid() })).max(10)
  })).max(20),
  warnings: z.array(z.string().max(300)).max(20)
});

export const assistanceInput = z.object({
  feature: z.enum(['costing', 'routing', 'commercial', 'costing_review', 'routing_review', 'commercial_review']).optional(),
  reviewType: z.enum(['costing', 'routing', 'commercial', 'costing_review', 'routing_review', 'commercial_review']).optional(),
  costingRevisionId: z.string().uuid().optional(),
  commercialReviewId: z.string().uuid().optional(),
  rfqId: z.string().uuid().optional(),
  context: z.record(z.unknown()).optional()
}).refine(v => v.feature || v.reviewType, {
  message: 'feature or reviewType is required',
  path: ['feature']
});

export const assistanceResult = z.object({
  summary: z.string().min(1).max(5000),
  findings: z.array(z.object({
    code: z.string().optional(),
    severity: z.enum(['info', 'warning', 'critical']),
    title: z.string().optional(),
    category: z.string().max(120).optional(),
    message: z.string().min(1).max(2000),
    basis: z.string().max(2000).optional(),
    evidence: z.string().max(2000).optional(),
    affectedRecord: z.string().optional(),
    recommendation: z.string().max(2000).optional(),
    source: z.enum(['deterministic', 'ai_analysis']).optional()
  })),
  recommendations: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  status: z.enum(['ok', 'completed', 'insufficient_evidence', 'failed'])
});
