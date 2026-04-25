# OpenCardHub Technical Architecture

## 1. Recommended Stack

Backend:

- Node.js 22 LTS.
- NestJS.
- TypeScript.
- MySQL 8.
- Redis.
- BullMQ.

Admin frontend:

- Vue 3.
- TypeScript.
- Vite.
- Pinia.
- Vue Router.
- Naive UI or Element Plus.

Storefront frontend:

- Nuxt 3 or Vue 3.

Deployment:

- Nginx.
- Docker Compose.
- MySQL.
- Redis.
- Node process manager.

## 2. Application Modules

Backend modules:

- `AuthModule`: login, token, session, password.
- `UserModule`: V0, V1, V2 users and profile data.
- `LevelModule`: level definitions and level capability templates.
- `CapabilityModule`: capability checking and limits.
- `ConfigModule`: scoped settings and config resolution.
- `SiteModule`: storefront lifecycle and settings.
- `DomainModule`: host resolution, system subdomains, custom domains.
- `ProductModule`: categories, products, storefront product overrides.
- `InventoryModule`: card inventory import, lock, sale, invalidation.
- `PricingModule`: wholesale price and sale price calculation.
- `OrderModule`: order creation, order query, order lifecycle.
- `PaymentModule`: Alipay first, provider interface reserved.
- `DeliveryModule`: automatic card delivery first.
- `TemplateModule`: storefront templates and schema-driven config.
- `NotificationModule`: event notifications and message templates.
- `PluginModule`: commercial plugin extension points.
- `AuditModule`: operation logs and security logs.

## 3. Multi-Tenant Resolution

OpenCardHub uses a single application and a single database.

Every storefront is a tenant represented by `sites.id`.

Request flow:

1. Read `Host` from request headers.
2. Query `domains` by host.
3. Resolve `site_id`.
4. Load site settings and capabilities.
5. Load storefront template and product display rules.
6. Render storefront or handle API request under that tenant context.

Main-site requests can use a dedicated main-site tenant or a reserved platform context.

## 4. Configuration Model

Configuration must support scoped resolution.

Suggested tables:

```text
settings
- id
- scope_type
- scope_id
- group
- key
- value_json
- type
- is_public
- created_at
- updated_at
```

```text
feature_flags
- id
- key
- name
- description
- default_enabled
- edition
- created_at
```

```text
level_capabilities
- id
- level_id
- capability_key
- enabled
- limit_value
- config_json
```

```text
user_capabilities
- id
- user_id
- capability_key
- enabled
- limit_value
- expired_at
```

Core resolution rule:

```text
Default config
< Global config
< Edition config
< Level config
< User config
< Site config
< Product config
< Runtime context
```

Preference settings use the most specific value.

Limit settings use the strictest value unless an explicit administrator override exists.

## 5. Capability Keys

Initial capability keys:

```text
purchase.goods
agent.discount
site.create
site.max_count
domain.system_sub
domain.custom
domain.max_count
product.custom_price
product.custom_name
product.custom_description
template.basic
template.premium
pricing.advanced
stats.profit
api.access
payment.own_provider
```

V0, V1, and V2 should be stored as level templates, not hard-coded authorization branches.

## 6. Pricing Engine

`PricingEngine` should resolve two different values:

- Wholesale price for the current user level.
- Sale price for the current storefront and buyer context.

Wholesale price priority:

```text
Product-level level price
> Category-level level discount
> Level unified discount
> Product default wholesale price
```

Sale price priority:

```text
Platform locked price
> Storefront product override price
> Storefront pricing rule
> Main-site sale price
```

Validation:

- Enforce cost price lower bound.
- Enforce minimum sale price.
- Enforce feature and capability limits.
- Return trace data for debugging and admin explanation.

## 7. Inventory And Order Safety

Card delivery must be transaction-safe.

Order creation should:

1. Create pending order.
2. Lock required card inventory using transaction and row lock.
3. Create payment request.

Payment callback should:

1. Verify signature.
2. Verify amount.
3. Check callback idempotency.
4. Mark order as paid.
5. Deliver locked cards once.
6. Mark order as completed.
7. Store delivered card snapshots.

Repeated callbacks must not duplicate delivery.

## 8. Payment Provider Interface

The payment module should use a provider interface.

Initial provider:

- Alipay.

Reserved providers:

- WeChat Pay.
- EPay.
- Balance.
- Other plugin-based providers.

Suggested interface:

```ts
interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyCallback(input: PaymentCallbackInput): Promise<VerifiedPaymentResult>;
  queryPayment(input: QueryPaymentInput): Promise<QueryPaymentResult>;
}
```

## 9. Template Schema

Templates should declare their own configurable fields.

Suggested schema storage:

```text
theme_schemas
- id
- template_id
- schema_json
- default_config_json
```

Admin UI can render settings forms from the schema.

Example schema field:

```json
{
  "primary_color": {
    "type": "color",
    "label": "Theme color",
    "default": "#1677ff"
  }
}
```

## 10. Plugin Architecture

Commercial plugins should extend the system without modifying open-source core code.

Plugin categories:

- Payment provider.
- Notification channel.
- Domain and SSL automation.
- Premium templates.
- Advanced pricing rules.
- API supply integration.
- Advanced analytics.
- Risk control.

The open-source core should expose stable extension interfaces.

Commercial plugins can remain closed-source and use license checks at plugin level.

## 11. Initial Database Tables

Core tables:

- `users`
- `agent_levels`
- `level_capabilities`
- `user_capabilities`
- `settings`
- `feature_flags`
- `sites`
- `domains`
- `categories`
- `products`
- `product_cards`
- `site_products`
- `pricing_rules`
- `orders`
- `order_cards`
- `payments`
- `templates`
- `theme_schemas`
- `notification_templates`
- `operation_logs`

Detailed SQL migrations will be created during implementation.
