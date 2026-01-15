-- AlterTable
ALTER TABLE `clinic` ADD COLUMN `bankAccount` VARCHAR(191) NULL,
    ADD COLUMN `bankClabe` VARCHAR(191) NULL,
    ADD COLUMN `bankName` VARCHAR(191) NULL,
    ADD COLUMN `invoiceNotes` TEXT NULL,
    ADD COLUMN `invoiceTerms` TEXT NULL,
    ADD COLUMN `logoUrl` TEXT NULL,
    ADD COLUMN `mobile` VARCHAR(191) NULL,
    ADD COLUMN `owner` VARCHAR(191) NULL,
    ADD COLUMN `slogan` VARCHAR(191) NULL,
    ADD COLUMN `socialMedia` JSON NULL,
    ADD COLUMN `taxId` VARCHAR(191) NULL,
    ADD COLUMN `taxName` VARCHAR(191) NULL,
    ADD COLUMN `website` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `ClinicSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `day` ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday') NOT NULL,
    `open` VARCHAR(5) NULL,
    `close` VARCHAR(5) NULL,
    `closed` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ClinicSchedule_clinicId_idx`(`clinicId`),
    UNIQUE INDEX `ClinicSchedule_clinicId_day_key`(`clinicId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClinicSchedule` ADD CONSTRAINT `ClinicSchedule_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `Clinic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
