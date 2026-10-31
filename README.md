# Brightloop Software - Subscription Management System

**Foundation & Catalog Subsystem (Milestones 1 & 2)**

This monorepo contains the enterprise backend API and React single-page administrative application for **Brightloop Software's Subscription Management System**. 

The system is developed in two parallel streams:
- **Stream A (This branch):** Foundation, Complete Prisma Database Schema, Authentication & RBAC, Catalog Modules (Products, Variants, Plans, Taxes, Discounts), Admin UI Shell, and Security.
- **Stream B (Teammate parallel branch):** Subscriptions Lifecycle, Quotation Templates, Invoicing Engine, Payments, Customer Portal views, and Executive Reporting.

---

## 1. Tech Stack

- **Monorepo Architecture:**
  - `/server`: Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL, bcryptjs, jsonwebtoken, zod, nodemailer.
  - `/client`: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide Icons.
- **Security & Quality:**
  - Helmet HTTP security headers, CORS origin whitelisting, Rate-limiting on authentication endpoints, strict Zod input validation schemas, unified error response handling `{ message, errors? }`.

---

## 2. Sensible Defaults Chosen

| Setting | Default Value | Notes |
|---|---|---|
| **Server Port** | `5000` | Configurable via `PORT` environment variable |
| **Client Port** | `5173` | Vite dev server with automated `/api` reverse proxy |
| **Database** | `postgresql://postgres:postgres@localhost:5432/brightloop_sub?schema=public` | Local Postgres or Docker container |
| **Password Policy** | Minimum **9 characters** (strictly `> 8`), at least 1 uppercase, at least 1 lowercase, at least 1 special character | Enforced by Zod on server and interactive live checklist on client |
| **JWT Expiry** | `7d` | Configurable via `JWT_EXPIRES_IN` |
| **Reset Token Window** | `1 hour` | Secure sha256 hash stored, raw token transmitted via email |
| **Soft Delete** | `isActive = false` | Deactivating products, plans, taxes, and discounts preserves relational integrity with existing subscriptions/invoices |
| **Mailer Mode** | Nodemailer with Ethereal / Console fallback | Prints preview link in console if no external SMTP credentials are provided |

---

## 3. Seed Accounts & Demo Credentials

Run `pnpm run prisma:seed` (or `npm run prisma:seed`) to populate the system with the following accounts:

| Role | Name | Email | Password |
|---|---|---|---|
| **ADMIN** | System Admin | `admin@brightloop.com` | `Admin@1234` |
| **STAFF** | Sarah Staff | `staff@brightloop.com` | `Staff@1234` |
| **CUSTOMER** | Acme Corporation | `cust1@acmecorp.com` | `Customer@1234` |
| **CUSTOMER** | Globex Inc | `cust2@globex.com` | `Customer@1234` |
| **CUSTOMER** | Initech Solutions | `cust3@initech.com` | `Customer@1234` |

---

## 4. Setup & Installation

### Option A: Running PostgreSQL with Docker
```bash
docker-compose up -d
```

### Option B: Local PostgreSQL
Ensure PostgreSQL is listening on port `5432` with a database named `brightloop_sub`.

### Installing Dependencies & Starting Development
```bash
# Install dependencies
pnpm install --dir server
pnpm install --dir client

# Apply Prisma migrations and seed database
cd server
pnpm run prisma:migrate
pnpm run prisma:seed

# Run dev servers
# Terminal 1: Server
pnpm run dev
# Terminal 2: Client
cd ../client
pnpm run dev
```

