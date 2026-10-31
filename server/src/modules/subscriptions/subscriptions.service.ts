import { prisma } from '../../db/prisma.js';
import { SubscriptionStatus, Role } from '@prisma/client';
import { calculateTotalWithTax } from '../../utils/taxCalculator.js';

export const ALLOWED_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  [SubscriptionStatus.DRAFT]: [SubscriptionStatus.QUOTATION, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.QUOTATION]: [SubscriptionStatus.CONFIRMED, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.CONFIRMED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.ACTIVE]: [SubscriptionStatus.PAUSED, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.PAUSED]: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CLOSED],
  [SubscriptionStatus.CLOSED]: [], // Closed subscriptions cannot transition unless renewed
};

/**
 * Race-safe sequential subscription number generator: SUB-YYYY-00001
 */
export async function generateSubscriptionNumber(tx: any = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SUB-${year}-`;

  const lastSub = await tx.subscription.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: 'desc' },
    select: { number: true },
  });

  let seq = 1;
  if (lastSub?.number) {
    const parts = lastSub.number.split('-');
    if (parts.length === 3) {
      const parsed = parseInt(parts[2], 10);
      if (!isNaN(parsed)) {
        seq = parsed + 1;
      }
    }
  }

  return `${prefix}${seq.toString().padStart(5, '0')}`;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planId?: string;
  templateId?: string;
  startDate?: string | Date;
  expiryDate?: string | Date;
  paymentTerms?: string;
  lines?: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitPrice?: number;
    taxId?: string | null;
  }>;
}

export async function createSubscription(
  input: CreateSubscriptionInput,
  actor: { id: string; role: Role }
) {
  const { templateId, paymentTerms = 'NET_30' } = input;

  return prisma.$transaction(async (tx) => {
    let planId = input.planId;
    let quotationExpiryDate: Date | null = null;
    let initialLines = input.lines || [];

    // 1. If created from a template, inherit plan and lines
    if (templateId) {
      const template = await tx.quotationTemplate.findUnique({
        where: { id: templateId },
        include: {
          plan: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (!template) {
        throw new Error('Quotation template not found');
      }

      planId = template.planId;
      const validityDays = template.validityDays || 30;
      quotationExpiryDate = new Date();
      quotationExpiryDate.setDate(quotationExpiryDate.getDate() + validityDays);

      if (!initialLines || initialLines.length === 0) {
        initialLines = template.lines.map((tl) => {
          const basePrice = tl.product.salesPrice;
          const extraPrice = tl.variant?.extraPrice || 0;
          const unitPrice = tl.unitPrice !== null && tl.unitPrice !== undefined ? tl.unitPrice : basePrice + extraPrice;
          return {
            productId: tl.productId,
            variantId: tl.variantId || null,
            quantity: tl.quantity || 1,
            unitPrice,
            taxId: null,
          };
        });
      }
    }

    if (!planId) {
      throw new Error('Plan is required to create a subscription');
    }

    const plan = await tx.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw new Error('Selected plan not found');
    }

    // 2. Validate customer exists
    const customer = await tx.user.findUnique({ where: { id: input.customerId } });
    if (!customer) {
      throw new Error('Selected customer not found');
    }

    // 3. Enforce plan.minQuantity
    const totalQuantity = initialLines.reduce((acc, l) => acc + (Number(l.quantity) || 1), 0);
    if (plan.minQuantity && totalQuantity < plan.minQuantity) {
      const err: any = new Error(
        `Total quantity (${totalQuantity}) does not satisfy minimum required quantity (${plan.minQuantity}) for plan "${plan.name}"`
      );
      err.statusCode = 400;
      throw err;
    }

    // 4. Resolve line pricing & taxes
    const resolvedLines = [];
    for (const line of initialLines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        throw new Error(`Product with ID ${line.productId} not found`);
      }

      let extraPrice = 0;
      if (line.variantId) {
        const variant = await tx.productVariant.findUnique({ where: { id: line.variantId } });
        if (variant) {
          extraPrice = variant.extraPrice || 0;
        }
      }

      const unitPrice =
        line.unitPrice !== undefined && line.unitPrice !== null
          ? Number(line.unitPrice)
          : product.salesPrice + extraPrice;

      const quantity = Math.max(1, Number(line.quantity) || 1);
      const subtotal = unitPrice * quantity;

      let taxRate = 0;
      if (line.taxId) {
        const tax = await tx.tax.findUnique({ where: { id: line.taxId } });
        if (tax && tax.active) {
          taxRate = tax.ratePercent;
        }
      }

      const { totalWithTax } = calculateTotalWithTax(subtotal, { ratePercent: taxRate, active: true });

      resolvedLines.push({
        productId: line.productId,
        variantId: line.variantId || null,
        quantity,
        unitPrice,
        taxId: line.taxId || null,
        amount: Math.round(totalWithTax * 100) / 100,
      });
    }

    // 5. Generate unique subscription number
    const subNumber = await generateSubscriptionNumber(tx);
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const expiryDate = input.expiryDate ? new Date(input.expiryDate) : null;

    // 6. Create subscription
    const subscription = await tx.subscription.create({
      data: {
        number: subNumber,
        customerId: input.customerId,
        planId,
        startDate,
        expiryDate,
        quotationExpiryDate,
        paymentTerms,
        status: templateId ? SubscriptionStatus.QUOTATION : SubscriptionStatus.DRAFT,
        nextBillingDate: startDate,
        lines: {
          create: resolvedLines,
        },
        history: {
          create: {
            fromStatus: null,
            toStatus: templateId ? SubscriptionStatus.QUOTATION : SubscriptionStatus.DRAFT,
            changedById: actor.id,
            reason: templateId ? 'Created as quotation from template' : 'Created as draft subscription',
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        history: {
          include: {
            changedBy: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { changedAt: 'desc' },
        },
        renewedFrom: { select: { id: true, number: true, status: true } },
        renewals: { select: { id: true, number: true, status: true } },
      },
    });

    return subscription;
  });
}

/**
 * Executes a state machine transition with validation and audit history recording
 */
export async function transitionSubscriptionStatus(
  subscriptionId: string,
  targetStatus: SubscriptionStatus,
  actor: { id: string; role: Role },
  reason?: string
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) {
      const err: any = new Error('Subscription not found');
      err.statusCode = 404;
      throw err;
    }

    const currentStatus = sub.status;

    // 1. Check allowed transitions
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      const err: any = new Error(
        `Illegal status transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${
          allowed.length > 0 ? allowed.join(', ') : 'None (Terminal state)'
        }`
      );
      err.statusCode = 400;
      throw err;
    }

    // 2. Honor plan flags: pausable
    if (targetStatus === SubscriptionStatus.PAUSED && currentStatus === SubscriptionStatus.ACTIVE) {
      if (sub.plan.pausable === false) {
        const err: any = new Error(`Plan "${sub.plan.name}" does not permit pausing subscriptions`);
        err.statusCode = 400;
        throw err;
      }
    }

    // Honor plan flags: closable early
    if (targetStatus === SubscriptionStatus.CLOSED && currentStatus === SubscriptionStatus.ACTIVE) {
      if (sub.plan.closable === false) {
        if (sub.expiryDate && new Date() < new Date(sub.expiryDate)) {
          const err: any = new Error(
            `Plan "${sub.plan.name}" does not permit closing subscriptions early before the expiry date (${sub.expiryDate.toISOString()})`
          );
          err.statusCode = 400;
          throw err;
        }
      }
    }

    // 3. Billing date forward adjustment on resume so paused periods are not backfilled
    let updatedNextBillingDate = sub.nextBillingDate;
    if (currentStatus === SubscriptionStatus.PAUSED && targetStatus === SubscriptionStatus.ACTIVE) {
      const lastPause = await tx.subscriptionStatusHistory.findFirst({
        where: { subscriptionId, toStatus: SubscriptionStatus.PAUSED },
        orderBy: { changedAt: 'desc' },
      });
      const pausedAt = lastPause ? new Date(lastPause.changedAt) : sub.updatedAt;
      const pauseDurationMs = Math.max(0, Date.now() - pausedAt.getTime());

      const baseDate = sub.nextBillingDate ? new Date(sub.nextBillingDate) : new Date();
      let shifted = new Date(baseDate.getTime() + pauseDurationMs);
      if (shifted <= new Date()) {
        shifted = new Date();
      }
      updatedNextBillingDate = shifted;
    } else if (targetStatus === SubscriptionStatus.ACTIVE && !sub.nextBillingDate) {
      updatedNextBillingDate = new Date();
    }

    // 4. Update subscription status
    const updated = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: targetStatus,
        nextBillingDate: updatedNextBillingDate,
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        history: {
          include: {
            changedBy: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { changedAt: 'desc' },
        },
        renewedFrom: { select: { id: true, number: true, status: true } },
        renewals: { select: { id: true, number: true, status: true } },
      },
    });

    // 5. Record audit history
    await tx.subscriptionStatusHistory.create({
      data: {
        subscriptionId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        changedById: actor.id,
        reason: reason || `Transitioned from ${currentStatus} to ${targetStatus}`,
      },
    });

    return updated;
  });
}

export async function pauseSubscription(
  subscriptionId: string,
  actor: { id: string; role: Role },
  reason?: string
) {
  return transitionSubscriptionStatus(
    subscriptionId,
    SubscriptionStatus.PAUSED,
    actor,
    reason || 'Subscription paused by staff/admin'
  );
}

export async function resumeSubscription(
  subscriptionId: string,
  actor: { id: string; role: Role },
  reason?: string
) {
  return transitionSubscriptionStatus(
    subscriptionId,
    SubscriptionStatus.ACTIVE,
    actor,
    reason || 'Subscription resumed by staff/admin'
  );
}

export async function renewSubscription(
  subscriptionId: string,
  actor: { id: string; role: Role }
) {
  return prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: true,
        lines: true,
      },
    });

    if (!sub) {
      const err: any = new Error('Subscription not found');
      err.statusCode = 404;
      throw err;
    }

    if (sub.plan.renewable === false) {
      const err: any = new Error(`Plan "${sub.plan.name}" does not permit renewal`);
      err.statusCode = 400;
      throw err;
    }

    if (sub.status !== SubscriptionStatus.ACTIVE && sub.status !== SubscriptionStatus.CLOSED) {
      const err: any = new Error('Only active or closed subscriptions can be renewed');
      err.statusCode = 400;
      throw err;
    }

    // New start date = old expiry date, or now if no expiry
    const startDate = sub.expiryDate ? new Date(sub.expiryDate) : new Date();
    let expiryDate: Date | null = null;
    if (sub.expiryDate && sub.startDate) {
      const durationMs = new Date(sub.expiryDate).getTime() - new Date(sub.startDate).getTime();
      expiryDate = new Date(startDate.getTime() + durationMs);
    }

    const subNumber = await generateSubscriptionNumber(tx);

    const renewedSub = await tx.subscription.create({
      data: {
        number: subNumber,
        customerId: sub.customerId,
        planId: sub.planId,
        renewedFromId: sub.id,
        startDate,
        expiryDate,
        paymentTerms: sub.paymentTerms,
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: startDate,
        lines: {
          create: sub.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxId: l.taxId,
            amount: l.amount,
          })),
        },
        history: {
          create: {
            fromStatus: null,
            toStatus: SubscriptionStatus.ACTIVE,
            changedById: actor.id,
            reason: `Renewed from ${sub.number}`,
          },
        },
      },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
            tax: true,
          },
        },
        history: {
          include: {
            changedBy: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { changedAt: 'desc' },
        },
        renewedFrom: {
          select: { id: true, number: true, status: true },
        },
        renewals: {
          select: { id: true, number: true, status: true },
        },
      },
    });

    // Record audit history on the original subscription
    await tx.subscriptionStatusHistory.create({
      data: {
        subscriptionId: sub.id,
        fromStatus: sub.status,
        toStatus: sub.status,
        changedById: actor.id,
        reason: `Renewed into ${renewedSub.number}`,
      },
    });

    return renewedSub;
  });
}
