-- CreateTable
CREATE TABLE `VegetationLog` (
    `id` VARCHAR(191) NOT NULL,
    `siteId` VARCHAR(191) NOT NULL,
    `observerName` VARCHAR(191) NULL,
    `date` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `overallScore` DOUBLE NULL,
    `overallRating` VARCHAR(191) NULL,
    `landscapeAvg` DOUBLE NULL,
    `sizeAvg` DOUBLE NULL,
    `vegAvg` DOUBLE NULL,
    `soilAvg` DOUBLE NULL,
    `hydroAvg` DOUBLE NULL,
    `answers` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VegetationLog_siteId_idx`(`siteId`),
    INDEX `VegetationLog_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
