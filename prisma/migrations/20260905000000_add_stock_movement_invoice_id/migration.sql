ALTER TABLE "stockmovement" ADD COLUMN "invoiceId" INTEGER;
CREATE INDEX "stockmovement_invoiceId_idx" ON "stockmovement"("invoiceId");
UPDATE "stockmovement" AS sm
SET "invoiceId" = i."id"
FROM "invoice" AS i
WHERE sm."clinicId" = i."clinicId"
  AND sm."referenceType" = 'INVOICE'
  AND sm."referenceId" = i."number";
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
