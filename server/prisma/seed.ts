import { PrismaClient, Role, BillingPeriod, DiscountType, DiscountAppliesTo } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Idempotent Database Seeding ---');

  // 1. Users (upsert by unique email)
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

  // 2. Products with Variants
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
  }

  console.log('Seeded 3 Products with Variants (idempotent)');

  // 3. Plans
  const now = new Date();
  const nextYear = new Date();
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

  console.log('Seeded 3 Plans (idempotent)');

  // 4. Taxes
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

  // 5. Discounts
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
          create: [
            {
              productId: product1.id,
            },
          ],
        },
      },
    });
  }

  console.log('Seeded 2 Discounts (idempotent)');
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
