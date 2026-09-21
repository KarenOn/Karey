CREATE TABLE "cashregister" (
  "id" SERIAL NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cashregister_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "cashsession" ADD COLUMN "registerId" INTEGER;

INSERT INTO "cashregister" ("clinicId", "name", "isActive", "updatedAt")
SELECT DISTINCT "clinicId", 'Caja principal', true, CURRENT_TIMESTAMP
FROM "cashsession";

UPDATE "cashsession" s
SET "registerId" = r."id"
FROM "cashregister" r
WHERE r."clinicId" = s."clinicId" AND r."name" = 'Caja principal';

ALTER TABLE "cashsession" ALTER COLUMN "registerId" SET NOT NULL;

CREATE UNIQUE INDEX "cashregister_clinicId_name_key" ON "cashregister"("clinicId", "name");
CREATE INDEX "cashregister_clinicId_isActive_idx" ON "cashregister"("clinicId", "isActive");
CREATE INDEX "cashsession_registerId_openedAt_idx" ON "cashsession"("registerId", "openedAt");
DROP INDEX IF EXISTS "cashsession_one_open_per_clinic_uidx";
CREATE UNIQUE INDEX "cashsession_one_open_per_register_uidx" ON "cashsession"("registerId") WHERE "status" = 'OPEN';

ALTER TABLE "cashregister" ADD CONSTRAINT "cashregister_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cashsession" ADD CONSTRAINT "cashsession_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "cashregister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
