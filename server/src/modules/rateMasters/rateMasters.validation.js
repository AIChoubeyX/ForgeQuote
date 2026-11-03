import { z } from 'zod';

const categories = ['material_price', 'machine_hour', 'scrap_percent', 'overhead_percent', 'packing_cost', 'freight_rate', 'margin_percent'];
export const rateSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  category: z.enum(categories),
  unit: z.string().trim().min(1).max(40),
  machineOrOperation: z.string().trim().max(160).optional().or(z.literal('')),
  value: z.number().finite().min(0),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''))
}).superRefine((value, context) => {
  if (value.effectiveTo && value.effectiveTo < value.effectiveFrom) context.addIssue({ code: z.ZodIssueCode.custom, path: ['effectiveTo'], message: 'Effective-to must not precede effective-from' });
  if (['scrap_percent', 'overhead_percent', 'margin_percent'].includes(value.category) && value.value > 100) context.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Percentage rates must be between 0 and 100' });
});
