-- AlterTable
ALTER TABLE "user" ADD COLUMN     "isClinicCreator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "productTourCompletedAt" TIMESTAMP(3),
ADD COLUMN     "setupChecklistCompletedAt" TIMESTAMP(3),
ADD COLUMN     "setupChecklistDismissedAt" TIMESTAMP(3);
