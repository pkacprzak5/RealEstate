# Nieruchomości Kraków

A smart real-estate listings platform for browsing apartments and houses in Kraków.

**Stack:** Laravel 12 · Inertia.js · React 18 · TypeScript · Tailwind CSS · Leaflet · TiDB Cloud

## Features

- **Browse listings** — grid view with cards or interactive Leaflet map
- **Structured filters** — property type, market type, price range, area, rooms, district, keywords
- **AI-powered search** ("Zapytaj") — describe what you're looking for in natural language; Claude converts it to structured filters
- **Smart area suggestions** — data-driven area range hints when filtering by room count
- **Listing details** — image gallery with lightbox, key facts table, HTML description, location map
- **Responsive design** — desktop sidebar, mobile filter drawer, simplified mobile pagination

## Quick Start

```bash
# Prerequisites: PHP 8.2+, Composer, Node 18+, MySQL or Docker

# Clone and install
git clone <repo-url> && cd RealEstate
composer install
npm install --legacy-peer-deps

# Environment
cp .env.example .env
php artisan key:generate

# Database (option A: Docker)
docker compose up -d mysql
# (option B: use your own MySQL and update .env)

# Migrate and seed (100 pre-scraped Kraków listings)
php artisan migrate
php artisan db:seed

# Build frontend and serve
npm run build
php artisan serve
# Visit http://localhost:8000
```

## Data Source

100 listings scraped from Otodom.pl (Kraków flats + houses, sale + rent) using a Playwright-based scraper. Pre-scraped seed data is included in `database/seeders/data/listings.json` for reliable demo setup.

To re-scrape (requires Playwright):
```bash
npx playwright install chromium
node scripts/scrape-otodom.mjs --output database/seeders/data/listings.json
```

## AI Feature: Vague-Intent Search

The "Zapytaj" tab lets users type natural language queries like *"przytulne 2-pokojowe blisko centrum do 500 tys"*. The backend sends this to Claude API which extracts structured filters (property type, price range, rooms, district, etc.). If the API is unavailable, it falls back to keyword search.

Requires `ANTHROPIC_API_KEY` in `.env`. Uses `claude-haiku-4-5-20251001` by default for fast, cheap parsing.

## Production Deployment

See [docs/deployment.md](docs/deployment.md) for Koyeb + TiDB Cloud setup.

```bash
# Build Docker image
docker build -t real-estate .

# Run locally (needs DB env vars)
docker run -p 8000:8000 --env-file .env real-estate
```

## Testing

```bash
php artisan test
# 20 tests, 104 assertions — covers controller, services, import command
```

## Project Structure

```
app/
├── Console/Commands/     ImportListings command
├── Http/Controllers/     ListingController (index + show)
├── Models/               Listing with scopes and accessors
└── Services/             IntentParserService, AreaSuggestionService

resources/js/
├── Components/Listings/  FilterSidebar, ListingCard, ListingMap, ChatBox, ...
├── Components/UI/        Pagination
├── Hooks/                useListingFilters
├── Layouts/              AppLayout
├── Pages/Listings/       Index, Show
└── types/                TypeScript interfaces

database/
├── migrations/           Listings table
└── seeders/data/         Pre-scraped 100 listings JSON

scripts/                  Otodom Playwright scraper
docker/                   Nginx, Supervisor, entrypoint configs
docs/                     Specs, plans, deployment guide
```

## Known Limitations

- Keyword search uses LIKE (sufficient for 100 rows, won't scale to thousands)
- Otodom scraper may break if site structure changes
- No user accounts or saved searches
- Image URLs point to Otodom CDN (may expire)
- Map view shows all listings on current page, not all results

## Future Improvements

- Full-text search (Meilisearch or Elasticsearch) for production scale
- Saved searches with email alerts
- Price history tracking
- Neighborhood insights (schools, transport, amenities)
- Server-side map clustering for large datasets
