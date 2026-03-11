#!/bin/sh
set -e

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
