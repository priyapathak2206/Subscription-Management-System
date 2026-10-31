import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Role, SubscriptionStatus, InvoiceStatus, DiscountType, DiscountAppliesTo, BillingPeriod } from '@prisma/client';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';

describe('Real Database E2E Walkthrough (Scenes 1 to 7)', () => {
  const app = createApp();

  let adminToken: string;
  let adminId: string;
  let staffToken: string;
  let staffId: string;

  let customerAToken: string;
  let customerAId: string;
  let customerBToken: string;
  let customerBId: string;

  let taxId: string;
  let productId: string;
  let variantId: string;
  let planId: string;
  let discountId: string;
  let templateId: string;

  let subscriptionAId: string;
  let invoiceAId: string;
  let invoiceTotal = 0;

  let invoiceBId: string;

  beforeAll(async () => {
    // 1. Clean test database tables in strict dependency order
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

    // 2. Seed initial ADMIN and STAFF users
    const saltRounds = 10;
    const adminPassHash = await bcrypt.hash('AdminSecret@2026', saltRounds);
    const staffPassHash = await bcrypt.hash('StaffSecret@2026', saltRounds);

    const admin = await prisma.user.create({
      data: {
        name: 'Global Admin',
        email: 'admin.e2e@brightloop.com',
        passwordHash: adminPassHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminId = admin.id;

    const staff = await prisma.user.create({
      data: {
        name: 'Support Staff',
        email: 'staff.e2e@brightloop.com',
        passwordHash: staffPassHash,
        role: Role.STAFF,
        isActive: true,
      },
    });
    staffId = staff.id;

    // 3. Obtain tokens for ADMIN and STAFF via /api/auth/login
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin.e2e@brightloop.com', password: 'AdminSecret@2026' });
    expect(adminLoginRes.status).toBe(200);
    adminToken = adminLoginRes.body.token;

    const staffLoginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff.e2e@brightloop.com', password: 'StaffSecret@2026' });
    expect(staffLoginRes.status).toBe(200);
    staffToken = staffLoginRes.body.token;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ==========================================
  // SCENE 1: Registration, Strict Password, Single-Use Reset
  // ==========================================
  describe('Scene 1: Customer Sign-Up, Password Policy & Single-Use Reset', () => {
    it('rejects weak passwords (< 9 characters or missing character sets)', async () => {
      // 8 characters (fails strict policy: "more than eight characters" -> >= 9)
      const resShort = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Shorty', email: 'short@example.com', password: 'Short1!' });
      expect(resShort.status).toBe(400);

      // Missing uppercase
      const resNoUpper = await request(app)
        .post('/api/auth/register')
        .send({ name: 'No Upper', email: 'noupper@example.com', password: 'lowercaseonly1!' });
      expect(resNoUpper.status).toBe(400);

      // Missing lowercase
      const resNoLower = await request(app)
        .post('/api/auth/register')
        .send({ name: 'No Lower', email: 'nolower@example.com', password: 'UPPERCASEONLY1!' });
      expect(resNoLower.status).toBe(400);

      // Missing special char
      const resNoSpecial = await request(app)
        .post('/api/auth/register')
        .send({ name: 'No Special', email: 'nospecial@example.com', password: 'NoSpecialChar123' });
      expect(resNoSpecial.status).toBe(400);
    });

    it('registers Customer A successfully with compliant password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Customer A',
          email: 'customer.a@brightloop.com',
          password: 'CustomerPass@2026',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.token).toBeDefined();
      customerAId = res.body.user.id;
      customerAToken = res.body.token;
    });

    it('rejects duplicate email registration', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Customer A Duplicate',
          email: 'customer.a@brightloop.com',
          password: 'AnotherPass@2026',
        });

      expect([400, 409]).toContain(res.status);
    });

    it('enforces single-use password reset token (second attempt rejected)', async () => {
      // Generate secure 64-char hex reset token and store hash in test DB
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await prisma.passwordResetToken.create({
        data: {
          userId: customerAId,
          tokenHash,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour
        },
      });

      // 1. First reset succeeds
      const firstResetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          password: 'NewCustomerPass@2026',
        });
      expect(firstResetRes.status).toBe(200);

      // 2. Second reset attempt with same token fails (single-use guarantee)
      const secondResetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: rawToken,
          password: 'ThirdPassword@2026',
        });
      expect(secondResetRes.status).toBe(400);

      // 3. Login with newly set password succeeds and refreshes customerAToken
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer.a@brightloop.com',
          password: 'NewCustomerPass@2026',
        });
      expect(loginRes.status).toBe(200);
      customerAToken = loginRes.body.token;
    });
  });

  // ==========================================
  // SCENE 2: Admin Creates Foundation & Catalog Setup
  // ==========================================
  describe('Scene 2: Admin Creates Tax, Product (+560 Variant), Plan, Discount & Template', () => {
    it('admin creates GST 18% tax rate', async () => {
      const res = await request(app)
        .post('/api/taxes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'GST 18%',
          ratePercent: 18,
          active: true,
        });

      expect(res.status).toBe(201);
      taxId = res.body.tax.id;
      expect(taxId).toBeDefined();
    });

    it('admin creates product with Odoo variant (+560)', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Dedicated Cloud Server',
          type: 'service',
          salesPrice: 1200,
          costPrice: 800,
          isActive: true,
          variants: [
            {
              attribute: 'RAM',
              value: '64GB ECC',
              extraPrice: 560,
            },
          ],
        });

      expect(res.status).toBe(201);
      productId = res.body.product.id;
      variantId = res.body.product.variants[0].id;
      expect(res.body.product.variants[0].extraPrice).toBe(560);
    });

    it('admin creates recurring monthly plan with pause/renew enabled', async () => {
      const res = await request(app)
        .post('/api/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Dedicated Plan',
          price: 1760,
          billingPeriod: BillingPeriod.MONTHLY,
          pausable: true,
          renewable: true,
          closable: true,
          isActive: true,
        });

      expect(res.status).toBe(201);
      planId = res.body.plan.id;
    });

    it('admin creates 10% discount on subscriptions', async () => {
      const res = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Welcome 10% Off',
          type: DiscountType.PERCENT,
          value: 10,
          appliesTo: DiscountAppliesTo.SUBSCRIPTION,
          isActive: true,
        });

      expect(res.status).toBe(201);
      discountId = res.body.discount.id;
      expect(res.body.discount.usedCount).toBe(0);
    });

    it('admin creates quotation template referencing plan and variant', async () => {
      const res = await request(app)
        .post('/api/quotation-templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Enterprise Hosting Template',
          planId,
          validityDays: 30,
          lines: [
            {
              productId,
              variantId,
              quantity: 1,
              unitPrice: 1760,
            },
          ],
        });

      expect(res.status).toBe(201);
      templateId = res.body.template.id;
    });
  });

  // ==========================================
  // SCENE 3: Staff Creates Subscription & Advances to ACTIVE
  // ==========================================
  describe('Scene 3: Staff Creates Subscription From Template & Moves to ACTIVE', () => {
    it('staff creates subscription from template for Customer A', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          customerId: customerAId,
          templateId,
        });

      expect(res.status).toBe(201);
      expect(res.body.subscription.status).toBe(SubscriptionStatus.QUOTATION);
      expect(res.body.subscription.lines).toHaveLength(1);
      expect(res.body.subscription.lines[0].unitPrice).toBe(1760);
      subscriptionAId = res.body.subscription.id;
    });

    it('staff advances subscription to CONFIRMED', async () => {
      const res = await request(app)
        .post(`/api/subscriptions/${subscriptionAId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: SubscriptionStatus.CONFIRMED,
          reason: 'Customer approved quotation',
        });

      expect(res.status).toBe(200);
      expect(res.body.subscription.status).toBe(SubscriptionStatus.CONFIRMED);
    });

    it('staff advances subscription to ACTIVE', async () => {
      const res = await request(app)
        .post(`/api/subscriptions/${subscriptionAId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          status: SubscriptionStatus.ACTIVE,
          reason: 'Payment method authorized; subscription activated',
        });

      expect(res.status).toBe(200);
      expect(res.body.subscription.status).toBe(SubscriptionStatus.ACTIVE);
    });
  });

  // ==========================================
  // SCENE 4: Run Billing Twice & Automatic Discount Applied
  // ==========================================
  describe('Scene 4: Run Billing Idempotency & Discount Usage Tracking', () => {
    it('first run-billing creates invoice with discount applied', async () => {
      const res = await request(app)
        .post('/api/invoices/run-billing')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.created).toBe(1);

      // Verify the generated invoice in DB
      const invoice = await prisma.invoice.findFirst({
        where: { subscriptionId: subscriptionAId },
      });
      expect(invoice).toBeDefined();
      invoiceAId = invoice!.id;
      invoiceTotal = invoice!.total;

      // Subtotal = 1,760; Discount = 10% ($176); Total = $1,584
      expect(invoice!.subtotal).toBe(1760);
      expect(invoiceTotal).toBe(1584);

      // Verify discount usedCount was incremented in DB
      const discount = await prisma.discount.findUnique({ where: { id: discountId } });
      expect(discount?.usedCount).toBe(1);
    });

    it('second run-billing creates 0 invoices (idempotent)', async () => {
      const res = await request(app)
        .post('/api/invoices/run-billing')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary.created).toBe(0);
    });
  });

  // ==========================================
  // SCENE 5: Invoice Confirm & Payments Lifecycle
  // ==========================================
  describe('Scene 5: Invoice Confirmation, Partial Payment, Overpayment Rejected, Final Payment', () => {
    it('staff confirms draft invoice', async () => {
      const res = await request(app)
        .post(`/api/invoices/${invoiceAId}/confirm`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.invoice.status).toBe(InvoiceStatus.CONFIRMED);
    });

    it('records partial payment', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          invoiceId: invoiceAId,
          amount: 584,
          method: 'CARD',
          note: 'Initial deposit',
        });

      expect(res.status).toBe(201);
      expect(res.body.payment.amount).toBe(584);
      expect(res.body.invoice.amountPaid).toBe(584);
      expect(res.body.isFullyPaid).toBe(false);

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceAId } });
      expect(invoice?.amountPaid).toBe(584);
      expect(invoice?.status).toBe(InvoiceStatus.CONFIRMED);
    });

    it('rejects payment exceeding remaining balance (overpayment guard)', async () => {
      // Remaining is 1584 - 584 = 1000. Attempt paying 1001.
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          invoiceId: invoiceAId,
          amount: 1001,
          method: 'CARD',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/exceeds outstanding balance/i);
    });

    it('final payment clears balance and automatically marks invoice as PAID', async () => {
      // Pay remaining 1000
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          invoiceId: invoiceAId,
          amount: 1000,
          method: 'BANK_TRANSFER',
          note: 'Final settlement',
        });

      expect(res.status).toBe(201);
      expect(res.body.isFullyPaid).toBe(true);
      expect(res.body.invoice.status).toBe(InvoiceStatus.PAID);
      expect(res.body.invoice.amountPaid).toBe(1584);

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceAId } });
      expect(invoice?.status).toBe(InvoiceStatus.PAID);
      expect(invoice?.amountPaid).toBe(1584);
    });
  });

  // ==========================================
  // SCENE 6: Reports Summary Matches DB Aggregates
  // ==========================================
  describe('Scene 6: Reports Summary Matches Database Aggregates', () => {
    it('returns summary KPI metrics matching actual database records', async () => {
      const res = await request(app)
        .get('/api/reports/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify KPI metrics match our DB state
      expect(res.body.activeSubscriptionCount).toBe(1);
      expect(res.body.totalInvoiced).toBe(1584);
      expect(res.body.revenueCollected).toBe(1584);
      expect(res.body.outstandingAmount).toBe(0);
    });
  });

  // ==========================================
  // SCENE 7: Cross-Customer Isolation & RBAC
  // ==========================================
  describe('Scene 7: Multi-Tenant Customer Isolation & Staff RBAC Restrictions', () => {
    beforeAll(async () => {
      // Register Customer B
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Customer B',
          email: 'customer.b@brightloop.com',
          password: 'CustomerBPass@2026',
        });
      customerBId = regRes.body.user.id;
      customerBToken = regRes.body.token;

      // Create an invoice belonging to Customer B
      const subB = await prisma.subscription.create({
        data: {
          number: 'SUB-2026-99999',
          customerId: customerBId,
          planId,
          startDate: new Date(),
          status: SubscriptionStatus.ACTIVE,
          paymentTerms: 'NET_30',
        },
      });

      const invB = await prisma.invoice.create({
        data: {
          number: 'INV-2026-99999',
          customerId: customerBId,
          subscriptionId: subB.id,
          subtotal: 500,
          total: 500,
          amountPaid: 0,
          status: InvoiceStatus.CONFIRMED,
          dueDate: new Date(Date.now() + 30 * 86400000),
          issueDate: new Date(),
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 86400000),
        },
      });
      invoiceBId = invB.id;
    });

    it('customer A cannot read customer B invoice (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/invoices/${invoiceBId}`)
        .set('Authorization', `Bearer ${customerAToken}`);

      expect(res.status).toBe(403);
    });

    it('customer A cannot pay customer B invoice (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          invoiceId: invoiceBId,
          amount: 50,
          method: 'CARD',
        });

      expect(res.status).toBe(403);
    });

    it('customer A cannot create subscription assigned to customer B (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${customerAToken}`)
        .send({
          customerId: customerBId,
          planId,
        });

      expect(res.status).toBe(403);
    });

    it('staff receives 403 Forbidden on admin-only routes', async () => {
      // 1. Staff cannot create tax rate
      const taxRes = await request(app)
        .post('/api/taxes')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Staff Tax', ratePercent: 5 });
      expect(taxRes.status).toBe(403);

      // 2. Staff cannot create discount
      const discRes = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Staff Discount',
          type: DiscountType.FIXED,
          value: 10,
          appliesTo: DiscountAppliesTo.SUBSCRIPTION,
        });
      expect(discRes.status).toBe(403);

      // 3. Staff cannot list internal staff users
      const staffListRes = await request(app)
        .get('/api/users/staff')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(staffListRes.status).toBe(403);
    });
  });
});
