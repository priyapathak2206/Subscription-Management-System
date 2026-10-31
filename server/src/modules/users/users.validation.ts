import { z } from 'zod';
import { passwordZodSchema } from '../../utils/password.js';

export const createStaffSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address'),
  password: passwordZodSchema,
});

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive flag is required' }),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffStatusInput = z.infer<typeof updateStaffStatusSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

