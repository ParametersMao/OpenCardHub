# OpenCardHub Product Requirements

## 1. Product Goal

OpenCardHub is a configurable multi-tenant virtual goods distribution system.

The platform owner operates a main site, manages product supply and card inventory, configures agent levels and privileges, and allows qualified agents to create their own storefronts. Agent storefronts reuse the main-site supply while keeping configurable prices, templates, domains, announcements, customer service details, and display rules.

## 2. Core Roles

### Platform Administrator

The platform administrator owns the main site and controls the whole system.

Responsibilities:

- Manage products, categories, and card inventory.
- Configure V0, V1, and V2 level privileges.
- Configure wholesale prices, discounts, and minimum price rules.
- Manage agents and storefronts.
- Manage domains, templates, payments, notifications, and delivery rules.
- View all orders, profits, logs, and risk events.

### V0 Normal User

V0 is a normal buyer.

Default abilities:

- Register and login, if registration is enabled.
- Buy products from the main site or agent storefronts.
- Query own orders.

Default restrictions:

- Cannot use wholesale pricing.
- Cannot create storefronts.
- Cannot configure products, domains, templates, or payment settings.

Configurable abilities:

- Whether registration is allowed.
- Whether order history is visible.
- Whether upgrade application is allowed.

### V1 First-Level Agent

V1 is an agent level focused on wholesale pricing.

Core ability:

- Can use wholesale discount prices configured by the platform administrator.

Configurable abilities:

- Unified wholesale discount.
- Category-level wholesale discount.
- Product-level wholesale price.
- Whether storefront creation is allowed.
- Maximum storefront count.
- Whether system subdomains are allowed.
- Whether custom domains are allowed.
- Maximum domain count.
- Whether product sale price can be customized.
- Whether product name and description can be customized.
- Whether templates can be customized.
- Whether profit statistics are visible.
- Whether API access is allowed.

### V2 Second-Level Agent

V2 is the advanced agent level.

Expected default abilities:

- Better wholesale price than V1.
- Storefront creation.
- Multiple storefronts.
- Custom domain binding.
- Premium templates.
- Advanced pricing rules.
- Storefront decoration.
- Profit statistics.
- Advanced notification channels.
- API access.

Important rule:

V2 privileges are not hard-coded. V2 receives a stronger default capability set, but every privilege and limit must remain configurable by the platform administrator.

## 3. Main Site Features

### Product Management

The platform administrator can manage:

- Categories.
- Products.
- Product cover images.
- Product descriptions.
- Purchase notes.
- After-sales notes.
- Product type.
- Cost price.
- Main-site sale price.
- Wholesale price.
- Minimum sale price.
- Stock status.
- Display status.
- Whether agents can sell the product.
- Whether agents can customize price, name, cover, and description.

Initial product type:

- Card/code product.

Reserved product types:

- Account product.
- Link product.
- Manual delivery product.
- API delivery product.

### Card Inventory

Card inventory must be managed separately from products.

Card statuses:

- `unused`: available.
- `locked`: reserved by an unpaid or processing order.
- `sold`: delivered.
- `invalid`: disabled.

Required behavior:

- Card import.
- Card status tracking.
- Inventory count.
- Transaction-safe locking during order creation.
- Idempotent delivery after payment success.

### Order Management

The platform must support:

- Main-site orders.
- Agent storefront orders.
- Payment status.
- Delivery status.
- Order status.
- Agent profit.
- Platform profit.
- Buyer contact.
- Order query.
- Payment callback logs.
- Delivery logs.

Order statuses:

- `pending`: waiting for payment.
- `paid`: paid.
- `delivering`: delivering.
- `completed`: completed.
- `cancelled`: cancelled.
- `refunded`: refunded.
- `failed`: failed.

## 4. Agent Storefront Features

### Storefront Creation

Qualified agents can create storefronts if their configured capabilities allow it.

Creation flow:

1. Agent logs in.
2. System checks `site.create` capability.
3. System checks storefront count limit.
4. Agent enters storefront name.
5. Agent selects template.
6. Agent selects system subdomain or custom domain if allowed.
7. System creates site record.
8. System initializes default settings.
9. System initializes product display rules.
10. Storefront becomes accessible when domain status is active.

