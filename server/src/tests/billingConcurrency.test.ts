import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient, SubscriptionStatus, BillingPeriod, Role } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

import { runRecurringBillingBatch, BILLING_ADVISORY_LOCK_ID } from '../modules/invoices/invoices.service.js';
import { prisma } from '../db/prisma.js';

describe('Task 2: Billing Concurrency Guard & Advisory Lock', () => {
  let lockHoldingClient: PrismaClient | null = null;
  let canConnectToRealDb = false;

  beforeAll(async () => {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1;`;
      canConnectToRealDb = true;

      // Second client to simulate a distinct PostgreSQL session for lock contention
      lockHoldingClient = new PrismaClient();
      await lockHoldingClient.$connect();
    } catch {
      canConnectToRealDb = false;
    }
  });

  afterAll(async () => {
    if (lockHoldingClient) {
      try {
        await lockHoldingClient.$executeRaw`SELECT pg_advisory_unlock_all();`;
      } catch {
        // Ignored
      }
      await lockHoldingClient.$disconnect();
    }
  });

  it('exports valid numeric BILLING_ADVISORY_LOCK_ID', () => {
    expect(BILLING_ADVISORY_LOCK_ID).toBeTypeOf('number');
    expect(BILLING_ADVISORY_LOCK_ID).toBeGreaterThan(0);
  });

  it('rejects batch billing with HTTP 409 when advisory lock is held by another session', async () => {
    if (!canConnectToRealDb || !lockHoldingClient) {
      console.log('Skipping real DB lock test: DB not reachable');
      return;
    }

    // Acquire the lock in the separate PostgreSQL session
    const lockAcquired = await lockHoldingClient.$queryRaw<Array<any>>`
      SELECT pg_try_advisory_lock(${BILLING_ADVISORY_LOCK_ID}::bigint) AS locked;
    `;
    expect(lockAcquired[0].locked).toBe(true);

    try {
      // Main app runner must be rejected with 409
      await expect(runRecurringBillingBatch()).rejects.toThrowError(
        expect.objectContaining({
          message: expect.stringContaining('already in progress'),
          statusCode: 409,
        })
      );
    } finally {
      // Release the lock from the second session
      await lockHoldingClient.$queryRaw`
        SELECT pg_advisory_unlock(${BILLING_ADVISORY_LOCK_ID}::bigint);
      `;
    }
  });

  it('two parallel run-billing calls on a real test DB give exactly one invoice per (subscription, period) and no unexpected failures', async () => {
    if (!canConnectToRealDb) {
      console.log('Skipping real DB concurrency execution: database connection unavailable');
      return;
    }

    const testCustomerId = `test-concurrent-cust-${Date.now()}`;
    const testPlanId = `test-concurrent-plan-${Date.now()}`;
    const testSubId = `test-concurrent-sub-${Date.now()}`;
    const subNumber = `SUB-CONC-${Date.now()}`;
    const today = new Date();
    const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);

    try {
      // 1. Seed customer, plan, and active subscription due for billing in the DB
      await prisma.user.create({
        data: {
          id: testCustomerId,
          name: 'Concurrent Test Customer',
          email: `${testCustomerId}@test.com`,
          passwordHash: 'dummyhash123',
          role: Role.CUSTOMER,
        },
      });

      await prisma.plan.create({
        data: {
          id: testPlanId,
          name: 'Concurrency Test Plan',
          price: 150,
          billingPeriod: BillingPeriod.MONTHLY,
          pausable: true,
          renewable: true,
          closable: true,
        },
      });

      await prisma.subscription.create({
        data: {
          id: testSubId,
          number: subNumber,
          customerId: testCustomerId,
          planId: testPlanId,
          startDate: periodStart,
          status: SubscriptionStatus.ACTIVE,
          nextBillingDate: periodStart,
          lines: {
            create: [],
          },
        },
      });

      // 2. Trigger two parallel runRecurringBillingBatch executions simultaneously
      const results = await Promise.allSettled([
        runRecurringBillingBatch(),
        runRecurringBillingBatch(),
      ]);

      // At least one must succeed; the other must either succeed with skipped or fail with 409
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBeGreaterThanOrEqual(1);

      if (rejected.length > 0) {
        for (const rej of rejected) {
          const reason = (rej as PromiseRejectedResult).reason;
          expect(reason.statusCode === 409 || reason.message.includes('already in progress')).toBe(true);
        }
      }

      // 3. Verify exactly ONE invoice was created for this subscription and period
      const createdInvoices = await prisma.invoice.findMany({
        where: {
          subscriptionId: testSubId,
          periodStart,
        },
      });

      expect(createdInvoices).toHaveLength(1);
      expect(createdInvoices[0].subscriptionId).toBe(testSubId);
    } finally {
      // Clean up test records
      try {
        await prisma.invoiceLine.deleteMany({
          where: { invoice: { subscriptionId: testSubId } },
        });
        await prisma.invoice.deleteMany({
          where: { subscriptionId: testSubId },
        });
        await prisma.subscriptionLine.deleteMany({
          where: { subscriptionId: testSubId },
        });
        await prisma.subscriptionStatusHistory.deleteMany({
          where: { subscriptionId: testSubId },
        });
        await prisma.subscription.deleteMany({
          where: { id: testSubId },
        });
        await prisma.plan.deleteMany({
          where: { id: testPlanId },
        });
        await prisma.user.deleteMany({
          where: { id: testCustomerId },
        });
      } catch {
        // Ignored
      }
    }
  });
});
