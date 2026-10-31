import { z } from 'zod';
import { DiscountType, DiscountAppliesTo } from '@prisma/client';

export const createDiscountSchema = z
  .object({
    name: z.string({ required_error: 'Discount name is required' }).trim().min(2, 'Name must be at least 2 characters'),
    type: z.nativeEnum(DiscountType, {
      errorMap: () => ({ message: 'Discount type must be either FIXED or PERCENT' }),
    }),
    value: z.coerce.number().min(0.01, 'Discount value must be greater than 0'),
    minPurchase: z.coerce.number().min(0).optional().nullable(),
    minQuantity: z.coerce.number().int().min(1).optional().nullable(),
    startDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
    usageLimit: z.coerce.number().int().min(1).optional().nullable(),
    appliesTo: z.nativeEnum(DiscountAppliesTo, {
      errorMap: () => ({ message: 'appliesTo must be either PRODUCT or SUBSCRIPTION' }),
    }),
    productIds: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENT && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      if (data.appliesTo === DiscountAppliesTo.PRODUCT && (!data.productIds || data.productIds.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'At least one product must be selected when discount applies to products',
      path: ['productIds'],
    }
  );

export const updateDiscountSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    type: z.nativeEnum(DiscountType).optional(),
    value: z.coerce.number().min(0.01).optional(),
    minPurchase: z.coerce.number().min(0).optional().nullable(),
    minQuantity: z.coerce.number().int().min(1).optional().nullable(),
    startDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
    endDate: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
    usageLimit: z.coerce.number().int().min(1).optional().nullable(),
    appliesTo: z.nativeEnum(DiscountAppliesTo).optional(),
    productIds: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === DiscountType.PERCENT && data.value !== undefined && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['value'],
    }
  );

export const listDiscountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  type: z.nativeEnum(DiscountType).optional(),
  appliesTo: z.nativeEnum(DiscountAppliesTo).optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountInput = z.infer<typeof updateDiscountSchema>;
export type ListDiscountsQuery = z.infer<typeof listDiscountsQuerySchema>;

