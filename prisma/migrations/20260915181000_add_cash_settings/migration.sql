ALTER TABLE "clinic" ADD COLUMN "cashEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clinic" ADD COLUMN "requireCashSessionForCash" BOOLEAN NOT NULL DEFAULT false;
