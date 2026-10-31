import { z } from 'zod';
import { BillingPeriod } from '@prisma/client';

export const createPlanSchema = z.object({
  name: z.string({ required_error: 'Plan name is required' }).trim().min(2, 'Plan name must be at least 2 characters'),
  price: z.coerce.number().min(0, 'Price must be non-negative'),
  billingPeriod: z.nativeEnum(BillingPeriod, {
    errorMap: () => ({ message: 'billingPeriod must be one of: DAILY, WEEKLY, MONTHLY, YEARLY' }),
  }),
  minQuantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
  startDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
  endDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
  autoClose: z.boolean().default(false),
  closable: z.boolean().default(true),
  pausable: z.boolean().default(true),
  renewable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export const listPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  billingPeriod: z.nativeEnum(BillingPeriod).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema>;

