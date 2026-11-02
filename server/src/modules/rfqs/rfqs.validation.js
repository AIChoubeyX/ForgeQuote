import { z } from 'zod';
export const rfqSchema = z.object({
  rfqNumber: z.string().trim().min(1).max(80),
  customerId: z.string().uuid(),
  receivedDate: z.string().date(),
  dueDate: z.string().date(),
  assignedEstimatorId: z.string().uuid(),
  status: z.enum(['draft','in_progress','ready_for_quote','quoted','closed']).default('draft'),
  sourceNotes: z.string().max(2000).default(''),
  part: z.object({ name: z.string().trim().min(1).max(160), description: z.string().max(2000).default(''), material: z.string().trim().min(1).max(120), grossWeight: z.number().positive(), annualVolume: z.number().int().positive() })
}).refine(value => value.dueDate >= value.receivedDate, { message: 'Due date cannot be before received date', path: ['dueDate'] });
