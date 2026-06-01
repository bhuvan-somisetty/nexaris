# 🌌 Nexaris — Multi-Vendor Commerce Ecosystem

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15.x-black.svg)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11.x-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-blue.svg)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38bdf8.svg)](https://tailwindcss.com/)

Nexaris is a state-of-the-art, enterprise-grade multi-vendor e-commerce platform. Designed as a modular monolith, it offers an end-to-end shopping, checkout, fulfillment, and payment experience. With robust Role-Based Access Control (RBAC), historical order snapshotting, double-entry inventory reservation checks, and provider-agnostic payment processing, Nexaris scales gracefully from single-merchant stores to expansive multi-merchant marketplaces.

---

## 🏗️ Architecture Diagram

Nexaris is structured as an npm workspaces monorepo separating client frontend presentation from business logic controllers and databases.

```mermaid
graph TD
    %% Frontend Clients
    subgraph Client ["Client Portal (Next.js 15 + Tailwind CSS)"]
        FC["Customer Dashboard"]
        FS["Seller Portal"]
        FA["Admin Control Panel"]
    end

    %% API Layer / Backend
    subgraph Server ["Backend API Server (NestJS Framework)"]
        %% Guards
        AuthGuard["JWT Auth Guard"]
        RBACGuard["Roles Guard (RBAC)"]
        
        %% Modules
        subgraph Services ["Modular Core Services"]
            AuthSvc["Auth & Tokens"]
            UserSvc["User & Profile"]
            ProdSvc["Product Catalog"]
            CartSvc["Cart & Wishlist"]
            OrderSvc["Orders & Checkout"]
            InvSvc["Inventory Reserve"]
            PaySvc["Payment Providers (Mock/Razorpay)"]
        end
    end

    %% Database Engine
    subgraph Data ["Database Engine (PostgreSQL)"]
        DB[(PostgreSQL Database)]
        PrismaORM["Prisma Client ORM"]
    end

    %% Connections
    FC & FS & FA -->|REST API Request / Bearer JWT| AuthGuard
    AuthGuard --> RBACGuard
    RBACGuard --> AuthSvc & UserSvc & ProdSvc & CartSvc & OrderSvc & InvSvc & PaySvc
    
    AuthSvc & UserSvc & ProdSvc & CartSvc & OrderSvc & InvSvc & PaySvc <--> PrismaORM
    PrismaORM <--> DB
```

---

## 🛠️ Technology Stack

Nexaris utilizes a unified modern TypeScript ecosystem to ensure type safety and developer productivity across both client and server:

### Frontend
* **Framework**: **Next.js 15** (App Router, Suspense boundaries, Client-side state transitions)
* **Styling**: **Vanilla CSS / CSS Modules** (Tailwind CSS is supported, styling is designed using curated HSL dark/light modes, micro-animations, glassmorphism UI)
* **API Client**: **Axios** with global interceptors handling automatic behind-the-scenes JWT token refreshing and request queuing.
* **Icons**: **Lucide React**

### Backend
* **Framework**: **NestJS** (Modular architecture, custom guards, REST controllers)
* **Database Access**: **Prisma Client ORM**
* **Security & Tokens**: **Passport.js + JWT** (sliding-window refresh token rotation)
* **Fulfillment**: Multi-vendor individual tracking

### Infrastructure
* **Database**: **PostgreSQL 16**
* **Containerization**: **Docker** (for local PostgreSQL instance)
* **Package Manager**: **npm workspaces** (monorepo coordination)

---

## 🛡️ User Roles & Access Matrix

Nexaris employs strict **Role-Based Access Control (RBAC)** to secure operations across three primary user roles:

| Module / Action | Customer | Seller | Admin | Guard Layer |
|:---|:---:|:---:|:---:|:---|
| Browse Products / Shop | ✅ | ✅ | ✅ | Public |
| Add to Cart / Checkout / Pay | ✅ | ❌ | ❌ | `RolesGuard([CUSTOMER])` |
| View Cart / Wishlist | ✅ | ❌ | ❌ | `RolesGuard([CUSTOMER])` |
| Manage Store / Products | ❌ | ✅ | ❌ | `RolesGuard([SELLER])` |
| Update Specific Fulfillment | ❌ | ✅ | ❌ | `RolesGuard([SELLER])` (Ownership Verified) |
| Manage Global Platforms | ❌ | ❌ | ✅ | `RolesGuard([ADMIN])` |
| Approve Sellers / Moderate Catalog | ❌ | ❌ | ✅ | `RolesGuard([ADMIN])` |
| Issue Refunds | ❌ | ❌ | ✅ | `RolesGuard([ADMIN])` |

---

## 🚀 Key Features

* **📦 Sliding-Window Authentication**: 15-minute JWT access tokens kept in memory; database-backed refresh tokens rotated dynamically on access, with instant session revocation on logout.
* **🛍️ Hierarchical Category Catalog**: Unlimited nesting of sub-categories with complete parent-child relational mapping.
* **🎨 Product Variant Matrices**: Flexible option selections (e.g., Size, Color) with variant-level price overrides and SKU generation.
* **🛒 Persistent Shopping Carts**: Active shopping carts saved in database; real-time validation checks for product availability and stock capacities prior to checkout.
* **💳 Double-Entry Inventory Reservations**:
  * On checkout: Inventory is *reserved* (`reserved += qty`), holding stock for 15 minutes.
  * On payment success: Inventory is *deducted* (`quantity -= qty`, `reserved -= qty`).
  * On payment failure or order cancellation: Inventory reservation is automatically *released*.
* **📋 Historical Order Snapshots**: Products are snapshotted (Name, Slug, Price, Image, Variant SKU) directly inside order items to ensure historical receipts remain accurate even if products are edited or deleted.
* **📊 Split Fulfillment Tracking**: Sellers can only view, manage, and transition fulfillment status (SHIPPED, DELIVERED) for items originating from their own store.
* **💰 Flexible Payment Provider Abstraction**: Interfaces business services with an `IPaymentProvider` layer, making swapping between Mock systems and live payment aggregators (e.g., Razorpay) as simple as changing an environment variable.

---

## 📁 Database Schema (Entity-Relationship Overview)

Nexaris manages relational entities using Prisma ORM. Below is an overview of the data models:

```mermaid
erDiagram
    User ||--|| Profile : "has profile"
    User ||--o| SellerProfile : "owns storefront"
    User ||--oN Address : "registers"
    User ||--oN RefreshToken : "authorizes"
    User ||--oN Product : "lists"
    User ||--o| Cart : "fills"
    User ||--o| Wishlist : "saves"
    User ||--oN Order : "places"
    User ||--oN Notification : "receives"
    User ||--oN AuditLog : "triggers"

    Category ||--oN Product : "classifies"
    Product ||--oN ProductImage : "exhibits"
    Product ||--oN ProductVariant : "offers"
    Product ||--oN ProductAttribute : "details"
    Product ||--o| Inventory : "tracks stock"
    ProductVariant ||--o| Inventory : "tracks variant stock"

    Cart ||--oN CartItem : "contains"
    CartItem }|--|| Product : "selects"
    CartItem }|--o| ProductVariant : "specifies"

    Wishlist ||--oN WishlistItem : "contains"
    WishlistItem }|--|| Product : "selects"
    WishlistItem }|--o| ProductVariant : "specifies"

    Order ||--oN OrderItem : "comprises"
    Order ||--|| OrderAddress : "ships to"
    Order ||--oN OrderTimeline : "logs progress"
    Order ||--|| Payment : "settles"

    OrderItem }|--|| Product : "references"
    OrderItem }|--o| ProductVariant : "references variant"

    Payment ||--oN PaymentAttempt : "records log"
    Payment ||--oN Refund : "supports"
```

### Main Database Tables
1. **Users & Profiles**: `User`, `Profile`, `SellerProfile`, `Address`, `RefreshToken`, `AuditLog`.
2. **Product Catalog**: `Category`, `Product`, `ProductImage`, `ProductVariant`, `ProductAttribute`, `Inventory`.
3. **Shopping Experience**: `Cart`, `CartItem`, `Wishlist`, `WishlistItem`.
4. **Orders & Operations**: `Order`, `OrderItem`, `OrderAddress`, `OrderTimeline`.
5. **Payment Ecosystem**: `Payment`, `PaymentAttempt`, `Refund`.

---

## 🔌 API Overview

### 🔐 Authentication (`/api/auth`)
* `POST /api/auth/register` — User registration.
* `POST /api/auth/login` — Sign in and issue JWT + sliding refresh tokens.
* `POST /api/auth/refresh` — Dynamic token rotation.
* `POST /api/auth/logout` — Instant token revocation.
* `GET /api/auth/me` — Retrieve profile info.

### 👤 Users & Profiles (`/api/users`)
* `GET /api/users/profile` — Fetch personal profile.
* `PUT /api/users/profile` — Update details/avatar.
* `GET /api/users/addresses` — List shipping addresses.
* `POST /api/users/addresses` — Add shipping address.
* `DELETE /api/users/addresses/:id` — Delete address.
* `GET /api/users/sellers` *(Admin only)* — View pending seller applications.
* `PATCH /api/users/sellers/:id/status` *(Admin only)* — Approve/reject seller profiles.

### 📦 Product Management (`/api/products`)
* `GET /api/products` — Paginated search, sort, and filters.
* `GET /api/products/:slug` — Detailed view with inventory status.
* `POST /api/products` *(Seller only)* — List a new product draft.
* `PUT /api/products/:id` *(Seller only)* — Edit product details.
* `DELETE /api/products/:id` *(Seller only)* — Delete store product.
* `PATCH /api/products/:id/status` *(Admin only)* — Approve or block catalog products.

### 🛒 Cart & Wishlist (`/api/cart` & `/api/wishlist`)
* `GET /api/cart` — Retrieve user's current shopping cart.
* `POST /api/cart/items` — Add product variant to cart (validates inventory).
* `PATCH /api/cart/items/:id` — Adjust quantities.
* `DELETE /api/cart/items/:id` — Remove item.
* `POST /api/wishlist/items` — Add product to wishlist.
* `POST /api/wishlist/items/:id/move-to-cart` — Transfer item to cart.

### 💳 Checkout, Orders & Payments (`/api/checkout`, `/api/orders`, `/api/payments`)
* `POST /api/checkout` — Checkout cart, reserve inventory, create `PENDING` order. Returns payment info.
* `GET /api/orders` — List orders (filtered by customer, seller storefront, or admin scopes).
* `GET /api/orders/:id` — Retrieve snapshotted order item details, timeline, and payment statuses.
* `POST /api/orders/:id/cancel` — Cancel order, release inventory reservation / rollback stock.
* `POST /api/payments/:paymentId/verify` — Verify transaction, deduct inventory, transition order to `CONFIRMED`.
* `POST /api/payments/:paymentId/retry` — Regenerate payment attempts on fail (15-min extension).
* `POST /api/payments/:paymentId/refund` *(Admin only)* — Initiate full or partial order refund.
* `POST /api/webhooks/mock` — public dev webhooks simulating success/failed provider notifications.

---

## 📈 Implemented Roadmaps (Phases v0.1.0 to v0.5.0)

- [x] **v0.1.0 — Phase 1: Authentication & Monorepo Foundations**
  - NestJS modular monolith back-end architecture.
  - Native npm workspaces structure.
  - PostgreSQL database design with Prisma schema.
  - Sliding-window Access/Refresh token rotation with database session verification.
  - Client authentication screens (Sign Up, Login, Profile UI).
- [x] **v0.2.0 — Phase 2: Marketplace Catalog**
  - Nested category tree management.
  - Products, images, and option variant schemas.
  - Search, pagination, and multi-facet filtering.
  - Product detailed view with interactive image slider and variant options.
- [x] **v0.3.0 — Phase 3: Cart & Wishlist System**
  - Persistent shopping carts stored in database.
  - Real-time stock validation check during item count modifications.
  - Custom wishlist operations with one-click "Move to Cart".
  - Mini-cart sidebar component.
- [x] **v0.4.0 — Phase 4: Checkout & Order System**
  - Calculated billing breakdowns (18% GST + standard shipping structures).
  - Snapshotting order items for receipt audit longevity.
  - Individual seller item fulfillment tracking matrices.
  - User order details screen with timeline statuses.
  - Multi-portal dashboard views tailored specifically to Customer, Seller, and Admin workspaces.
- [x] **v0.5.0 — Phase 5: Payment Architecture**
  - Database structures supporting payments, retries, and refunds.
  - Double-entry inventory booking (Reserve on Checkout / Deduct on Success / Release on Expire).
  - Countdown clock (15-min window) ensuring reservations expire cleanly.
  - Retrying/regenerating payment links.
  - Admin tools allowing partial/full refunds.
  - Dynamic payment provider abstraction stubs (Mock vs. Razorpay).
- [ ] **v0.6.0 — Phase 6: In-App Notification Hub & Webhook Integrations** *(Upcoming)*
- [ ] **v0.7.0 — Phase 7: Redis Caching & Query Tuning** *(Future)*

---

## 📸 Screenshots Placeholders

*Below are UI layout mocks for key user journeys:*

### Customer Payment Portal
```
┌────────────────────────────────────────────────────────┐
│  N E X A R I S                                         │
├────────────────────────────────────────────────────────┤
│  Payment Expiry Timer: 14:59                           │
│                                                        │
│  [ Mock Payment Card ]                                 │
│  Card Number: •••• •••• •••• 4242                      │
│                                                        │
│  [ Pay Now ]                 [ Simulate Failure ]      │
└────────────────────────────────────────────────────────┘
```

### Multi-Vendor Order Dashboard
```
┌────────────────────────────────────────────────────────┐
│  Seller Dashboard — Fulfillment status                 │
├────────────────────────────────────────────────────────┤
│  Order #103982                                         │
│  - Item A (Your product)   [ SHIPPED ]                 │
│  - Item B (Other vendor)   [ PROCESSING ] (Read-only)  │
│                                                        │
│  Update Fulfillment: [ Set as Shipped ]                │
└────────────────────────────────────────────────────────┘
```

---

## ⚙️ Installation & Development Setup

Follow these steps to run the complete multi-vendor ecosystem locally:

### 1. Prerequisites
Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local PostgreSQL database container)
* Git

