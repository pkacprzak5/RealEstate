# Deployment Guide — Railway (App + MySQL)

## Prerequisites

1. [Railway account](https://railway.app/) (usage-based billing)
2. GitHub repository connected to Railway

## Railway Setup

### 1. Create the project

1. Go to Railway → New Project → Deploy from GitHub Repo
2. Select this repository, branch `main`
3. Railway auto-detects the Dockerfile via `railway.toml`

### 2. Add MySQL database

1. In the Railway project, click **+ New** → **Database** → **MySQL**
2. Railway automatically provisions a MySQL instance and sets `DATABASE_URL`, `MYSQLHOST`, `MYSQLPORT`, etc. as env vars
3. Add the following env vars to the app service (use Railway's reference variables to pull from the MySQL service):

```
DB_CONNECTION=mysql
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
```

### 3. Set app environment variables

```bash
# Via Railway CLI
railway variables set APP_NAME="Nieruchomości Kraków"
railway variables set APP_ENV=production
railway variables set APP_DEBUG=false
railway variables set APP_URL=https://YOUR_APP.up.railway.app
railway variables set GEMINI_API_KEY=YOUR_GEMINI_KEY
```

### Or deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Link to project
railway init
railway link

# Deploy
railway up
```

## Configuration

Railway uses `railway.toml` for build configuration:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health.php"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Railway automatically sets the `PORT` environment variable — the Docker entrypoint configures Nginx to listen on it.

## Required Environment Variables

| Variable | Description | Example |
|---|---|---|
| `APP_NAME` | Application name | `Nieruchomości Kraków` |
| `APP_ENV` | Environment | `production` |
| `APP_DEBUG` | Debug mode | `false` |
| `APP_URL` | Public URL | `https://your-app.up.railway.app` |
| `DB_CONNECTION` | Database driver | `mysql` |
| `DB_HOST` | MySQL host | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | MySQL port | `${{MySQL.MYSQLPORT}}` |
| `DB_DATABASE` | Database name | `${{MySQL.MYSQLDATABASE}}` |
| `DB_USERNAME` | MySQL user | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | MySQL password | `${{MySQL.MYSQLPASSWORD}}` |
| `GEMINI_API_KEY` | Gemini API key | (secret, optional — AI features degrade gracefully) |

## What Happens on First Deploy

1. Docker builds the image (multi-stage: Node → Composer → PHP-FPM)
2. Entrypoint generates `APP_KEY` if missing
3. Config/route/view caches are built
4. Waits for database to be reachable (up to 30 retries)
5. Migrations run automatically (`--force`)
6. If the listings table is empty, seed data (100 listings from JSON) is imported
7. Nginx + PHP-FPM start via Supervisor

## Smoke Checks

After deployment, verify:

- [ ] `GET /` — loads Index page with listings
- [ ] `GET /listings/1` — loads Show page
- [ ] Filters work (property type, price, area, rooms)
- [ ] Map view loads with markers
- [ ] AI Search works (if `GEMINI_API_KEY` set)
- [ ] Pagination works
- [ ] Mobile responsive layout
- [ ] Health check passes (`GET /health.php`)

## Troubleshooting

- **502 Bad Gateway**: Check Railway deploy logs, likely PHP-FPM startup issue
- **Database connection error**: Verify MySQL reference variables are correctly linked from the MySQL service
- **Missing assets**: Check that `public/build/` exists in the Docker image (built during Docker build stage)
- **Blank page**: Check `APP_KEY` is set, check Railway logs for Laravel errors
- **AI features not working**: Verify `GEMINI_API_KEY` is set — all AI features fall back gracefully without it
- **Port issues**: Railway sets `PORT` env var automatically — do not hardcode ports in the Dockerfile
