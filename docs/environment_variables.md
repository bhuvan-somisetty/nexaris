# Nexaris Environment Variables Inventory

This document outlines the required environment variables for the Nexaris backend and frontend environments in production.

---

## 1. Backend Environment Variables (Railway)

These variables must be configured in the Railway dashboard for the backend service.

| Variable | Description | Recommended/Default Value | Secret? |
| :--- | :--- | :--- | :---: |
| `NODE_ENV` | Application environment mode | `production` | No |
| `PORT` | The port the NestJS server listens on | `5000` | No |
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` | Yes |
| `JWT_SECRET` | Secret key used to sign JWT authorization tokens | [Random 64-char string] | Yes |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` | No |
| `FRONTEND_URL` | Next.js frontend URL used for CORS validation | `https://nexaris.shop` | No |
| `THROTTLER_TTL` | Rate limit window in seconds | `60` | No |
| `THROTTLER_LIMIT` | Max allowed requests per window | `100` | No |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary name for image hosting | `[CloudName]` | No |
| `CLOUDINARY_API_KEY` | Cloudinary API access key | `[APIKey]` | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API access secret | `[APISecret]` | Yes |
| `SENTRY_DSN` | DSN endpoint for NestJS Sentry SDK | `https://...@o...ingest.sentry.io/...` | Yes |
| `STRIPE_SECRET_KEY` | Secret key for Stripe payment gateway API | `sk_live_...` | Yes |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification secret | `whsec_...` | Yes |
| `EMAIL_HOST` | Host of SMTP server for outgoing emails | `smtp.gmail.com` | No |
| `EMAIL_PORT` | Port of SMTP server | `587` | No |
| `EMAIL_USER` | SMTP username credential | `[SMTPUsername]` | Yes |
| `EMAIL_PASS` | SMTP password credential | `[SMTPPassword]` | Yes |
| `EMAIL_FROM` | Sender display name and email address | `Nexaris <noreply@nexaris.shop>` | No |

---

## 2. Frontend Environment Variables (Vercel)

These variables must be configured in the Vercel dashboard for the frontend deployment.

| Variable | Description | Recommended/Default Value | Secret? |
| :--- | :--- | :--- | :---: |
| `NEXT_PUBLIC_API_URL` | Absolute URL of the hosted NestJS backend API | `https://api.nexaris.shop` | No |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary Name used for client upload requests | `[CloudName]` | No |
| `NEXT_PUBLIC_SENTRY_DSN` | DSN endpoint for Next.js Sentry Client SDK | `https://...@o...ingest.sentry.io/...` | Yes |
| `SENTRY_AUTH_TOKEN` | Auth token used by build compiler to upload source maps | `sntryu_...` | Yes |

---

## 3. Environment Variable Security Best Practices

1. **Never commit `.env` files**: Ensure all `.env`, `.env.local`, and `.env.production` files are specified in `.gitignore`.
2. **Rotate Secrets**: Rotate keys such as `JWT_SECRET`, `STRIPE_SECRET_KEY`, and database credentials every 90 days.
3. **Least Privilege**: Ensure database users used in production have only the necessary permissions required (e.g. read/write/ddl) and do not use root administrative accounts.
