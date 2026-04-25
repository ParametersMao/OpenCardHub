# OpenCardHub

OpenCardHub is an open-source and commercial-ready virtual goods distribution platform.

It is designed for source merchants who want to run a main card-selling platform, provide synchronized inventory to agents, and let agents manage their own configurable storefronts.

## Positioning

OpenCardHub is not only a card shop system. It is a configurable multi-tenant distribution platform for virtual goods.

Core ideas:

- Main-site centralized supply.
- Agent-level pricing and privileges.
- One-click agent storefront creation.
- Domain-based tenant resolution.
- Configurable product, pricing, template, payment, delivery, and notification rules.
- Open-source core with commercial plugins and hosted services.

## Confirmed Product Direction

- Project name: `OpenCardHub`
- Backend: `Node.js + NestJS + TypeScript`
- Admin frontend: `Vue 3 + TypeScript`
- Storefront frontend: `Nuxt 3` or `Vue 3`
- Database: `MySQL 8`
- Cache and queue: `Redis + BullMQ`
- First payment provider: `Alipay`
- Member levels: `V0`, `V1`, `V2`
- Business model: open-source core, commercial plugins, optional cloud hosting

## Member Levels

`V0` is a normal buyer.

- Can buy goods.
- Can query orders.
- Cannot use wholesale pricing.
- Cannot create storefronts.

`V1` is a first-level agent.

- Can use admin-configured wholesale discount prices.
- Other privileges are configurable by the main-site administrator.

`V2` is a second-level agent.

- Intended to include all advanced privileges by default.
- All privileges still remain configurable by the main-site administrator.

In OpenCardHub, levels are privilege templates. Real access is resolved from configurable capabilities.

## Documentation

- [Product Requirements](docs/PRD.md)
- [Technical Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Open Source and Commercial Boundary](docs/COMMERCIAL.md)

## Development

Install dependencies:

```bash
npm install
```

Start infrastructure:

```bash
docker compose up -d
```

Prepare database:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Start backend API:

```bash
npm run dev:server
```

Start admin frontend:

```bash
npm run dev:admin
```

Useful checks:

```bash
npm run build
npm run lint
```

Initial local endpoints:

- Backend health: `http://localhost:3000/api/health`
- Admin frontend: `http://localhost:5173`

Initial API surfaces:

- `GET /api/capabilities/keys`
- `GET /api/capabilities/levels`
- `POST /api/capabilities/levels/bootstrap`
- `GET /api/capabilities/levels/persisted`
- `GET /api/config/settings`
- `PUT /api/config/settings`
- `POST /api/config/resolve`
- `GET /api/catalog/categories`
- `POST /api/catalog/categories`
- `GET /api/catalog/products`
- `POST /api/catalog/products`
- `GET /api/catalog/sites/:siteId/products`
- `GET /api/catalog/sites/:siteId/overrides`
- `POST /api/catalog/site-products`
- `POST /api/inventory/cards/import`
- `GET /api/inventory/products/:productId/cards`
- `GET /api/inventory/products/:productId/stock`
- `POST /api/inventory/cards/lock`
- `GET /api/orders`
- `POST /api/orders`
- `POST /api/payments/alipay/orders/:orderId`
- `POST /api/payments/alipay/callback`
- `GET /api/sites`
- `POST /api/sites`
- `POST /api/sites/domains`
- `GET /api/sites/resolve`

MySQL note:

Prisma 6 does not support MySQL users that authenticate with `sha256_password`.
Use `mysql_native_password` or `caching_sha2_password` for the `DATABASE_URL` user.

## Repository Status

This repository is currently in early scaffold stage.

The first implementation milestone is to build a configurable MVP that includes product management, card inventory, Alipay payment, order delivery, V0/V1/V2 levels, and agent storefront creation.
