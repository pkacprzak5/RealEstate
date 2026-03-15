# Nieruchomości Kraków

A smart real-estate listings platform for browsing apartments and houses in Kraków.

**Stack:** Laravel 12 · Inertia.js · React 18 · TypeScript · Tailwind CSS · Leaflet · MySQL · Gemini 2.5 Flash

**Live demo:** Deployed on Railway

## Features

- **Browse listings** — grid view with cards or interactive Leaflet map
- **Structured filters** — property type, market type, price range, area, rooms, district, keywords
- **AI conversational search** — describe what you're looking for in natural language; a multi-step Gemini 2.5 Flash pipeline extracts preferences, retrieves candidates via progressive SQL relaxation, ranks them with explanations, and can ask clarifying questions
- **Keyword search** — plain text search across titles, descriptions, districts
- **AI listing enrichment** — deterministic keyword extraction from Polish descriptions (condition, heating, parking, balcony, nearby POIs, etc.) with optional Gemini-powered summaries for edge cases
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

## AI Features

All AI features use **Gemini 2.5 Flash** and degrade gracefully — every feature has a deterministic fallback.

### Conversational AI Search

The AI Search panel lets users describe what they're looking for in natural language (e.g., *"przytulne mieszkanie blisko parku, spokojne, z balkonem"*). The backend runs a 4-step pipeline:

1. **PreferenceExtractor** — Gemini parses the conversation into structured filters + soft preferences (e.g., "quiet", "near park"). Includes fuzzy district normalization for Kraków neighborhoods.
2. **CandidateRetriever** — pure SQL with progressive filter relaxation (4 passes: exact → price ±20% → drop district → drop area) to ensure at least 3 candidates.
3. **ListingRanker** — Gemini scores candidates 0–1 and generates a Polish explanation for each, considering both hard filters and soft preferences like surroundings and amenities.
4. **Orchestrator** — ties it together with full tracing (`trace_id`, `latency_ms`, `llm_calls` count).

The system can also ask up to 2 clarifying questions when confidence is low. Falls back to deterministic ranking if Gemini is unavailable.

### Listing Enrichment

A deterministic keyword-based enricher extracts 20+ structured features from Polish descriptions (condition, heating, parking, balcony, nearby POIs, year built, etc.). For edge cases, an optional Gemini-powered enrichment generates English summaries and fills gaps the deterministic parser misses.

### Keyword Search

The structured filter tab supports keyword search — type any text and it searches across listing titles, descriptions, districts, and streets using LIKE matching. Sufficient for ~100 listings.

Requires `GEMINI_API_KEY` in `.env` for the AI conversational search.

## Production Deployment

Deployed on **Railway** with **MySQL** (MySQL-compatible). See [docs/deployment.md](docs/deployment.md) for full setup.

```bash
# Build Docker image
docker build -t real-estate .

# Run locally (needs DB env vars; Railway uses PORT env var)
docker run -p 8080:8080 --env-file .env real-estate
```

## Testing

```bash
php artisan test
# 20 tests, 104 assertions — covers controller, services, import command
```

## Project Structure

```
app/
├── Console/Commands/     ImportListings, EnrichListings
├── Http/Controllers/     ListingController, AiSearchController
├── Models/               Listing with scopes and accessors
└── Services/
    ├── AreaSuggestionService      Data-driven area range hints
    ├── Gemini/GeminiClient        Gemini 2.5 Flash API client
    └── AiSearch/                  Conversational AI search pipeline
        ├── PreferenceExtractor    NL → filters + soft preferences
        ├── CandidateRetriever     Progressive SQL filter relaxation
        ├── ListingRanker          Gemini-powered scoring + explanations
        ├── AiSearchOrchestrator   Pipeline orchestration + tracing
        ├── DeterministicEnricher  Keyword-based feature extraction
        └── Prompts                Prompt templates for Gemini

resources/js/
├── Components/Listings/  FilterSidebar, ListingCard, MapView, ...
├── Components/AiSearch/  AiSearchPanel, RecommendationsPanel, AiRecommendationCard
├── Components/UI/        Pagination
├── Hooks/                useListingFilters, useAiSearch
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

- Keyword search uses LIKE (sufficient for ~100 rows, won't scale to thousands)
- AI search makes 2–3 live Gemini calls per request (~2-4s latency), no response caching
- Otodom scraper may break if site structure changes
- No user accounts or saved searches
- Image URLs point to Otodom CDN (may expire)
- Map view shows all listings on current page, not all results
- Deterministic enricher uses substring matching without Polish stemming/lemmatization

## Future Improvements

- Full-text search (Meilisearch or Elasticsearch) for production scale
- LLM response caching for similar queries to reduce latency and cost
- User accounts with saved favorites and AI search history for personalized results
- Image tagging via Gemini Vision (infrastructure exists, not yet wired up)
- Polish NLP improvements (stemming/lemmatization) for better keyword extraction
- Price history tracking
- Server-side map clustering for large datasets
