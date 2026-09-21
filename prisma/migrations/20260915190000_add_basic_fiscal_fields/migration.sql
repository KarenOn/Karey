CREATE TYPE "ClientIdentificationType" AS ENUM ('CEDULA', 'RNC', 'PASSPORT_OTHER');

ALTER TABLE "client" ADD COLUMN "identificationType" "ClientIdentificationType";
ALTER TABLE "client" ADD COLUMN "identificationNumber" TEXT;

ALTER TABLE "invoice" ADD COLUMN "fiscalDocumentType" TEXT;
ALTER TABLE "invoice" ADD COLUMN "ncf" TEXT;
ALTER TABLE "invoice" ADD COLUMN "eNcf" TEXT;
