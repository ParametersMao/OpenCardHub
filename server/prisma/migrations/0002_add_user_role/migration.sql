-- AlterTable
ALTER TABLE `users`
    ADD COLUMN `role` ENUM('admin', 'agent', 'buyer') NOT NULL DEFAULT 'buyer';
