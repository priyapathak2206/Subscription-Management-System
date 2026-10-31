import cron from 'node-cron';
import { prisma } from './db/prisma.js';
import { SubscriptionStatus } from '@prisma/client';

export function setupCronJobs(billingJobFn?: () => Promise<any>) {
  // 1. Daily midnight auto-close cron job
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Cron] Running daily auto-close check for expired subscriptions...');
      const now = new Date();
      
      const expiredSubs = await prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          expiryDate: { lte: now },
          plan: { autoClose: true },
        },
        include: { plan: true },
      });

      for (const sub of expiredSubs) {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: sub.id },
            data: { status: SubscriptionStatus.CLOSED },
          });

          await tx.subscriptionStatusHistory.create({
            data: {
              subscriptionId: sub.id,
              fromStatus: SubscriptionStatus.ACTIVE,
              toStatus: SubscriptionStatus.CLOSED,
              reason: 'Auto-closed on expiry date by system cron.',
            },
          });
        });
      }

      console.log(`[Cron] Auto-close finished. Closed ${expiredSubs.length} subscriptions.`);
    } catch (err) {
      console.error('[Cron] Error during auto-close job:', err);
    }
  });

  // 2. Daily recurring billing job at 01:00 AM
  cron.schedule('0 1 * * *', async () => {
    try {
      if (billingJobFn) {
        console.log('[Cron] Triggering daily automated recurring billing job...');
        const res = await billingJobFn();
        console.log('[Cron] Recurring billing completed:', res);
      }
    } catch (err) {
      console.error('[Cron] Error during recurring billing cron job:', err);
    }
  });
}

export default setupCronJobs;

