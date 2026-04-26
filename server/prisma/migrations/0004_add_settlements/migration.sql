CREATE TABLE `settlements` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `settlement_no` VARCHAR(64) NOT NULL,
  `settlement_scope` VARCHAR(64) NOT NULL,
  `user_id` BIGINT NULL,
  `status` ENUM('draft', 'confirmed', 'archived', 'voided') NOT NULL DEFAULT 'draft',
  `period_start` DATETIME(3) NOT NULL,
  `period_end` DATETIME(3) NOT NULL,
  `paid_order_count` INTEGER NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `cost_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `agent_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `platform_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `withdrawal_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `snapshot_json` JSON NOT NULL,
  `remark` VARCHAR(255) NULL,
  `confirmed_at` DATETIME(3) NULL,
  `voided_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `settlements_settlement_no_key`(`settlement_no`),
  UNIQUE INDEX `settlements_settlement_scope_period_start_period_end_status_key`(
    `settlement_scope`,
    `period_start`,
    `period_end`,
    `status`
  ),
  INDEX `settlements_status_idx`(`status`),
  INDEX `settlements_period_start_period_end_idx`(`period_start`, `period_end`),
  INDEX `settlements_user_id_idx`(`user_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `settlements`
  ADD CONSTRAINT `settlements_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
