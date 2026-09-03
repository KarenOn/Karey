ALTER TABLE "vaccinationrecord"
ADD COLUMN "vaccineName" TEXT;

UPDATE "vaccinationrecord" AS "record"
SET "vaccineName" = "catalog"."name"
FROM "vaccinecatalog" AS "catalog"
WHERE "record"."vaccineId" = "catalog"."id";

ALTER TABLE "vaccinationrecord"
ALTER COLUMN "vaccineName" SET NOT NULL,
ALTER COLUMN "vaccineId" DROP NOT NULL;

ALTER TABLE "vaccinationrecord"
DROP CONSTRAINT "vaccinationrecord_vaccineId_fkey";

ALTER TABLE "vaccinationrecord"
ADD CONSTRAINT "vaccinationrecord_vaccineId_fkey"
FOREIGN KEY ("vaccineId") REFERENCES "vaccinecatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
