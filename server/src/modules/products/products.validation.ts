import { z } from 'zod';

export const productVariantInputSchema = z.object({
  id: z.string().optional(),
  attribute: z.string({ required_error: 'Variant attribute name is required' }).min(1, 'Attribute name is required'),
  value: z.string({ required_error: 'Variant value is required' }).min(1, 'Variant value is required'),
  extraPrice: z.coerce.number().default(0),
});

export const createProductSchema = z.object({
  name: z.string({ required_error: 'Product name is required' }).trim().min(2, 'Product name must be at least 2 characters'),
  type: z.string({ required_error: 'Product type is required' }).trim().min(1, 'Product type is required'),
  salesPrice: z.coerce.number().min(0, 'Sales price cannot be negative'),
  costPrice: z.coerce.number().min(0, 'Cost price cannot be negative'),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  variants: z.array(productVariantInputSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  type: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