### 2. Clone the Repository
```bash
git clone https://github.com/bhuvan-somisetty/nexaris.git
cd nexaris
```

### 3. Setup PostgreSQL Database via Docker
Nexaris includes a `docker-compose.yml` file to spin up a PostgreSQL instance instantly:
```bash
docker-compose up -d
```

### 4. Install Dependencies
Run the installation command in the root directory. Native npm workspaces will automatically resolve backend and frontend dependencies:
```bash
npm install
```

### 5. Configure Environment Variables

Create a `.env` file in the **`/backend`** directory:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexaris?schema=public"
JWT_SECRET="your-ultra-secure-jwt-secret-key-change-in-prod"
JWT_REFRESH_SECRET="your-ultra-secure-refresh-secret-key-change-in-prod"
PORT=3001
```

### 6. Run Database Migrations & Seeds
Run migrations to construct the database schema and seed it with dummy products, categories, and users (Customer, Seller, Admin accounts):
```bash
# From root directory
npm run db:setup
```

*(Alternatively, run these directly in the `/backend` folder)*:
```bash
npx prisma migrate dev
npx prisma db seed
```

### 7. Run the Application in Development Mode
You can spin up both the backend and frontend dev environments simultaneously from the project root:
```bash
npm run dev
```

* **Frontend Server**: Runs on [http://localhost:3000](http://localhost:3000)
* **Backend API**: Runs on [http://localhost:3001](http://localhost:3001)

### Seed Login Credentials
Use the default accounts created by the db seed for testing:
* **Admin**: `admin@nexaris.com` (Password: `password123`)
* **Seller**: `seller@nexaris.com` (Password: `password123`)
* **Customer**: `customer@nexaris.com` (Password: `password123`)

---

## 🛠️ Verification & Compilation Checks
Ensure everything builds correctly:
```bash
# Build backend application
npm run build --workspace=backend

# Build frontend application
npm run build --workspace=frontend
```

---

## 🤝 Contribution Guidelines

We follow standard git workflows to maintain codebase integrity:
1. **Branch Naming**: Use `feature/phase-name` or `bugfix/issue-name` format.
2. **Staging & Commits**: Format commit messages descriptively matching release milestones (e.g. `Phase 5: Payment System`).
3. **Tagging**: Tag major release points with semantic versioning tags matching corresponding phases (e.g., `v0.5.0`).
4. **Pull Requests**: Explain changes, list verification paths, and verify complete frontend and backend builds before submission.