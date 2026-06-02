#!/bin/bash
# Nexaris Database Backup & Rollback Verification Script
# Exit immediately if any command fails
set -e

# Load DB Connection string from .env or fallback
DB_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/nexaris?schema=public"}
BACKUP_DIR="./backups"
BACKUP_FILE="$BACKUP_DIR/nexaris_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "=== Nexaris Database Operations Utility ==="
echo "1. Checking Database Connectivity..."
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
  echo "[ERROR] Database is unreachable. Verify connection string."
  exit 1
fi
echo "[OK] Connected to database."

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "2. Initiating Database Backup..."
# Export database schema and records
pg_dump "$DB_URL" -F p -v -f "$BACKUP_FILE"
echo "[SUCCESS] Database backed up to: $BACKUP_FILE"

echo "3. Verifying Backup File Integrity..."
if [ ! -s "$BACKUP_FILE" ]; then
  echo "[ERROR] Backup file is empty or missing."
  exit 1
fi
# Simple validation check: ensure it contains table declarations
if ! grep -q "CREATE TABLE" "$BACKUP_FILE"; then
  echo "[ERROR] Backup verification failed. Table declarations missing."
  exit 1
fi
echo "[OK] Backup verification complete (Table structures present)."

echo "4. Ready for rollback verification if needed."
echo "To restore this backup, run the following command:"
echo "psql \"\$DATABASE_URL\" -f $BACKUP_FILE"
echo "==========================================="
exit 0
