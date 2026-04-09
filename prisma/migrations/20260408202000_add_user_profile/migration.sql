-- CreateTable
CREATE TABLE `userprofile` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `jobTitle` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `userprofile_userId_key`(`userId`),
    INDEX `userprofile_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `userprofile`
    ADD CONSTRAINT `userprofile_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
