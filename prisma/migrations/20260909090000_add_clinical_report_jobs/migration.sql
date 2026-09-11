CREATE TYPE "ClinicalReportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "clinicalreportjob" (
  "id" SERIAL NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "requestedById" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "petIds" JSONB NOT NULL,
  "clientId" INTEGER,
  "range" JSONB NOT NULL,
  "status" "ClinicalReportJobStatus" NOT NULL DEFAULT 'PENDING',
  "storageRef" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "clinicalreportjob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clinicalreportjob_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "clinicalreportjob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "clinicalreportjob_clinicId_dedupeKey_key" ON "clinicalreportjob"("clinicId", "dedupeKey");
CREATE INDEX "clinicalreportjob_status_createdAt_idx" ON "clinicalreportjob"("status", "createdAt");
CREATE INDEX "clinicalreportjob_clinicId_requestedById_idx" ON "clinicalreportjob"("clinicId", "requestedById");