The application will be accessible at:
- **Client Web App:** [http://localhost:5173](http://localhost:5173)
- **Server API:** [http://localhost:5000/api](http://localhost:5000/api)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 5. Critical Helpers & Boundary APIs (For Teammate)

To prevent code duplication and ensure strict multi-tenant customer isolation and billing accuracy, your parallel billing/reporting modules **must** use the following exported utilities:

### 1. Customer Data Scoping Helper (`server/src/utils/customerScope.ts`)
Ensures customers can only read/mutate their own data, while Admins and Staff retain global/scoped visibility.

```typescript
import { applyCustomerScope, resolveCustomerIdScope } from '../../utils/customerScope.js';

// Example in Subscription / Invoice controller:
export async function listSubscriptions(req: Request, res: Response) {
  // Automatically injects customerId constraint if req.user is a CUSTOMER
  // Throws 403 Forbidden if a CUSTOMER requests another customer's ID
  const where = applyCustomerScope(req.user, {
    status: 'ACTIVE'
  });

  const subscriptions = await prisma.subscription.findMany({ where });
  res.json({ subscriptions });
}
```

### 2. Tax Calculation Utility (`server/src/utils/taxCalculator.ts`)
Shared precision rounding utility according to financial 2-decimal rules.

```typescript
import { calculateTax, calculateTotalWithTax } from '../../utils/taxCalculator.js';

const taxAmount = calculateTax(subtotal, { ratePercent: 18, active: true });
// Automatically returns 0 if tax is inactive or amount <= 0
```

### 3. Discount Evaluation & Application (`server/src/utils/discountEngine.ts`)
Used by the quotation and invoice engine to compute discounts.

```typescript
import { getEligibleDiscounts, applyDiscount } from '../../utils/discountEngine.js';

// 1. Fetch active discounts from database
const discounts = await prisma.discount.findMany({
  where: { isActive: true },
  include: { discountProducts: true }
});

// 2. Filter eligible discounts for order lines
// Automatically checks: date window, usage limit, min purchase, min quantity, and product match
const eligibleDiscounts = getEligibleDiscounts(discounts, orderLines, {
  date: new Date(),
  subtotal: 500
});

// 3. Apply discount
const { discountAmount, finalAmount } = applyDiscount(subtotal, eligibleDiscounts[0]);

// IMPORTANT TRANSACTION REQUIREMENT:
// When an invoice is created using a discount, the caller MUST increment usedCount inside its transaction:
await prisma.$transaction(async (tx) => {
  await tx.discount.update({
    where: { id: eligibleDiscounts[0].id },
    data: { usedCount: { increment: 1 } }
  });
  // ... create invoice
});
```

### 4. RBAC & Authentication Middleware (`server/src/middleware/`)
- `authenticate`: Validates JWT Bearer token, checks active status, and attaches `req.user`.
- `requireRole(...roles)`: Restricts endpoints to specified roles (e.g., `requireRole(Role.ADMIN)`).

---

## 6. Full Database Schema Summary

The full schema defines all 11 core entities in `server/prisma/schema.prisma`:
1. `User` (`ADMIN`, `STAFF`, `CUSTOMER`)
2. `PasswordResetToken` (SHA-256 token hash, 1-hour expiry, single-use `usedAt`)
3. `Product` (salesPrice, costPrice, notes, type)
4. `ProductVariant` (attribute, value, extraPrice -> finalPrice = salesPrice + extraPrice)
5. `Plan` (price, billingPeriod, minQuantity, autoClose, closable, pausable, renewable)
6. `Tax` (ratePercent, active)
7. `Discount` & `DiscountProduct` (FIXED/PERCENT, usageLimit, usedCount, minPurchase, minQuantity, appliesTo PRODUCT/SUBSCRIPTION)
8. `QuotationTemplate` & `QuotationTemplateLine`
9. `Subscription`, `SubscriptionLine`, `SubscriptionStatusHistory` (indexes on `status`, `customerId`)
10. `Invoice` & `InvoiceLine` (`@@unique([subscriptionId, periodStart])` preventing double-billing, indexes on `status`, `dueDate`, `customerId`)
11. `Payment` (method CASH, CARD, BANK_TRANSFER, UPI, CHEQUE, OTHER; index on `invoiceId`)

---

## 7. Running Tests

Unit and integration tests cover:
- Password validation rules (min 9 chars, uppercase, lowercase, special char)
- Duplicate email conflict rejection (409)
- Secure password reset token generation, single-use marking, and 1h expiry
- RBAC role guards (Admin, Staff, Customer)
- Tax precision calculations
- Discount eligibility, expiry, usage limit exhaustion, and amount calculations

```bash
cd server
pnpm run test
```

