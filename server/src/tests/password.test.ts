import { describe, it, expect } from 'vitest';
import { validatePasswordRules, passwordZodSchema } from '../utils/password.js';

describe('Password Policy Validation', () => {
  it('rejects passwords with 8 characters or fewer (rule: > 8 chars, min 9)', () => {
    const res = validatePasswordRules('Pass@123'); // 8 chars
    expect(res.isValid).toBe(false);
    expect(res.checks.minLength).toBe(false);
    expect(res.errors).toContain('Password must be more than 8 characters (minimum 9 characters)');
  });

  it('rejects passwords without an uppercase letter', () => {
    const res = validatePasswordRules('admin@1234');
    expect(res.isValid).toBe(false);
    expect(res.checks.hasUppercase).toBe(false);
    expect(res.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('rejects passwords without a lowercase letter', () => {
    const res = validatePasswordRules('ADMIN@1234');
    expect(res.isValid).toBe(false);
    expect(res.checks.hasLowercase).toBe(false);
    expect(res.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('rejects passwords without a special character', () => {
    const res = validatePasswordRules('Admin12345');
    expect(res.isValid).toBe(false);
    expect(res.checks.hasSpecial).toBe(false);
    expect(res.errors).toContain('Password must contain at least one special character');
  });

  it('accepts valid passwords meeting all criteria', () => {
    const res = validatePasswordRules('Admin@1234');
    expect(res.isValid).toBe(true);
    expect(res.checks.minLength).toBe(true);
    expect(res.checks.hasUppercase).toBe(true);
    expect(res.checks.hasLowercase).toBe(true);
    expect(res.checks.hasSpecial).toBe(true);
    expect(res.errors).toHaveLength(0);
  });

  it('validates with zod schema appropriately', () => {
    const valid = passwordZodSchema.safeParse('Secure#Pass1');
    expect(valid.success).toBe(true);

    const invalidShort = passwordZodSchema.safeParse('Short1!');
    expect(invalidShort.success).toBe(false);

    const invalidNoSpecial = passwordZodSchema.safeParse('NoSpecial99');
    expect(invalidNoSpecial.success).toBe(false);
  });
});

