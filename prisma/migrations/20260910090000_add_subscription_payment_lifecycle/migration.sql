CREATE TYPE "SubscriptionPaymentStatus" AS ENUM ('PAID', 'PENDING');

ALTER TABLE "clinic"
  ADD COLUMN "subscriptionPaymentStatus" "SubscriptionPaymentStatus" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "subscriptionPaidAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionReminderDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "subscriptionGraceDays" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "subscriptionIntervalMonths" INTEGER NOT NULL DEFAULT 1;
