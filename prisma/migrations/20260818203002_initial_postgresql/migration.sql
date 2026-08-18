-- CreateEnum
CREATE TYPE "ClinicRole" AS ENUM ('OWNER', 'ADMIN', 'VET', 'RECEPTION');

-- CreateEnum
CREATE TYPE "PetSpecies" AS ENUM ('DOG', 'CAT', 'BIRD', 'RABBIT', 'OTHER');

-- CreateEnum
CREATE TYPE "PetSex" AS ENUM ('MALE', 'FEMALE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'VOID');

-- CreateEnum
CREATE TYPE "InvoiceItemType" AS ENUM ('SERVICE', 'PRODUCT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUST', 'SALE', 'PURCHASE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VaccineIntervalUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS', 'YEARS');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'VACCINATION', 'SURGERY', 'AESTHETIC', 'CHECKUP', 'EMERGENCY', 'GROOMING', 'BATH', 'HOSPITALIZATION', 'DEWORMING', 'OTHER');

-- CreateEnum
CREATE TYPE "TodayTurnStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAST_DUE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userprofile" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "jobTitle" TEXT,
    "bio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userprofile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "impersonatedBy" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employeeinvite" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "userId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employeeinvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'America/Santo_Domingo',
    "logoUrl" TEXT,
    "slogan" TEXT,
    "owner" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "taxName" TEXT,
    "taxId" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "bankClabe" TEXT,
    "invoiceNotes" TEXT,
    "invoiceTerms" TEXT,
    "socialMedia" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "subscriptionEndDate" DATE,
    "plan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicschedule" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "day" "Weekday" NOT NULL,
    "open" VARCHAR(5),
    "close" VARCHAR(5),
    "closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clinicschedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicmember" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicmember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pet" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL,
    "breed" TEXT,
    "sex" "PetSex" NOT NULL DEFAULT 'UNKNOWN',
    "color" TEXT,
    "birthDate" TIMESTAMP(3),
    "microchip" TEXT,
    "weightKg" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" TEXT,
    "notes" TEXT,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentAt" TIMESTAMP(3),
    "vetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "todayturn" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "clientId" INTEGER,
    "petId" INTEGER,
    "petName" TEXT NOT NULL,
    "species" "PetSpecies" NOT NULL DEFAULT 'DOG',
    "ownerName" TEXT NOT NULL,
    "ownerPhone" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL DEFAULT 'GROOMING',
    "serviceName" TEXT NOT NULL,
    "notes" TEXT,
    "arrivalAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedDurationMins" INTEGER NOT NULL DEFAULT 60,
    "status" "TodayTurnStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "todayturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "durationMins" INTEGER,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT,
    "cost" DECIMAL(12,2),
    "price" DECIMAL(12,2),
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "requiresPrescription" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stockmovement" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stockmovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "petId" INTEGER,
    "appointmentId" INTEGER,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoiceitem" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "type" "InvoiceItemType" NOT NULL,
    "serviceId" INTEGER,
    "productId" INTEGER,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "lineTotal" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoiceitem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinicalvisit" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "vetId" TEXT,
    "visitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "temperatureC" DOUBLE PRECISION,
    "diagnosis" TEXT,
    "treatment" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinicalvisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicalattachment" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "visitId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicalattachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinecatalog" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "species" "PetSpecies",
    "intervalValue" INTEGER,
    "intervalUnit" "VaccineIntervalUnit",
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaccinecatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaccinationrecord" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "petId" INTEGER NOT NULL,
    "vaccineId" INTEGER NOT NULL,
    "visitId" INTEGER,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextDueAt" TIMESTAMP(3),
    "batchNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vaccinationrecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "meta" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationrecipient" (
    "id" SERIAL NOT NULL,
    "notificationId" INTEGER NOT NULL,
    "userId" TEXT,
    "clientId" INTEGER,
    "email" TEXT,
    "phone" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "notificationrecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pushsubscription" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pushsubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "userprofile_userId_key" ON "userprofile"("userId");

-- CreateIndex
CREATE INDEX "userprofile_userId_idx" ON "userprofile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "role_clinicId_isActive_idx" ON "role"("clinicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "role_clinicId_key_key" ON "role"("clinicId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "employeeinvite_tokenHash_key" ON "employeeinvite"("tokenHash");

-- CreateIndex
CREATE INDEX "employeeinvite_clinicId_createdAt_idx" ON "employeeinvite"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "employeeinvite_email_idx" ON "employeeinvite"("email");

-- CreateIndex
CREATE INDEX "clinic_createdAt_idx" ON "clinic"("createdAt");

-- CreateIndex
CREATE INDEX "clinic_isActive_subscriptionStatus_idx" ON "clinic"("isActive", "subscriptionStatus");

-- CreateIndex
CREATE INDEX "clinicschedule_clinicId_idx" ON "clinicschedule"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "clinicschedule_clinicId_day_key" ON "clinicschedule"("clinicId", "day");

-- CreateIndex
CREATE INDEX "clinicmember_clinicId_idx" ON "clinicmember"("clinicId");

-- CreateIndex
CREATE INDEX "clinicmember_userId_idx" ON "clinicmember"("userId");

-- CreateIndex
CREATE INDEX "clinicmember_clinicId_roleId_idx" ON "clinicmember"("clinicId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "clinicmember_clinicId_userId_key" ON "clinicmember"("clinicId", "userId");

-- CreateIndex
CREATE INDEX "client_clinicId_idx" ON "client"("clinicId");

-- CreateIndex
CREATE INDEX "client_clinicId_fullName_idx" ON "client"("clinicId", "fullName");

-- CreateIndex
CREATE INDEX "client_clinicId_phone_idx" ON "client"("clinicId", "phone");

-- CreateIndex
CREATE INDEX "client_clinicId_email_idx" ON "client"("clinicId", "email");

-- CreateIndex
CREATE INDEX "pet_clinicId_idx" ON "pet"("clinicId");

-- CreateIndex
CREATE INDEX "pet_clientId_idx" ON "pet"("clientId");

-- CreateIndex
CREATE INDEX "pet_clinicId_name_idx" ON "pet"("clinicId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "pet_clinicId_microchip_key" ON "pet"("clinicId", "microchip");

-- CreateIndex
CREATE INDEX "appointment_clinicId_startAt_idx" ON "appointment"("clinicId", "startAt");

-- CreateIndex
CREATE INDEX "appointment_clinicId_status_idx" ON "appointment"("clinicId", "status");

-- CreateIndex
CREATE INDEX "appointment_clinicId_reminderSent_startAt_idx" ON "appointment"("clinicId", "reminderSent", "startAt");

-- CreateIndex
CREATE INDEX "appointment_clinicId_type_idx" ON "appointment"("clinicId", "type");

-- CreateIndex
CREATE INDEX "appointment_petId_idx" ON "appointment"("petId");

-- CreateIndex
CREATE INDEX "appointment_clientId_idx" ON "appointment"("clientId");

-- CreateIndex
CREATE INDEX "appointment_vetId_idx" ON "appointment"("vetId");

-- CreateIndex
CREATE INDEX "todayturn_clinicId_arrivalAt_idx" ON "todayturn"("clinicId", "arrivalAt");

-- CreateIndex
CREATE INDEX "todayturn_clinicId_status_idx" ON "todayturn"("clinicId", "status");

-- CreateIndex
CREATE INDEX "todayturn_clinicId_type_idx" ON "todayturn"("clinicId", "type");

-- CreateIndex
CREATE INDEX "todayturn_clientId_idx" ON "todayturn"("clientId");

-- CreateIndex
CREATE INDEX "todayturn_petId_idx" ON "todayturn"("petId");

-- CreateIndex
CREATE INDEX "service_clinicId_isActive_idx" ON "service"("clinicId", "isActive");

-- CreateIndex
CREATE INDEX "service_clinicId_category_idx" ON "service"("clinicId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "service_clinicId_name_key" ON "service"("clinicId", "name");

-- CreateIndex
CREATE INDEX "product_clinicId_isActive_idx" ON "product"("clinicId", "isActive");

-- CreateIndex
CREATE INDEX "product_clinicId_stockOnHand_idx" ON "product"("clinicId", "stockOnHand");

-- CreateIndex
CREATE INDEX "product_clinicId_minStock_idx" ON "product"("clinicId", "minStock");

-- CreateIndex
CREATE UNIQUE INDEX "product_clinicId_sku_key" ON "product"("clinicId", "sku");

-- CreateIndex
CREATE INDEX "stockmovement_clinicId_createdAt_idx" ON "stockmovement"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "stockmovement_productId_idx" ON "stockmovement"("productId");

-- CreateIndex
CREATE INDEX "stockmovement_createdById_idx" ON "stockmovement"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_appointmentId_key" ON "invoice"("appointmentId");

-- CreateIndex
CREATE INDEX "invoice_clinicId_issueDate_idx" ON "invoice"("clinicId", "issueDate");

-- CreateIndex
CREATE INDEX "invoice_clinicId_createdAt_idx" ON "invoice"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "invoice_clinicId_status_idx" ON "invoice"("clinicId", "status");

-- CreateIndex
CREATE INDEX "invoice_clientId_idx" ON "invoice"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_clinicId_number_key" ON "invoice"("clinicId", "number");

-- CreateIndex
CREATE INDEX "invoiceitem_invoiceId_idx" ON "invoiceitem"("invoiceId");

-- CreateIndex
CREATE INDEX "invoiceitem_serviceId_idx" ON "invoiceitem"("serviceId");

-- CreateIndex
CREATE INDEX "invoiceitem_productId_idx" ON "invoiceitem"("productId");

-- CreateIndex
CREATE INDEX "payment_invoiceId_idx" ON "payment"("invoiceId");

-- CreateIndex
CREATE INDEX "payment_paidAt_idx" ON "payment"("paidAt");

-- CreateIndex
CREATE INDEX "payment_createdById_idx" ON "payment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "clinicalvisit_appointmentId_key" ON "clinicalvisit"("appointmentId");

-- CreateIndex
CREATE INDEX "clinicalvisit_clinicId_visitAt_idx" ON "clinicalvisit"("clinicId", "visitAt");

-- CreateIndex
CREATE INDEX "clinicalvisit_petId_idx" ON "clinicalvisit"("petId");

-- CreateIndex
CREATE INDEX "clinicalvisit_clientId_idx" ON "clinicalvisit"("clientId");

-- CreateIndex
CREATE INDEX "clinicalvisit_vetId_idx" ON "clinicalvisit"("vetId");

-- CreateIndex
CREATE INDEX "medicalattachment_visitId_idx" ON "medicalattachment"("visitId");

-- CreateIndex
CREATE INDEX "medicalattachment_clinicId_createdAt_idx" ON "medicalattachment"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "vaccinecatalog_clinicId_isActive_idx" ON "vaccinecatalog"("clinicId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "vaccinecatalog_clinicId_name_key" ON "vaccinecatalog"("clinicId", "name");

-- CreateIndex
CREATE INDEX "vaccinationrecord_clinicId_nextDueAt_idx" ON "vaccinationrecord"("clinicId", "nextDueAt");

-- CreateIndex
CREATE INDEX "vaccinationrecord_petId_idx" ON "vaccinationrecord"("petId");

-- CreateIndex
CREATE INDEX "vaccinationrecord_vaccineId_idx" ON "vaccinationrecord"("vaccineId");

-- CreateIndex
CREATE INDEX "notification_clinicId_createdAt_idx" ON "notification"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_clinicId_status_idx" ON "notification"("clinicId", "status");

-- CreateIndex
CREATE INDEX "notification_scheduledAt_idx" ON "notification"("scheduledAt");

-- CreateIndex
CREATE INDEX "notification_createdById_idx" ON "notification"("createdById");

-- CreateIndex
CREATE INDEX "notificationrecipient_notificationId_idx" ON "notificationrecipient"("notificationId");

-- CreateIndex
CREATE INDEX "notificationrecipient_userId_idx" ON "notificationrecipient"("userId");

-- CreateIndex
CREATE INDEX "notificationrecipient_clientId_idx" ON "notificationrecipient"("clientId");

-- CreateIndex
CREATE INDEX "pushsubscription_clinicId_idx" ON "pushsubscription"("clinicId");

-- CreateIndex
CREATE INDEX "pushsubscription_userId_idx" ON "pushsubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "pushsubscription_clinicId_key" ON "pushsubscription"("clinicId");

-- AddForeignKey
ALTER TABLE "userprofile" ADD CONSTRAINT "userprofile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeinvite" ADD CONSTRAINT "employeeinvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeinvite" ADD CONSTRAINT "employeeinvite_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeinvite" ADD CONSTRAINT "employeeinvite_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employeeinvite" ADD CONSTRAINT "employeeinvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicschedule" ADD CONSTRAINT "clinicschedule_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicmember" ADD CONSTRAINT "clinicmember_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicmember" ADD CONSTRAINT "clinicmember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicmember" ADD CONSTRAINT "clinicmember_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client" ADD CONSTRAINT "client_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet" ADD CONSTRAINT "pet_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pet" ADD CONSTRAINT "pet_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todayturn" ADD CONSTRAINT "todayturn_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todayturn" ADD CONSTRAINT "todayturn_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "todayturn" ADD CONSTRAINT "todayturn_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service" ADD CONSTRAINT "service_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stockmovement" ADD CONSTRAINT "stockmovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoiceitem" ADD CONSTRAINT "invoiceitem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoiceitem" ADD CONSTRAINT "invoiceitem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "service"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoiceitem" ADD CONSTRAINT "invoiceitem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicalvisit" ADD CONSTRAINT "clinicalvisit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicalvisit" ADD CONSTRAINT "clinicalvisit_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicalvisit" ADD CONSTRAINT "clinicalvisit_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicalvisit" ADD CONSTRAINT "clinicalvisit_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinicalvisit" ADD CONSTRAINT "clinicalvisit_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicalattachment" ADD CONSTRAINT "medicalattachment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicalattachment" ADD CONSTRAINT "medicalattachment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "clinicalvisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinecatalog" ADD CONSTRAINT "vaccinecatalog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinationrecord" ADD CONSTRAINT "vaccinationrecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinationrecord" ADD CONSTRAINT "vaccinationrecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinationrecord" ADD CONSTRAINT "vaccinationrecord_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccinecatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaccinationrecord" ADD CONSTRAINT "vaccinationrecord_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "clinicalvisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationrecipient" ADD CONSTRAINT "notificationrecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationrecipient" ADD CONSTRAINT "notificationrecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationrecipient" ADD CONSTRAINT "notificationrecipient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushsubscription" ADD CONSTRAINT "pushsubscription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pushsubscription" ADD CONSTRAINT "pushsubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
