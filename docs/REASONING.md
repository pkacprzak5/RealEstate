# Technical Reasoning

## Approach: Narrow Vertical Slice

I chose to build one complete, defensible vertical slice rather than breadth:

- **One city** (Kraków), **one source** (Otodom), **~100 listings** — enough to demonstrate the full flow without multi-source complexity.
- **Four categories** (flat/house × sale/rent) — shows the data model handles variation without over-complicating scope.
- **Deterministic first, AI second** — all filtering, sorting, and display works without any AI. The natural language search is additive.

## Key Technical Decisions

### Data Source: Otodom via Playwright

Otodom is the largest Polish real estate portal with structured, rich data. Scraping with Playwright (non-headless) bypasses Cloudflare protection. The `#__NEXT_DATA__` JSON approach avoids fragile DOM parsing.

**Tradeoff:** Scraper is source-specific and may break if Otodom changes. Mitigated by shipping pre-scraped seed data — the demo always works regardless of scraper status.

### Database: TiDB Cloud (MySQL-compatible)

TiDB's free tier provides a production-grade MySQL-compatible database. No FULLTEXT index support, but with 100 rows LIKE-based search is fast enough and simpler.

**Tradeoff:** LIKE won't scale past ~10K rows. At that point, migrate to Meilisearch or add a FULLTEXT index on standard MySQL. For 100-row MVP, simplicity wins.

### AI Feature: Intent Parsing, Not Generation

The Claude API converts natural language to structured filters — a bounded, explainable transformation with a clear fallback (keyword search). This is more defensible than AI-generated rankings or summaries because:

1. The output is verifiable (you can see exactly which filters were extracted)
2. The fallback is functional (keyword search still works)
3. The cost is minimal (one small Haiku call per query)
4. The behavior is logged and traceable

### Frontend: Inertia + React (No Separate API)

Inertia gives SPA-like navigation without building a separate API layer. All routing lives in Laravel, all state management is server-driven. This eliminates API versioning, authentication tokens, and client-side state sync for a demo app.

### Import: Upsert on external_id

Re-running the importer updates existing listings rather than creating duplicates. This makes the data pipeline idempotent — safe to run on every deploy via the seeder.

### Area Suggestions: Data-Driven, Not AI

When users filter by rooms, the system queries actual listing data to suggest a typical area range (10th-90th percentile). This is a simple SQL query, not an AI call — cheaper, faster, and deterministic.

## What I Would Do Differently at Scale

- **Search:** Meilisearch or Elasticsearch for full-text, faceted search with typo tolerance
- **Data pipeline:** Scheduled scraper runs with change detection and notification
- **Map:** Server-side clustering (ST_ClusterDBSCAN) for thousands of markers
- **Caching:** Redis for filter dropdown values, popular search results, district stats
- **Monitoring:** Sentry for errors, query performance tracking, AI API usage dashboards
