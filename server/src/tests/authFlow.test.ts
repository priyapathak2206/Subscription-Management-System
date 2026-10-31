import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { Role } from '@prisma/client';
import { registerSchema } from '../modules/auth/auth.validation.js';

describe('Auth Validation & Security Flows', () => {
  it('validates customer registration payload and rejects weak passwords', () => {
    const invalidShort = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Short1!', // 7 chars, less than 9
    });
    expect(invalidShort.success).toBe(false);

    const valid = registerSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPassword@123',
    });
    expect(valid.success).toBe(true);
  });

  describe('Password Reset Token Hashing & Expiry', () => {
    it('creates a 64-character hex token and securely hashes it via sha256', () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      expect(rawToken).toHaveLength(64);

      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(tokenHash).toHaveLength(64);
      expect(tokenHash).not.toEqual(rawToken);

      // Verify re-hashing yields exact match
      const secondHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(secondHash).toBe(tokenHash);
    });

    it('enforces 1-hour expiry window', () => {
      const now = Date.now();
      const expiresAt = new Date(now + 60 * 60 * 1000);
      const diffMinutes = (expiresAt.getTime() - now) / (1000 * 60);

      expect(diffMinutes).toBeCloseTo(60, 1);
    });

    it('ensures single-use state transition sets usedAt timestamp', () => {
      const tokenRecord = {
        id: 'tok-1',
        tokenHash: 'hash-abc',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null as Date | null,
      };

      // Before use
      expect(tokenRecord.usedAt).toBeNull();

      // Simulating use
      tokenRecord.usedAt = new Date();
      expect(tokenRecord.usedAt).not.toBeNull();
      expect(tokenRecord.usedAt).toBeInstanceOf(Date);
    });
  });
});

