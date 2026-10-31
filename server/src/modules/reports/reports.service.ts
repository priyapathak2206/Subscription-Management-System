import { prisma } from '../../db/prisma.js';
import { Prisma, SubscriptionStatus, InvoiceStatus, BillingPeriod } from '@prisma/client';

export interface ReportFilterOptions {
  startDate?: string | Date;
  endDate?: string | Date;
  customerId?: string;
  planId?: string;
  status?: string;
}

export async function getSummaryKPIs(filters: ReportFilterOptions) {
  const today = new Date();
  const start = filters.startDate ? new Date(filters.startDate) : undefined;
  let end: Date | undefined = undefined;
  if (filters.endDate) {
    end = new Date(filters.endDate);
    if (!isNaN(end.getTime()) && typeof filters.endDate === 'string' && filters.endDate.length === 10) {
      end.setHours(23, 59, 59, 999);
    }
  }

  // 1. Active Subscriptions Count & MRR Calculation
  const isSubscriptionStatus =
    filters.status && Object.values(SubscriptionStatus).includes(filters.status as any);

  const subWhere: Prisma.SubscriptionWhereInput = {
    ...(isSubscriptionStatus
      ? { status: filters.status as SubscriptionStatus }
      : { status: SubscriptionStatus.ACTIVE }),
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.planId && { planId: filters.planId }),
  };

  const activeSubscriptions = await prisma.subscription.findMany({
    where: subWhere,
    select: {
      id: true,
      status: true,
      plan: {
        select: {
          price: true,
          billingPeriod: true,
        },
      },
      lines: {
        select: {
          amount: true,
        },
      },
    },
  });

  const activeSubscriptionCount = activeSubscriptions.length;

  let mrr = 0;
  for (const sub of activeSubscriptions) {
    // Only calculate MRR for active contracts
    if (sub.status !== SubscriptionStatus.ACTIVE) continue;

    const subTotal =
      sub.lines.length > 0
        ? sub.lines.reduce((sum, l) => sum + (l.amount || 0), 0)
        : sub.plan.price;

    switch (sub.plan.billingPeriod) {
      case BillingPeriod.DAILY:
        mrr += subTotal * 30;
        break;
      case BillingPeriod.WEEKLY:
        mrr += (subTotal * 52) / 12;
        break;
      case BillingPeriod.MONTHLY:
        mrr += subTotal;
        break;
      case BillingPeriod.YEARLY:
        mrr += subTotal / 12;
        break;
      default:
        mrr += subTotal;
    }
  }
  mrr = Math.round(mrr * 100) / 100;

  // 2. High-Performance SQL Aggregates for Invoices
  const isInvoiceStatus =
    filters.status && Object.values(InvoiceStatus).includes(filters.status as any);

  const invoiceWhere: Prisma.InvoiceWhereInput = {
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.planId && { subscription: { planId: filters.planId } }),
    ...(isInvoiceStatus && { status: filters.status as InvoiceStatus }),
    ...(start || end
      ? {
          issueDate: {
            ...(start && { gte: start }),
            ...(end && { lte: end }),
          },
        }
      : {}),
  };

  const invoiceAggs = await prisma.invoice.aggregate({
    where: invoiceWhere,
    _sum: {
      total: true,
      amountPaid: true,
    },
    _count: {
      id: true,
    },
  });

  const totalInvoiced = Math.round((invoiceAggs._sum.total || 0) * 100) / 100;
  const revenueCollected = Math.round((invoiceAggs._sum.amountPaid || 0) * 100) / 100;
  const outstandingAmount = Math.max(0, Math.round((totalInvoiced - revenueCollected) * 100) / 100);

  // 3. Overdue Invoices Aggregate
  // Overdue rule: status NOT IN [PAID, CANCELLED] and dueDate < today
  const overdueWhere: Prisma.InvoiceWhereInput = {
    ...invoiceWhere,
    status: {
      notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
    },
    dueDate: {
      lt: today,
    },
  };

  const overdueAggs = await prisma.invoice.aggregate({
    where: overdueWhere,
    _sum: {
      total: true,
      amountPaid: true,
    },
    _count: {
      id: true,
    },
  });

  const overdueCount = overdueAggs._count.id || 0;
  const overdueTotal = overdueAggs._sum.total || 0;
  const overduePaid = overdueAggs._sum.amountPaid || 0;
  const overdueAmount = Math.max(0, Math.round((overdueTotal - overduePaid) * 100) / 100);

  // 4. Revenue by Month Time-Series (Fast SQL Group By)
  const customerFilter = filters.customerId
    ? Prisma.sql`AND "customerId" = ${filters.customerId}`
    : Prisma.empty;
  const planFilter = filters.planId
    ? Prisma.sql`AND "subscriptionId" IN (SELECT "id" FROM "subscriptions" WHERE "planId" = ${filters.planId})`
    : Prisma.empty;
  const dateFilter =
    start && end
      ? Prisma.sql`AND "issueDate" >= ${start} AND "issueDate" <= ${end}`
      : start
      ? Prisma.sql`AND "issueDate" >= ${start}`
      : end
      ? Prisma.sql`AND "issueDate" <= ${end}`
      : Prisma.empty;

  const revenueByMonthRaw: Array<{ month: string; invoiced: number; collected: number }> =
    await prisma.$queryRaw`
      SELECT 
        TO_CHAR("issueDate", 'YYYY-MM') AS month,
        ROUND(COALESCE(SUM("total"), 0)::numeric, 2)::float AS invoiced,
        ROUND(COALESCE(SUM("amountPaid"), 0)::numeric, 2)::float AS collected
      FROM "invoices"
      WHERE "status" != CAST('CANCELLED' AS "InvoiceStatus")
        ${customerFilter}
        ${planFilter}
        ${dateFilter}
      GROUP BY TO_CHAR("issueDate", 'YYYY-MM')
      ORDER BY month ASC
      LIMIT 12;
    `;

  return {
    kpis: {
      activeSubscriptionCount,
      mrr,
      totalInvoiced,
      revenueCollected,
      outstandingAmount,
      overdueCount,
      overdueAmount,
      totalInvoicesCount: invoiceAggs._count.id || 0,
    },
    revenueByMonth: revenueByMonthRaw || [],
  };
}

