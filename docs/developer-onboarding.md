# Nexaris Developer Onboarding Guide

Welcome to Nexaris! This guide details the steps required to set up your local development environment and run the application.

---

## Prerequisites

Before starting, ensure you have the following installed:
*   **Node.js** (v20.x or higher)
*   **npm** (v10.x or higher)
*   **Docker Desktop** (Required for running local PostgreSQL & Redis)

---

## Local Setup

### 1. Clone & Install Dependencies
Clone the repository and install dependency nodes in both frontend and backend directories:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Copy the template environment configurations:
```bash
# In backend/
cp .env.example .env
```
Ensure your `.env` contains correct database and Redis configurations. Example:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nexaris?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="super-secret-jwt-key"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

### 3. Spin Up Infrastructure
Run docker-compose to start PostgreSQL and Redis:
```bash
# From the root directory
docker-compose up -d
```

### 4. Database Setup & Seed
Generate the Prisma client, run migrations, and seed mock data:
```bash
cd backend
npx prisma generate
npx prisma migrate dev
npm run db:seed
```
The seed script populates categories, admin users, sellers, products, reviews, and search synonyms.

### 5. Running the Application

Start the backend and frontend dev servers:
```bash
# Backend (in backend/)
npm run start:dev

# Frontend (in frontend/)
npm run dev
```

---

## Executing Tests

Nexaris uses Jest for automated tests. Ensure local databases are running before executing E2E integrations.

```bash
# Run unit tests
npm run test

# Run End-to-End tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

---

## Useful Slash Commands in Chat
If you need automated support from our AI assistant during development:
*   `/goal` - Automates a long-running, multi-step code improvement.
*   `/browser` - Opens search panels or checks your local deployment URL.
*   `/grill-me` - Reviews architectural options through an interactive interview.
