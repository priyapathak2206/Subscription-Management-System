# Brightloop Software — Subscription Management System

[![CI/CD Tests](https://img.shields.io/badge/tests-144%20passed-brightgreen.svg)](#running-tests)
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
- **PostgreSQL Advisory Locking Concurrency Guard:** Session-level advisory lock (`pg_try_advisory_lock(84920412)`) and row-level `SELECT ... FOR UPDATE SKIP LOCKED` prevent overlapping billing runs, gracefully rejecting concurrent requests with HTTP 409 Conflict and skipping scheduled cron overlaps.
- **Comprehensive Lifecycle (Pause, Resume, Renew):** Full finite state machine supporting `ACTIVE <-> PAUSED -> CLOSED` and `RENEW` transitions. Enforces plan configuration flags (`plan.pausable`, `plan.renewable`, `plan.closable`), skips paused subscriptions during billing runs, moves `nextBillingDate` forward on resumption so paused periods are not backfilled, and creates linked renewal subscriptions with preserved line items.
- **Finite State Machine & Audit Trail:** Strict transitions (`DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> PAUSED -> CLOSED`) with audit trail logs recording actor, timestamp, and business reasons.
- **Dynamic Catalog Pricing:** Product variants compute effective unit prices as `product.salesPrice + variant.extraPrice` with automatic line-item tax and promotional discount deduction.
- **Sub-140ms Financial Analytics & Measured Indexes:** 7 additive composite B-Tree indexes delivering sub-140ms response times on 20,000+ invoices and 5,000+ subscriptions measured under realistic load.
- **Role-Tailored Multi-Tenant Experience:** Strict data isolation between administrators, operational staff, and customers.

---

## 2. Tech Stack & Ports

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide Icons.
- **Backend:** Node.js 20+, Express.js, TypeScript, Prisma ORM, PostgreSQL 17.
- **Security & RBAC:** JWT Bearer tokens, Helmet HTTP headers, CORS whitelisting, Express rate limiting, Zod validation, bcryptjs password hashing.
- **Automation & Scheduling:** node-cron for automated recurring billing runs and daily midnight subscription auto-close.
- **Testing & Quality:** Vitest test suite with 100% pass rate across 144 tests (121 unit tests + 23 real-database E2E tests).

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

# Step 1: Install server dependencies
npm install

# Step 2: Configure environment variables (ensure DATABASE_URL and JWT_SECRET are set in server/.env)
# cp .env.example .env

# Step 3: Generate Prisma Client
npx prisma generate

# Step 4: Deploy the single baseline database migration
npx prisma migrate deploy

# Step 5: Seed idempotent demo data (Admin, Staff, Customers, Catalog, Subscriptions, Invoices, Payments)
npx prisma db seed

# Step 6: Start the backend API in development mode
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

> [!IMPORTANT]
> **Single Baseline Migration Rule:** This repository maintains a single canonical baseline migration (`20261031133000_baseline`) containing all enums, relations, and recent schema additions (such as `subscriptions.quotationExpiryDate`). Do NOT create additional migrations or edit `schema.prisma` without cross-team coordination.

### 2. Client Setup
In a new terminal window:
```bash
# Navigate to the client folder
cd client

# Step 1: Install client dependencies
npm install

# Step 2: Start the Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Demo Logins

The database seed provides pre-configured demo credentials for testing role-based workflows:

| Role | Email Address | Password | What to Test |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@1234` | Full access: Catalog (Products, Variants, Plans, Taxes, Discounts), Staff management, manual billing runs, financial executive KPI dashboards (`/dashboard`). |
| **Staff** | `staff@brightloop.com` | `Staff@1234` | Operational access: Quotation templates (`/templates`), customer subscriptions, invoice confirmation, email sending, payment entry. |
| **Customer 1** | `cust1@acmecorp.com` | `Customer@1234` | Customer portal: Has 3 ACTIVE subscriptions. Tests customer scoping (`/subscriptions`, `/invoices`, `/payments`), verifying no other customer's records appear, and confirming 403 Forbidden on staff-only endpoints. |
| **Customer 2** | `cust2@globex.com` | `Customer@1234` | Multi-tenant customer isolation: Independent subscription and billing history. |
| **Customer 3** | `cust3@initech.com` | `Customer@1234` | Multi-tenant customer isolation: Independent customer portal. |

---

## 5. Running Tests & Verifications

Run the automated test suite in the server:

```bash
cd server
npm test
```
All 17 test files and 144 tests will run and pass (121 unit tests, 23 real DB e2e tests):
```
 Test Files  17 passed (17)
      Tests  144 passed (144)
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

### 3. `Environment variable not found: DATABASE_URL` (UTF-8 BOM Issue)
If Prisma CLI commands fail with `Environment variable not found: DATABASE_URL` even though `server/.env` contains the variable:
- Windows text editors (such as Notepad or PowerShell redirection `>`) may save `server/.env` with a UTF-8 Byte Order Mark (BOM: `\uFEFF`), which prevents Prisma from parsing the first environment variable.
- Rewrite `server/.env` as plain UTF-8 without BOM:
  ```powershell
  $content = [IO.File]::ReadAllText("server/.env")
  [IO.File]::WriteAllText("server/.env", $content.TrimStart([char]0xFEFF), (New-Object System.Text.UTF8Encoding($false)))
  ```

### 4. Blank Page / White Screen on Load
If navigating to `http://localhost:5173` renders a blank page:
1. Open DevTools (`F12`) and inspect the **Console** and **Network** tabs for uncaught errors.
2. Perform a hard refresh using `Ctrl + F5` to clear stale cached Vite chunks.
3. Ensure the backend API is running on port 5000 (`http://localhost:5000/api/health` returns `200 OK`) so client authentication requests resolve successfully.

### 5. Missing `quotationExpiryDate` Column / Schema Out of Sync
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
3. Verify status:
   ```bash
   npx prisma migrate status
   ```
