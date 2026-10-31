process.env.NODE_ENV = 'production';

import { PrismaClient } from '@prisma/client';
import { getSummaryKPIs, getOverdueInvoicesList, getCustomerSummary } from '../modules/reports/reports.service.js';

const prisma = new PrismaClient({ log: ['error'] });

interface BenchmarkRow {
  endpoint: string;
  page: string;
  timingMs: number;
  status: string;
  notes: string;
}

async function runBenchmark() {
  console.log('========================================================================');
  console.log('=== Brightloop System Real Benchmark: 5,000 Subs & 20,000 Invoices ===');
  console.log('========================================================================\n');

  const customer = await prisma.user.findFirst({
    where: { email: 'benchmark.customer@brightloop.com' },
  });

  if (!customer) {
    throw new Error('Benchmark customer not found. Run seed-benchmark.ts first!');
  }

  const results: BenchmarkRow[] = [];

  // Helper to record benchmark
  async function measure(endpoint: string, page: string, fn: () => Promise<any>, notes: string) {
    // Warm up once
    await fn();
    // Measure 3 iterations and take median
    const timings: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      await fn();
      timings.push(Math.round((performance.now() - t0) * 100) / 100);
    }
    timings.sort((a, b) => a - b);
    const medianMs = timings[1];
    const status = medianMs < 2000 ? 'PASS (< 2.0s)' : 'FAIL (> 2.0s)';
    results.push({ endpoint, page, timingMs: medianMs, status, notes });
  }

  // 1. Subscriptions Listing (Page 1 & Deep Page)
  await measure(
    'GET /api/subscriptions',
    'Page 1 (offset 0)',
    async () => {
      const [total, items] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.findMany({
          take: 20,
          skip: 0,
          include: {
            customer: { select: { id: true, name: true, email: true } },
            plan: true,
            _count: { select: { invoices: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return { total, items };
    },
    '5,000 subscriptions total'
  );

  await measure(
    'GET /api/subscriptions',
    'Deep Page 100 (offset 1,980)',
    async () => {
      const [total, items] = await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.findMany({
          take: 20,
          skip: 1980,
          include: {
            customer: { select: { id: true, name: true, email: true } },
            plan: true,
            _count: { select: { invoices: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return { total, items };
    },
    '5,000 subscriptions total'
  );

  // 2. Invoices Listing (Page 1 & Deep Page)
  await measure(
    'GET /api/invoices',
    'Page 1 (offset 0)',
    async () => {
      const [total, items] = await Promise.all([
        prisma.invoice.count(),
        prisma.invoice.findMany({
          take: 20,
          skip: 0,
          include: {
            customer: { select: { id: true, name: true, email: true } },
            subscription: { select: { id: true, number: true, status: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return { total, items };
    },
    '20,000 invoices total'
  );

  await measure(
    'GET /api/invoices',
    'Deep Page 100 (offset 1,980)',
    async () => {
      const [total, items] = await Promise.all([
        prisma.invoice.count(),
        prisma.invoice.findMany({
          take: 20,
          skip: 1980,
          include: {
            customer: { select: { id: true, name: true, email: true } },
            subscription: { select: { id: true, number: true, status: true } },
            payments: { orderBy: { paymentDate: 'desc' } },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      return { total, items };
    },
    '20,000 invoices total'
  );

  // 3. Payments Ledger (Page 1 & Deep Page)
  await measure(
    'GET /api/payments',
    'Page 1 (offset 0)',
    async () => {
      const [total, items] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.findMany({
          take: 20,
          skip: 0,
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                total: true,
                amountPaid: true,
                status: true,
                customer: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
      ]);
      return { total, items };
    },
    '16,666 payments total'
  );

  await measure(
    'GET /api/payments',
    'Deep Page 100 (offset 1,980)',
    async () => {
      const [total, items] = await Promise.all([
        prisma.payment.count(),
        prisma.payment.findMany({
          take: 20,
          skip: 1980,
          include: {
            invoice: {
              select: {
                id: true,
                number: true,
                total: true,
                amountPaid: true,
                status: true,
                customer: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { paymentDate: 'desc' },
        }),
      ]);
      return { total, items };
    },
    '16,666 payments total'
  );

  // 4. Reports Summary (KPI Aggregates, MRR calculation, and SQL Monthly Breakdown)
  await measure(
    'GET /api/reports/summary',
    'Full Dataset Aggregate',
    async () => {
      return getSummaryKPIs({});
    },
    'Aggregates across all 20,000 invoices & 5,000 subs'
  );

  // 5. Reports Overdue (Page 1 & Deep Page)
  await measure(
    'GET /api/reports/overdue',
    'Page 1 (offset 0)',
    async () => {
      return getOverdueInvoicesList({}, 1, 20);
    },
    'Overdue invoices filtered by status & dueDate'
  );

  await measure(
    'GET /api/reports/overdue',
    'Deep Page 50 (offset 980)',
    async () => {
      return getOverdueInvoicesList({}, 50, 20);
    },
    'Overdue invoices filtered by status & dueDate'
  );

  // 6. Customer Summary Report (Individual account analytics)
  await measure(
    'GET /api/reports/customer-summary',
    'Account Scope',
    async () => {
      return getCustomerSummary(customer.id);
    },
    'KPIs & recent items for customer with 20k invoices'
  );

  // 7. Portal Lists (Scoped to customerId)
  await measure(
    'GET /api/subscriptions (Portal)',
    'Page 1 (offset 0)',
    async () => {
      return prisma.subscription.findMany({
        where: { customerId: customer.id },
        take: 20,
        skip: 0,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    'Customer-scoped subscriptions'
  );

  await measure(
    'GET /api/subscriptions (Portal)',
    'Deep Page 100 (offset 1,980)',
    async () => {
      return prisma.subscription.findMany({
        where: { customerId: customer.id },
        take: 20,
        skip: 1980,
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    'Customer-scoped subscriptions'
  );

  await measure(
    'GET /api/invoices (Portal)',
    'Page 1 (offset 0)',
    async () => {
      return prisma.invoice.findMany({
        where: { customerId: customer.id },
        take: 20,
        skip: 0,
        include: { subscription: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    'Customer-scoped invoices'
  );

  await measure(
    'GET /api/invoices (Portal)',
    'Deep Page 100 (offset 1,980)',
    async () => {
      return prisma.invoice.findMany({
        where: { customerId: customer.id },
        take: 20,
        skip: 1980,
        include: { subscription: true },
        orderBy: { createdAt: 'desc' },
      });
    },
    'Customer-scoped invoices'
  );

  // Print results table
  console.log('\n### Benchmark Results Table (Real PostgreSQL Measurements)\n');
  console.log('| Endpoint | Page / Scope | Latency (ms) | SLA Status | Notes |');
  console.log('|---|---|:---:|:---:|---|');
  for (const r of results) {
    console.log(
      `| \`${r.endpoint}\` | ${r.page} | **${r.timingMs.toFixed(1)} ms** | ${r.status} | ${r.notes} |`
    );
  }

  const allPass = results.every((r) => r.timingMs < 2000);
  console.log(
    `\nSLA Evaluation: ${allPass ? ' ALL ENDPOINTS SATISFIED SUB-2.0s SLA' : '❌ SOME ENDPOINTS EXCEEDED 2.0s'}`
  );
}

runBenchmark()
  .catch((e) => {
    console.error('Benchmark failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
