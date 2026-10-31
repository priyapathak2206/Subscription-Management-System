import { z } from 'zod';
import { passwordZodSchema } from '../../utils/password.js';

export const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address'),
  password: passwordZodSchema,
});

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string({ required_error: 'Reset token is required' }).min(1, 'Reset token is required'),
  password: passwordZodSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