### Storefront Configuration

Each storefront can configure:

- Site name.
- Logo.
- Favicon.
- SEO title.
- SEO keywords.
- SEO description.
- Announcement.
- Popup notice.
- Customer service QQ.
- Customer service WeChat.
- Customer service link.
- Working hours.
- Theme template.
- Theme color.
- Banner.
- Homepage layout.
- Product list layout.
- Product detail layout.
- Whether to show stock.
- Whether to show sales count.
- Whether to show original price.
- Whether order query is enabled.

### Storefront Product Overrides

Storefronts use product inheritance plus overrides.

Base data comes from the main-site product.

Storefront override data may include:

- Custom product name.
- Custom cover.
- Custom description.
- Custom purchase notes.
- Custom after-sales notes.
- Custom sale price.
- Custom crossed-out price.
- Visibility.
- Sort order.
- Homepage recommendation.
- Purchase limit.
- Minimum purchase quantity.
- Whether stock is hidden.
- Whether sales count is hidden.

## 5. Domain Features

Domain types:

- `main`: main-site domain.
- `system_sub`: system subdomain.
- `custom`: custom domain.

System subdomain example:

```text
agent001.example.com
```

The platform should support wildcard DNS:

```text
*.example.com -> server IP
```

Custom domain binding should support:

- Domain submission.
- DNS verification.
- Status checking.
- Main domain selection.
- Multiple domains per storefront, if allowed.

Commercial version may add:

- Automatic SSL.
- Automatic renewal.
- Advanced DNS diagnostics.

## 6. Pricing Requirements

OpenCardHub needs both wholesale pricing and storefront sale pricing.

Price layers:

- Cost price.
- Platform default wholesale price.
- Level wholesale discount.
- Category wholesale discount.
- Product-level wholesale price.
- Main-site sale price.
- Storefront sale price.
- Minimum sale price.

Wholesale price priority:

```text
Product-level wholesale price for level
> Category-level wholesale discount for level
> Level unified wholesale discount
> Platform default wholesale price
```

Storefront sale price priority:

```text
Product forbids custom price -> platform controlled price
Storefront product custom price
> Storefront pricing rule
> Main-site sale price
```

Final validation:

- Sale price cannot be lower than minimum sale price.
- Wholesale price cannot be lower than cost price unless explicitly allowed by administrator.
- Agent profit and platform profit must be calculated from final resolved prices.

## 7. Configuration Center

Configurability is a first-class product requirement.

The configuration model should support:

- Inheritance.
- Override.
- Limit enforcement.
- Scope-based resolution.

Configuration scopes:

- System default.
- Global platform.
- Edition.
- Agent level.
- User.
- Storefront.
- Product.
- Runtime context.

Configuration priority:

```text
System default
< Global platform
< Edition
< Agent level
< User
< Storefront
< Product
< Runtime context
```

Preference configurations are overridden by more specific scopes.

Limit configurations use the stricter value.

Core services:

- `ConfigResolver`.
- `FeatureGate`.
- `CapabilityChecker`.
- `PricingEngine`.
- `DomainResolver`.
- `DeliveryEngine`.
- `NotificationDispatcher`.

## 8. Payment Requirements

First payment provider:

- Alipay.

Payment modes:

- Platform unified collection first.
- Agent independent collection reserved for commercial version.

Required payment behavior:

- Payment order creation.
- Callback signature verification.
- Payment amount verification.
- Idempotent callback handling.
- Order delivery after successful payment.
- Callback log storage.

## 9. Delivery Requirements

Initial delivery method:

- Automatic card delivery.

Reserved delivery methods:

- Manual delivery.
- API delivery.
- Link delivery.
- Account delivery.
- Custom text delivery.

Delivery must be idempotent. A repeated payment callback must not deliver the same order twice.

## 10. Open Source And Commercial Product Shape

Community edition should be usable and complete enough to attract users.

Commercial value should come from automation, scale, advanced configuration, premium templates, commercial plugins, and hosted services.

Details are defined in [COMMERCIAL.md](COMMERCIAL.md).
