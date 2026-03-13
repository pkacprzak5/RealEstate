#!/bin/sh
set -e

echo "==> Starting entrypoint..."

# Railway provides PORT env var; default to 8000 for local Docker
export NGINX_PORT="${PORT:-8000}"
echo "==> Listening on port $NGINX_PORT"

# Render nginx config template
envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Debug: show DB config
echo "==> DB_CONNECTION=$DB_CONNECTION DB_HOST=$DB_HOST DB_PORT=$DB_PORT DB_DATABASE=$DB_DATABASE DB_USERNAME=$DB_USERNAME"

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
# NOTE: route:cache is skipped because /debug-health uses a closure

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

# Diagnostic: test debug-health route (returns JSON, catches its own errors)
echo "==> Smoke-testing /debug-health..."
php artisan tinker --execute="
\$request = \Illuminate\Http\Request::create('/debug-health');
\$kernel = app(\Illuminate\Contracts\Http\Kernel::class);
\$response = \$kernel->handle(\$request);
echo 'STATUS: ' . \$response->getStatusCode() . PHP_EOL;
echo 'BODY: ' . \$response->getContent() . PHP_EOL;
" 2>&1 || true

# Diagnostic: check if route cache and config cache are valid
echo "==> Route list check..."
php artisan route:list 2>&1 | head -20 || true

echo "==> Config check..."
php artisan tinker --execute="
echo 'DB: ' . config('database.default') . PHP_EOL;
echo 'HOST: ' . config('database.connections.mysql.host') . PHP_EOL;
echo 'APP_URL: ' . config('app.url') . PHP_EOL;
echo 'APP_KEY set: ' . (config('app.key') ? 'yes' : 'NO') . PHP_EOL;
echo 'SESSION: ' . config('session.driver') . PHP_EOL;
" 2>&1 || true

# Fix storage permissions LAST — after all root artisan commands that may write to logs
echo "==> Fixing storage permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

echo "==> Entrypoint complete, starting services..."
exec "$@"
