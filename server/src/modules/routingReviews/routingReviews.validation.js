import { z } from 'zod';
export const decisionSchema = z.object({
  decision: z.enum(['approved', 'changes_requested']),
  comment: z.string().trim().min(1).max(2000)
});
