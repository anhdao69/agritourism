-- CreateTable
CREATE TABLE `ImpactDatum` (
    `id` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `displayCode` VARCHAR(191) NOT NULL,
    `displayDescription` VARCHAR(191) NOT NULL,
    `value` DECIMAL(24, 6) NOT NULL,
    `raw` JSON NULL,
    `uploadedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImpactDatum_modelId_type_idx`(`modelId`, `type`),
    INDEX `ImpactDatum_displayCode_idx`(`displayCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
