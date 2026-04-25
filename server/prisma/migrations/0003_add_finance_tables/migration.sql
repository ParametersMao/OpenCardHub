CREATE TABLE `finance_transactions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `type` ENUM('order_profit', 'withdrawal_freeze', 'withdrawal_paid', 'withdrawal_reject', 'manual_adjust') NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `balance_after` DECIMAL(12, 2) NOT NULL,
  `reference_no` VARCHAR(128) NOT NULL,
  `remark` VARCHAR(255) NULL,
  `metadata_json` JSON NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `finance_transactions_reference_no_key` (`reference_no`),
  INDEX `finance_transactions_user_id_idx` (`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `withdrawals` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `account_type` VARCHAR(32) NOT NULL,
  `account_name` VARCHAR(96) NOT NULL,
  `account_no` VARCHAR(128) NOT NULL,
  `remark` VARCHAR(255) NULL,
  `review_remark` VARCHAR(255) NULL,
  `reviewed_at` DATETIME(3) NULL,
  `paid_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  INDEX `withdrawals_user_id_idx` (`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `finance_transactions`
  ADD CONSTRAINT `finance_transactions_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `withdrawals`
  ADD CONSTRAINT `withdrawals_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
