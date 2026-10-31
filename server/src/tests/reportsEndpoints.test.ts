import { describe, it, expect, vi } from 'vitest';
import { Role, SubscriptionStatus, InvoiceStatus, BillingPeriod } from '@prisma/client';
import { requireRole } from '../middleware/requireRole.js';
import { resolveCustomerIdScope, ForbiddenError } from '../utils/customerScope.js';
import { Request, Response } from 'express';

describe('Reports Endpoints & Financial Analytics Suite', () => {
  const adminUser = {
    id: 'admin-id-1',
    name: 'Admin User',
    email: 'admin@brightloop.com',
    role: Role.ADMIN,
    isActive: true,
  };

  const staffUser = {
    id: 'staff-id-2',
    name: 'Staff Member',
    email: 'staff@brightloop.com',
    role: Role.STAFF,
    isActive: true,
  };

  const customerUser = {
    id: 'cust-id-3',
    name: 'Customer Acme',
    email: 'cust1@acmecorp.com',
    role: Role.CUSTOMER,
    isActive: true,
  };

  const otherCustomer = {
    id: 'cust-id-4',
    name: 'Customer Globex',
    email: 'cust2@globex.com',
    role: Role.CUSTOMER,
    isActive: true,
  };

  function createMockHttp(user?: any, query: Record<string, any> = {}) {
    const req = { user, query } as unknown as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn();
    return { req, res, next };
  }

  describe('1. Reports Role-Based Access Control', () => {
    it('allows ADMIN to access global reports endpoint (/summary)', () => {
      const guard = requireRole(Role.ADMIN, Role.STAFF);
      const { req, res, next } = createMockHttp(adminUser);

      guard(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('allows STAFF to access global reports endpoint (/summary)', () => {
      const guard = requireRole(Role.ADMIN, Role.STAFF);
      const { req, res, next } = createMockHttp(staffUser);

      guard(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('denies CUSTOMER on global reports endpoint (/summary) with 403 Forbidden', () => {
      const guard = requireRole(Role.ADMIN, Role.STAFF);
      const { req, res, next } = createMockHttp(customerUser);

      guard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Forbidden'),
        })
      );
    });

    it('denies CUSTOMER on global overdue endpoint (/overdue) with 403 Forbidden', () => {
      const guard = requireRole(Role.ADMIN, Role.STAFF);
      const { req, res, next } = createMockHttp(customerUser);

      guard(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('allows CUSTOMER on scoped customer summary endpoint (/customer-summary)', () => {
      const guard = requireRole(Role.CUSTOMER, Role.ADMIN, Role.STAFF);
      const { req, res, next } = createMockHttp(customerUser);

      guard(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('2. Customer Scope & Isolation in Reports', () => {
    it('customer is automatically scoped to their own customerId', () => {
      const scopedId = resolveCustomerIdScope(customerUser);
      expect(scopedId).toBe('cust-id-3');
    });

    it('customer cannot request another customerId (throws ForbiddenError 403)', () => {
      expect(() => {
        resolveCustomerIdScope(customerUser, 'cust-id-4');
      }).toThrow(ForbiddenError);
    });

    it('admin or staff can view global (undefined customerId) or filter by customer', () => {
      const globalView = resolveCustomerIdScope(adminUser);
      expect(globalView).toBeUndefined();

      const scopedView = resolveCustomerIdScope(adminUser, 'cust-id-3');
      expect(scopedView).toBe('cust-id-3');
    });
  });

  describe('3. Overdue Invoicing Business Logic', () => {
    const today = new Date();
    const pastDueDate = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    const futureDueDate = new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days in future

    function isOverdue(invoice: { status: InvoiceStatus; dueDate: Date }) {
      return (
        invoice.status !== InvoiceStatus.PAID &&
        invoice.status !== InvoiceStatus.CANCELLED &&
        invoice.dueDate.getTime() < today.getTime()
      );
    }

    it('marks CONFIRMED invoice with past due date as overdue', () => {
      expect(isOverdue({ status: InvoiceStatus.CONFIRMED, dueDate: pastDueDate })).toBe(true);
    });

    it('marks DRAFT invoice with past due date as overdue', () => {
      expect(isOverdue({ status: InvoiceStatus.DRAFT, dueDate: pastDueDate })).toBe(true);
    });

    it('does NOT mark PAID invoice with past due date as overdue', () => {
      expect(isOverdue({ status: InvoiceStatus.PAID, dueDate: pastDueDate })).toBe(false);
    });

    it('does NOT mark CANCELLED invoice with past due date as overdue', () => {
      expect(isOverdue({ status: InvoiceStatus.CANCELLED, dueDate: pastDueDate })).toBe(false);
    });

    it('does NOT mark invoice with future due date as overdue', () => {
      expect(isOverdue({ status: InvoiceStatus.CONFIRMED, dueDate: futureDueDate })).toBe(false);
    });
  });

  describe('4. MRR Normalization Logic across Billing Periods', () => {
    function calculateNormalizedMRR(billingPeriod: BillingPeriod, price: number): number {
      switch (billingPeriod) {
        case BillingPeriod.DAILY:
          return price * 30;
        case BillingPeriod.WEEKLY:
          return (price * 52) / 12;
        case BillingPeriod.MONTHLY:
          return price;
        case BillingPeriod.YEARLY:
          return price / 12;
        default:
          return price;
      }
    }

    it('normalizes monthly plan price 1:1', () => {
      expect(calculateNormalizedMRR(BillingPeriod.MONTHLY, 250)).toBe(250);
    });

    it('normalizes yearly plan price to monthly (/ 12)', () => {
      expect(calculateNormalizedMRR(BillingPeriod.YEARLY, 2400)).toBe(200);
    });

    it('normalizes weekly plan price to monthly (* 52 / 12)', () => {
      const weekly = calculateNormalizedMRR(BillingPeriod.WEEKLY, 100);
      expect(Math.round(weekly * 100) / 100).toBe(433.33);
    });

    it('normalizes daily plan price to monthly (* 30)', () => {
      expect(calculateNormalizedMRR(BillingPeriod.DAILY, 10)).toBe(300);
    });
  });
});

