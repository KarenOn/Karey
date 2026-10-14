CREATE TABLE "productbatch" (
  "id" SERIAL NOT NULL,
  "productId" INTEGER NOT NULL,
  "lotNumber" TEXT NOT NULL,
  "expirationDate" DATE,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "cost" DECIMAL(12,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "productbatch_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "stockmovement" ADD COLUMN "batchId" INTEGER;
ALTER TABLE "vaccinationrecord" ADD COLUMN "batchId" INTEGER;
INSERT INTO "productbatch" ("productId", "lotNumber", "expirationDate", "quantity", "updatedAt")
SELECT "id", 'LEGACY-' || "id", "expirationDate", "stockOnHand", CURRENT_TIMESTAMP
FROM "product" WHERE "stockOnHand" > 0;
CREATE UNIQUE INDEX "productbatch_productId_lotNumber_key" ON "productbatch"("productId", "lotNumber");
CREATE INDEX "productbatch_productId_expirationDate_idx" ON "productbatch"("productId", "expirationDate");
CREATE INDEX "productbatch_productId_quantity_idx" ON "productbatch"("productId", "quantity");
CREATE INDEX "stockmovement_batchId_idx" ON "stockmovement"("batchId");
ALTER TABLE "productbatch" ADD CONSTRAINT "productbatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "productbatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vaccinationrecord" ADD CONSTRAINT "vaccinationrecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "productbatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
