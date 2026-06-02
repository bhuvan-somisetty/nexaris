# Nexaris — Enterprise Marketplace Platform

Nexaris is a production-grade, highly scalable B2C/B2B marketplace. It is built as a resilient, observable modular monolith utilizing NestJS, Prisma, PostgreSQL, Redis, BullMQ, and Next.js.

---

## Core System Highlights

*   **Robust Multi-Seller Checkout & Shipping Splits**: The platform transactionally manages orders containing items from multiple independent sellers. During checkout, inventory is safely reserved, shipping costs are aggregated, and separate `Shipment` entities with independent carrier tracking AWBs are generated per seller.
*   **Fuzzy Search Engine & Typo Tolerance**: Powered by PostgreSQL Full-Text Search (FTS) and `pg_trgm` similarity fallbacks. A custom ranking formula balances search term similarity, product views/popularity, sales volume, average ratings, and inventory status. Synonym expansions (`mobile` ↔ `smartphone`) and search analytics CTR tracking are fully supported.
*   **Decoupled Async Processing (BullMQ)**: Replaced high-blocking chronometers with Redis-backed job queues. Heavy mathematical operations (pairwise item-similarity calculations, user preference profile updates) and system integrations (third-party delivery status updates, customer notifications) run in low-priority background threads with automatic dead-letter queue (DLQ) containment.
*   **Resilient Fallback Cache**: A custom Redis caching wrapper that falls back to an in-memory TTL map automatically during connectivity loss. Once Redis is restored, connections re-establish seamlessly with zero data loss or application downtime.
*   **Telemetry & Observability**: Integrated structured logging via Pino, Prometheus metric exports (`/api/metrics`), and full Sentry exception tracing. An admin panel (`/admin/observability`) displays CPU/memory graphs, Redis hit/miss rates, and active/failed queue lengths.

---

## Technology Stack

*   **Backend Framework**: NestJS (TypeScript)
*   **Database & ORM**: PostgreSQL, Prisma ORM
*   **Caching & Queues**: Redis, BullMQ
*   **APIs & Documentation**: Swagger / OpenAPI 3.0
*   **Testing**: Jest, Supertest
*   **Frontend**: Next.js 14 (App Router), Tailwind CSS
*   **Observability**: Sentry, Pino, Prometheus, custom dashboards
*   **Containerization**: Docker Compose

---

## Architectural Layout

```
                  ┌───────────────────────┐
                  │   Next.js Frontend    │
                  └──────────┬────────────┘
                             │ HTTPS API
                  ┌──────────▼────────────┐
                  │  NestJS Gateway / API │
                  └────┬──────────────┬───┘
                       │              │
        ┌──────────────▼──────┐ ┌─────▼────────────────┐
        │  Prisma / Postgres  │ │    Redis Cache &     │
        │      (Database)     │ │    BullMQ Queues     │
        └─────────────────────┘ └─────────────┬────────┘
                                              │ Poll Jobs
                                        ┌─────▼────────┐
                                        │  Background  │
                                        │ Queue Workers│
                                        └──────────────┘
```
