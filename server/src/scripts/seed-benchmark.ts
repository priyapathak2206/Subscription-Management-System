import { PrismaClient, SubscriptionStatus, InvoiceStatus, BillingPeriod, Role, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting High-Scale Benchmark Seeding (5,000 Subs, 20,000 Invoices, 10,000 Payments) ---');
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

  // 3. Clean up existing benchmark records to ensure pristine counts
  console.log('Cleaning up existing benchmark records...');
  await prisma.payment.deleteMany({
    where: { invoice: { customerId: benchmarkCustomer.id } },
  });
  await prisma.invoiceLine.deleteMany({
    where: { invoice: { customerId: benchmarkCustomer.id } },
  });
  await prisma.invoice.deleteMany({
    where: { customerId: benchmarkCustomer.id },
  });
  await prisma.subscriptionLine.deleteMany({
    where: { subscription: { customerId: benchmarkCustomer.id } },
  });
  await prisma.subscriptionStatusHistory.deleteMany({
    where: { subscription: { customerId: benchmarkCustomer.id } },
  });
  await prisma.subscription.deleteMany({
    where: { customerId: benchmarkCustomer.id },
  });

  // 4. Batch insert 5,000 subscriptions
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
    });
    console.log(` Inserted ${(b + 1) * subBatchSize} / ${totalSubs} subscriptions`);
  }

  // 5. Batch insert exactly 20,000 invoices (4 per subscription across 4 months)
  console.log('Generating 20,000 invoices across subscriptions...');
  const today = new Date();
  const paymentRecords: any[] = [];
  const invRecords: any[] = [];

  let invCount = 0;
  for (let subIdx = 0; subIdx < totalSubs; subIdx++) {
    const subId = subIds[subIdx];

    for (let m = 0; m < 4; m++) {
      invCount++;
      const periodStart = new Date(2026, m, 1);
      const periodEnd = new Date(2026, m + 1, 1);
      const dueDate = new Date(2026, m, 28);
      const isOverdue = dueDate < today && invCount % 3 === 0;
      const status = isOverdue
        ? InvoiceStatus.CONFIRMED
        : invCount % 4 === 0
        ? InvoiceStatus.DRAFT
        : InvoiceStatus.PAID;

      const subtotal = 299.0;
      const taxTotal = 53.82;
      const total = 352.82;
      const amountPaid = status === InvoiceStatus.PAID ? total : isOverdue ? 50.0 : 0.0;
      const invId = `bench-inv-${invCount.toString().padStart(6, '0')}`;

      invRecords.push({
        id: invId,
        number: `INV-BENCH-${invCount.toString().padStart(7, '0')}`,
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

      if (amountPaid > 0) {
        paymentRecords.push({
          id: `bench-pay-${invCount.toString().padStart(6, '0')}`,
          invoiceId: invId,
          amount: amountPaid,
          method: PaymentMethod.BANK_TRANSFER,
          paymentDate: dueDate,
          note: `Benchmark payment for ${invId}`,
          createdAt: dueDate,
        });
      }
    }
  }

  // Batch insert invoices in chunks of 2,000
  const invChunk = 2000;
  for (let i = 0; i < invRecords.length; i += invChunk) {
    const slice = invRecords.slice(i, i + invChunk);
    await prisma.invoice.createMany({ data: slice });
    console.log(` Inserted ${Math.min(i + invChunk, invRecords.length)} / ${invRecords.length} invoices`);
  }

  // Batch insert payments in chunks of 2,000
  console.log(`Generating ${paymentRecords.length} payments...`);
  for (let i = 0; i < paymentRecords.length; i += invChunk) {
    const slice = paymentRecords.slice(i, i + invChunk);
    await prisma.payment.createMany({ data: slice });
    console.log(` Inserted ${Math.min(i + invChunk, paymentRecords.length)} / ${paymentRecords.length} payments`);
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