export async function getOverdueInvoicesList(filters: ReportFilterOptions, page = 1, limit = 20) {
  const today = new Date();
  const start = filters.startDate ? new Date(filters.startDate) : undefined;
  let end: Date | undefined = undefined;
  if (filters.endDate) {
    end = new Date(filters.endDate);
    if (!isNaN(end.getTime()) && typeof filters.endDate === 'string' && filters.endDate.length === 10) {
      end.setHours(23, 59, 59, 999);
    }
  }

  const isInvoiceStatus =
    filters.status && Object.values(InvoiceStatus).includes(filters.status as any);

  const where: Prisma.InvoiceWhereInput = {
    ...(filters.customerId && { customerId: filters.customerId }),
    ...(filters.planId && { subscription: { planId: filters.planId } }),
    ...(isInvoiceStatus
      ? { status: filters.status as InvoiceStatus }
      : { status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] } }),
    dueDate: {
      lt: today,
    },
    ...(start || end
      ? {
          issueDate: {
            ...(start && { gte: start }),
            ...(end && { lte: end }),
          },
        }
      : {}),
  };

  const [total, rawInvoices] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, email: true } },
        subscription: { select: { id: true, number: true, plan: { select: { name: true } } } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { dueDate: 'asc' },
    }),
  ]);

  const overdueInvoices = rawInvoices.map((inv) => {
    const balance = Math.max(0, Math.round((inv.total - inv.amountPaid) * 100) / 100);
    const daysOverdue = Math.max(
      1,
      Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    return {
      id: inv.id,
      number: inv.number,
      customer: inv.customer,
      subscriptionNumber: inv.subscription?.number,
      planName: inv.subscription?.plan?.name,
      dueDate: inv.dueDate.toISOString(),
      issueDate: inv.issueDate.toISOString(),
      daysOverdue,
      total: inv.total,
      amountPaid: inv.amountPaid,
      outstanding: balance,
      outstandingBalance: balance,
      status: inv.status,
    };
  });

  return {
    overdueInvoices,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function getCustomerSummary(customerId: string) {
  const today = new Date();

  const [activeSubscriptionCount, invoiceAggs, overdueAggs, recentInvoices, recentSubscriptions] =
    await Promise.all([
      prisma.subscription.count({
        where: {
          customerId,
          status: SubscriptionStatus.ACTIVE,
        },
      }),
      prisma.invoice.aggregate({
        where: { customerId },
        _sum: { total: true, amountPaid: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: {
          customerId,
          status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
          dueDate: { lt: today },
        },
        _sum: { total: true, amountPaid: true },
        _count: { id: true },
      }),
      prisma.invoice.findMany({
        where: { customerId },
        orderBy: { issueDate: 'desc' },
        take: 5,
        include: {
          subscription: { select: { number: true, plan: { select: { name: true } } } },
        },
      }),
      prisma.subscription.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          plan: { select: { name: true, price: true, billingPeriod: true } },
        },
      }),
    ]);

  const totalInvoiced = Math.round((invoiceAggs._sum.total || 0) * 100) / 100;
  const revenueCollected = Math.round((invoiceAggs._sum.amountPaid || 0) * 100) / 100;
  const outstandingAmount = Math.max(0, Math.round((totalInvoiced - revenueCollected) * 100) / 100);

  const overdueCount = overdueAggs._count.id || 0;
  const overdueTotal = overdueAggs._sum.total || 0;
  const overduePaid = overdueAggs._sum.amountPaid || 0;
  const overdueAmount = Math.max(0, Math.round((overdueTotal - overduePaid) * 100) / 100);

  return {
    activeSubscriptionCount,
    totalInvoiced,
    revenueCollected,
    totalPaid: revenueCollected,
    outstandingAmount,
    outstandingBalance: outstandingAmount,
    overdueInvoiceCount: overdueCount,
    overdueTotalAmount: overdueAmount,
    recentInvoices: recentInvoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      total: inv.total,
      amountPaid: inv.amountPaid,
      outstanding: Math.max(0, Math.round((inv.total - inv.amountPaid) * 100) / 100),
      status: inv.status,
      planName: inv.subscription?.plan?.name,
    })),
    recentSubscriptions: recentSubscriptions.map((sub) => ({
      id: sub.id,
      number: sub.number,
      planName: sub.plan.name,
      price: sub.plan.price,
      billingPeriod: sub.plan.billingPeriod,
      status: sub.status,
      startDate: sub.startDate.toISOString(),
      nextBillingDate: sub.nextBillingDate?.toISOString(),
    })),
  };
}
