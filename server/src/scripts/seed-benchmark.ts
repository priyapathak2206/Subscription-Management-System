import { PrismaClient, SubscriptionStatus, InvoiceStatus, BillingPeriod, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting High-Scale Benchmark Seeding (5,000 Subs, 20,000 Invoices) ---');
  const start = Date.now();

  // 1. Ensure a benchmark customer exists
  const benchmarkCustomer = await prisma.user.upsert({
    where: { email: 'benchmark.customer@brightloop.com' },
    update: {},
    create: {
      name: 'Global Enterprise Holdings',
      email: 'benchmark.customer@brightloop.com',
      passwordHash: await bcrypt.hash('Customer@1234', 10),
      role: Role.CUSTOMER,
    },
  });

  // 2. Ensure benchmark plan exists
  const benchmarkPlan = await prisma.plan.upsert({
    where: { id: 'plan-bench-001' },
    update: {},
    create: {
      id: 'plan-bench-001',
      name: 'Enterprise Scale Plan',
      price: 299,
      billingPeriod: BillingPeriod.MONTHLY,
      minQuantity: 1,
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
      isActive: true,
    },
  });

  // 3. Batch insert 5,000 subscriptions
  console.log('Generating 5,000 subscriptions...');
  const subBatchSize = 1000;
  const totalSubs = 5000;
  const subIds: string[] = [];

  for (let b = 0; b < totalSubs / subBatchSize; b++) {
    const subRecords = [];
    for (let i = 0; i < subBatchSize; i++) {
      const idx = b * subBatchSize + i + 1;
      const id = `bench-sub-${idx.toString().padStart(5, '0')}`;
      subIds.push(id);
      const isPast = idx % 2 === 0;
      const status = idx % 5 === 0 ? SubscriptionStatus.CLOSED : SubscriptionStatus.ACTIVE;

      subRecords.push({
        id,
        number: `SUB-BENCH-${idx.toString().padStart(6, '0')}`,
        customerId: benchmarkCustomer.id,
        planId: benchmarkPlan.id,
        startDate: new Date('2025-01-01'),
        expiryDate: new Date('2027-01-01'),
        paymentTerms: 'NET_30',
        status,
        nextBillingDate: isPast ? new Date('2026-10-01') : new Date('2026-12-01'),
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      });
    }

    await prisma.subscription.createMany({
      data: subRecords,
      skipDuplicates: true,
    });
    console.log(` Inserted ${(b + 1) * subBatchSize} / ${totalSubs} subscriptions`);
  }

  // 4. Batch insert 20,000 invoices
  console.log('Generating 20,000 invoices across subscriptions...');
  const invBatchSize = 2000;
  const totalInvoices = 20000;
  const today = new Date();

  for (let b = 0; b < totalInvoices / invBatchSize; b++) {
    const invRecords = [];
    for (let i = 0; i < invBatchSize; i++) {
      const idx = b * invBatchSize + i + 1;
      const subId = subIds[idx % subIds.length];
      const monthOffset = (idx % 12);
      const periodStart = new Date(2026, monthOffset, 1);
      const periodEnd = new Date(2026, monthOffset + 1, 1);
      const dueDate = new Date(2026, monthOffset, 28);
      const isOverdue = dueDate < today && idx % 3 === 0;
      const status = isOverdue
        ? InvoiceStatus.CONFIRMED
        : idx % 4 === 0
        ? InvoiceStatus.DRAFT
        : InvoiceStatus.PAID;

      const subtotal = 299.0;
      const taxTotal = 53.82;
      const total = 352.82;
      const amountPaid = status === InvoiceStatus.PAID ? total : isOverdue ? 50.0 : 0.0;

      invRecords.push({
        id: `bench-inv-${idx.toString().padStart(6, '0')}`,
        number: `INV-BENCH-${idx.toString().padStart(7, '0')}`,
        subscriptionId: subId,
        customerId: benchmarkCustomer.id,
        periodStart,
        periodEnd,
        issueDate: periodStart,
        dueDate,
        status,
        subtotal,
        discountTotal: 0,
        taxTotal,
        total,
        amountPaid,
        createdAt: periodStart,
        updatedAt: periodStart,
      });
    }

    await prisma.invoice.createMany({
      data: invRecords,
      skipDuplicates: true,
    });
    console.log(` Inserted ${(b + 1) * invBatchSize} / ${totalInvoices} invoices`);
  }

  const elapsed = (Date.now() - start) / 1000;
  console.log(`Benchmark seeding completed in ${elapsed.toFixed(2)}s!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
