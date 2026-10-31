import {
  PrismaClient,
  Role,
  BillingPeriod,
  DiscountType,
  DiscountAppliesTo,
  SubscriptionStatus,
  InvoiceStatus,
  PaymentMethod,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Idempotent Database Seeding ---');

  // ==========================================
  // 1. Users (Admin, Staff, Customers)
  // ==========================================
  const adminPasswordHash = await bcrypt.hash('Admin@1234', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@1234', 10);
  const custPasswordHash = await bcrypt.hash('Customer@1234', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.com' },
    update: {
      name: 'Brightloop Administrator',
      role: Role.ADMIN,
      isActive: true,
      passwordHash: adminPasswordHash,
    },
    create: {
      name: 'Brightloop Administrator',
      email: 'admin@brightloop.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'staff@brightloop.com' },
    update: {
      name: 'Sarah Staff',
      role: Role.STAFF,
      isActive: true,
      passwordHash: staffPasswordHash,
    },
    create: {
      name: 'Sarah Staff',
      email: 'staff@brightloop.com',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      isActive: true,
    },
  });

  const cust1 = await prisma.user.upsert({
    where: { email: 'cust1@acmecorp.com' },
    update: {
      name: 'Acme Corporation',
      role: Role.CUSTOMER,
      isActive: true,
      passwordHash: custPasswordHash,
    },
    create: {
      name: 'Acme Corporation',
      email: 'cust1@acmecorp.com',
      passwordHash: custPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  const cust2 = await prisma.user.upsert({
    where: { email: 'cust2@globex.com' },
    update: {
      name: 'Globex Inc',
      role: Role.CUSTOMER,
      isActive: true,
      passwordHash: custPasswordHash,
    },
    create: {
      name: 'Globex Inc',
      email: 'cust2@globex.com',
      passwordHash: custPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  const cust3 = await prisma.user.upsert({
    where: { email: 'cust3@initech.com' },
    update: {
      name: 'Initech Solutions',
      role: Role.CUSTOMER,
      isActive: true,
      passwordHash: custPasswordHash,
    },
    create: {
      name: 'Initech Solutions',
      email: 'cust3@initech.com',
      passwordHash: custPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  console.log('Seeded Users: 1 Admin, 1 Staff, 3 Customers (upserted)');

  // ==========================================
  // 2. Products with Variants
  // ==========================================
  let product1 = await prisma.product.findFirst({
    where: { name: 'Enterprise ERP Suite' },
    include: { variants: true },
  });

  if (!product1) {
    product1 = await prisma.product.create({
      data: {
        name: 'Enterprise ERP Suite',
        type: 'SOFTWARE',
        salesPrice: 1200.0,
        costPrice: 400.0,
        notes: 'Integrated enterprise resource planning and management suite',
        isActive: true,
        variants: {
          create: [
            { attribute: 'Brand', value: 'Odoo', extraPrice: 560.0 },
            { attribute: 'Brand', value: 'SAP', extraPrice: 1200.0 },
          ],
        },
      },
      include: { variants: true },
    });
  }

  let product2 = await prisma.product.findFirst({
    where: { name: 'Cloud Hosting Standard' },
    include: { variants: true },
  });

  if (!product2) {
    product2 = await prisma.product.create({
      data: {
        name: 'Cloud Hosting Standard',
        type: 'INFRASTRUCTURE',
        salesPrice: 150.0,
        costPrice: 50.0,
        notes: 'Dedicated virtual cloud compute and scalable storage node',
        isActive: true,
        variants: {
          create: [
            { attribute: 'Region', value: 'US-East', extraPrice: 0.0 },
            { attribute: 'Region', value: 'EU-Central', extraPrice: 25.0 },
          ],
        },
      },
      include: { variants: true },
    });
  }

  let product3 = await prisma.product.findFirst({
    where: { name: 'Priority Technical Support' },
    include: { variants: true },
  });

  if (!product3) {
    product3 = await prisma.product.create({
      data: {
        name: 'Priority Technical Support',
        type: 'SERVICE',
        salesPrice: 300.0,
        costPrice: 100.0,
        notes: '24/7 dedicated engineering response SLA',
        isActive: true,
        variants: {
          create: [
            { attribute: 'Tier', value: 'Gold 24/7', extraPrice: 150.0 },
            { attribute: 'Tier', value: 'Platinum VIP', extraPrice: 350.0 },
          ],
        },
      },
      include: { variants: true },
    });
  }

  console.log('Seeded 3 Products with Variants (idempotent)');

  // ==========================================
  // 3. Plans (Monthly, Yearly, Weekly)
  // ==========================================
  const now = new Date();
  const nextYear = new Date(now);
  nextYear.setFullYear(now.getFullYear() + 1);

  let plan1 = await prisma.plan.findFirst({ where: { name: 'Starter Business' } });
  if (!plan1) {
    plan1 = await prisma.plan.create({
      data: {
        name: 'Starter Business',
        price: 99.0,
        billingPeriod: BillingPeriod.MONTHLY,
        minQuantity: 1,
        startDate: now,
        endDate: nextYear,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true,
        isActive: true,
      },
    });
  }

  let plan2 = await prisma.plan.findFirst({ where: { name: 'Growth Pro' } });
  if (!plan2) {
    plan2 = await prisma.plan.create({
      data: {
        name: 'Growth Pro',
        price: 249.0,
        billingPeriod: BillingPeriod.MONTHLY,
        minQuantity: 2,
        startDate: now,
        endDate: nextYear,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true,
        isActive: true,
      },
    });
  }

  let plan3 = await prisma.plan.findFirst({ where: { name: 'Enterprise Annual' } });
  if (!plan3) {
    plan3 = await prisma.plan.create({
      data: {
        name: 'Enterprise Annual',
        price: 2400.0,
        billingPeriod: BillingPeriod.YEARLY,
        minQuantity: 5,
        startDate: now,
        endDate: nextYear,
        autoClose: false,
        closable: false,
        pausable: true,
        renewable: true,
        isActive: true,
      },
    });
  }

  let plan4 = await prisma.plan.findFirst({ where: { name: 'Sprint Agile Weekly' } });
  if (!plan4) {
    plan4 = await prisma.plan.create({
      data: {
        name: 'Sprint Agile Weekly',
        price: 49.0,
        billingPeriod: BillingPeriod.WEEKLY,
        minQuantity: 1,
        startDate: now,
        endDate: nextYear,
        autoClose: false,
        closable: true,
        pausable: true,
        renewable: true,
        isActive: true,
      },
    });
  }

  console.log('Seeded Plans (idempotent: Monthly, Yearly, Weekly)');

  // ==========================================
  // 4. Taxes
  // ==========================================
  let tax1 = await prisma.tax.findFirst({ where: { name: 'Standard GST / VAT (18%)' } });
  if (!tax1) {
    tax1 = await prisma.tax.create({
      data: {
        name: 'Standard GST / VAT (18%)',
        ratePercent: 18.0,
        active: true,
      },
    });
  }

  let tax2 = await prisma.tax.findFirst({ where: { name: 'Reduced Service Tax (5%)' } });
  if (!tax2) {
    tax2 = await prisma.tax.create({
      data: {
        name: 'Reduced Service Tax (5%)',
        ratePercent: 5.0,
        active: true,
      },
    });
  }

  console.log('Seeded 2 Taxes (idempotent)');

  // ==========================================
  // 5. Discounts
  // ==========================================
  let discount1 = await prisma.discount.findFirst({ where: { name: 'Welcome Pro 20%' } });
  if (!discount1) {
    discount1 = await prisma.discount.create({
      data: {
        name: 'Welcome Pro 20%',
        type: DiscountType.PERCENT,
        value: 20.0,
        minPurchase: 100.0,
        minQuantity: 1,
        startDate: now,
        endDate: nextYear,
        usageLimit: 100,
        usedCount: 0,
        appliesTo: DiscountAppliesTo.SUBSCRIPTION,
        isActive: true,
      },
    });
  }

  let discount2 = await prisma.discount.findFirst({ where: { name: 'ERP Special Promo $100' } });
  if (!discount2) {
    discount2 = await prisma.discount.create({
      data: {
        name: 'ERP Special Promo $100',
        type: DiscountType.FIXED,
        value: 100.0,
        minPurchase: 500.0,
        minQuantity: 1,
        startDate: now,
        endDate: nextYear,
        usageLimit: 50,
        usedCount: 0,
        appliesTo: DiscountAppliesTo.PRODUCT,
        isActive: true,
        discountProducts: {
          create: [{ productId: product1.id }],
        },
      },
    });
  }

  console.log('Seeded 2 Discounts (idempotent)');

  // ==========================================
  // 6. Subscriptions (across all 5 states, at least 3 ACTIVE for cust1)
  // ==========================================
  const subDefinitions = [
    {
      number: 'SUB-2026-00001',
      customerId: cust1.id,
      planId: plan1.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      nextBillingDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // in 20 days
      paymentTerms: 'NET_30',
      lines: [
        {
          productId: product1.id,
          variantId: product1.variants[0]?.id,
          quantity: 1,
          unitPrice: 1760.0,
          amount: 1760.0,
        },
      ],
    },
    {
      number: 'SUB-2026-00002',
      customerId: cust1.id,
      planId: plan2.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // in 5 days
      paymentTerms: 'NET_15',
      lines: [
        {
          productId: product2.id,
          variantId: product2.variants[1]?.id,
          quantity: 2,
          unitPrice: 175.0,
          amount: 350.0,
        },
      ],
    },
    {
      number: 'SUB-2026-00003',
      customerId: cust1.id,
      planId: plan3.id,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
      nextBillingDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000), // in ~6 months
      paymentTerms: 'IMMEDIATE',
      lines: [
        {
          productId: product3.id,
          variantId: product3.variants[1]?.id,
          quantity: 1,
          unitPrice: 650.0,
          amount: 650.0,
        },
      ],
    },
    {
      number: 'SUB-2026-00004',
      customerId: cust2.id,
      planId: plan1.id,
      status: SubscriptionStatus.CONFIRMED,
      startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      nextBillingDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      paymentTerms: 'NET_30',
      lines: [
        {
          productId: product1.id,
          variantId: product1.variants[0]?.id,
          quantity: 1,
          unitPrice: 1760.0,
          amount: 1760.0,
        },
      ],
    },
    {
      number: 'SUB-2026-00005',
      customerId: cust2.id,
      planId: plan2.id,
      status: SubscriptionStatus.QUOTATION,
      startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      quotationExpiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      paymentTerms: 'NET_30',
      lines: [
        {
          productId: product2.id,
          variantId: product2.variants[0]?.id,
          quantity: 1,
          unitPrice: 150.0,
          amount: 150.0,
        },
      ],
    },
    {
      number: 'SUB-2026-00006',
      customerId: cust3.id,
      planId: plan1.id,
      status: SubscriptionStatus.DRAFT,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      quotationExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      paymentTerms: 'NET_15',
      lines: [
        {
          productId: product3.id,
          variantId: product3.variants[0]?.id,
          quantity: 1,
          unitPrice: 450.0,
          amount: 450.0,
        },
      ],
    },
    {
      number: 'SUB-2026-00007',
      customerId: cust3.id,
      planId: plan3.id,
      status: SubscriptionStatus.CLOSED,
      startDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      expiryDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      paymentTerms: 'NET_30',
      lines: [
        {
          productId: product1.id,
          variantId: product1.variants[1]?.id,
          quantity: 1,
          unitPrice: 2400.0,
          amount: 2400.0,
        },
      ],
    },
  ];

  const seededSubs: Record<string, any> = {};

  for (const sDef of subDefinitions) {
    const { lines, ...subData } = sDef;
    const sub = await prisma.subscription.upsert({
      where: { number: sDef.number },
      update: {
        ...subData,
      },
      create: {
        ...subData,
      },
    });

    seededSubs[sub.number] = sub;

    // Ensure line items exist
    const existingLine = await prisma.subscriptionLine.findFirst({
      where: { subscriptionId: sub.id },
    });
    if (!existingLine) {
      for (const line of lines) {
        await prisma.subscriptionLine.create({
          data: {
            subscription: { connect: { id: sub.id } },
            product: { connect: { id: line.productId } },
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            amount: line.amount,
          },
        });
      }
    }
  }

  console.log('Seeded 7 Subscriptions across all 5 statuses (idempotent)');

  // ==========================================
  // 7. Invoices (about 10 invoices, unique per sub & periodStart)
  // Statuses: DRAFT, CONFIRMED, PAID
  // Overdue (CONFIRMED & dueDate < today): at least 2
  // PAID: at least 3
  // Unpaid not yet due: 1
  // ==========================================
  const invoiceDefinitions = [
    {
      number: 'INV-2026-00001',
      subscriptionNumber: 'SUB-2026-00001',
      customerId: cust1.id,
      status: InvoiceStatus.PAID,
      periodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // Paid past due
      subtotal: 1760.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 1760.0,
      amountPaid: 1760.0,
    },
    {
      number: 'INV-2026-00002',
      subscriptionNumber: 'SUB-2026-00001',
      customerId: cust1.id,
      status: InvoiceStatus.PAID,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Paid past due
      subtotal: 1760.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 1760.0,
      amountPaid: 1760.0,
    },
    {
      number: 'INV-2026-00003',
      subscriptionNumber: 'SUB-2026-00002',
      customerId: cust1.id,
      status: InvoiceStatus.PAID,
      periodStart: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      subtotal: 350.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 350.0,
      amountPaid: 350.0,
    },
    {
      // Overdue Invoice 1 (CONFIRMED, past due, unpaid)
      number: 'INV-2026-00004',
      subscriptionNumber: 'SUB-2026-00002',
      customerId: cust1.id,
      status: InvoiceStatus.CONFIRMED,
      periodStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // OVERDUE
      subtotal: 350.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 350.0,
      amountPaid: 0.0,
    },
    {
      // Overdue Invoice 2 (CONFIRMED, past due, partially paid)
      number: 'INV-2026-00005',
      subscriptionNumber: 'SUB-2026-00002',
      customerId: cust1.id,
      status: InvoiceStatus.CONFIRMED,
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(),
      issueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // OVERDUE
      subtotal: 350.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 350.0,
      amountPaid: 100.0,
    },
    {
      // Unpaid not yet due (CONFIRMED, future dueDate)
      number: 'INV-2026-00006',
      subscriptionNumber: 'SUB-2026-00001',
      customerId: cust1.id,
      status: InvoiceStatus.CONFIRMED,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000), // FUTURE DUE
      subtotal: 1760.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 1760.0,
      amountPaid: 0.0,
    },
    {
      // Overdue Invoice 3 for cust2
      number: 'INV-2026-00007',
      subscriptionNumber: 'SUB-2026-00004',
      customerId: cust2.id,
      status: InvoiceStatus.CONFIRMED,
      periodStart: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // OVERDUE
      subtotal: 1760.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 1760.0,
      amountPaid: 0.0,
    },
    {
      number: 'INV-2026-00008',
      subscriptionNumber: 'SUB-2026-00003',
      customerId: cust1.id,
      status: InvoiceStatus.PAID,
      periodStart: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      subtotal: 650.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 650.0,
      amountPaid: 650.0,
    },
    {
      // Draft invoice
      number: 'INV-2026-00009',
      subscriptionNumber: 'SUB-2026-00006',
      customerId: cust3.id,
      status: InvoiceStatus.DRAFT,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 450.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 450.0,
      amountPaid: 0.0,
    },
    {
      number: 'INV-2026-00010',
      subscriptionNumber: 'SUB-2026-00007',
      customerId: cust3.id,
      status: InvoiceStatus.PAID,
      periodStart: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      periodEnd: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      issueDate: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() - 370 * 24 * 60 * 60 * 1000),
      subtotal: 2400.0,
      discountTotal: 0.0,
      taxTotal: 0.0,
      total: 2400.0,
      amountPaid: 2400.0,
    },
  ];

  const seededInvoices: Record<string, any> = {};

  for (const invDef of invoiceDefinitions) {
    const sub = seededSubs[invDef.subscriptionNumber];
    const invoice = await prisma.invoice.upsert({
      where: { number: invDef.number },
      update: {
        subscription: sub ? { connect: { id: sub.id } } : undefined,
        customer: { connect: { id: invDef.customerId } },
        status: invDef.status,
        periodStart: invDef.periodStart,
        periodEnd: invDef.periodEnd,
        issueDate: invDef.issueDate,
        dueDate: invDef.dueDate,
        subtotal: invDef.subtotal,
        discountTotal: invDef.discountTotal,
        taxTotal: invDef.taxTotal,
        total: invDef.total,
        amountPaid: invDef.amountPaid,
      },
      create: {
        number: invDef.number,
        subscription: { connect: { id: sub.id } },
        customer: { connect: { id: invDef.customerId } },
        status: invDef.status,
        periodStart: invDef.periodStart,
        periodEnd: invDef.periodEnd,
        issueDate: invDef.issueDate,
        dueDate: invDef.dueDate,
        subtotal: invDef.subtotal,
        discountTotal: invDef.discountTotal,
        taxTotal: invDef.taxTotal,
        total: invDef.total,
        amountPaid: invDef.amountPaid,
      },
    });

    seededInvoices[invoice.number] = invoice;

    // Line item for invoice
    const existingLine = await prisma.invoiceLine.findFirst({
      where: { invoiceId: invoice.id },
    });
    if (!existingLine) {
      await prisma.invoiceLine.create({
        data: {
          invoice: { connect: { id: invoice.id } },
          product: { connect: { id: product1.id } },
          quantity: 1,
          unitPrice: invDef.subtotal,
          amount: invDef.subtotal,
        },
      });
    }
  }

  console.log('Seeded 10 Invoices across DRAFT, CONFIRMED, PAID (idempotent)');

  // ==========================================
  // 8. Payments (5 payments with diverse methods consistent with amountPaid)
  // ==========================================
  const paymentDefinitions = [
    {
      invoiceNumber: 'INV-2026-00001',
      method: PaymentMethod.CARD,
      amount: 1760.0,
      paymentDate: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000),
      note: 'Stripe online payment (Card ending 4242)',
    },
    {
      invoiceNumber: 'INV-2026-00002',
      method: PaymentMethod.BANK_TRANSFER,
      amount: 1760.0,
      paymentDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      note: 'Direct wire transfer ref: WT-883921',
    },
    {
      invoiceNumber: 'INV-2026-00003',
      method: PaymentMethod.UPI,
      amount: 350.0,
      paymentDate: new Date(Date.now() - 78 * 24 * 60 * 60 * 1000),
      note: 'UPI payment id: upi_9827361',
    },
    {
      invoiceNumber: 'INV-2026-00005',
      method: PaymentMethod.CASH,
      amount: 100.0,
      paymentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      note: 'Partial cash settlement receipt #CS-102',
    },
    {
      invoiceNumber: 'INV-2026-00008',
      method: PaymentMethod.CHEQUE,
      amount: 650.0,
      paymentDate: new Date(Date.now() - 155 * 24 * 60 * 60 * 1000),
      note: 'Corporate Cheque #004481 cleared',
    },
  ];

  for (const pDef of paymentDefinitions) {
    const inv = seededInvoices[pDef.invoiceNumber];
    if (inv) {
      const existingPay = await prisma.payment.findFirst({
        where: { invoiceId: inv.id, amount: pDef.amount, method: pDef.method },
      });
      if (!existingPay) {
        await prisma.payment.create({
          data: {
            invoice: { connect: { id: inv.id } },
            method: pDef.method,
            amount: pDef.amount,
            paymentDate: pDef.paymentDate,
            note: pDef.note,
          },
        });
      }
    }
  }

  console.log('Seeded 5 Payments across CARD, BANK_TRANSFER, UPI, CASH, CHEQUE (idempotent)');
  console.log('--- Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
