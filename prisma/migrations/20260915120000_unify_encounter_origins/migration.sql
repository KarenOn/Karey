ALTER TABLE "todayturn" ADD COLUMN "serviceId" INTEGER;
ALTER TABLE "clinicalvisit" ADD COLUMN "todayTurnId" INTEGER;
UPDATE "todayturn" AS turn
SET "serviceId" = service.id
FROM "service" AS service
WHERE turn."serviceId" IS NULL
  AND service."clinicId" = turn."clinicId"
  AND service."name" = turn."serviceName";
CREATE UNIQUE INDEX "clinicalvisit_todayTurnId_key" ON "clinicalvisit"("todayTurnId");
CREATE INDEX "todayturn_serviceId_idx" ON "todayturn"("serviceId");
ALTER TABLE "todayturn" ADD CONSTRAINT "todayturn_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clinicalvisit" ADD CONSTRAINT "clinicalvisit_todayTurnId_fkey" FOREIGN KEY ("todayTurnId") REFERENCES "todayturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
