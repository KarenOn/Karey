ALTER TABLE "vaccinecatalog"
ADD COLUMN "productId" INTEGER;

CREATE UNIQUE INDEX "vaccinecatalog_productId_key"
ON "vaccinecatalog"("productId");

CREATE INDEX "vaccinecatalog_clinicId_productId_idx"
ON "vaccinecatalog"("clinicId", "productId");

UPDATE "vaccinecatalog" AS "catalog"
SET "productId" = "product"."id"
FROM "product"
WHERE "catalog"."clinicId" = "product"."clinicId"
  AND LOWER("product"."category") = 'vacuna'
  AND LOWER("catalog"."name") = LOWER("product"."name")
  AND "catalog"."productId" IS NULL;

INSERT INTO "vaccinecatalog" ("clinicId", "productId", "name", "isActive", "createdAt", "updatedAt")
SELECT "product"."clinicId", "product"."id", "product"."name", "product"."isActive", NOW(), NOW()
FROM "product"
WHERE LOWER("product"."category") = 'vacuna'
  AND NOT EXISTS (
    SELECT 1
    FROM "vaccinecatalog" AS "catalog"
    WHERE "catalog"."clinicId" = "product"."clinicId"
      AND "catalog"."productId" = "product"."id"
  )
  AND NOT EXISTS (
    SELECT 1
    FROM "vaccinecatalog" AS "same_name"
    WHERE "same_name"."clinicId" = "product"."clinicId"
      AND LOWER("same_name"."name") = LOWER("product"."name")
  );

ALTER TABLE "vaccinecatalog"
ADD CONSTRAINT "vaccinecatalog_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
