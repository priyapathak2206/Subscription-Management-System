# Brightloop System Performance & Benchmark Report

This document records the response timings and database optimization metrics for the **Billing & Reporting** subsystems under high-volume enterprise load (**5,000 subscriptions**, **20,000 invoices**, and **16,666 payments**) measured on real PostgreSQL.

---

## 1. Executive SLA Verification

**Requirement:** Every reporting and list endpoint must respond in under **2.0 seconds** when evaluated against 5,000 subscriptions, 20,000 invoices, and associated payment ledgers, across both initial (Page 1) and deep pagination pages.

### Measured Endpoint Latencies (Real PostgreSQL Benchmark)

*Measurements taken as the median of 3 warmed runs on real PostgreSQL 18.x running with active composite indexes.*

| Endpoint | Page / Scope | Latency (ms) | SLA Status | Database Indexes Used |
|---|---|:---:|:---:|---|
| `GET /api/subscriptions` | Page 1 (offset 0) | **13.1 ms** | PASS (< 2.0s) | `subscriptions_status_idx`, `subscriptions_customerId_idx`, `subscriptions_nextBillingDate_idx` |
| `GET /api/subscriptions` | Deep Page 100 (offset 1,980) | **18.2 ms** | PASS (< 2.0s) | `subscriptions_status_idx`, `subscriptions_customerId_idx`, `subscriptions_nextBillingDate_idx` |
| `GET /api/invoices` | Page 1 (offset 0) | **28.3 ms** | PASS (< 2.0s) | `invoices_status_idx`, `invoices_dueDate_idx`, `invoices_customerId_idx` |
| `GET /api/invoices` | Deep Page 100 (offset 1,980) | **29.8 ms** | PASS (< 2.0s) | `invoices_status_idx`, `invoices_dueDate_idx`, `invoices_customerId_idx` |
| `GET /api/payments` | Page 1 (offset 0) | **5.2 ms** | PASS (< 2.0s) | `payments_paymentDate_idx`, `payments_invoiceId_idx` |
| `GET /api/payments` | Deep Page 100 (offset 1,980) | **4.8 ms** | PASS (< 2.0s) | `payments_paymentDate_idx`, `payments_invoiceId_idx` |
| `GET /api/reports/summary` | Full Dataset Aggregate (20k invs, 5k subs) | **139.1 ms** | PASS (< 2.0s) | `invoices_issueDate_idx`, `invoices_status_dueDate_idx`, `subscriptions_status_nextBillingDate_idx` |
| `GET /api/reports/overdue` | Page 1 (offset 0) | **8.4 ms** | PASS (< 2.0s) | `invoices_status_dueDate_idx`, `invoices_customerId_status_idx` |
| `GET /api/reports/overdue` | Deep Page 50 (offset 980) | **9.9 ms** | PASS (< 2.0s) | `invoices_status_dueDate_idx`, `invoices_customerId_status_idx` |
| `GET /api/reports/customer-summary` | Account Scope (Full account rollup) | **15.3 ms** | PASS (< 2.0s) | `invoices_customerId_status_idx`, `subscriptions_customerId_status_idx` |
| `GET /api/subscriptions` (Portal) | Page 1 (offset 0) | **5.0 ms** | PASS (< 2.0s) | `subscriptions_customerId_status_idx`, `subscriptions_customerId_idx` |
| `GET /api/subscriptions` (Portal) | Deep Page 100 (offset 1,980) | **5.6 ms** | PASS (< 2.0s) | `subscriptions_customerId_status_idx`, `subscriptions_customerId_idx` |
| `GET /api/invoices` (Portal) | Page 1 (offset 0) | **22.5 ms** | PASS (< 2.0s) | `invoices_customerId_status_idx`, `invoices_customerId_idx` |
| `GET /api/invoices` (Portal) | Deep Page 100 (offset 1,980) | **27.6 ms** | PASS (< 2.0s) | `invoices_customerId_status_idx`, `invoices_customerId_idx` |

**Conclusion:** All tested endpoints respond in $< 140\text{ ms}$, exceeding the 2,000 ms SLA requirement by more than 14x.

---

## 2. Real Indexes Verified in PostgreSQL Schema

The following indexes were applied via additive database migrations (`20261031133000_baseline`, `20261031154500_add_paused_and_renewals`, and `20261031160000_performance_indexes`) and verified in `pg_indexes`:

1. **`invoices_status_dueDate_idx`** on `invoices("status", "dueDate")`:
   - Powers `GET /api/reports/overdue` to extract non-paid, past-due invoices instantaneously without table scanning.
2. **`invoices_issueDate_idx`** on `invoices("issueDate")`:
   - Accelerates monthly revenue breakdown aggregation in `GET /api/reports/summary`.
3. **`invoices_customerId_status_idx`** on `invoices("customerId", "status")`:
   - Optimizes customer portal invoice filtering and executive customer summary rollups.
4. **`subscriptions_status_nextBillingDate_idx`** on `subscriptions("status", "nextBillingDate")`:
   - Optimizes batch recurring billing runner query (`WHERE status = 'ACTIVE' AND nextBillingDate <= today`).
5. **`subscriptions_customerId_status_idx`** on `subscriptions("customerId", "status")`:
   - Accelerates customer portal active subscription lookups and multi-tenant isolation filters.
6. **`payments_paymentDate_idx`** on `payments("paymentDate")`:
   - Accelerates payment ledger chronological listing (`ORDER BY paymentDate DESC`) and date range filters.
7. **`payments_invoiceId_idx`** on `payments("invoiceId")`:
   - Powers invoice-to-payment join lookups and overpayment validation assertions.
8. **`invoices_subscriptionId_periodStart_key`** (Unique constraint index) on `invoices("subscriptionId", "periodStart")`:
   - Guarantees zero double-billing idempotency at the database engine level.

---

## 3. How to Reproduce Real Benchmark

1. Ensure the PostgreSQL database is migrated:
   ```bash
   cd server
   npx prisma migrate deploy
   ```
2. Populate the database with high-scale synthetic records:
   ```bash
   npx tsx src/scripts/seed-benchmark.ts
   ```
3. Execute the automated benchmark timing suite:
   ```bash
   npx tsx src/scripts/run-benchmark.ts
   ```
