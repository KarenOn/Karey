ALTER TABLE "clinic" ADD COLUMN "inventoryExpiryAlertDays" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "product" ADD COLUMN "expirationDate" DATE;
CREATE INDEX "product_clinicId_expirationDate_idx" ON "product"("clinicId", "expirationDate");
