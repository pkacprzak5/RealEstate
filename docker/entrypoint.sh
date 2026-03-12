#!/bin/sh
set -e

# Railway provides PORT env var; default to 8000 for local Docker
export NGINX_PORT="${PORT:-8000}"

# Render nginx config template (substitute $NGINX_PORT)
envsubst '${NGINX_PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

# Generate app key if not set
if [ -z "$APP_KEY" ]; then
    php artisan key:generate --force
fi

# Cache config and routes for production
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Run migrations
php artisan migrate --force

# Seed if database is empty
LISTING_COUNT=$(php artisan tinker --execute="echo \App\Models\Listing::count();" 2>/dev/null || echo "0")
if [ "$LISTING_COUNT" = "0" ]; then
    echo "Database empty, running seeder..."
    php artisan db:seed --force
fi

exec "$@"
