# Brightloop System Architecture & Technical Specifications

This document details the architectural topology, database entity relationships, and core engineering decisions behind the **Brightloop Subscription Management System**.

---

## 1. System Topology & Architecture

```mermaid
flowchart TD
    subgraph Frontend["Client Tier (React 18 + Vite + Tailwind)"]
        SPA["Single Page App (React Router v6)"]
        AuthContext["Auth Context & Token Interceptors"]
        PortalView["Customer Self-Service Portal"]
        AdminView["Admin / Staff Operations & Analytics"]
    end

    subgraph API["Backend Tier (Express.js + TypeScript)"]
        Router["Express App Router & Middlewares"]
        RateLimiter["Rate Limiting & Helmet Security"]
        AuthGuard["JWT Authenticate & requireRole Guard"]
        ScopeGuard["customerScope Query Scoping"]
        
        subgraph Subsystems["Core Modules"]
            AuthMod["Auth & RBAC Module"]
            CatalogMod["Products & Plans Catalog"]
            SubMod["Subscription State Machine Engine"]
            InvoiceMod["Idempotent Invoicing & Billing Engine"]
            PaymentMod["Payment Ledger & Validation Engine"]
            ReportMod["High-Scale Analytics Engine"]
        end
        
        CronJob["node-cron Scheduler (Auto-Close & Recurring Run)"]
    end

    subgraph DataTier["Data Tier (Prisma ORM & PostgreSQL)"]
        Prisma["Prisma ORM Client (Connection Pooling)"]
        Postgres[("PostgreSQL 16 Database with Composite Indexes")]
    end

    SPA -->|HTTPS / JWT Auth| Router
    Router --> RateLimiter --> AuthGuard --> ScopeGuard
    ScopeGuard --> Subsystems
    CronJob -->|Scheduled Triggers| SubMod
    CronJob -->|Daily Batch Run| InvoiceMod
    Subsystems --> Prisma --> Postgres
```

---

## 2. Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    USER ||--o{ SUBSCRIPTION : "owns (as customer)"
    USER ||--o{ INVOICE : "billed to"
    USER ||--o{ PASSWORD_RESET_TOKEN : "requests"
    
    PLAN ||--o{ SUBSCRIPTION : "defines terms for"
    PLAN ||--o{ QUOTATION_TEMPLATE : "templates"
    
    PRODUCT ||--o{ PRODUCT_VARIANT : "has variations"
    PRODUCT ||--o{ SUBSCRIPTION_LINE : "sold in"
    PRODUCT ||--o{ QUOTATION_TEMPLATE_LINE : "pre-configured in"
    
    QUOTATION_TEMPLATE ||--|{ QUOTATION_TEMPLATE_LINE : "contains"
    
    SUBSCRIPTION ||--|{ SUBSCRIPTION_LINE : "contains"
    SUBSCRIPTION ||--o{ SUBSCRIPTION_STATUS_HISTORY : "tracks transitions"
    SUBSCRIPTION ||--o{ INVOICE : "generates recurring"
    
    INVOICE ||--|{ INVOICE_LINE : "contains"
    INVOICE ||--o{ PAYMENT : "settled by"
    
    TAX ||--o{ SUBSCRIPTION_LINE : "taxes"
    DISCOUNT ||--o{ DISCOUNT_PRODUCT : "restricts"
    PRODUCT ||--o{ DISCOUNT_PRODUCT : "restricted by"

    USER {
        string id PK
        string email UK
        string name
        string role
        boolean isActive
    }

    SUBSCRIPTION {
        string id PK
        string number UK
        string customerId FK
        string planId FK
        string status
        datetime startDate
        datetime expiryDate
        datetime nextBillingDate
        string paymentTerms
    }

    INVOICE {
        string id PK
        string number UK
        string subscriptionId FK
        string customerId FK
        datetime periodStart
        datetime periodEnd
        float total
        float amountPaid
        string status
    }

    PAYMENT {
        string id PK
        string invoiceId FK
        float amount
        string method
        datetime paymentDate
    }
```

---

## 3. Key Architectural Design Decisions

### Decision 1: Deterministic Idempotency on Invoicing (`[subscriptionId, periodStart]`)
- **Challenge:** In recurring subscription systems, concurrent cron runners, network retries, or manual administrator billing executions could cause customers to be billed twice for the same billing cycle.
- **Solution:** 
  1. The database enforces a strict composite unique constraint: `@@unique([subscriptionId, periodStart])`.
  2. `generateInvoiceForSubscription` performs atomic pre-checks and wraps creation inside a database transaction.
  3. If a concurrent execution collides, Prisma's `P2002` error is intercepted gracefully, returning `{ skipped: true, reason: 'Duplicate period avoided' }` without application exceptions or financial inconsistencies.

### Decision 2: Finite State Machine with Audit History
- **Challenge:** Unchecked subscription status changes (e.g. activating a draft without confirmation, or reopening a legally terminated contract) lead to billing corruption.
- **Solution:**
  1. An explicit state transition matrix (`ALLOWED_TRANSITIONS`) enforces:
     `DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED`.
  2. Illegal status jumps immediately return `HTTP 400 Bad Request`.
  3. Plan-level constraints (such as `closable: false` blocking premature contract termination before `expiryDate`) are validated within the transaction.
  4. Every status change automatically writes an immutable record to `SubscriptionStatusHistory` capturing the actor ID, timestamp, and optional business rationale.

### Decision 3: Indexed SQL Aggregates for Enterprise Reporting
- **Challenge:** Real-time calculation of MRR, total invoiced, collection rates, and overdue receivables across 5,000 subscriptions and 20,000 invoices must meet an executive SLA of **$< 2.0\text{ seconds}$**.
- **Solution:**
  1. Composite B-Tree indexes: `invoices(status, dueDate)`, `invoices(issueDate, status)`, and `subscriptions(status, nextBillingDate)`.
  2. Replaced naive in-memory JavaScript array filtering with native PostgreSQL grouping (`TO_CHAR(issueDate, 'YYYY-MM')`).
  3. Normalized MRR computations scale sub-20ms, verified in automated benchmark testing.

