# Technical Reasoning

## Approach: Narrow Vertical Slice

I chose to build one complete, defensible vertical slice rather than breadth:

- **One city** (Kraków), **one source** (Otodom), **~100 listings** — enough to demonstrate the full flow without multi-source complexity.
- **Four categories** (flat/house × sale/rent, ~25 each) — shows the data model handles variation and ensures diverse offers for meaningful search.
- **Deterministic first, AI second** — all filtering, sorting, and display works without any AI. AI features are additive and every one has a deterministic fallback.

## Key Technical Decisions

### Data Source: Otodom via Playwright

Otodom is the largest Polish real estate portal with structured, rich data. Scraping with Playwright (non-headless) bypasses Cloudflare protection. The `#__NEXT_DATA__` JSON approach avoids fragile DOM parsing.

**Tradeoff:** Scraper is source-specific and may break if Otodom changes. Mitigated by shipping pre-scraped seed data — the demo always works regardless of scraper status.

### Database: MySQL on Railway

Railway's MySQL addon provides a managed database with zero setup. With ~100 rows, LIKE-based keyword search is fast enough and simpler than setting up FULLTEXT indexes.

**Tradeoff:** LIKE won't scale past ~10K rows. At that point, migrate to Meilisearch or add a FULLTEXT index. For 100-row MVP, simplicity wins.

### AI: Gemini 2.5 Flash — Intentional, Explainable, Fallback-First

Every AI feature uses **Gemini 2.5 Flash** and is designed to be intentional, explainable, and backed by deterministic fallbacks.

#### Conversational AI Search (4-step pipeline)

The AI Search lets users describe what they want in natural language — including soft preferences like "quiet neighborhood", "near a park", or "good for a family". The pipeline:

1. **PreferenceExtractor** — Gemini parses conversation into structured filters + soft preferences. Includes fuzzy district normalization for Kraków neighborhoods and sanity bounds on prices.
2. **CandidateRetriever** — pure SQL, no AI. Uses progressive filter relaxation (exact → price ±20% → drop district → drop area) to ensure at least 3 candidates.
3. **ListingRanker** — Gemini scores candidates 0–1 considering both hard filters and soft preferences (surroundings, amenities extracted from descriptions). Generates a Polish explanation per listing.
4. **Orchestrator** — ties it together with tracing (`trace_id`, latency, LLM call count).

The system can ask up to 2 clarifying questions when confidence is low. Falls back to deterministic ranking if Gemini is unavailable.

**Why this matters:** Users often don't think in structured filters. They think in terms of lifestyle ("quiet place near a park for my family"). This pipeline bridges that gap while keeping SQL retrieval deterministic and the AI layer explainable.

#### Listing Enrichment (Deterministic + AI)

A keyword-based `DeterministicEnricher` extracts 20+ structured features from Polish descriptions (condition, heating, parking, balcony, nearby Kraków POIs, year built, etc.) using longest-match-first ordering. For edge cases, optional Gemini-powered enrichment generates English summaries.

**Why deterministic first:** It's cheaper, faster, reproducible, and handles ~80% of cases. AI is reserved for the long tail where keyword matching falls short.

### Frontend: Inertia + React (No Separate API)

Inertia gives SPA-like navigation without building a separate API layer. All routing lives in Laravel, all state management is server-driven. This eliminates API versioning, authentication tokens, and client-side state sync for a demo app.

### Import: Upsert on external_id

Re-running the importer updates existing listings rather than creating duplicates. This makes the data pipeline idempotent — safe to run on every deploy via the seeder.

### Area Suggestions: Data-Driven, Not AI

When users filter by rooms, the system queries actual listing data to suggest a typical area range (10th–90th percentile). This is a simple SQL query, not an AI call — cheaper, faster, and deterministic.

### Deployment: Railway (App + MySQL)

Railway provides simple Docker-based deployment with automatic builds from the Dockerfile, plus a managed MySQL addon. Everything runs on one platform — low-cost, easy to set up, and sufficient for a temporary demo.

## What I Would Do Differently at Scale

- **Search:** Meilisearch or Elasticsearch for full-text, faceted search with typo tolerance
- **AI caching:** Cache LLM responses for similar queries to reduce latency (~2-4s currently) and cost
- **User accounts:** Saved favorites, search history, and AI assistant memory for personalized results over time
- **Data pipeline:** Scheduled scraper runs with change detection and notification
- **Map:** Server-side clustering (ST_ClusterDBSCAN) for thousands of markers
- **Caching:** Redis for filter dropdown values, popular search results, district stats
- **Monitoring:** Sentry for errors, query performance tracking, AI API usage dashboards
- **Image tagging:** Wire up existing Gemini Vision infrastructure for visual feature extraction
