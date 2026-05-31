# Nexaris Database Schema - Phase 1

This document specifies the database tables and relations implemented via Prisma ORM for the Nexaris Phase 1 foundation.

---

## Core Tables & Fields

### User
Persists accounts and role information.
- `id` (String, UUID, Primary Key)
- `email` (String, Unique)
- `passwordHash` (String)
- `role` (Role Enum: `CUSTOMER`, `SELLER`, `ADMIN`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Profile
Stores personal customer attributes.
- `id` (String, UUID, Primary Key)
- `userId` (String, Unique Foreign Key to `User`, Cascade Delete)
- `firstName` (String)
- `lastName` (String)
- `phone` (String, Optional)
- `avatarUrl` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### SellerProfile
Defines parameters for storefront accounts.
- `id` (String, UUID, Primary Key)
- `userId` (String, Unique Foreign Key to `User`, Cascade Delete)
- `storeName` (String, Unique)
- `storeDescription` (String, Optional)
- `status` (SellerStatus Enum: `PENDING`, `APPROVED`, `REJECTED`)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Address
Facilitates shipping and billing structures.
- `id` (String, UUID, Primary Key)
- `userId` (String, Foreign Key to `User`, Cascade Delete)
- `type` (AddressType Enum: `SHIPPING`, `BILLING`)
- `isDefault` (Boolean)
- `firstName` (String)
- `lastName` (String)
- `street1` (String)
- `street2` (String, Optional)
- `city` (String)
- `state` (String)
- `postalCode` (String)
- `country` (String)
- `phone` (String, Optional)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Notification
Logs communication and dispatch updates.
- `id` (String, UUID, Primary Key)
- `userId` (String, Foreign Key to `User`, Cascade Delete)
- `title` (String)
- `message` (String)
- `type` (NotificationType Enum: `ORDER_UPDATE`, `PROMOTION`, `AUTH`, `SYSTEM`)
- `isRead` (Boolean)
- `metadata` (Json, Optional) - Extensible payload for linking orders/products
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### AuditLog
Maintains administrative system logs.
- `id` (String, UUID, Primary Key)
- `userId` (String, Optional Foreign Key to `User`, SetNull on Delete)
- `action` (String) - e.g., `REGISTER`, `SELLER_APPROVED`, `LOGIN`
- `entity` (String) - e.g., `USER`, `SELLER_PROFILE`
- `entityId` (String, Optional)
- `oldValue` (Json, Optional)
- `newValue` (Json, Optional)
- `ipAddress` (String, Optional)
- `userAgent` (String, Optional)
- `createdAt` (DateTime)

### RefreshToken
Rotates JWT user sessions.
- `id` (String, UUID, Primary Key)
- `token` (String, Unique)
- `userId` (String, Foreign Key to `User`, Cascade Delete)
- `expiresAt` (DateTime)
- `isRevoked` (Boolean)
- `createdAt` (DateTime)

---

## Relationships (ER diagram preview)

```
  [User] 1 ---- 0..1 [Profile]
  [User] 1 ---- 0..1 [SellerProfile]
  [User] 1 ---- 0..N [Address]
  [User] 1 ---- 0..N [Notification]
  [User] 1 ---- 0..N [RefreshToken]
  [User] 0..1 -- 0..N [AuditLog]
```