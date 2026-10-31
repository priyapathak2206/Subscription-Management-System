import { PrismaClient, Role, BillingPeriod, DiscountType, DiscountAppliesTo } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  // Clear existing data in reverse order of dependencies
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionStatusHistory.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discountProduct.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users
  const adminPasswordHash = await bcrypt.hash('Admin@1234', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@1234', 10);
  const custPasswordHash = await bcrypt.hash('Customer@1234', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Brightloop Administrator',
      email: 'admin@brightloop.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Sarah Staff',
      email: 'staff@brightloop.com',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      isActive: true,
    },
  });

  const cust1 = await prisma.user.create({
    data: {
      name: 'Acme Corporation',
      email: 'cust1@acmecorp.com',
      passwordHash: custPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  const cust2 = await prisma.user.create({
    data: {
      name: 'Globex Inc',
      email: 'cust2@globex.com',
      passwordHash: custPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  const cust3 = await prisma.user.create({
    data: {
      name: 'Initech Solutions',
      email: 'cust3@initech.com',
      passwordHash: custPasswordHash,
      role: Role.CUSTOMER,
      isActive: true,
    },
  });

  console.log('Seeded Users: 1 Admin, 1 Staff, 3 Customers');

  // 2. Products with Variants
  const product1 = await prisma.product.create({
    data: {
      name: 'Enterprise ERP Suite',
      type: 'SOFTWARE',
      salesPrice: 1200.0,
      costPrice: 400.0,
      notes: 'Integrated enterprise resource planning and management suite',
      isActive: true,
      variants: {
        create: [
          {
            attribute: 'Brand',
            value: 'Odoo',
            extraPrice: 560.0,
          },
          {
            attribute: 'Brand',
            value: 'SAP',
            extraPrice: 1200.0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Cloud Hosting Standard',
      type: 'INFRASTRUCTURE',
      salesPrice: 150.0,
      costPrice: 50.0,
      notes: 'Dedicated virtual cloud compute and scalable storage node',
      isActive: true,
      variants: {
        create: [
          {
            attribute: 'Region',
            value: 'US-East',
            extraPrice: 0.0,
          },
          {
            attribute: 'Region',
            value: 'EU-Central',
            extraPrice: 25.0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Priority Technical Support',
      type: 'SERVICE',
      salesPrice: 300.0,
      costPrice: 100.0,
      notes: '24/7 dedicated engineering response SLA',
      isActive: true,
      variants: {
        create: [
          {
            attribute: 'Tier',
            value: 'Gold 24/7',
            extraPrice: 150.0,
          },
          {
            attribute: 'Tier',
            value: 'Platinum VIP',
            extraPrice: 350.0,
          },
        ],
      },
    },
    include: { variants: true },
  });

  console.log('Seeded 3 Products with Variants');

  // 3. Plans
  const now = new Date();
  const nextYear = new Date();
  nextYear.setFullYear(now.getFullYear() + 1);

  const plan1 = await prisma.plan.create({
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

  const plan2 = await prisma.plan.create({
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

  const plan3 = await prisma.plan.create({
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

  console.log('Seeded 3 Plans');

  // 4. Taxes
  const tax1 = await prisma.tax.create({
    data: {
      name: 'Standard GST / VAT (18%)',
      ratePercent: 18.0,
      active: true,
    },
  });

  const tax2 = await prisma.tax.create({
    data: {
      name: 'Reduced Service Tax (5%)',
      ratePercent: 5.0,
      active: true,
    },
  });

  console.log('Seeded 2 Taxes');

  // 5. Discounts
  const discount1 = await prisma.discount.create({
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

  const discount2 = await prisma.discount.create({
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
        create: [
          {
            productId: product1.id,
          },
        ],
      },
    },
  });

  console.log('Seeded 2 Discounts');
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

