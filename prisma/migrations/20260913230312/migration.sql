-- CreateIndex
CREATE INDEX "clinicalreportjob_clinicId_dedupeKey_idx" ON "clinicalreportjob"("clinicId", "dedupeKey");
