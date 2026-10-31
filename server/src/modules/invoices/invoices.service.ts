import { prisma } from '../../db/prisma.js';
import {
  InvoiceStatus,
  BillingPeriod,
  SubscriptionStatus,
} from '@prisma/client';
import { calculateTax } from '../../utils/taxCalculator.js';
import {
  getEligibleDiscounts,
  applyDiscount,
  OrderLineItem,
} from '../../utils/discountEngine.js';

/**
 * Race-safe sequential invoice number generator: INV-YYYY-00001
 */
export async function generateInvoiceNumber(tx: any = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const lastInv = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  let seq = 1;
  if (lastInv?.number) {
    const parts = lastInv.number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        seq = parsed + 1;
      }
    }
  }

  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

/**
 * Calculates the end date for a given billing period
 */
export function calculatePeriodEnd(start: Date, period: BillingPeriod): Date {
  const end = new Date(start);
  switch (period) {
    case BillingPeriod.DAILY:
      end.setDate(end.getDate() + 1);
      break;
    case BillingPeriod.WEEKLY:
      end.setDate(end.getDate() + 7);
      break;
    case BillingPeriod.MONTHLY:
      end.setMonth(end.getMonth() + 1);
      break;
    case BillingPeriod.YEARLY:
      end.setFullYear(end.getFullYear() + 1);
      break;
  }
  return end;
}

/**
 * Calculates due date based on payment terms
 */
export function calculateDueDate(issueDate: Date, paymentTerms?: string | null): Date {
  const due = new Date(issueDate);
  if (!paymentTerms) {
    due.setDate(due.getDate() + 30);
    return due;
  }

  const terms = paymentTerms.toUpperCase();
  if (terms === 'IMMEDIATE' || terms === 'DUE_ON_RECEIPT') {
    return due;
  } else if (terms.startsWith('NET_')) {
    const days = parseInt(terms.replace('NET_', ''), 10);
    due.setDate(due.getDate() + (isNaN(days) ? 30 : days));
  } else {
    const days = parseInt(terms, 10);
    due.setDate(due.getDate() + (isNaN(days) ? 30 : days));
  }
  return due;
}

export interface GenerationResult {
  invoice?: any;
  created: boolean;
  skipped: boolean;
  reason?: string;
}

/**
 * Generates an invoice for a specific subscription and billing period inside a database transaction.
 * IDEMPOTENT: Enforces unique [subscriptionId, periodStart], catches conflict gracefully.
 */
