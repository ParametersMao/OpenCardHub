-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(64) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `mobile` VARCHAR(32) NULL,
    `email` VARCHAR(128) NULL,
    `level_code` ENUM('V0', 'V1', 'V2') NOT NULL DEFAULT 'V0',
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `parent_id` BIGINT NULL,
    `balance` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_mobile_key`(`mobile`),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agent_levels` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` ENUM('V0', 'V1', 'V2') NOT NULL,
    `name` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `agent_levels_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_capabilities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `level_id` BIGINT NOT NULL,
    `capability_key` VARCHAR(96) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `limit_value` INTEGER NULL,
    `config_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `level_capabilities_level_id_capability_key_key`(`level_id`, `capability_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_capabilities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `capability_key` VARCHAR(96) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `limit_value` INTEGER NULL,
    `config_json` JSON NULL,
    `expired_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_capabilities_user_id_capability_key_key`(`user_id`, `capability_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scope_type` VARCHAR(32) NOT NULL,
    `scope_id` BIGINT NULL,
    `group` VARCHAR(64) NOT NULL,
    `key` VARCHAR(96) NOT NULL,
    `value_json` JSON NOT NULL,
    `type` VARCHAR(32) NOT NULL DEFAULT 'json',
    `is_public` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_scope_type_scope_id_group_key_key`(`scope_type`, `scope_id`, `group`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_flags` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(96) NOT NULL,
    `name` VARCHAR(96) NOT NULL,
    `description` VARCHAR(255) NULL,
    `default_enabled` BOOLEAN NOT NULL DEFAULT false,
    `edition` VARCHAR(32) NOT NULL DEFAULT 'community',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feature_flags_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `owner_user_id` BIGINT NOT NULL,
    `name` VARCHAR(96) NOT NULL,
    `logo` VARCHAR(512) NULL,
    `status` ENUM('pending', 'active', 'suspended', 'expired', 'banned') NOT NULL DEFAULT 'pending',
    `template_id` BIGINT NULL,
    `theme_config_json` JSON NULL,
    `seo_title` VARCHAR(128) NULL,
    `seo_keywords` VARCHAR(255) NULL,
    `seo_description` VARCHAR(255) NULL,
    `notice` TEXT NULL,
    `customer_service_json` JSON NULL,
    `expired_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sites_owner_user_id_idx`(`owner_user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `domains` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NULL,
    `domain` VARCHAR(255) NOT NULL,
    `type` ENUM('main', 'system_sub', 'custom') NOT NULL,
    `status` ENUM('pending', 'verified', 'active', 'failed', 'disabled') NOT NULL DEFAULT 'pending',
    `verify_token` VARCHAR(128) NULL,
    `ssl_status` VARCHAR(32) NULL,
    `ssl_expired_at` DATETIME(3) NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `domains_domain_key`(`domain`),
    INDEX `domains_site_id_idx`(`site_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `parent_id` BIGINT NULL,
    `name` VARCHAR(96) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('draft', 'active', 'hidden', 'disabled') NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `category_id` BIGINT NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `cover` VARCHAR(512) NULL,
    `description` TEXT NULL,
    `product_type` ENUM('card', 'account', 'link', 'manual', 'api') NOT NULL DEFAULT 'card',
    `cost_price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `default_wholesale_price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `sale_price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `min_sale_price` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `stock_count` INTEGER NOT NULL DEFAULT 0,
    `allow_site_sale` BOOLEAN NOT NULL DEFAULT true,
    `allow_agent_edit_price` BOOLEAN NOT NULL DEFAULT false,
    `allow_agent_edit_name` BOOLEAN NOT NULL DEFAULT false,
    `allow_agent_edit_description` BOOLEAN NOT NULL DEFAULT false,
    `status` ENUM('draft', 'active', 'hidden', 'disabled') NOT NULL DEFAULT 'draft',
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `products_category_id_idx`(`category_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_cards` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `product_id` BIGINT NOT NULL,
    `card_content` TEXT NOT NULL,
    `status` ENUM('unused', 'locked', 'sold', 'invalid') NOT NULL DEFAULT 'unused',
    `locked_order_id` BIGINT NULL,
    `sold_order_id` BIGINT NULL,
    `locked_at` DATETIME(3) NULL,
    `sold_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `product_cards_product_id_status_idx`(`product_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_products` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `site_id` BIGINT NOT NULL,
    `product_id` BIGINT NOT NULL,
    `custom_name` VARCHAR(128) NULL,
    `custom_description` TEXT NULL,
    `custom_cover` VARCHAR(512) NULL,
    `custom_price` DECIMAL(12, 2) NULL,
    `is_visible` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_products_site_id_product_id_key`(`site_id`, `product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_rules` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `scope_type` VARCHAR(32) NOT NULL,
    `scope_id` BIGINT NULL,
    `rule_type` VARCHAR(64) NOT NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `conditions_json` JSON NULL,
    `actions_json` JSON NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pricing_rules_scope_type_scope_id_priority_idx`(`scope_type`, `scope_id`, `priority`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_no` VARCHAR(64) NOT NULL,
    `site_id` BIGINT NULL,
    `agent_user_id` BIGINT NULL,
    `buyer_contact` VARCHAR(128) NULL,
    `product_id` BIGINT NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unit_price` DECIMAL(12, 2) NOT NULL,
    `total_amount` DECIMAL(12, 2) NOT NULL,
    `cost_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `agent_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `platform_profit` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `payment_method` VARCHAR(64) NULL,
    `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `delivery_status` ENUM('pending', 'delivering', 'delivered', 'failed') NOT NULL DEFAULT 'pending',
    `order_status` ENUM('pending', 'paid', 'delivering', 'completed', 'cancelled', 'refunded', 'failed') NOT NULL DEFAULT 'pending',
    `client_ip` VARCHAR(64) NULL,
    `paid_at` DATETIME(3) NULL,
    `delivered_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `orders_order_no_key`(`order_no`),
    INDEX `orders_site_id_idx`(`site_id`),
    INDEX `orders_agent_user_id_idx`(`agent_user_id`),
    INDEX `orders_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_cards` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `product_card_id` BIGINT NOT NULL,
    `card_content_snapshot` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `order_cards_order_id_product_card_id_key`(`order_id`, `product_card_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `order_id` BIGINT NOT NULL,
    `payment_no` VARCHAR(96) NOT NULL,
    `provider` VARCHAR(64) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
    `raw_notify_json` JSON NULL,
    `paid_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_payment_no_key`(`payment_no`),
    INDEX `payments_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `templates` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(96) NOT NULL,
    `key` VARCHAR(96) NOT NULL,
    `preview_image` VARCHAR(512) NULL,
    `config_schema_json` JSON NULL,
    `default_config_json` JSON NULL,
    `is_premium` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `templates_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_templates` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `event_key` VARCHAR(96) NOT NULL,
    `channel` VARCHAR(64) NOT NULL,
    `title_template` VARCHAR(255) NOT NULL,
    `content_template` TEXT NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `notification_templates_event_key_channel_key`(`event_key`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `operation_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NULL,
    `action` VARCHAR(96) NOT NULL,
    `target_type` VARCHAR(64) NULL,
    `target_id` BIGINT NULL,
    `ip` VARCHAR(64) NULL,
    `detail_json` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `operation_logs_user_id_idx`(`user_id`),
    INDEX `operation_logs_target_type_target_id_idx`(`target_type`, `target_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_capabilities` ADD CONSTRAINT `level_capabilities_level_id_fkey` FOREIGN KEY (`level_id`) REFERENCES `agent_levels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_capabilities` ADD CONSTRAINT `user_capabilities_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sites` ADD CONSTRAINT `sites_owner_user_id_fkey` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sites` ADD CONSTRAINT `sites_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `domains` ADD CONSTRAINT `domains_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_cards` ADD CONSTRAINT `product_cards_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_products` ADD CONSTRAINT `site_products_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_products` ADD CONSTRAINT `site_products_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_agent_user_id_fkey` FOREIGN KEY (`agent_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_cards` ADD CONSTRAINT `order_cards_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_cards` ADD CONSTRAINT `order_cards_product_card_id_fkey` FOREIGN KEY (`product_card_id`) REFERENCES `product_cards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

