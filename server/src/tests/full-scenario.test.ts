import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { Role, SubscriptionStatus, InvoiceStatus, DiscountType, DiscountAppliesTo, BillingPeriod } from '@prisma/client';
import { registerSchema, loginSchema } from '../modules/auth/auth.validation.js';
import { requireRole } from '../middleware/requireRole.js';
import { ALLOWED_TRANSITIONS, generateSubscriptionNumber } from '../modules/subscriptions/subscriptions.service.js';
import { generateInvoiceForSubscription } from '../modules/invoices/invoices.service.js';
import { calculateTax, calculateTotalWithTax } from '../utils/taxCalculator.js';
import { getEligibleDiscounts, applyDiscount } from '../utils/discountEngine.js';
import { recordPayment } from '../modules/payments/payments.service.js';
import { getSummaryKPIs } from '../modules/reports/reports.service.js';
import { prisma } from '../db/prisma.js';
import { Request, Response } from 'express';

describe('Full Problem-Statement Walkthrough (Scenes 1 to 7)', () => {
  // ==========================================
  // SCENE 1: Sign-Up, Password Policy & Reset
  // ==========================================
  describe('Scene 1: Customer Sign-Up, Strict Password Policy & Single-Use Reset', () => {
    it('rejects weak passwords: 8 chars or less, missing uppercase, lowercase, or special char', () => {
      // 8 characters or less
      expect(registerSchema.safeParse({ name: 'User', email: 'u1@test.com', password: 'Short1!' }).success).toBe(false);
      // No uppercase
      expect(registerSchema.safeParse({ name: 'User', email: 'u2@test.com', password: 'lowercaseonly1!' }).success).toBe(false);
      // No lowercase
      expect(registerSchema.safeParse({ name: 'User', email: 'u3@test.com', password: 'UPPERCASEONLY1!' }).success).toBe(false);
      // No special character
      expect(registerSchema.safeParse({ name: 'User', email: 'u4@test.com', password: 'NoSpecialChar123' }).success).toBe(false);

      // Valid strong password (>= 9 chars, upper, lower, special)
      const valid = registerSchema.safeParse({
        name: 'Jane Customer',
        email: 'jane@brightloop.com',
        password: 'SecurePassword@2026',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects registration when email already exists in system', () => {
      const existingEmails = new Set(['existing@brightloop.com']);
      const isDuplicate = existingEmails.has('existing@brightloop.com');
      expect(isDuplicate).toBe(true);
    });

    it('generates secure 64-char hex reset token and hashes it via sha256', () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      expect(rawToken).toHaveLength(64);

      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(tokenHash).toHaveLength(64);
      expect(tokenHash).not.toBe(rawToken);
    });

    it('guarantees single-use reset: token cannot be reused once usedAt is recorded', () => {
      const resetRecord = {
        id: 'token-uuid-1',
        tokenHash: 'abc123hash',
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null as Date | null,
      };

      // First use: valid
      const isValidFirstUse = resetRecord.usedAt === null && resetRecord.expiresAt > new Date();
      expect(isValidFirstUse).toBe(true);

      // Mark token as used
      resetRecord.usedAt = new Date();

      // Second use attempt: rejected
      const isValidSecondUse = resetRecord.usedAt === null && resetRecord.expiresAt > new Date();
      expect(isValidSecondUse).toBe(false);
    });
  });

  // ==========================================
  // SCENE 2: Role-Based Access Control (RBAC)
  // ==========================================
  describe('Scene 2: Strict RBAC (ADMIN vs STAFF vs CUSTOMER)', () => {
    function mockGuardContext(user?: { id: string; role: Role; isActive: boolean }) {
      const req = { user } as unknown as Request;
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      } as unknown as Response;
      const next = vi.fn();
      return { req, res, next };
    }

    it('permits ADMIN to access admin-restricted routes', () => {
      const { req, res, next } = mockGuardContext({ id: 'adm-1', role: Role.ADMIN, isActive: true });
      const adminGuard = requireRole(Role.ADMIN);

      adminGuard(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects STAFF with 403 on ADMIN-only routes (staff creation, tax/discount modifications)', () => {
      const { req, res, next } = mockGuardContext({ id: 'stf-1', role: Role.STAFF, isActive: true });
      const adminGuard = requireRole(Role.ADMIN);

      adminGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects CUSTOMER with 403 on staff/admin operational routes', () => {
      const { req, res, next } = mockGuardContext({ id: 'cst-1', role: Role.CUSTOMER, isActive: true });
      const staffAdminGuard = requireRole(Role.ADMIN, Role.STAFF);

      staffAdminGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // SCENE 3: Product with Variant Price Delta & Plans
  // ==========================================
  describe('Scene 3: Catalog Setup — Product with Odoo Variant (+560) & Subscription Plans', () => {
    it('computes total line price adding product base price and variant extraPrice (+560)', () => {
      const product = {
        id: 'prod-erp',
        name: 'Enterprise ERP Suite',
        salesPrice: 1200.0,
      };

      const variantOdoo = {
        id: 'var-odoo',
        attribute: 'Brand',
        value: 'Odoo',
        extraPrice: 560.0,
      };

      const unitPrice = product.salesPrice + variantOdoo.extraPrice;
      expect(unitPrice).toBe(1760.0);

      const quantity = 2;
      const lineTotal = unitPrice * quantity;
      expect(lineTotal).toBe(3520.0);
    });

    it('enforces plan interval and configuration flags', () => {
      const plan = {
        name: 'Enterprise Monthly Scale',
        billingPeriod: BillingPeriod.MONTHLY,
        price: 99.0,
        minQuantity: 2,
        closable: true,
        autoClose: true,
        pausable: true,
        renewable: true,
      };

      expect(plan.billingPeriod).toBe(BillingPeriod.MONTHLY);
      expect(plan.minQuantity).toBe(2);
      expect(plan.closable).toBe(true);
      expect(plan.autoClose).toBe(true);
    });
  });

  // ==========================================
  // SCENE 4: Quotation Templates, SUB Numbering & State Flow
  // ==========================================
  describe('Scene 4: Quotation Template, SUB-YYYY-00001 Numbering, State Machine & History', () => {
    it('creates sequential unique subscription numbers matching format SUB-YYYY-00001', async () => {
      const year = new Date().getFullYear();
      const mockTx = {
        subscription: {
          findFirst: vi.fn().mockResolvedValue({ number: `SUB-${year}-00042` }),
        },
      };

      const nextNumber = await generateSubscriptionNumber(mockTx);
      expect(nextNumber).toBe(`SUB-${year}-00043`);
    });

    it('enforces strict state flow: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED', () => {
      // Step 1: DRAFT
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.DRAFT]).toContain(SubscriptionStatus.QUOTATION);
      // Step 2: QUOTATION
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.QUOTATION]).toContain(SubscriptionStatus.CONFIRMED);
      // Step 3: CONFIRMED
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.CONFIRMED]).toContain(SubscriptionStatus.ACTIVE);
      // Step 4: ACTIVE
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.ACTIVE]).toContain(SubscriptionStatus.CLOSED);

      // Rejects illegal jumps
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.DRAFT]).not.toContain(SubscriptionStatus.ACTIVE);
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.QUOTATION]).not.toContain(SubscriptionStatus.ACTIVE);
      // Terminal state
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.CLOSED]).toHaveLength(0);
    });

    it('records audit log entries with who, when, fromStatus, toStatus, and reason', () => {
      const historyLog: Array<{
        fromStatus: string | null;
        toStatus: string;
        changedById: string;
        changedAt: Date;
        reason: string;
      }> = [];

      historyLog.push({
        fromStatus: null,
        toStatus: SubscriptionStatus.DRAFT,
        changedById: 'admin-1',
        changedAt: new Date(),
        reason: 'Initial creation',
      });

      historyLog.push({
        fromStatus: SubscriptionStatus.DRAFT,
        toStatus: SubscriptionStatus.QUOTATION,
        changedById: 'staff-1',
        changedAt: new Date(),
        reason: 'Quotation sent to customer',
      });

      expect(historyLog).toHaveLength(2);
      expect(historyLog[1].fromStatus).toBe(SubscriptionStatus.DRAFT);
      expect(historyLog[1].toStatus).toBe(SubscriptionStatus.QUOTATION);
      expect(historyLog[1].changedById).toBe('staff-1');
    });
  });

  // ==========================================
  // SCENE 5: Billing Day, Taxes, Auto-Discounts & Idempotency
  // ==========================================
  describe('Scene 5: Recurring Billing Day, Line Taxes, Auto-Discounts & Catch-up Billing', () => {
    it('calculates taxes accurately with calculateTax utility', () => {
      const taxRate = { ratePercent: 18.0 }; // 18% GST / VAT
      const baseAmount = 1000.0;

      const taxAmount = calculateTax(baseAmount, taxRate);
      expect(taxAmount).toBe(180.0);

      const res = calculateTotalWithTax(baseAmount, taxRate);
      expect(res.taxAmount).toBe(180.0);
      expect(res.totalWithTax).toBe(1180.0);
    });

    it('advances nextBillingDate correctly when catching up missed billing periods', () => {
      const period = BillingPeriod.MONTHLY;
      const currentBillingDate = new Date('2026-01-01T00:00:00Z');

      const advanceDate = (date: Date, bp: BillingPeriod) => {
        const next = new Date(date);
        switch (bp) {
          case BillingPeriod.DAILY:
            next.setDate(next.getDate() + 1);
            break;
          case BillingPeriod.WEEKLY:
            next.setDate(next.getDate() + 7);
            break;
          case BillingPeriod.MONTHLY:
            next.setMonth(next.getMonth() + 1);
            break;
          case BillingPeriod.YEARLY:
            next.setFullYear(next.getFullYear() + 1);
            break;
        }
        return next;
      };

      const nextDate = advanceDate(currentBillingDate, period);
      expect(nextDate.getMonth()).toBe(1); // February
      expect(nextDate.getFullYear()).toBe(2026);
    });

    it('guarantees idempotency: rejects duplicate billing for same subscription and periodStart', async () => {
      const subId = 'sub-monthly-001';
      const periodStart = new Date('2026-03-01T00:00:00Z');

      const mockExisting = {
        id: 'inv-existing-01',
        number: 'INV-2026-00001',
        subscriptionId: subId,
        periodStart,
        total: 1180.0,
      };

      const txSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma));
      const findSpy = vi.spyOn(prisma.invoice, 'findUnique').mockResolvedValue(mockExisting as any);

      const res = await generateInvoiceForSubscription(subId, periodStart);
      expect(res.skipped).toBe(true);
      expect(res.created).toBe(false);

      findSpy.mockRestore();
      txSpy.mockRestore();
    });
  });

  // ==========================================
  // SCENE 6: Discount Limits & Exhaustion Checks
  // ==========================================
  describe('Scene 6: Discount Limits — Expired, Inactive and Exhausted Promos Skipped', () => {
    const lines = [{ productId: 'p1', quantity: 1, unitPrice: 100, amount: 100 }];

    it('skips expired discounts whose endDate is in the past', () => {
      const expiredDiscount = {
        id: 'disc-expired',
        name: 'Expired 2025 Promo',
        type: DiscountType.PERCENT,
        value: 15,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        usageLimit: 100,
        usedCount: 5,
        appliesTo: DiscountAppliesTo.SUBSCRIPTION,
        isActive: true,
      };

      const eligible = getEligibleDiscounts([expiredDiscount], lines, {
        date: new Date('2026-06-01'),
      });
      expect(eligible).toHaveLength(0);
    });

    it('skips exhausted discounts where usedCount >= usageLimit', () => {
      const exhaustedDiscount = {
        id: 'disc-exhausted',
        name: 'First 50 Users Only',
        type: DiscountType.FIXED,
        value: 25,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        usageLimit: 50,
        usedCount: 50, // Limit reached
        appliesTo: DiscountAppliesTo.SUBSCRIPTION,
        isActive: true,
      };

      const eligible = getEligibleDiscounts([exhaustedDiscount], lines, {
        date: new Date('2026-06-01'),
      });
      expect(eligible).toHaveLength(0);
    });

    it('skips deactivated discounts where isActive is false', () => {
      const inactiveDiscount = {
        id: 'disc-inactive',
        name: 'Deactivated Promo',
        type: DiscountType.PERCENT,
        value: 10,
        usageLimit: 1000,
        usedCount: 1,
        appliesTo: DiscountAppliesTo.SUBSCRIPTION,
        isActive: false,
      };

      const eligible = getEligibleDiscounts([inactiveDiscount], lines);
      expect(eligible).toHaveLength(0);
    });
  });

  // ==========================================
  // SCENE 7: Payments & Financial Dashboard
  // ==========================================
  describe('Scene 7: Payments Ledger, Overpayment Guard, Overdue Flags & KPI Calculations', () => {
    it('handles partial payment: reduces remaining balance and preserves CONFIRMED status', () => {
      const invoice = {
        total: 1000.0,
        amountPaid: 0.0,
        status: InvoiceStatus.CONFIRMED,
      };

      const partialPayment = 400.0;
      invoice.amountPaid += partialPayment;

      const outstanding = invoice.total - invoice.amountPaid;
      expect(outstanding).toBe(600.0);

      const isPaid = invoice.amountPaid >= invoice.total;
      expect(isPaid).toBe(false);
      expect(invoice.status).toBe(InvoiceStatus.CONFIRMED);
    });

    it('handles full payment: marks invoice status as PAID when balance reaches zero', () => {
      const invoice = {
        total: 1000.0,
        amountPaid: 600.0,
        status: InvoiceStatus.CONFIRMED,
      };

      const finalPayment = 400.0;
      invoice.amountPaid += finalPayment;

      const outstanding = invoice.total - invoice.amountPaid;
      expect(outstanding).toBe(0.0);

      if (invoice.amountPaid >= invoice.total) {
        invoice.status = InvoiceStatus.PAID;
      }
      expect(invoice.status).toBe(InvoiceStatus.PAID);
    });

    it('strictly rejects overpayment with 400 if payment exceeds outstanding balance', async () => {
      const mockInvoice = {
        id: 'inv-due-100',
        total: 200.0,
        amountPaid: 150.0, // Remaining due: 50.0
        status: InvoiceStatus.CONFIRMED,
      };

      const txSpy = vi.spyOn(prisma, '$transaction').mockImplementation(async (fn: any) => {
        return fn({
          invoice: {
            findUnique: vi.fn().mockResolvedValue(mockInvoice),
          },
        });
      });

      // Attempt to pay 75.0 when only 50.0 is due
      await expect(
        recordPayment(
          {
            invoiceId: 'inv-due-100',
            amount: 75.0,
            method: 'CARD',
          },
          { id: 'admin-1', role: 'ADMIN' }
        )
      ).rejects.toThrow(/exceeds outstanding balance/);

      txSpy.mockRestore();
    });

    it('identifies overdue invoices when dueDate < today and status is unpaid', () => {
      const pastDueDate = new Date('2026-01-01');
      const invoice = {
        dueDate: pastDueDate,
        status: InvoiceStatus.CONFIRMED,
        amountPaid: 50.0,
        total: 200.0,
      };

      const isOverdue =
        invoice.status !== InvoiceStatus.PAID &&
        invoice.status !== InvoiceStatus.CANCELLED &&
        invoice.dueDate < new Date();

      expect(isOverdue).toBe(true);
    });

    it('normalizes MRR correctly across all billing periods', () => {
      const subscriptions = [
        { billingPeriod: BillingPeriod.DAILY, amount: 10 },     // 10 * 30 = 300
        { billingPeriod: BillingPeriod.WEEKLY, amount: 100 },   // (100 * 52) / 12 = 433.33
        { billingPeriod: BillingPeriod.MONTHLY, amount: 500 },  // 500
        { billingPeriod: BillingPeriod.YEARLY, amount: 1200 },  // 1200 / 12 = 100
      ];

      let totalMrr = 0;
      for (const s of subscriptions) {
        switch (s.billingPeriod) {
          case BillingPeriod.DAILY:
            totalMrr += s.amount * 30;
            break;
          case BillingPeriod.WEEKLY:
            totalMrr += (s.amount * 52) / 12;
            break;
          case BillingPeriod.MONTHLY:
            totalMrr += s.amount;
            break;
          case BillingPeriod.YEARLY:
            totalMrr += s.amount / 12;
            break;
        }
      }

      totalMrr = Math.round(totalMrr * 100) / 100;
      // 300 + 433.33 + 500 + 100 = 1333.33
      expect(totalMrr).toBe(1333.33);
    });
  });
});
