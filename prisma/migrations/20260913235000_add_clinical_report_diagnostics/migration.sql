ALTER TABLE "clinicalreportjob"
  ADD COLUMN "failureStage" TEXT,
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;
