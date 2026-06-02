# Nexaris Production Operations Runbook

This document describes the standard operational procedures for managing Nexaris deployments in production.

---

## 1. Database Migrations

### Applying Migrations
All database schema changes must be applied via Prisma in the CI/CD pipeline:
```bash
npx prisma migrate deploy
```
> [!CAUTION]
> Never run `prisma migrate dev` in production. It can cause database resets and data loss.

### Hotfix Rollbacks
If a migration fails or causes application regression:
1.  Identify the last stable git commit hash.
2.  If the migration did not modify columns destructively, redeploy the previous backend bundle.
3.  If data was modified, restore database state from the latest automated PG snapshot (configured hourly in AWS RDS / Cloud SQL).

---

## 2. Queue Management (BullMQ)

If jobs fail, they enter the Dead-Letter Queue (DLQ) state in Redis instead of vanishing.

### Inspecting Queue Backlogs
You can inspect the queue sizes using the custom Observability Admin Dashboard at `/admin/observability`.
Alternatively, query the Redis keys directly using `redis-cli`:
```bash
# Check length of active jobs in fulfillment queue
LLEN "bull:fulfillment:active"

# Check size of failed jobs
ZCARD "bull:fulfillment:failed"
```

### Reprocessing DLQ Jobs
To retry failed queue items:
1.  Navigate to the `/admin/observability` dashboard.
2.  Review the failure stack trace in the "Queue Monitor" tab.
3.  Click **"Retry All Failed"** to re-queue the jobs with their original payloads.

---

## 3. Caching & Redis Maintenance

### Purging Application Cache
To force cache invalidation without restarting the NestJS application:
```bash
# Flush specific catalog cache keys
redis-cli DEL "nexaris:cache:catalog:home"
redis-cli DEL "nexaris:cache:categories:tree"

# Flush ALL cached elements (standalone instance)
redis-cli FLUSHDB
```

### Redis Connection Exhaustion
If logs display `Redis connection error: max number of clients reached`:
1.  Check the connection pooling size of the NestJS instances.
2.  Verify sentinel/replica connections are closed on process termination.
3.  Increase client limits in `redis.conf` (`maxclients 10000`).

---

## 4. Observability & Incident Response

### CPU & Memory Spikes
1.  **Locate Source**: Open Sentry or access the NestJS Pino stdout JSON stream.
2.  **Queue Saturation**: Check if the recommendation workers are processing large product similarity sets simultaneously. Scale the background worker instances separately from the HTTP API instances.
3.  **Slow Queries**: Inspect database profiling logs. Add indices to search matching tables if querying exceeds $150\text{ms}$.
