import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { requireRole } from '../middleware/requireRole.js';
import { Request, Response } from 'express';

describe('Role Guard Middleware (requireRole)', () => {
  function createMockContext(user?: any) {
    const req = { user } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
  }

  it('returns 401 if request is unauthenticated', () => {
    const { req, res, next } = createMockContext(undefined);
    const guard = requireRole(Role.ADMIN);

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Authentication required' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 if user lacks required role', () => {
    const { req, res, next } = createMockContext({
      id: 'staff-1',
      role: Role.STAFF,
      isActive: true,
    });
    const guard = requireRole(Role.ADMIN);

    guard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Forbidden: Action requires one of [ADMIN] role privileges.'),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() if user role is included in allowed roles', () => {
    const { req, res, next } = createMockContext({
      id: 'admin-1',
      role: Role.ADMIN,
      isActive: true,
    });
    const guard = requireRole(Role.ADMIN, Role.STAFF);

    guard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

