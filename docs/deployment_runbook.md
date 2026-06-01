# Nexaris Production Deployment Runbook

This document serves as the guide for setting up and deploying the Nexaris application to production.

---

## 1. Neon PostgreSQL Setup

Neon is used as the serverless PostgreSQL provider.

### Steps:
1. **Create Project**:
   - Log in to [Neon Console](https://console.neon.tech/).
   - Click **Create Project**, name it `nexaris-prod`, and choose the nearest region.
   - Choose PostgreSQL Version 15 or 16.
2. **Retrieve Connection String**:
   - Locate the connection string from the dashboard.
   - Format: `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`.
   - Keep this connection string secure. You will need it for both local migrations and server environments.
3. **Database Initialization**:
   - Set the `DATABASE_URL` environment variable locally to point to Neon.
   - Run the migration deploy command to synchronize the database schema:
     ```bash
     npm run db:generate -w backend
     npx prisma migrate deploy --schema=backend/prisma/schema.prisma
     ```
   - Seed the database with core templates and initial data:
     ```bash
     npm run db:seed -w backend
     ```

---

## 2. Cloudinary Media Storage Setup

Cloudinary manages product and review media uploads directly from the client.

### Steps:
1. **Create Account**:
   - Sign up at [Cloudinary](https://cloudinary.com/).
2. **Collect Cloudinary Credentials**:
   - Copy the following from your Cloudinary Console dashboard:
     - Cloud Name
     - API Key
     - API Secret
3. **Configure Upload Presets**:
   - Go to **Settings** -> **Upload** in Cloudinary.
   - Set up two unsigned upload presets (or configure signing via API):
     - `products_preset` (targeting folder `nexaris/products`)
     - `reviews_preset` (targeting folder `nexaris/reviews`)
   - Alternatively, Nexaris uses **signed client uploads** using backend signature tokens. Ensure your Cloudinary API Secret is set on the backend so signature verification operates correctly.

---

## 3. Railway Backend Setup

NestJS backend is hosted on Railway.

### Steps:
1. **Create Project**:
   - Go to [Railway Dashboard](https://railway.app/).
   - Click **New Project** -> **Deploy from GitHub repo**.
   - Select your `Nexaris` repository.
2. **Configure Service Path**:
   - Select the service created, go to **Settings**, and change the **Root Directory** to `/backend` (or run custom build command in monorepo).
   - Alternatively, set the custom build command: `npm run build` inside backend workspace.
3. **Set Port**:
   - Set the `PORT` variable. Railway default is standard or detects automatically, NestJS uses `process.env.PORT` defaulting to `5000` or `8000`.
4. **Input Environment Variables**:
   - Add all required backend variables in the **Variables** tab (Refer to [docs/environment_variables.md](file:///c:/Users/BHUVAN/OneDrive/Desktop/Nexaris/docs/environment_variables.md)).
5. **Set up Domain**:
   - Under the service's **Settings** tab, generate or assign a custom domain name (e.g. `https://api.nexaris.shop` or Railway-provided domain).
   - Record this backend URL. You will need it as `NEXT_PUBLIC_API_URL` for the frontend.

---

## 4. Vercel Frontend Setup

Next.js frontend is hosted on Vercel.

### Steps:
1. **Import Repository**:
   - Go to [Vercel Dashboard](https://vercel.com/).
   - Click **Add New** -> **Project**.
   - Import your `Nexaris` repository.
2. **Configure Root Directory**:
   - Set the root directory parameter to `frontend`.
3. **Build and Development Settings**:
   - Framework Preset: **Next.js**.
   - Build Command: `npm run build` (runs `next build --turbopack` or similar).
   - Output Directory: `.next`.
4. **Input Environment Variables**:
   - Add all required frontend environment variables (Refer to [docs/environment_variables.md](file:///c:/Users/BHUVAN/OneDrive/Desktop/Nexaris/docs/environment_variables.md)).
5. **Deploy**:
   - Click **Deploy**. Vercel will build the frontend and generate a deployment URL.
   - Configure a custom domain in Vercel settings if desired.

---

## 5. Sentry Integration

Sentry tracks application issues in production.

### Steps:
1. **Create Projects**:
   - Log in to your [Sentry Account](https://sentry.io/).
   - Create a project for `nexaris-frontend` (Next.js) and `nexaris-backend` (NestJS).
2. **Collect DSNs**:
   - Retrieve the client and server DSN values.
   - Set them as environment variables `SENTRY_DSN` in their respective hosting environments.
3. **Upload Source Maps**:
   - Ensure the Sentry Auth Token is added as `SENTRY_AUTH_TOKEN` in GitHub Secrets so build maps are uploaded during CI.
