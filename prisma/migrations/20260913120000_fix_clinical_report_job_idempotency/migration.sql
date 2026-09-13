DROP INDEX IF EXISTS "clinicalreportjob_clinicId_dedupeKey_key";

CREATE UNIQUE INDEX "clinicalreportjob_active_dedupe_key"
ON "clinicalreportjob" ("clinicId", "dedupeKey")
WHERE "status" IN ('PENDING', 'PROCESSING');
