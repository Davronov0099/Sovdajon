#!/bin/bash
set -e

# Sardorbek Furnitura — Production deploy script
# Usage: bash deploy.sh

APP_DIR="/var/www/sardorbek"
RELEASE_DIR="$APP_DIR/releases/$(date +%Y%m%d-%H%M%S)"
CURRENT_LINK="$APP_DIR/current"
SHARED_ENV="$APP_DIR/shared/.env"
PREV_COMMIT=$(cd "$APP_DIR/repo" && git rev-parse HEAD 2>/dev/null || echo "none")

echo "=== Deploy started at $(date) ==="

# 1. Pull latest code
cd "$APP_DIR/repo"
git fetch origin main
git reset --hard origin/main
CURRENT_COMMIT=$(git rev-parse HEAD)
echo "Commit: $CURRENT_COMMIT"

# 2. Install dependencies (production only)
pnpm install --frozen-lockfile

# 3. Build shared + API + web
pnpm --filter @sardorbek/shared build
pnpm --filter @sardorbek/api build
pnpm --filter @sardorbek/web build

# 4. Pre-migration backup (CRITICAL — before schema changes)
echo "=== Pre-migration database backup ==="
BACKUP_FILE="$APP_DIR/backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql.gz"
mkdir -p "$APP_DIR/backups"
pg_dump -U sardorbek_user sardorbek_db | gzip > "$BACKUP_FILE"
echo "Backup saved: $BACKUP_FILE"

# 5. Database migration (fail = abort deploy)
cd apps/api
if ! npx prisma migrate deploy; then
  echo "=== MIGRATION FAILED — ABORTING DEPLOY ==="
  echo "Backup available at: $BACKUP_FILE"
  exit 1
fi
cd ../..

# 6. Create release directory
mkdir -p "$RELEASE_DIR/api" "$RELEASE_DIR/web"
cp -r apps/api/dist/* "$RELEASE_DIR/api/"
cp -r apps/api/node_modules "$RELEASE_DIR/api/"
cp -r apps/web/dist/* "$RELEASE_DIR/web/"

# 7. Symlink .env (secure — stays outside releases)
ln -sfn "$SHARED_ENV" "$RELEASE_DIR/api/.env"

# 8. Symlink switch (ATOMIC — zero-downtime)
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

# 9. Reload PM2 (zero-downtime graceful reload)
pm2 reload sardorbek-api

# 10. Health check (wait 5s for startup)
sleep 5
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://sardorbek.biznesjon.uz/api/v1/health/ready)
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "=== Deploy SUCCESS ($CURRENT_COMMIT) ==="
  # Cleanup old releases (keep last 5)
  ls -dt "$APP_DIR/releases"/*/ 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
  # Cleanup old backups (keep last 10)
  ls -t "$APP_DIR/backups"/*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
else
  echo "=== Deploy FAILED (HTTP $HTTP_STATUS) — ROLLBACK ==="
  PREV_RELEASE=$(ls -dt "$APP_DIR/releases"/*/ 2>/dev/null | head -2 | tail -1)
  if [ -n "$PREV_RELEASE" ]; then
    ln -sfn "$PREV_RELEASE" "$CURRENT_LINK"
    pm2 reload sardorbek-api
    echo "Rolled back to $PREV_RELEASE"
  fi
  exit 1
fi

echo "=== Deploy completed at $(date) ==="
