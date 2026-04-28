CREATE TABLE `payment_notify_logs` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `provider` VARCHAR(64) NOT NULL,
  `payment_no` VARCHAR(96) NULL,
  `order_no` VARCHAR(64) NULL,
  `status` VARCHAR(32) NOT NULL,
  `verified` BOOLEAN NOT NULL DEFAULT false,
  `error_message` VARCHAR(255) NULL,
  `raw_notify_json` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `payment_notify_logs_provider_payment_no_idx`(`provider`, `payment_no`),
  INDEX `payment_notify_logs_order_no_idx`(`order_no`),
  INDEX `payment_notify_logs_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
