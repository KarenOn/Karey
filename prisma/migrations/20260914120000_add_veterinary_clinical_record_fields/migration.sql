ALTER TABLE "pet"
  ADD COLUMN "allergies" TEXT,
  ADD COLUMN "chronicConditions" TEXT,
  ADD COLUMN "clinicalHistory" TEXT,
  ADD COLUMN "currentMedications" TEXT,
  ADD COLUMN "clinicalWarnings" TEXT;

ALTER TABLE "clinicalvisit"
  ADD COLUMN "anamnesis" TEXT,
  ADD COLUMN "heartRateBpm" INTEGER,
  ADD COLUMN "respiratoryRatePpm" INTEGER,
  ADD COLUMN "carePlan" TEXT,
  ADD COLUMN "nextReviewAt" TIMESTAMP(3);
