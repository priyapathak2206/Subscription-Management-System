# Brightloop 5-Minute Live Demonstration Script

This walkthrough provides an exact, step-by-step click trail for evaluating the **Brightloop Subscription Management System** end-to-end.

---

## Pre-Loaded Demo Credentials

| Role | Email Address | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@brightloop.com` | `Admin@1234` | Full system access: catalog, staff, billing, reports |
| **Staff** | `staff@brightloop.com` | `Staff@1234` | Billing operations & customer service |
| **Customer** | `cust1@acmecorp.com` | `Customer@1234` | Self-service portal: own subscriptions & invoices only |

---

## 5-Minute Demo Flow

### 0:00 - 0:45 | Scene 1: Sign-Up & Password Policy
1. Open the application at `http://localhost:5173`.
2. Click **Create an Account**.
3. Enter name `Demo Tester` and email `demo@test.com`.
4. Try typing a weak password: `test1` &rarr; Notice the live password checklist dynamically highlights missing requirements:
   - Minimum 9 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 special character
5. Type `Brightloop@2026` &rarr; All 4 checkmarks turn green. Click **Register** &rarr; Automatically redirected to Customer Portal.

---

### 0:45 - 1:30 | Scene 2 & 3: Admin Catalog & Variant Pricing
1. Log out, then log in as Admin (`admin@brightloop.com` / `Admin@1234`).
2. Navigate to **Products & Variants** in sidebar.
   - Observe **Enterprise ERP Suite** ($1,200 base price) with variant **Brand: Odoo** (+560 extra price). Effective unit price = $1,760.
3. Navigate to **Subscription Plans**:
   - Observe **Enterprise Monthly Scale** ($99.00 / month) with `autoClose` enabled and `minQuantity: 2`.
4. Navigate to **Discounts & Promos**:
   - Observe active discounts with usage limits and expiry dates.

---

### 1:30 - 2:30 | Scene 4: Quotation Template & Subscription State Machine
1. In the sidebar, click **Subscriptions**.
2. Click on the **Quotation Templates** tab.
   - Click **Create Subscription from this** on the *Standard SaaS 30-Day Quote* card.
3. In the modal:
   - Select Customer: `Acme Corporation (cust1@acmecorp.com)`.
   - Observe that the plan and product lines automatically populate from the template.
   - Click **Create Subscription** &rarr; Generates unique number `SUB-2026-00001` in `QUOTATION` status.
4. Click **View Details** on the newly created subscription:
   - Review the **Lifecycle State Machine Stepper**: `Draft -> Quotation -> Confirmed -> Active -> Closed`.
   - Under *Available State Transitions*, click **Confirm Quotation** &rarr; Status advances to `CONFIRMED`.
   - Click **Activate Subscription** &rarr; Status advances to `ACTIVE`.
   - Scroll down to review the **Audit History Trail**, verifying who changed the status, when, and the transition reasons.

---

### 2:30 - 3:30 | Scene 5 & 6: Automated Billing Run & Idempotency
1. Navigate to **Invoices** in the sidebar.
2. In the header, click **Run Billing Batch**.
   - Review the modal description explaining chunked recurring invoice processing.
   - Click **Start Billing Batch**.
   - Notice the live execution result card:
     - `Created: N`
     - `Skipped (Current): M`
     - `Failed: 0`
   - Observe the new invoice numbers generated (e.g. `INV-2026-00001`).
3. Click **Start Billing Batch** a second time &rarr; Notice `Created: 0, Skipped: N` &rarr; Demonstrates **database-level idempotency**: impossible to double bill!
4. Click on the newly generated invoice row to view full details:
   - Observe pre-computed taxes (18% GST).
   - Observe eligible discounts automatically deducted from subtotal.
   - Click **Print / View HTML** &rarr; Opens a clean, branded receipt suitable for physical print or PDF download.

---

### 3:30 - 4:15 | Scene 7: Payments Ledger & Overpayment Guard
1. From the open invoice detail modal, click **Record Payment**.
   - Observe the outstanding balance (e.g. `$1,180.00`).
2. Try entering an overpayment: `$1,500.00`.
   - Notice the input validation and error toast: *Overpayment rejected: payment amount exceeds remaining balance*.
3. Enter partial payment: `$500.00`, select method `CARD`, and click **Confirm Payment**.
   - Invoice updates: Amount Paid `$500.00`, Outstanding `$680.00`, status remains `CONFIRMED`.
4. Click **Record Payment** again, enter the remaining `$680.00`, select `UPI`, and confirm.
   - Outstanding reaches `$0.00` &rarr; Invoice status automatically updates to `PAID`!
5. Navigate to **Payments** in sidebar to view the chronological transaction ledger.

---

### 4:15 - 5:00 | Scene 8: Executive Dashboard & Customer Isolation
1. Click **Dashboard** in the sidebar:
   - Review the **6 Real-time Financial KPIs**: Active Subs, MRR, Total Invoiced, Revenue Collected, Outstanding Balance, Overdue Accounts.
   - Hover over the **12-Month Invoiced vs Collected Trajectory Chart** to see dynamic tooltip breakdowns.
   - Inspect the **Delinquent Accounts** table and click **Remind** to trigger an automated reminder email.
2. **Customer Multi-Tenant Isolation Verification**:
   - Log out of Admin.
   - Log in as Customer (`cust1@acmecorp.com` / `Customer@1234`).
   - Automatically redirected to the **Customer Portal**.
   - Verify the customer only sees Acme Corporation's subscriptions and invoices.
   - Notice Admin-only navigation links (Staff, Catalog, Dashboard) are completely hidden.
   - Click **Pay Now** to settle an open invoice directly from the self-service portal.
