# Brightloop Software — Subscription Management System

[![CI/CD Tests](https://img.shields.io/badge/tests-100%20passed-brightgreen.svg)](#running-tests)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-%5E5.4.5-blue.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](#docker-quick-start)

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

## 2. Tech Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Axios, Lucide Icons.
- **Backend:** Node.js 20, Express.js, TypeScript, Prisma ORM, PostgreSQL 16.
- **Security & RBAC:** JWT Bearer tokens, Helmet HTTP headers, CORS whitelisting, Express rate limiting, Zod validation, bcryptjs password hashing.
- **Automation & Scheduling:** node-cron for automated recurring billing runs and daily midnight subscription auto-close.
- **Testing & Quality:** Vitest test suite with 100% pass rate across 100 comprehensive tests.
- **Containerization:** Multi-stage Dockerfiles and Docker Compose orchestration.

---

## 3. Features per Role

| Role | Access Scope & Capabilities |
|---|---|
| **Admin** | • Global catalog management (Products, Variants, Subscription Plans, Tax Rates, Discounts)<br>• Staff member creation and role provisioning<br>• Trigger batch recurring billing engine (`POST /api/invoices/run-billing`)<br>• Executive Finance Dashboard with 6 real-time KPIs and 12-month revenue trajectory<br>• Overdue accounts tracking and automated email reminders |
| **Staff** | • Quotation template definition and subscription creation<br>• State machine progression (`Confirm Quotation`, `Activate Contract`, `Close Subscription`)<br>• Invoice management (Confirm, Cancel, Email Dispatch, Printable Receipts)<br>• Payment recording with overpayment guard validation |
| **Customer** | • Self-service Customer Portal with active subscription cards<br>• View billing history, issue dates, and due dates<br>• Download / Print official tax receipts<br>• One-click online payment settlement directly from portal<br>• Strict multi-tenant isolation: completely blocked from accessing other customer records |

---

## 4. Application Preview

```
+-------------------------------------------------------------------------------------------------------+
|  Brightloop Executive Dashboard                                      [ 2026-01-01  to  2026-10-31 ]   |
+-------------------------------------------------------------------------------------------------------+
|  [Active Subs]        [MRR]           [Total Invoiced]   [Collected]     [Outstanding]    [Overdue]   |
|     5,000          $148,250.00          $1,240,500.00    $1,180,000.00     $60,500.00     $18,400.00  |
+-------------------------------------------------------------------------------------------------------+
|  12-Month Invoiced vs. Collected Revenue Trajectory                                                   |
|   $150k |        █ █        █ █        █ █        █ █        █ █        █ █        █ █        █ █    |
|   $100k |   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █    |
|    $50k |   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █   █ █  █ █    |
|         +-------------------------------------------------------------------------------------------+ |
|             Jan    Feb     Mar    Apr     May    Jun     Jul    Aug     Sep    Oct     Nov    Dec     |
+-------------------------------------------------------------------------------------------------------+
```

---

## 5. Team Split & Responsibilities

- **Person A (Milestone 1 — Foundation & Catalog):**
  - Database schema architecture (`server/prisma/schema.prisma`)
  - Authentication & JWT token infrastructure with single-use password reset tokens
  - RBAC authorization middleware (`requireRole`)
  - Catalog subsystems: Products, Variants, Plans, Taxes, Discounts
  - Shared utilities: `customerScope.ts`, `taxCalculator.ts`, `discountEngine.ts`, `password.ts`
- **Person B (Milestone 2 — Billing, Reporting & Deployment):**
  - Quotation Templates CRUD and sequential `SUB-YYYY-00001` numbering generator
  - Subscription Finite State Machine with audit trail history logs
  - Idempotent recurring billing engine (`POST /api/invoices/run-billing`)
  - Payments ledger with real-time overpayment protection (HTTP 400 rejection)
  - Sub-2s executive analytics engine (`GET /api/reports/summary`, `GET /api/reports/overdue`)
  - Full React 18 frontend pages (`SubscriptionsPage`, `InvoicesPage`, `PaymentsPage`, `PortalPage`, `DashboardPage`)
  - Production Docker orchestration, 100-test automated verification suite, and demo kit

---

## 6. Quick Start

### Option A: One-Command Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/priyapathak2206/Subscription-Management-System.git
cd Subscription-Management-System

# Start PostgreSQL, Express API, and Nginx Client
docker compose up -d --build

# Run migrations and seed default demo data
docker compose exec server npx prisma migrate deploy
docker compose exec server npm run prisma:seed
```

- **Frontend App:** [http://localhost:5173](http://localhost:5173) (or [http://localhost](http://localhost))
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

### Option B: Manual Local Setup

#### Prerequisites
- Node.js >= 20.x
- PostgreSQL 16+ running locally on port 5432

#### 1. Server Setup
```bash
cd server
npm install

# Configure environment
cp .env.example .env

# Generate Prisma Client & Run Migrations
npx prisma generate
npx prisma migrate dev --name init

# Seed Demo Data (Admin, Staff, Customers, Catalog)
npm run prisma:seed

# Start Server in Development Mode
npm run dev
```

#### 2. Client Setup
```bash
cd ../client
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Demo Credentials

| Role | Email Address | Password | Intended Test Flow |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@1234` | Catalog, batch billing runner, executive financial KPIs |
| **Staff** | `staff@brightloop.com` | `Staff@1234` | Quotation to subscription conversion, payment entry |
| **Customer** | `cust1@acmecorp.com` | `Customer@1234` | Self-service portal, view invoices, online payments |

Detailed click-by-click instructions are available in [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md).

---

## 8. Running Tests

Run the full automated test suite (including the 7-scene end-to-end integration scenario):

```bash
cd server
npm test
```

```
Test Files  13 passed (13)
     Tests  100 passed (100)
  Duration  1.67s
```

Detailed test metrics are documented in [`docs/test-report.md`](docs/test-report.md).

---

## 9. Performance Benchmark (5,000 Subs & 20,000 Invoices)

```bash
cd server
# Seed synthetic high-volume dataset
npm run tsx src/scripts/seed-benchmark.ts

# Measure API latency
npm run tsx src/scripts/run-benchmark.ts
```

| Endpoint | Data Volume | Response Time | SLA Limit | SLA Status |
|---|:---:|:---:|:---:|:---:|
| `GET /api/reports/summary` | 20k Invoices | **~42 ms** | 2,000 ms | **PASS** |
| `GET /api/reports/overdue` | 20k Invoices | **~18 ms** | 2,000 ms | **PASS** |
| `GET /api/subscriptions` | 5k Subscriptions | **~12 ms** | 2,000 ms | **PASS** |
| `GET /api/invoices` | 20k Invoices | **~15 ms** | 2,000 ms | **PASS** |
| `GET /api/payments` | 10k Payments | **~9 ms** | 2,000 ms | **PASS** |

See [`docs/performance.md`](docs/performance.md) for full benchmark metrics.
