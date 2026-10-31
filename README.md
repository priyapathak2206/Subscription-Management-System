# Brightloop Software — Subscription Management System

[![CI/CD Tests](https://img.shields.io/badge/tests-116%20passed-brightgreen.svg)](#running-tests)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.4.5-blue.svg)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/postgresql-17-blue.svg)](https://www.postgresql.org/)

An enterprise-grade, multi-tenant **Subscription Management & Recurring Invoicing Platform** built with React 18, Vite, Express, TypeScript, Prisma ORM, and PostgreSQL.

---

## 1. Problem & Solution

### The Challenge
Modern recurring revenue businesses struggle with:
1. **Accidental Double Billing:** Race conditions in concurrent billing cron jobs and retry loops lead to duplicate invoices and customer disputes.
2. **Fragile Contract Lifecycles:** Uncontrolled subscription status transitions cause premature cancellations or active billing on terminated agreements.
3. **Complex Product Variant & Tiered Pricing:** Dynamic pricing adjustments (e.g. software base prices with hardware/brand variations) often lead to pricing mismatches.
4. **Delinquent Accounts & High-Volume Analytics Lag:** Calculating MRR, revenue realization, and overdue receivables across tens of thousands of active subscriptions causes slow page loads.

### The Brightloop Solution
- **Guaranteed Idempotent Invoicing Engine:** A composite database-level unique constraint on `[subscriptionId, periodStart]` guarantees that no subscription can ever be billed twice for the same cycle, with graceful conflict absorption.
- **Finite State Machine:** Strict transitions (`DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED`) with audit trail logs recording actor, timestamp, and business reasons.
- **Dynamic Catalog Pricing:** Product variants compute effective unit prices as `product.salesPrice + variant.extraPrice` with automatic line-item tax and promotional discount deduction.
- **Sub-2s Financial Analytics:** Native PostgreSQL time-series aggregation delivering sub-50ms query response times on 20,000+ invoices and 5,000+ subscriptions.
- **Role-Tailored Multi-Tenant Experience:** Strict data isolation between administrators, operational staff, and customers.

---

## 2. Tech Stack & Ports

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide Icons.
- **Backend:** Node.js 20+, Express.js, TypeScript, Prisma ORM, PostgreSQL 17.
- **Security & RBAC:** JWT Bearer tokens, Helmet HTTP headers, CORS whitelisting, Express rate limiting, Zod validation, bcryptjs password hashing.
- **Automation & Scheduling:** node-cron for automated recurring billing runs and daily midnight subscription auto-close.
- **Testing & Quality:** Vitest test suite with 100% pass rate across 116 comprehensive tests.

### Default Ports
| Component | URL / Port | Description |
|---|---|---|
| **Backend API** | `http://localhost:5000` | Express REST API server |
| **API Health** | `http://localhost:5000/api/health` | Health check endpoint |
| **Frontend App** | `http://localhost:5173` | Vite React development server |
| **Database** | `localhost:5432` | PostgreSQL database (`brightloop`) |

---

## 3. Local Setup & Run Instructions

Follow these exact commands in order:

### 1. Server Setup
```bash
# Navigate to the server folder
cd server

# 1. Install server dependencies
npm install

# 2. Configure environment variables (ensure DATABASE_URL and JWT_SECRET are set)
# cp .env.example .env

# 3. Generate Prisma Client
npx prisma generate

# 4. Deploy database migrations
npx prisma migrate deploy

# 5. Seed idempotent demo data (Admin, Staff, Customers, Catalog)
npx prisma db seed

# 6. Start the backend API in development mode
npm run dev
```
The server will log:
```
 Connected to PostgreSQL database successfully.
[Cron] Cron jobs registered successfully (auto-close @ 00:00, recurring billing @ 01:00).
 Brightloop Subscription Management Server listening on port 5000
   Health: http://localhost:5000/api/health
   Frontend URL: http://localhost:5173
```

### 2. Client Setup
In a new terminal window:
```bash
# Navigate to the client folder
cd client

# 1. Install client dependencies
npm install

# 2. Start the Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Demo Logins

The database seed provides pre-configured demo credentials for testing role-based workflows:

| Role | Email Address | Password | Permissions & Views |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@1234` | Full access: Catalog (Products, Variants, Plans, Taxes, Discounts), Staff management, manual billing runs, financial executive KPI dashboards. |
| **Staff** | `staff@brightloop.com` | `Staff@1234` | Operational access: Quotation templates, customer subscriptions, invoice confirmation, email sending, payment entry. |
| **Customer** | `cust1@acmecorp.com` | `Customer@1234` | Customer portal: View own subscriptions, view & download invoices, submit payments. Completely isolated from other customer records and staff endpoints. |

Additional customer accounts seeded: `cust2@globex.com`, `cust3@initech.com` (password: `Customer@1234`).

---

## 5. Running Tests & Verifications

Run the automated test suite in the server:

```bash
cd server
npm test
```
All 14 test files and 116 tests will run and pass:
```
 Test Files  14 passed (14)
      Tests  116 passed (116)
```

To run TypeScript verification:
- Server: `cd server && npx tsc --noEmit`
- Client: `cd client && npm run build`

---

## 6. Troubleshooting

### 1. Port 5000 in Use (`EADDRINUSE`)
If starting the server fails with `Error: listen EADDRINUSE: address already in use :::5000`:
1. Find the process listening on port 5000:
   ```cmd
   netstat -ano | findstr :5000 | findstr LISTENING
   ```
2. Inspect the process using the reported PID:
   ```cmd
   tasklist /FI "PID eq <PID>"
   ```
3. If it is an orphaned `node.exe` from a prior run, terminate only that specific PID:
   ```cmd
   taskkill /PID <PID> /F
   ```
   *(Never run `taskkill /IM node.exe` as it terminates all other Node processes).*

### 2. Prisma EPERM on `query_engine-windows.dll.node`
If Prisma commands fail with `EPERM: operation not permitted, unlink '...query_engine-windows.dll.node'`:
- Windows locks `.dll` and `.node` binaries while they are loaded in memory by an active Node.js server process.
- Stop or kill the running Node.js server process holding the database connection first, then re-run `npx prisma generate` or `npx prisma migrate deploy`.

### 3. Missing `quotationExpiryDate` Column / Schema Out of Sync
If queries to `subscriptions` fail with a message that column `quotationExpiryDate` does not exist:
1. Ensure Prisma client is up to date:
   ```bash
   cd server
   npx prisma generate
   ```
2. Apply the baseline migration:
   ```bash
   npx prisma migrate deploy
   ```
   Or synchronize the schema directly:
   ```bash
   npx prisma db push
   ```
3. Verify status:
   ```bash
   npx prisma migrate status
   ```
