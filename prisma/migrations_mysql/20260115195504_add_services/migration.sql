-- AlterTable
ALTER TABLE `service` ADD COLUMN `category` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Service_clinicId_category_idx` ON `Service`(`clinicId`, `category`);
