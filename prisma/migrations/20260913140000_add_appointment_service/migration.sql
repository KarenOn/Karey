ALTER TABLE "appointment" ADD COLUMN "serviceId" INTEGER;
CREATE INDEX "appointment_serviceId_idx" ON "appointment"("serviceId");
ALTER TABLE "appointment"
ADD CONSTRAINT "appointment_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
