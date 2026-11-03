import { z } from 'zod';

const decimal = z.union([z.string().regex(/^\d+(\.\d+)?$/), z.number().finite().nonnegative()]).transform(String);
const operation = z.object({
  sequence: z.number().int().positive(),
  operationName: z.string().trim().min(1).max(120),
  machineCode: z.string().trim().min(1).max(80),
  cycleTimeMinutes: decimal.refine(value => Number(value) > 0, 'Cycle time must be positive')
});
export const costingSchema = z.object({
  costingDate: z.string().date(),
  materialRateCode: z.string().trim().min(1).max(80),
  materialWeight: decimal.refine(value => Number(value) > 0),
  scrapRateCode: z.string().trim().min(1).max(80),
  overheadRateCode: z.string().trim().min(1).max(80),
  packingRateCode: z.string().trim().min(1).max(80),
  freightRateCode: z.string().trim().min(1).max(80),
  marginRateCode: z.string().trim().min(1).max(80),
  operations: z.array(operation).min(1)
});