export async function generateInvoiceForSubscription(
  subscriptionId: string,
  periodStart: Date,
  externalTx?: any
): Promise<GenerationResult> {
  const execute = async (tx: any): Promise<GenerationResult> => {
    // 1. Idempotency Check
    const existing = await tx.invoice.findUnique({
      where: {
        subscriptionId_periodStart: {
          subscriptionId,
          periodStart,
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        lines: true,
      },
    });

    if (existing) {
      return {
        invoice: existing,
        created: false,
        skipped: true,
        reason: 'Invoice already generated for this billing period.',
      };
    }

    // 2. Fetch Subscription with Plan, Lines, Customer, and Taxes
    const sub = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
      },
    });

    if (!sub) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    const issueDate = new Date();
    const periodEnd = calculatePeriodEnd(periodStart, sub.plan.billingPeriod);
    const dueDate = calculateDueDate(issueDate, sub.paymentTerms);

    // 3. Compute Line Items and Subtotal
    let subtotal = 0;
    let taxTotal = 0;
    const invoiceLinesData = [];
    const orderLinesForDiscount: OrderLineItem[] = [];

    for (const subLine of sub.lines) {
      const lineSubtotal = Math.round(subLine.unitPrice * subLine.quantity * 100) / 100;
      subtotal += lineSubtotal;

      // Tax calculation
      let lineTax = 0;
      if (subLine.tax && subLine.tax.active) {
        lineTax = calculateTax(lineSubtotal, {
          ratePercent: subLine.tax.ratePercent,
          active: true,
        });
      }
      taxTotal += lineTax;

      const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

      invoiceLinesData.push({
        productId: subLine.productId,
        variantId: subLine.variantId || null,
        quantity: subLine.quantity,
        unitPrice: subLine.unitPrice,
        taxId: subLine.taxId || null,
        amount: lineTotal,
      });

      orderLinesForDiscount.push({
        productId: subLine.productId,
        variantId: subLine.variantId || null,
        quantity: subLine.quantity,
        unitPrice: subLine.unitPrice,
        amount: lineSubtotal,
      });
    }

    subtotal = Math.round(subtotal * 100) / 100;
    taxTotal = Math.round(taxTotal * 100) / 100;

    // 4. Automatic Discount Evaluation
    let discountTotal = 0;
    const activeDiscounts = await tx.discount.findMany({
      where: { isActive: true },
      include: { discountProducts: true },
    });

    const eligibleDiscounts = getEligibleDiscounts(activeDiscounts, orderLinesForDiscount, {
      date: issueDate,
      subtotal,
    });

    if (eligibleDiscounts.length > 0) {
      // Pick highest eligible discount
      let bestDiscount = eligibleDiscounts[0];
      let maxDeduction = 0;

      for (const d of eligibleDiscounts) {
        const { discountAmount } = applyDiscount(subtotal, d);
        if (discountAmount > maxDeduction) {
          maxDeduction = discountAmount;
          bestDiscount = d;
        }
      }

      if (maxDeduction > 0) {
        discountTotal = maxDeduction;
        // Increment discount usage inside transaction
        await tx.discount.update({
          where: { id: bestDiscount.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const total = Math.max(0, Math.round((subtotal - discountTotal + taxTotal) * 100) / 100);
    const invoiceNumber = await generateInvoiceNumber(tx);

    // 5. Create Invoice Record
    const invoice = await tx.invoice.create({
      data: {
        number: invoiceNumber,
        subscriptionId,
        customerId: sub.customerId,
        periodStart,
        periodEnd,
        issueDate,
        dueDate,
        status: InvoiceStatus.DRAFT,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        amountPaid: 0,
        lines: {
          create: invoiceLinesData,
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
      },
    });

    return {
      invoice,
      created: true,
      skipped: false,
    };
  };

  if (externalTx) {
    return execute(externalTx);
  } else {
    try {
      return await prisma.$transaction(execute);
    } catch (err: any) {
      // Handle race-condition unique constraint conflict gracefully
      if (err.code === 'P2002') {
        return {
          created: false,
          skipped: true,
          reason: 'Concurrent conflict: Invoice already created.',
        };
      }
      throw err;
    }
  }
}

/**
 * Batch recurring billing job.
 * Processes every ACTIVE subscription whose nextBillingDate <= today,
 * advances nextBillingDate by the plan period, and catches up all missed periods.
 */
export async function runRecurringBillingBatch(): Promise<{
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}> {
  const today = new Date();
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  // Fetch ACTIVE subscriptions with nextBillingDate <= today
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      nextBillingDate: { lte: today },
    },
    include: {
      plan: true,
    },
    orderBy: { nextBillingDate: 'asc' },
  });

  // Process in chunks of 25 for fast throughput
  const chunkSize = 25;
  for (let i = 0; i < subscriptions.length; i += chunkSize) {
    const chunk = subscriptions.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (sub) => {
        try {
          let currentBillingDate = sub.nextBillingDate ? new Date(sub.nextBillingDate) : new Date(sub.startDate);

          // Catch up all periods until nextBillingDate is in the future
          while (currentBillingDate <= today) {
            const periodStart = new Date(currentBillingDate);
            const genResult = await generateInvoiceForSubscription(sub.id, periodStart);

            if (genResult.created) created++;
            if (genResult.skipped) skipped++;

            // Advance billing date
            currentBillingDate = calculatePeriodEnd(currentBillingDate, sub.plan.billingPeriod);
          }

          // Advance nextBillingDate on the subscription
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { nextBillingDate: currentBillingDate },
          });
        } catch (err: any) {
          failed++;
          errors.push(`Sub ${sub.number}: ${err.message}`);
        }
      })
    );
  }

  return { created, skipped, failed, errors };
}
