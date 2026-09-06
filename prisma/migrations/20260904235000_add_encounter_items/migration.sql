CREATE TABLE "encounteritem" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "todayTurnId" INTEGER,
    "type" "InvoiceItemType" NOT NULL,
    "serviceId" INTEGER,
    "productId" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "encounteritem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "encounteritem_clinicId_appointmentId_idx" ON "encounteritem"("clinicId", "appointmentId");
CREATE INDEX "encounteritem_clinicId_todayTurnId_idx" ON "encounteritem"("clinicId", "todayTurnId");
CREATE INDEX "encounteritem_petId_idx" ON "encounteritem"("petId");
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_todayTurnId_fkey" FOREIGN KEY ("todayTurnId") REFERENCES "todayturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "encounteritem" ADD CONSTRAINT "encounteritem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
