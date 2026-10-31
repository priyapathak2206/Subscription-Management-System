import { Request, Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { SubscriptionStatus } from '@prisma/client';
import { resolveCustomerIdScope } from '../../utils/customerScope.js';
import {
  createSubscription,
  transitionSubscriptionStatus,
} from './subscriptions.service.js';

export async function listSubscriptions(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string, 10) || 20));
    const status = req.query.status as SubscriptionStatus;
    const planId = req.query.planId as string;
    const search = req.query.search as string;
    const requestedCustomerId = req.query.customerId as string;

    // Apply strict multi-tenant customer isolation (throws 403 if customer accesses other accounts)
    const scopedCustomerId = resolveCustomerIdScope(req.user as any, requestedCustomerId);

    const where: any = {};
    if (status) where.status = status;
    if (planId) where.planId = planId;
    if (scopedCustomerId) where.customerId = scopedCustomerId;
    if (search) {
      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
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
          _count: {
            select: { invoices: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      items: subscriptions,
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to list subscriptions' });
  }
}

export async function getSubscriptionById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const sub = await prisma.subscription.findUnique({
      where: { id },
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
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!sub) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Customer isolation check: throws 403 Forbidden if not allowed
    resolveCustomerIdScope(req.user as any, sub.customerId);

    res.json({ subscription: sub });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ message: error.message || 'Failed to fetch subscription' });
  }
}

export async function handleCreateSubscription(req: Request, res: Response) {
  try {
    const { customerId } = req.body;
    // If actor is customer, they can only create for themselves
    if ((req.user as any).role === 'CUSTOMER' && customerId && customerId !== (req.user as any).id) {
      return res.status(403).json({ message: 'Customers cannot create subscriptions for other accounts' });
    }

    const targetCustomerId = customerId || (req.user as any).id;
    const subscription = await createSubscription(
      {
        ...req.body,
        customerId: targetCustomerId,
      },
      req.user as any
    );

    res.status(201).json({ subscription });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message || 'Failed to create subscription' });
  }
}

export async function handleTransitionSubscription(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { targetStatus, reason } = req.body;

    if (!targetStatus) {
      return res.status(400).json({ message: 'targetStatus is required' });
    }

    // Verify existing subscription & ownership
    const existing = await prisma.subscription.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Customers cannot directly confirm or force state transitions
    if ((req.user as any).role === 'CUSTOMER') {
      return res.status(403).json({ message: 'Customers are not permitted to trigger status transitions' });
    }

    const updated = await transitionSubscriptionStatus(
      id,
      targetStatus as SubscriptionStatus,
      req.user as any,
      reason
    );

    res.json({ subscription: updated });
  } catch (error: any) {
    const status = error.statusCode || 400;
    res.status(status).json({ message: error.message || 'Transition failed' });
  }
}
