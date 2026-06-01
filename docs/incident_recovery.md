# Nexaris Incident Recovery Checklist

This checklist provides step-by-step procedures for handling production issues on the Nexaris platform.

---

## 1. Application Restart & Crashing Service

If the backend or frontend is unresponsive or throwing boot-loop errors:

### Railway Backend Restart:
1. Go to the [Railway Console](https://railway.app/).
2. Select the `nexaris-backend` service.
3. Click the **...** (options menu) next to the service name.
4. Select **Redeploy** to build and restart a fresh container.
5. Monitor startup logs in the **Logs** tab to verify success.

### Vercel Frontend Restart:
1. Go to [Vercel Console](https://vercel.com/).
2. Select the project.
3. Click the **Deployments** tab.
4. Locate the active production deployment, click the menu button, and select **Redeploy**.

---

## 2. Database Backup & Restoration

Neon automatically handles point-in-time recovery (PITR) and automatic backups.

### Restoring to a Specific Time:
1. Log in to the [Neon Console](https://console.neon.tech/).
2. Go to the **Branches** tab.
3. Click **Create Branch**.
4. Select **Point in time** as the restore type.
5. Specify the exact timestamp to restore to (e.g., right before database corruption occurred).
6. Set the newly created branch as the primary branch, or copy its Connection String and update the `DATABASE_URL` variable in Railway to switch traffic to the restored database.

---

## 3. Rollback Strategy

If a deployment contains breaking bugs and must be rolled back immediately:

### Railway Backend Rollback:
1. Go to **Deployments** under the Railway backend service.
2. Select the previous stable deployment.
3. Click **Rollback** to run the previous Docker container image immediately.
4. If the new code contains schema changes, assess whether a database migration rollback is required.

### Vercel Frontend Rollback:
1. Navigate to the **Deployments** list on Vercel.
2. Select the previous stable deployment.
3. Click **Promote to Production** to roll back immediately without rebuilding.

---

## 4. Database Migration Rollback

If a bad migration was deployed:
1. Identify the offending migration name under `backend/prisma/migrations/`.
2. Locally write a manual rollback SQL script to revert the changes (e.g. drop tables, columns, indexes).
3. Connect to the Neon database using a SQL editor (like DBeaver or PGAdmin) with the administrative connection string.
4. Execute the SQL script.
5. Delete the corresponding migration record from the `_prisma_migrations` table so Prisma knows the migration is no longer applied:
   ```sql
   DELETE FROM _prisma_migrations WHERE migration_name = '2026xxxxxxxxx_migration_name';
   ```
6. Re-align the codebase by reverting the schema changes in `backend/prisma/schema.prisma` and commit.

---

## 5. Production Error Tracing with Sentry

When an incident is reported:
1. Log in to [Sentry Dashboard](https://sentry.io/).
2. Select either `nexaris-frontend` or `nexaris-backend`.
3. Go to the **Issues** tab to locate recent exceptions.
4. Select the high-frequency error.
5. Review the **Stack Trace**, which maps to original files and line numbers via CI-uploaded source maps.
6. Check **Tags** (e.g., browser type, user ID, request path) to identify patterns in affected users.
7. Click **Releases** to trace the introduction of the bug to a specific release tag/commit.
