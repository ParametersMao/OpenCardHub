# OpenCardHub Roadmap

## Phase 0: Planning And Repository Setup

Goal:

- Establish product direction, architecture, and documentation.

Deliverables:

- Project README.
- Product requirements document.
- Technical architecture document.
- Open-source and commercial boundary document.
- Initial roadmap.
- Local Git repository.

## Phase 1: Configurable MVP

Goal:

- Build a working main-site supply and order flow with configurable V0/V1/V2 levels.

Features:

- Admin login.
- User management.
- V0/V1/V2 level management.
- Capability configuration.
- Product category management.
- Product management.
- Card inventory import.
- Alipay payment.
- Order creation.
- Payment callback.
- Automatic card delivery.
- Order query.
- Operation logs.

Key technical services:

- `ConfigResolver`.
- `FeatureGate`.
- `CapabilityChecker`.
- `PricingEngine`.

## Phase 2: Agent Storefront MVP

Goal:

- Allow configured agents to create and manage storefronts.

Features:

- Storefront creation.
- Storefront settings.
- System subdomain support.
- Host-based tenant resolution.
- Storefront product list.
- Storefront product overrides.
- Storefront sale price calculation.
- Storefront order attribution.
- Agent profit statistics.

## Phase 3: Open Source Release

Goal:

- Make the community edition installable and usable.

Features:

- Docker Compose deployment.
- Install wizard.
- Environment configuration examples.
- Basic template.
- Basic payment configuration.
- Basic documentation.
- Backup and restore guide.
- Security checklist.

## Phase 4: Commercial Plugin Foundation

Goal:

- Build paid extension capability without weakening the open-source core.

Features:

- Plugin registry.
- Plugin lifecycle.
- Plugin settings.
- Plugin-level license check.
- Premium template plugin.
- Advanced pricing plugin.
- Custom domain plugin.
- Auto SSL plugin.

## Phase 5: Advanced Platform Features

Goal:

- Turn OpenCardHub into a larger distribution platform.

Features:

- Custom domain binding.
- Automatic SSL.
- Advanced storefront decoration.
- Advanced notification channels.
- API supply integration.
- Multi-supplier support.
- Agent independent payment.
- Webhooks.
- Risk control rules.
- Advanced analytics.

## Initial Milestone Order

Recommended implementation order:

1. Backend project scaffold.
2. Admin frontend scaffold.
3. Database schema and migrations.
4. Auth and user levels.
5. Capability configuration.
6. Product and inventory.
7. Pricing engine.
8. Orders and Alipay.
9. Automatic delivery.
10. Storefront and domain resolution.
11. Docker deployment.
12. Open-source release documentation.
