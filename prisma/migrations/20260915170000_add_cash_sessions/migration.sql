CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "CashMovementType" AS ENUM ('CASH_IN', 'CASH_OUT');

CREATE TABLE "cashsession" (
  "id" SERIAL NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "openedById" TEXT NOT NULL,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openingFloat" DECIMAL(12,2) NOT NULL,
  "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
  "closedById" TEXT,
  "closedAt" TIMESTAMP(3),
  "expectedCash" DECIMAL(12,2),
  "countedCash" DECIMAL(12,2),
  "difference" DECIMAL(12,2),
  "closingNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cashsession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cashmovement" (
  "id" SERIAL NOT NULL,
  "cashSessionId" INTEGER NOT NULL,
  "type" "CashMovementType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "concept" TEXT NOT NULL,
  "note" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cashmovement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payment" ADD COLUMN "cashSessionId" INTEGER;

CREATE INDEX "cashsession_clinicId_openedAt_idx" ON "cashsession"("clinicId", "openedAt");
CREATE INDEX "cashsession_clinicId_status_idx" ON "cashsession"("clinicId", "status");
CREATE UNIQUE INDEX "cashsession_one_open_per_clinic_uidx" ON "cashsession"("clinicId") WHERE "status" = 'OPEN';
CREATE INDEX "cashmovement_cashSessionId_createdAt_idx" ON "cashmovement"("cashSessionId", "createdAt");
CREATE INDEX "payment_cashSessionId_idx" ON "payment"("cashSessionId");

ALTER TABLE "cashsession" ADD CONSTRAINT "cashsession_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cashsession" ADD CONSTRAINT "cashsession_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cashsession" ADD CONSTRAINT "cashsession_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cashmovement" ADD CONSTRAINT "cashmovement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cashsession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cashmovement" ADD CONSTRAINT "cashmovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment" ADD CONSTRAINT "payment_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "cashsession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
