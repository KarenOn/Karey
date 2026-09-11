/*
  Warnings:

  - You are about to drop the column `isClinicCreator` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `productTourCompletedAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `setupChecklistCompletedAt` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `setupChecklistDismissedAt` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "isClinicCreator",
DROP COLUMN "productTourCompletedAt",
DROP COLUMN "setupChecklistCompletedAt",
DROP COLUMN "setupChecklistDismissedAt";
