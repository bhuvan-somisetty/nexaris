<div align="center">

# NEXARIS

### A multi-vendor marketplace built like a real commerce platform

Customers shop from many sellers in one cart. Sellers run their own storefronts and fulfil their own items.
Admins approve sellers, moderate the catalog and issue refunds. Behind it is a **NestJS API with 122 endpoints,
57 data models, Redis-backed queues, Razorpay payments and production monitoring**.

[![Live](https://img.shields.io/badge/live-nexaris--shopping.vercel.app-8b5cf6?style=for-the-badge&logo=vercel&logoColor=white)](https://nexaris-shopping.vercel.app/)
[![API](https://img.shields.io/badge/API-Railway-0b0d0e?style=for-the-badge&logo=railway&logoColor=white)](#-architecture)
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088ff?style=for-the-badge&logo=githubactions&logoColor=white)](.github/workflows/deploy.yml)

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232a?style=flat-square&logo=react&logoColor=61dafb)
![NestJS](https://img.shields.io/badge/NestJS_11-e0234e?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_6-2d3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169e1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-ff4438?style=flat-square&logo=redis&logoColor=white)
![Razorpay](https://img.shields.io/badge/Razorpay-0c2451?style=flat-square&logo=razorpay&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-362d59?style=flat-square&logo=sentry&logoColor=white)

**[Open the store](https://nexaris-shopping.vercel.app/)** · [Features](#-what-it-does) · [Architecture](#-architecture) · [Tech stack](#-tech-stack) · [Run locally](#-run-it-locally) · [Docs](docs/)

<br />

<img src="docs/assets/screenshot.png" alt="Nexaris storefront: Top tech, unreal prices hero with search and category navigation" width="100%" />

</div>

<br />

## ✦ Why Nexaris

Most student "e-commerce projects" stop at a product grid and a cart. Real marketplaces have much harder problems:

- **Many sellers, one checkout.** One order holds items from several stores, and each seller may only see and ship *their* items.
- **Stock you can't oversell.** Two people buying the last phone at the same second must not both succeed.
- **Payments fail.** A failed or abandoned payment must give the stock back.
- **History must not change.** If a seller edits a price tomorrow, yesterday's receipt must stay the same.

Nexaris is built around these problems, end to end.

## ✦ At a glance

<div align="center">

| **122** | **57** | **24** | **3** | **58** | **10** |
| :---: | :---: | :---: | :---: | :---: | :---: |
| REST endpoints | Prisma models | NestJS modules | roles with RBAC | automated tests | database migrations |

</div>

## ✦ What it does

<table>
<tr>
<td width="33%" valign="top">

### 🛍️ Customers
- Search with facets for category, brand, price and rating
- Product variants (size, colour) with their own prices
- Persistent cart and wishlist
- Multi-seller checkout and Razorpay payment
- Order timeline and shipment tracking
- Reviews, votes and reports
- Coupons, referrals and loyalty points
- Personal recommendations

</td>
<td width="33%" valign="top">

### 🏪 Sellers
- Own storefront and seller profile
- Product, variant and inventory management
- Image uploads to Cloudinary
- **Split fulfilment**: see and ship only your own items
- Shipments, labels and returns
- Seller ratings and product analytics

</td>
<td width="33%" valign="top">

### 🛡️ Admins
- Approve sellers and moderate the catalog
- Issue refunds
- Campaigns, coupons and user segments
- Notification templates and delivery logs
- Audit log of sensitive actions
- Metrics and error monitoring

</td>
</tr>
</table>

### The hard parts, solved

| Problem | How Nexaris handles it |
| :--- | :--- |
| **Overselling** | Double-entry inventory: checkout *reserves* stock for 15 minutes (`reserved += qty`), payment success *deducts* it, failure or cancel *releases* it |
| **Changing prices** | Order items **snapshot** name, slug, price, image and variant SKU, so receipts never change |
| **Multi-seller orders** | Each seller sees and moves only their own items through `SHIPPED → DELIVERED` |
| **Sessions** | 15-minute JWT access tokens in memory, database-backed refresh tokens **rotated on every use**, instant revoke on logout |
| **Payment vendor lock-in** | An `IPaymentProvider` interface. Mock and **Razorpay** providers swap with one env variable |
| **Slow work in requests** | Notifications and heavy jobs go to **BullMQ queues on Redis**, and domain events decouple modules |
| **Abuse** | Rate limiting (`@nestjs/throttler`), Helmet headers, DTO validation with `class-validator` |
| **Knowing when it breaks** | **Sentry** on frontend and backend, **Prometheus** metrics, structured **Pino** logs, a health endpoint |

### Role matrix

| Action | Customer | Seller | Admin |
| :--- | :---: | :---: | :---: |
| Browse and search | ✅ | ✅ | ✅ |
| Cart, wishlist, checkout, pay | ✅ | | |
| Manage store, products, inventory | | ✅ | |
| Fulfil own order items | | ✅ | |
| Approve sellers, moderate catalog | | | ✅ |
| Issue refunds | | | ✅ |

Enforced on the server by `JwtAuthGuard` + `RolesGuard`, with ownership checks on seller routes.

## ✦ Tech Stack

<img src="docs/assets/tech-stack.svg" alt="Nexaris tech stack: Next.js 15, React 19, TypeScript, Tailwind CSS 4, Lucide, Axios, NestJS 11, Prisma 6, Passport, Swagger, class-validator, Pino, PostgreSQL on Neon, Redis, BullMQ, Cloudinary, Razorpay, Sentry, Prometheus, Jest, Supertest, ESLint, Prettier, Vercel, Railway, Docker and GitHub Actions" width="100%" />

| Layer | Technology |
| :--- | :--- |
| **Storefront** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Lucide icons, Axios, Sentry |
| **API** | NestJS 11, Prisma 6, Passport JWT, Swagger / OpenAPI, class-validator, Pino logging, `@nestjs/schedule`, event emitter |
| **Data and jobs** | PostgreSQL (Neon in production), Redis via ioredis, BullMQ queues, Cloudinary images |
| **Payments and ops** | Razorpay, Sentry, Prometheus (`prom-client`), Helmet, throttler, compression |
| **Quality** | Jest 30, Supertest, ESLint 9, Prettier |
| **Delivery** | Storefront on **Vercel**, API on **Railway**, Docker, GitHub Actions CI/CD with automatic migrations |

## ✦ Architecture

```mermaid
flowchart LR
    U[Shoppers · sellers · admins] --> FE[Next.js 15 storefront<br/>Vercel]
    FE -- "REST /api · JWT" --> API
    subgraph API["NestJS 11 API · Railway"]
        direction TB
        G[Guards: JWT · Roles · Throttler] --> MODS
        MODS[auth · users · products · categories · inventory<br/>cart · wishlist · orders · payments · shipping<br/>reviews · seller-ratings · promotions · search<br/>recommendations · notifications · analytics · upload]
    end
    API --> PG[(PostgreSQL · Neon<br/>57 Prisma models)]
    API --> R[(Redis)]
    R --> Q[BullMQ workers<br/>notifications · jobs]
    API --> CL[Cloudinary]
    API --> RZ[Razorpay]
    API --> OBS[Sentry · Prometheus · Pino]
    GH[GitHub Actions] -- "lint · build · migrate" --> API
```

### Checkout flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant API as NestJS API
    participant DB as PostgreSQL
    participant RZ as Razorpay
    C->>API: POST /api/checkout
    API->>DB: validate cart, reserve stock (15 min), snapshot items
    API->>RZ: create payment order
    RZ-->>C: payment sheet
    C->>RZ: pay
    RZ-->>API: payment result
    alt success
        API->>DB: deduct stock, order PAID, timeline event
        API-->>C: order confirmed (notification queued)
    else failed or timed out
        API->>DB: release reservation, order FAILED
    end
```

## ✦ Run it locally

**Prerequisites:** Node.js 18+, Docker Desktop, Git.

```bash
git clone https://github.com/bhuvan-somisetty/nexaris.git
cd nexaris
docker compose up -d            # PostgreSQL 15
npm install                     # npm workspaces: backend + frontend
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexaris?schema=public"
JWT_SECRET="change-me"
JWT_REFRESH_SECRET="change-me-too"
PORT=3001
```

```bash
npm run db:migrate              # apply all migrations
npm run db:seed -w backend      # demo products, categories and users
npm run dev:backend             # API      → http://localhost:3001/api
npm run dev:frontend            # store    → http://localhost:3000
```

API docs (Swagger) are at **http://localhost:3001/api/docs**.

**Seeded demo accounts** (local only, password `password123`): `admin@nexaris.com` · `seller@nexaris.com` · `customer@nexaris.com`

| Command | What it does |
| :--- | :--- |
| `npm run build:backend` / `build:frontend` | Production builds |
| `npm test -w backend` | Jest unit and e2e tests |
| `npm run db:studio` | Prisma Studio |

## ✦ Project structure

```text
nexaris/
├── backend/                 # NestJS 11 API
│   ├── prisma/              # schema (57 models), migrations, seed
│   └── src/                 # auth, products, cart, orders, payments, shipping, search,
│                            # recommendations, promotions, notifications, queue, redis, metrics…
├── frontend/                # Next.js 15 storefront
│   └── src/app/             # products, cart, checkout, payment, orders, seller, admin, profile…
├── docs/                    # architecture, ADRs, runbooks, env reference, product overview
├── docker-compose.yml
└── .github/workflows/       # CI/CD: lint, build, deploy migrations
```

## ✦ Documentation

| Doc | What's inside |
| :--- | :--- |
| [Product overview](docs/product-overview.md) | Full feature list, schema and API reference |
| [Architecture guide](docs/architecture-guide.md) | Module boundaries and data flow |
| [Architectural decisions](docs/architectural-decisions.md) | Why each major choice was made |
| [Production runbook](docs/production-runbook.md) · [Deployment](docs/deployment_runbook.md) | Deploying and operating it |
| [Incident recovery](docs/incident_recovery.md) | What to do when something breaks |
| [Environment variables](docs/environment_variables.md) | Every setting explained |

## ✦ Roadmap

- [x] Auth with rotating refresh tokens and RBAC
- [x] Catalog with nested categories and variants
- [x] Cart, wishlist, checkout and inventory reservations
- [x] Payment abstraction with Razorpay
- [x] Reviews and seller ratings
- [x] Notifications on BullMQ
- [x] Product analytics and indexes
- [x] Promotions: coupons, campaigns, referrals and loyalty
- [x] Recommendations
- [x] Shipping, tracking and returns
- [x] Faceted search with synonyms and click logs
- [ ] Seller payouts
- [ ] Mobile app

## ✦ Author

**Bhuvan Somisetty** · [GitHub @bhuvan-somisetty](https://github.com/bhuvan-somisetty)

<div align="center">

If you like Nexaris, give it a ⭐

</div>
