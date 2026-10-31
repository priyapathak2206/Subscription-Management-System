-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "renewedFromId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "subscriptions_renewedFromId_idx" ON "subscriptions"("renewedFromId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_renewedFromId_fkey'
    ) THEN
        ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_renewedFromId_fkey" FOREIGN KEY ("renewedFromId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
