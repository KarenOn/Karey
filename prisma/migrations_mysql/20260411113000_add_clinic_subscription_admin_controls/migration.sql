ALTER TABLE `clinic`
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `subscriptionStatus` ENUM('ACTIVE', 'INACTIVE', 'PAST_DUE') NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN `subscriptionEndDate` DATE NULL,
  ADD COLUMN `plan` VARCHAR(191) NULL;

CREATE INDEX `clinic_isActive_subscriptionStatus_idx`
  ON `clinic`(`isActive`, `subscriptionStatus`);
