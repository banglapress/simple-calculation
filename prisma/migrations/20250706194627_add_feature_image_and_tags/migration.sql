/*
  Warnings:

  - Added the required column `featureImage` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `post` ADD COLUMN `featureImage` VARCHAR(191) NOT NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL;
