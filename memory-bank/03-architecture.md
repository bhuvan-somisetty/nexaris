# Nexaris Architecture

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- Shadcn UI

Backend:
- NestJS
- TypeScript

Database:
- PostgreSQL

ORM:
- Prisma

Authentication:
- JWT
- Refresh Tokens

Caching:
- Redis

Storage:
- Cloudinary

Deployment:
- Vercel
- Railway / Render

---

# Architecture Style

Modular Monolith (Phase 1)

Modules:

- Auth
- Users
- Products
- Categories
- Cart
- Orders
- Reviews
- Wishlist
- Sellers
- Analytics
- Notifications
- Admin

Future:
Transition to Microservices if scale requires.