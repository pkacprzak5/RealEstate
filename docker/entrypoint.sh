#!/bin/sh
set -e

echo "==> Starting entrypoint..."

# Railway provides PORT env var; default to 8000 for local Docker
export NGINX_PORT="${PORT:-8000}"
echo "==> Listening on port $NGINX_PORT"

# Render nginx config template
envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Minimal .env — only APP_KEY lives here, everything else comes from system env vars
echo "APP_KEY=" > .env

# Generate app key if not set via env var
if [ -z "$APP_KEY" ]; then
    echo "==> Generating APP_KEY..."
    php artisan key:generate --force
fi

# config:cache bakes all env() values into a cached PHP file
# It runs HERE in the entrypoint where Railway's env vars are available
# After this, php-fpm doesn't need env vars — it reads the cached config
echo "==> Caching config and views..."
php artisan config:cache
php artisan view:cache
php artisan route:cache

# Wait for database to be reachable
echo "==> Waiting for database..."
MAX_TRIES=30
COUNT=0
until php artisan tinker --execute="try { DB::connection()->getPdo(); echo 'ok'; } catch (\Exception \$e) { echo \$e->getMessage(); exit(1); }" 2>&1 | grep -q "ok"; do
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$MAX_TRIES" ]; then
        echo "==> ERROR: Database not reachable after $MAX_TRIES attempts. Last error:"
        php artisan tinker --execute="try { DB::connection()->getPdo(); } catch (\Exception \$e) { echo \$e->getMessage(); }" 2>&1 || true
        break
    fi
    echo "==> DB not ready, retrying ($COUNT/$MAX_TRIES)..."
    sleep 2
done

# Run migrations
echo "==> Running migrations..."
php artisan migrate --force

# Seed if database is empty
LISTING_COUNT=$(php artisan tinker --execute="echo \App\Models\Listing::count();" 2>/dev/null || echo "0")
if [ "$LISTING_COUNT" = "0" ]; then
    echo "==> Database empty, running seeder..."
    php artisan db:seed --force
fi

# Create a raw PHP health check that bypasses Laravel
cat > /var/www/html/public/health.php <<'HEALTH'
<?php
echo json_encode(['status' => 'php_ok', 'php' => PHP_VERSION]);
HEALTH

# PHP error logging to stderr
echo "log_errors = On" > /usr/local/etc/php/conf.d/debug.ini
echo "error_log = /dev/stderr" >> /usr/local/etc/php/conf.d/debug.ini

# Fix storage permissions LAST — after all root artisan commands that may write to logs
echo "==> Fixing storage permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

echo "==> Entrypoint complete, starting services..."
exec "$@"
