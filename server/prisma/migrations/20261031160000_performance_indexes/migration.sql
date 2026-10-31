-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoices_status_dueDate_idx" ON "invoices"("status", "dueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoices_issueDate_idx" ON "invoices"("issueDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "invoices_customerId_status_idx" ON "invoices"("customerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_status_nextBillingDate_idx" ON "subscriptions"("status", "nextBillingDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_customerId_status_idx" ON "subscriptions"("customerId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_paymentDate_idx" ON "payments"("paymentDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "payments_invoiceId_idx" ON "payments"("invoiceId");
