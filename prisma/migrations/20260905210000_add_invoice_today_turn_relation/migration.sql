ALTER TABLE "invoice" ADD COLUMN "todayTurnId" INTEGER;
CREATE UNIQUE INDEX "invoice_todayTurnId_key" ON "invoice"("todayTurnId");
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_todayTurnId_fkey" FOREIGN KEY ("todayTurnId") REFERENCES "todayturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;