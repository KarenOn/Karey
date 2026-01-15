-- AlterTable
ALTER TABLE `appointment` MODIFY `type` ENUM('CONSULTATION', 'VACCINATION', 'SURGERY', 'AESTHETIC', 'CHECKUP', 'EMERGENCY', 'GROOMING', 'BATH', 'HOSPITALIZATION', 'DEWORMING', 'OTHER') NOT NULL DEFAULT 'CONSULTATION';

-- CreateTable
CREATE TABLE `TodayTurn` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clinicId` INTEGER NOT NULL,
    `clientId` INTEGER NULL,
    `petId` INTEGER NULL,
    `petName` VARCHAR(191) NOT NULL,
    `species` ENUM('DOG', 'CAT', 'BIRD', 'RABBIT', 'OTHER') NOT NULL DEFAULT 'DOG',
    `ownerName` VARCHAR(191) NOT NULL,
    `ownerPhone` VARCHAR(191) NOT NULL,
    `type` ENUM('CONSULTATION', 'VACCINATION', 'SURGERY', 'AESTHETIC', 'CHECKUP', 'EMERGENCY', 'GROOMING', 'BATH', 'HOSPITALIZATION', 'DEWORMING', 'OTHER') NOT NULL DEFAULT 'GROOMING',
    `serviceName` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `arrivalAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estimatedDurationMins` INTEGER NOT NULL DEFAULT 60,
    `status` ENUM('WAITING', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `notifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TodayTurn_clinicId_arrivalAt_idx`(`clinicId`, `arrivalAt`),
    INDEX `TodayTurn_clinicId_status_idx`(`clinicId`, `status`),
    INDEX `TodayTurn_clinicId_type_idx`(`clinicId`, `type`),
    INDEX `TodayTurn_clientId_idx`(`clientId`),
    INDEX `TodayTurn_petId_idx`(`petId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TodayTurn` ADD CONSTRAINT `TodayTurn_clinicId_fkey` FOREIGN KEY (`clinicId`) REFERENCES `Clinic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TodayTurn` ADD CONSTRAINT `TodayTurn_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TodayTurn` ADD CONSTRAINT `TodayTurn_petId_fkey` FOREIGN KEY (`petId`) REFERENCES `Pet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
