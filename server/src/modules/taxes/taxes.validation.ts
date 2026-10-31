import { z } from 'zod';

export const createTaxSchema = z.object({
  name: z.string({ required_error: 'Tax name is required' }).trim().min(2, 'Tax name must be at least 2 characters'),
  ratePercent: z.coerce.number().min(0, 'Tax rate must be at least 0%').max(100, 'Tax rate cannot exceed 100%'),
  active: z.boolean().default(true),
});

export const updateTaxSchema = createTaxSchema.partial();

export const listTaxesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().optional(),
  active: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateTaxInput = z.infer<typeof createTaxSchema>;
export type UpdateTaxInput = z.infer<typeof updateTaxSchema>;
export type ListTaxesQuery = z.infer<typeof listTaxesQuerySchema>;

