ALTER TABLE `appointment`
  ADD COLUMN `reminderSent` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `reminderSentAt` DATETIME(3) NULL;

CREATE INDEX `appointment_clinicId_reminderSent_startAt_idx`
  ON `appointment`(`clinicId`, `reminderSent`, `startAt`);
