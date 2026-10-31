import { describe, it, expect, vi } from 'vitest';
import { Role } from '@prisma/client';
import { resolveCustomerIdScope, applyCustomerScope, ForbiddenError } from '../utils/customerScope.js';
import { requireRole } from '../middleware/requireRole.js';
import { Request, Response } from 'express';

describe('Customer Access, Isolation & Staff RBAC Guards', () => {
  const customerA = {
    id: 'customer-aaa-111',
    name: 'Customer Alice',
    email: 'alice@example.com',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const customerB = {
    id: 'customer-bbb-222',
    name: 'Customer Bob',
    email: 'bob@example.com',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const staffUser = {
    id: 'staff-sss-333',
    name: 'Support Staff',
    email: 'staff@brightloop.com',
    role: Role.STAFF,
    isActive: true,
  };

  const adminUser = {
    id: 'admin-zzz-999',
    name: 'Brightloop Admin',
    email: 'admin@brightloop.com',
    role: Role.ADMIN,
    isActive: true,
  };

  function createMockHttp(user?: any) {
    const req = { user } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
  }

  describe('1. Customer Data Isolation (Subscriptions, Invoices, Payments)', () => {
    it('customer automatically receives their own customerId for subscription listings', () => {
      const scoped = resolveCustomerIdScope(customerA);
      expect(scoped).toBe('customer-aaa-111');

      const where = applyCustomerScope(customerA, { status: 'ACTIVE' });
      expect(where).toEqual({
        status: 'ACTIVE',
        customerId: 'customer-aaa-111',
      });
    });

    it('customer automatically receives their own customerId for invoice listings', () => {
      const scoped = resolveCustomerIdScope(customerA);
      expect(scoped).toBe('customer-aaa-111');

      const invoiceWhere = applyCustomerScope(customerA, { status: 'CONFIRMED' });
      expect(invoiceWhere).toEqual({
        status: 'CONFIRMED',
        customerId: 'customer-aaa-111',
      });
    });

    it('customer is forbidden from querying another customer ID in query parameters', () => {
      expect(() => {
        resolveCustomerIdScope(customerA, customerB.id);
      }).toThrowError(ForbiddenError);
    });

    it('customer is forbidden from reading individual subscriptions owned by other customers', () => {
      const otherSub = { id: 'sub-2', customerId: customerB.id };
      expect(() => {
        resolveCustomerIdScope(customerA, otherSub.customerId);
      }).toThrow('Customers may only access their own data.');
    });

    it('customer is forbidden from reading individual invoices owned by other customers', () => {
      const otherInvoice = { id: 'inv-99', customerId: customerB.id };
      expect(() => {
        resolveCustomerIdScope(customerA, otherInvoice.customerId);
      }).toThrow('Customers may only access their own data.');
    });

    it('customer is allowed to access their own individual subscription or invoice', () => {
      const ownSub = { id: 'sub-1', customerId: customerA.id };
      expect(resolveCustomerIdScope(customerA, ownSub.customerId)).toBe('customer-aaa-111');
    });
  });

  describe('2. Customer Blocked from Staff-Only Endpoints', () => {
    it('blocks customer from calling quotation-templates endpoint (requireRole ADMIN, STAFF)', () => {
      const { req, res, next } = createMockHttp(customerA);
      const guard = requireRole(Role.ADMIN, Role.STAFF);

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Forbidden: Action requires one of [ADMIN, STAFF] role privileges.'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks customer from calling customer listing /api/users/customers (requireRole ADMIN, STAFF)', () => {
      const { req, res, next } = createMockHttp(customerA);
      const guard = requireRole(Role.ADMIN, Role.STAFF);

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks customer from calling catalog management /api/plans and /api/products', () => {
      const { req, res, next } = createMockHttp(customerA);
      const guard = requireRole(Role.ADMIN, Role.STAFF);

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks customer from triggering recurring billing batches /api/invoices/run-billing', () => {
      const { req, res, next } = createMockHttp(customerA);
      const guard = requireRole(Role.ADMIN, Role.STAFF);

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks customer from transitioning subscription status /api/subscriptions/:id/transition', () => {
      const { req, res, next } = createMockHttp(customerA);
      const guard = requireRole(Role.ADMIN, Role.STAFF);

      guard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('3. Admin and Staff Global Visibility & Operations', () => {
    it('admin sees all records when no filter is requested', () => {
      const scoped = resolveCustomerIdScope(adminUser);
      expect(scoped).toBeUndefined();

      const where = applyCustomerScope(adminUser, { status: 'ACTIVE' });
      expect(where).toEqual({ status: 'ACTIVE' });
    });

    it('staff sees all records when no filter is requested', () => {
      const scoped = resolveCustomerIdScope(staffUser);
      expect(scoped).toBeUndefined();

      const where = applyCustomerScope(staffUser, { status: 'CONFIRMED' });
      expect(where).toEqual({ status: 'CONFIRMED' });
    });

    it('admin can optionally filter to any specific customer', () => {
      const scoped = resolveCustomerIdScope(adminUser, 'customer-aaa-111');
      expect(scoped).toBe('customer-aaa-111');

      const where = applyCustomerScope(adminUser, {}, 'customerId');
      expect(where).toEqual({});
    });

    it('staff can optionally filter to any specific customer', () => {
      const scoped = resolveCustomerIdScope(staffUser, 'customer-bbb-222');
      expect(scoped).toBe('customer-bbb-222');
    });

    it('admin and staff are permitted by requireRole(ADMIN, STAFF)', () => {
      const guard = requireRole(Role.ADMIN, Role.STAFF);

      // Test Admin
      const adminCtx = createMockHttp(adminUser);
      guard(adminCtx.req, adminCtx.res, adminCtx.next);
      expect(adminCtx.next).toHaveBeenCalled();
      expect(adminCtx.res.status).not.toHaveBeenCalled();

      // Test Staff
      const staffCtx = createMockHttp(staffUser);
      guard(staffCtx.req, staffCtx.res, staffCtx.next);
      expect(staffCtx.next).toHaveBeenCalled();
      expect(staffCtx.res.status).not.toHaveBeenCalled();
    });
  });
});

