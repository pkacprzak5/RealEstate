# Deployment Guide — Koyeb + TiDB Cloud

## Prerequisites

1. [Koyeb account](https://www.koyeb.com/) (free tier)
2. [TiDB Cloud Starter](https://tidbcloud.com/) cluster (free, MySQL-compatible)
3. GitHub repository (public or connected to Koyeb)

## TiDB Cloud Setup

1. Create a free Serverless cluster in TiDB Cloud
2. Note connection details: host, port (4000), username, password
3. Download the CA certificate or use the system CA bundle

## Koyeb Deployment

### Option A: Deploy via Koyeb Dashboard

1. Go to Koyeb → Create App → Docker
2. Point to this GitHub repo, branch `feat/real-estate-mvp`
3. Set port to `8000`
4. Set environment variables (see below)
5. Deploy

### Option B: Deploy via Koyeb CLI

```bash
koyeb app create real-estate

koyeb service create real-estate/web \
  --git github.com/YOUR_USER/RealEstate \
  --git-branch feat/real-estate-mvp \
  --git-build-command "" \
  --docker-dockerfile Dockerfile \
  --ports 8000:http \
  --routes /:8000 \
  --instance-type free \
  --regions fra \
  --env APP_NAME="Nieruchomości Kraków" \
  --env APP_ENV=production \
  --env APP_DEBUG=false \
  --env APP_URL=https://YOUR_APP.koyeb.app \
  --env DB_CONNECTION=mysql \
  --env DB_HOST=YOUR_TIDB_HOST \
  --env DB_PORT=4000 \
  --env DB_DATABASE=real_estate \
  --env DB_USERNAME=YOUR_TIDB_USER \
  --env DB_PASSWORD=YOUR_TIDB_PASSWORD \
  --env MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt \
  --env ANTHROPIC_API_KEY=YOUR_KEY \
  --env ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

## Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `APP_NAME` | Application name | `Nieruchomości Kraków` |
| `APP_ENV` | Environment | `production` |
| `APP_DEBUG` | Debug mode | `false` |
| `APP_URL` | Public URL | `https://real-estate-xxx.koyeb.app` |
| `DB_CONNECTION` | Database driver | `mysql` |
| `DB_HOST` | TiDB host | `gateway01.eu-central-1.prod.aws.tidbcloud.com` |
| `DB_PORT` | TiDB port | `4000` |
| `DB_DATABASE` | Database name | `real_estate` |
| `DB_USERNAME` | TiDB user | `xxxxx.root` |
| `DB_PASSWORD` | TiDB password | (secret) |
| `MYSQL_ATTR_SSL_CA` | SSL cert path | `/etc/ssl/certs/ca-certificates.crt` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` (optional) |
| `ANTHROPIC_MODEL` | Claude model | `claude-haiku-4-5-20251001` |

## What Happens on First Deploy

1. Docker builds the image (multi-stage: Node → Composer → PHP-FPM)
2. Entrypoint generates APP_KEY if missing
3. Config/route/view caches are built
4. Migrations run automatically (`--force`)
5. If the listings table is empty, seed data (100 listings from JSON) is imported
6. Nginx + PHP-FPM start via Supervisor

## Smoke Checks

After deployment, verify:

- [ ] `GET /` — loads Index page with listings
- [ ] `GET /listings/1` — loads Show page
- [ ] Filters work (property type, price, area, rooms)
- [ ] Map view loads with markers
- [ ] "Zapytaj" search works (if ANTHROPIC_API_KEY set)
- [ ] Pagination works
- [ ] Mobile responsive layout

## Troubleshooting

- **502 Bad Gateway**: Check Koyeb build logs, likely PHP-FPM startup issue
- **Database connection error**: Verify TiDB host/port/credentials, ensure SSL CA is set
- **Missing assets**: Check that `public/build/` exists in the Docker image
- **Blank page**: Check `APP_KEY` is set, run `php artisan config:cache`
