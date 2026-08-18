/*
  Warnings:

  - You are about to drop the column `role` on the `clinicmember` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `clinicmember` DROP FOREIGN KEY `ClinicMember_clinicId_fkey`;

-- DropIndex
DROP INDEX `ClinicMember_clinicId_role_idx` ON `clinicmember`;

-- AlterTable
ALTER TABLE `clinicmember` DROP COLUMN `role`,
    ADD COLUMN `roleId` INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `session` ADD COLUMN `impersonatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `banExpires` DATETIME(3) NULL,
    ADD COLUMN `banReason` TEXT NULL,
    ADD COLUMN `banned` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `role` TEXT NULL;

-- CreateTable
CREATE TABLE `Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `permissions` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Role_clinicId_isActive_idx`(`clinicId`, `isActive`),
    UNIQUE INDEX `Role_clinicId_key_key`(`clinicId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmployeeInvite` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmployeeInvite_tokenHash_key`(`tokenHash`),
    INDEX `EmployeeInvite_clinicId_createdAt_idx`(`clinicId`, `createdAt`),
    INDEX `EmployeeInvite_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ClinicMember_clinicId_roleId_idx` ON `ClinicMember`(`clinicId`, `roleId`);

-- AddForeignKey
ALTER TABLE `Role` ADD CONSTRAINT `Role_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `Clinic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeInvite` ADD CONSTRAINT `EmployeeInvite_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `Clinic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeInvite` ADD CONSTRAINT `EmployeeInvite_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmployeeInvite` ADD CONSTRAINT `EmployeeInvite_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicMember` ADD CONSTRAINT `ClinicMember_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- ALTER TABLE `Pet` ADD CONSTRAINT `Pet_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `Clinic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
