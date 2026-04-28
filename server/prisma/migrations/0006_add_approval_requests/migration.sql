CREATE TABLE `approval_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `request_no` VARCHAR(64) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
  `requester_id` BIGINT NULL,
  `reviewer_id` BIGINT NULL,
  `target_type` VARCHAR(64) NULL,
  `target_id` BIGINT NULL,
  `action` VARCHAR(96) NOT NULL,
  `payload_json` JSON NOT NULL,
  `result_json` JSON NULL,
  `remark` VARCHAR(255) NULL,
  `review_remark` VARCHAR(255) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `reviewed_at` DATETIME(3) NULL,
  `applied_at` DATETIME(3) NULL,

  UNIQUE INDEX `approval_requests_request_no_key`(`request_no`),
  INDEX `approval_requests_status_idx`(`status`),
  INDEX `approval_requests_type_idx`(`type`),
  INDEX `approval_requests_requester_id_idx`(`requester_id`),
  INDEX `approval_requests_reviewer_id_idx`(`reviewer_id`),
  INDEX `approval_requests_target_type_target_id_idx`(`target_type`, `target_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `approval_requests`
  ADD CONSTRAINT `approval_requests_requester_id_fkey`
  FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `approval_requests`
  ADD CONSTRAINT `approval_requests_reviewer_id_fkey`
  FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
