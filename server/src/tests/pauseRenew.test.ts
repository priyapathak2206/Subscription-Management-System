import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SubscriptionStatus, Role, BillingPeriod } from '@prisma/client';
import {
  ALLOWED_TRANSITIONS,
  transitionSubscriptionStatus,
  renewSubscription,
} from '../modules/subscriptions/subscriptions.service.js';
import { generateInvoiceForSubscription } from '../modules/invoices/invoices.service.js';
import { prisma } from '../db/prisma.js';

describe('Task 1: Pause, Resume, and Renew Specifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pause & Resume Lifecycle', () => {
    it('allows ACTIVE -> PAUSED, PAUSED -> ACTIVE, and PAUSED -> CLOSED in state machine', () => {
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.ACTIVE]).toContain(SubscriptionStatus.PAUSED);
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.ACTIVE]).toContain(SubscriptionStatus.CLOSED);

      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.PAUSED]).toContain(SubscriptionStatus.ACTIVE);
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.PAUSED]).toContain(SubscriptionStatus.CLOSED);

      // Illegal transitions
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.PAUSED]).not.toContain(SubscriptionStatus.DRAFT);
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.PAUSED]).not.toContain(SubscriptionStatus.QUOTATION);
      expect(ALLOWED_TRANSITIONS[SubscriptionStatus.PAUSED]).not.toContain(SubscriptionStatus.CONFIRMED);
    });

    it('blocks pause when plan.pausable is false (throws 400)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-non-pausable',
              status: SubscriptionStatus.ACTIVE,
              plan: {
                name: 'Fixed Term Non-Pausable Plan',
                pausable: false,
                closable: true,
              },
            }),
          },
        };
        return callback(mockTx);
      });

      await expect(
        transitionSubscriptionStatus(
          'sub-non-pausable',
          SubscriptionStatus.PAUSED,
          { id: 'admin-1', role: Role.ADMIN }
        )
      ).rejects.toThrow(/does not permit pausing/);
    });

    it('permits pause when plan.pausable is true', async () => {
      const mockUpdatedSub = {
        id: 'sub-pausable',
        status: SubscriptionStatus.PAUSED,
        nextBillingDate: new Date('2026-11-01'),
        history: [],
      };

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-pausable',
              status: SubscriptionStatus.ACTIVE,
              plan: {
                name: 'Flexible Plan',
                pausable: true,
                closable: true,
              },
            }),
            update: vi.fn().mockResolvedValue(mockUpdatedSub),
          },
          subscriptionStatusHistory: {
            create: vi.fn().mockResolvedValue({ id: 'h-1' }),
            findFirst: vi.fn().mockResolvedValue(null),
          },
        };
        return callback(mockTx);
      });

      const res = await transitionSubscriptionStatus(
        'sub-pausable',
        SubscriptionStatus.PAUSED,
        { id: 'admin-1', role: Role.ADMIN }
      );
      expect(res.status).toBe(SubscriptionStatus.PAUSED);
    });

    it('moves nextBillingDate forward on resume so paused periods are not backfilled', async () => {
      const pastBillingDate = new Date('2026-10-01');
      const pausedAt = new Date('2026-10-05');
      let capturedUpdateData: any = null;

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-paused',
              status: SubscriptionStatus.PAUSED,
              nextBillingDate: pastBillingDate,
              updatedAt: pausedAt,
              plan: {
                name: 'Monthly Plan',
                pausable: true,
                billingPeriod: BillingPeriod.MONTHLY,
              },
            }),
            update: vi.fn().mockImplementation((args: any) => {
              capturedUpdateData = args.data;
              return {
                id: 'sub-paused',
                status: args.data.status,
                nextBillingDate: args.data.nextBillingDate,
              };
            }),
          },
          subscriptionStatusHistory: {
            findFirst: vi.fn().mockResolvedValue({
              changedAt: pausedAt,
              toStatus: SubscriptionStatus.PAUSED,
            }),
            create: vi.fn().mockResolvedValue({ id: 'hist-resume' }),
          },
        };
        return callback(mockTx);
      });

      const result = await transitionSubscriptionStatus(
        'sub-paused',
        SubscriptionStatus.ACTIVE,
        { id: 'staff-1', role: Role.STAFF },
        'Resuming service'
      );

      expect(result.status).toBe(SubscriptionStatus.ACTIVE);
      // nextBillingDate must be moved forward beyond the past date
      expect(capturedUpdateData.nextBillingDate.getTime()).toBeGreaterThanOrEqual(pastBillingDate.getTime());
    });
  });

  describe('Billing Engine Paused Subscription Handling', () => {
    it('skips billing generation when subscription is in PAUSED status', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          invoice: {
            findUnique: vi.fn().mockResolvedValue(null),
          },
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-paused-skip',
              status: SubscriptionStatus.PAUSED,
              plan: { billingPeriod: BillingPeriod.MONTHLY },
              lines: [],
            }),
          },
        };
        return callback(mockTx);
      });

      const result = await generateInvoiceForSubscription('sub-paused-skip', new Date('2026-11-01'));
      expect(result.created).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.reason).toContain('Subscription is paused');
    });
  });

  describe('Renew Subscription Handling', () => {
    it('blocks renewal when plan.renewable is false (throws 400)', async () => {
      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-non-renewable',
              status: SubscriptionStatus.ACTIVE,
              plan: {
                name: 'One-off Non-Renewable Plan',
                renewable: false,
              },
              lines: [],
            }),
          },
        };
        return callback(mockTx);
      });

      await expect(
        renewSubscription('sub-non-renewable', { id: 'admin-1', role: Role.ADMIN })
      ).rejects.toThrow(/does not permit renewal/);
    });

    it('blocks renewal when subscription is in DRAFT, QUOTATION, or CONFIRMED status', async () => {
      for (const invalidStatus of [SubscriptionStatus.DRAFT, SubscriptionStatus.QUOTATION, SubscriptionStatus.CONFIRMED]) {
        vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
          const mockTx = {
            subscription: {
              findUnique: vi.fn().mockResolvedValue({
                id: `sub-${invalidStatus}`,
                status: invalidStatus,
                plan: { name: 'Plan', renewable: true },
                lines: [],
              }),
            },
          };
          return callback(mockTx);
        });

        await expect(
          renewSubscription(`sub-${invalidStatus}`, { id: 'admin-1', role: Role.ADMIN })
        ).rejects.toThrow(/Only active or closed subscriptions can be renewed/);
      }
    });

    it('creates a new linked subscription when renewable=true from ACTIVE or CLOSED', async () => {
      const oldExpiryDate = new Date('2026-12-31T23:59:59.000Z');
      const oldStartDate = new Date('2026-01-01T00:00:00.000Z');

      let createdSubData: any = null;
      let originalSubHistoryData: any = null;

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const mockTx = {
          subscription: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'sub-old-123',
              number: 'SUB-2026-00042',
              customerId: 'cust-1',
              planId: 'plan-pro',
              status: SubscriptionStatus.CLOSED,
              startDate: oldStartDate,
              expiryDate: oldExpiryDate,
              paymentTerms: 'NET_30',
              plan: {
                id: 'plan-pro',
                name: 'Professional Yearly Plan',
                renewable: true,
              },
              lines: [
                {
                  productId: 'prod-saas',
                  variantId: 'var-1',
                  quantity: 5,
                  unitPrice: 100,
                  taxId: 'tax-1',
                  amount: 550,
                },
              ],
            }),
            findFirst: vi.fn().mockResolvedValue({ number: 'SUB-2026-00042' }),
            create: vi.fn().mockImplementation((args: any) => {
              createdSubData = args.data;
              return {
                id: 'sub-new-456',
                number: args.data.number,
                renewedFromId: args.data.renewedFromId,
                status: args.data.status,
                startDate: args.data.startDate,
                expiryDate: args.data.expiryDate,
                planId: args.data.planId,
                customerId: args.data.customerId,
              };
            }),
          },
          subscriptionStatusHistory: {
            create: vi.fn().mockImplementation((args: any) => {
              originalSubHistoryData = args.data;
              return { id: 'hist-orig' };
            }),
          },
        };
        return callback(mockTx);
      });

      const renewed = await renewSubscription('sub-old-123', { id: 'staff-99', role: Role.STAFF });

      expect(renewed).toBeDefined();
      expect(createdSubData.renewedFromId).toBe('sub-old-123');
      expect(createdSubData.startDate.toISOString()).toBe(oldExpiryDate.toISOString());
      expect(createdSubData.number).toBe('SUB-2026-00043');
      expect(createdSubData.lines.create).toHaveLength(1);
      expect(createdSubData.lines.create[0].productId).toBe('prod-saas');
      expect(createdSubData.lines.create[0].quantity).toBe(5);

      // Audit history recorded on original subscription
      expect(originalSubHistoryData.subscriptionId).toBe('sub-old-123');
      expect(originalSubHistoryData.reason).toContain('Renewed into SUB-2026-00043');
    });
  });
});
