# Cache-bust: v2 — force Railway to rebuild all layers
# Stage 1: Build frontend assets
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --legacy-peer-deps
COPY vite.config.js tsconfig.json tailwind.config.js postcss.config.js ./
COPY resources/ resources/
RUN npm run build

# Stage 2: Install PHP dependencies
FROM composer:2 AS composer
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize

# Stage 3: Production image
FROM php:8.4-fpm-alpine

# Install system dependencies + PHP extensions
RUN apk add --no-cache \
    nginx \
    supervisor \
    ca-certificates \
    gettext \
    && docker-php-ext-install pdo_mysql opcache

# Configure PHP for production
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.save_comments=1'; \
    echo 'expose_php=Off'; \
    echo 'memory_limit=256M'; \
    echo 'upload_max_filesize=10M'; \
    echo 'post_max_size=12M'; \
  } > /usr/local/etc/php/conf.d/production.ini

# Allow php-fpm to pass through environment variables
RUN sed -i 's/;clear_env = no/clear_env = no/' /usr/local/etc/php-fpm.d/www.conf && \
    grep -q 'clear_env' /usr/local/etc/php-fpm.d/www.conf || echo 'clear_env = no' >> /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www/html

# Copy application code
COPY --from=composer /app /var/www/html
COPY --from=frontend /app/public/build public/build

# Nginx config template (rendered at runtime by entrypoint for dynamic PORT)
COPY docker/nginx.conf /etc/nginx/http.d/default.conf.template

# Supervisor config
COPY docker/supervisord.conf /etc/supervisord.conf

# Set permissions
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Entrypoint
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# No EXPOSE — Railway uses PORT env var (default 8080) to route traffic
# Nginx listens on $PORT dynamically via entrypoint

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
