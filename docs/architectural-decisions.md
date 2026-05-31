# Nexaris Architectural Decisions Log (ADL)

This document records the foundational architectural decisions made for the Nexaris multi-vendor commerce ecosystem during Phase 1.

---

## ADR 1: Monorepo Folder Structure

### Context
Nexaris requires a modern client frontend (Next.js 15) and a secure modular backend service (NestJS). We need to maintain a single repository to coordinate code versions, type definitions, and configurations, while keeping boundaries clean.

### Decision
We implemented a **monorepo workspace** using native **npm workspaces** configured in the root `package.json`.
- `/frontend`: Independent Next.js application.
- `/backend`: Independent NestJS modular backend.

### Consequences
- Shared coordination at root (scripts for building/running dev environments).
- Simple package dependency sharing and monorepo script triggers.
- Frontend and backend remain logically decoupled and can be deployed to separate hosts (e.g. Vercel for frontend, Railway/ECS for backend).

---

## ADR 2: Relational Database Schema Design (PostgreSQL + Prisma)

### Context
Nexaris has three user roles (Customer, Seller, Admin) and requires foundational tables for addresses, notifications, and auditing that will scale to support catalog, checkout, and platform monitoring in later phases.

### Decision
We configured PostgreSQL with Prisma ORM. The schema includes the following structural choices:
- **`User` and `Profile` separation**: Avoids bloated user queries; core authentication data is stored in the `User` table, while details like name and avatar are in the `Profile` table.
- **`SellerProfile` table**: Sellers require specific information (e.g. store name, description, approval status). We created a distinct 1:1 `SellerProfile` table linked to the `User` record to isolate seller-only logic.
- **`Address` structure**: Linked 1:N with the `User` table and tagged with an `AddressType` enum (SHIPPING, BILLING) to scale for order fulfillment.
- **`Notification` configuration**: Structured to support multiple channels and includes a `metadata` JSON field to hold dynamic variables (e.g., `orderId`, `productId`) in subsequent phases.
- **`AuditLog` configuration**: Includes optional user relations, oldValue/newValue JSON properties, and IP/user-agent tracking for platform governance.

---

## ADR 3: JWT Authentication with Database-Backed Refresh Tokens

### Context
We need a stateless, secure authentication flow that allows user verification via JWTs but retains the ability to revoke user sessions (e.g. on logout or password change).

### Decision
We implemented a **sliding-window JWT access/refresh token flow**:
1. **Access Token**: Short-lived (15 minutes), signed with `JWT_SECRET`. Passed in the `Authorization: Bearer <token>` header. Stored in-memory on the client to protect against XSS.
2. **Refresh Token**: Long-lived (7 days), signed with `JWT_REFRESH_SECRET` and saved in the database.
3. **Rotation (Security)**: Each time a user calls `/auth/refresh`, the old refresh token is marked as `isRevoked: true` and a new refresh token is issued (sliding window rotation). This mitigates token theft replay attacks.
4. **Revocation**: On logout, the refresh token is marked as `isRevoked: true` in the database, instantly invalidating the session.

---

## ADR 4: Metadata-Driven Role-Based Access Control (RBAC)

### Context
Certain endpoints must be restricted based on user role (e.g. only Admins can list users or approve sellers; only Sellers can view inventory).

### Decision
We implemented RBAC using NestJS Guards and Custom Decorators:
- **`@Roles` Decorator**: Attaches allowed roles metadata to route handler execution contexts.
- **`JwtAuthGuard`**: Extracts and validates the access token, populating the `req.user` payload with role information.
- **`RolesGuard`**: Executes after `JwtAuthGuard`, reads the target route's roles metadata, and checks if the authenticated user's role matches. If not, it throws a `403 Forbidden` response.

---

## ADR 5: Client-Side Routing and Protected Portals

### Context
The Next.js 15 client needs to redirect users to their corresponding dashboards and handle loading states dynamically during token refresh checks.

### Decision
- An **`AuthContext`** manages login, registration, and logout states client-side.
- Persistent login: on load, the client checks `localStorage` for tokens. If a token exists, it calls `/auth/me` to fetch current user profile information.
- Axios interceptors automatically capture `401 Unauthorized` responses on access token expiration, call `/auth/refresh` behind the scenes, queue subsequent requests, and retry seamlessly.
- Role-based route blocks are enforced inside dashboard components (Home, Profile, Seller Portal, Admin Portal) checking `user.role` on render.
