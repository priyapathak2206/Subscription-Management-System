import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const PASSWORD_RULES = {
  MIN_LENGTH: 9, // MORE THAN 8 characters
  SPECIAL_CHAR_REGEX: /[^a-zA-Z0-9]/,
  UPPERCASE_REGEX: /[A-Z]/,
  LOWERCASE_REGEX: /[a-z]/,
};

export interface PasswordRuleResult {
  isValid: boolean;
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasSpecial: boolean;
  };
  errors: string[];
}

export function validatePasswordRules(password: string): PasswordRuleResult {
  const minLength = typeof password === 'string' && password.length >= PASSWORD_RULES.MIN_LENGTH;
  const hasUppercase = PASSWORD_RULES.UPPERCASE_REGEX.test(password || '');
  const hasLowercase = PASSWORD_RULES.LOWERCASE_REGEX.test(password || '');
  const hasSpecial = PASSWORD_RULES.SPECIAL_CHAR_REGEX.test(password || '');

  const errors: string[] = [];
  if (!minLength) {
    errors.push('Password must be more than 8 characters (minimum 9 characters)');
  }
  if (!hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasSpecial) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: minLength && hasUppercase && hasLowercase && hasSpecial,
    checks: {
      minLength,
      hasUppercase,
      hasLowercase,
      hasSpecial,
    },
    errors,
  };
}

export const passwordZodSchema = z
  .string({ required_error: 'Password is required' })
  .min(PASSWORD_RULES.MIN_LENGTH, {
    message: 'Password must be more than 8 characters (minimum 9 characters)',
  })
  .refine((val) => PASSWORD_RULES.UPPERCASE_REGEX.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => PASSWORD_RULES.LOWERCASE_REGEX.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => PASSWORD_RULES.SPECIAL_CHAR_REGEX.test(val), {
    message: 'Password must contain at least one special character',
  });

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

