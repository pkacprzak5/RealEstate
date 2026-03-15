# Real Estate Listings Platform — Design Spec

## Problem

Build a simplified smart real-estate listings platform for Kraków as a take-home assignment. Ingest ~100 listings (flats + houses, sale + rent) from Otodom.pl, normalize into MySQL (MySQL), and provide browse/search/details with map view, image galleries, and a vague-intent natural-language search. Deploy publicly on Railway.

## Locked Defaults

- City: Kraków
- Segments: flats + houses
- Markets: sale + rent
- Target corpus: ~100 listings (~25 per category)
- Language: Polish throughout (UI + content)
- Backend: Laravel
- Database: MySQL (Railway addon)
- Frontend: Inertia + React + TypeScript
- Styling: Tailwind
- Deployment: Railway
- Goal: temporary public clickable demo

## MVP Scope

### In scope

- Otodom scraper (4 categories: flat/house × sale/rent)
- Deterministic normalization + persistence in MySQL
- Seed JSON fallback for demo reliability
- Listings page with structured filters
- Grid view / map view toggle (Leaflet + OSM)
- Keyword search (LIKE — MySQL Cloud Starter may not support FULLTEXT; 100 rows = no concern)
- Vague-intent NL search (Gemini 2.5 Flash → structured filters)
- Smart area suggestion (data-driven, when rooms filter is active)
- Strict room range filtering
- Listing detail page with image gallery + location map
- Sorting (price, area, newest)
- Public Railway deployment
- Submission docs (README, reasoning doc, user journeys, demo script)

### Out of scope

- User accounts / auth
- Favorites / saved searches
- Multi-city
- Real-time price tracking
- Email alerts
- AI translation (content stays Polish)

## Source & Ingestion

### Source: Otodom.pl

Four search result pages:

| URL pattern | Type | Market |
|---|---|---|
| `/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow` | flat | sale |
| `/pl/wyniki/wynajem/mieszkanie/malopolskie/krakow` | flat | rent |
| `/pl/wyniki/sprzedaz/dom/malopolskie/krakow` | house | sale |
| `/pl/wyniki/wynajem/dom/malopolskie/krakow` | house | rent |

### Ingestion flow

1. `php artisan listings:import` — scrapes listing URLs from search pages, fetches each detail page
2. Parse structured fields deterministically (price, area, rooms, district, coordinates, images)
3. Upsert into `listings` table — deduplicate on `external_id`
4. Store raw HTML snapshot per listing for traceability
5. Log import stats: imported / skipped / failed

### Seed fallback

Ship `database/seeders/data/listings.json` with ~100 pre-scraped listings. `php artisan db:seed` works offline.

### Duplicate strategy

1. Exact `external_id` match → update existing record
2. Exact `source_url` match → update existing record
3. No fingerprint fallback needed — Otodom IDs are stable

### Missing-field handling

- `price`, `area`: nullable, shown as "Cena na zapytanie" / "Brak danych"
- `rooms`: nullable, filtered only when present
- `district`: nullable, fall back to "Kraków"
- `description`: if empty, show "Brak opisu"
- `published_at`: nullable, sort by `imported_at` as fallback

## Data Model

```sql
CREATE TABLE listings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    external_id VARCHAR(255) UNIQUE NOT NULL,
    source_name VARCHAR(50) NOT NULL DEFAULT 'otodom',
    source_url VARCHAR(500) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PLN',
    price_per_m2 DECIMAL(10,2) NULL,
    area_m2 DECIMAL(8,2) NULL,
    rooms TINYINT UNSIGNED NULL,
    floor TINYINT NULL,
    building_floors TINYINT NULL,
    property_type ENUM('flat','house') NOT NULL,
    market_type ENUM('sale','rent') NOT NULL,
    district VARCHAR(100) NULL,
    street VARCHAR(200) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    thumbnail_url VARCHAR(500) NULL,
    image_urls JSON NULL,
    published_at TIMESTAMP NULL,
    imported_at TIMESTAMP NOT NULL,
    normalization_status ENUM('complete','partial','failed') NOT NULL DEFAULT 'partial',
    raw_snapshot MEDIUMTEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,

    INDEX idx_property_market (property_type, market_type),
    INDEX idx_district (district),
    INDEX idx_price (price),
    INDEX idx_area (area_m2),
    INDEX idx_rooms (rooms),
    -- No FULLTEXT: MySQL compat; using LIKE for keyword search (100 rows)
);
```

## AI Features

### Feature B: Vague-intent search (query-time, Polish)

- **Problem:** Users type "przytulne 2-pokojowe blisko centrum do 500 tys"
- **Input:** Free-text Polish query
- **Output:** JSON `{property_type?, market_type?, min_price?, max_price?, min_rooms?, max_rooms?, district?, keywords?}`
- **Room filtering:** Strict — `WHERE rooms >= min_rooms AND rooms <= max_rooms`
- **Fallback:** If AI unavailable → full-text keyword search
- **Provider:** Claude API (Haiku)
- **UX:** "Zapytaj" tab shows chat box interface; AI interpretation shown as chat message bubble with "Zastosuj filtry" button. "Filtry" tab shows traditional structured filters + keyword search bar.

### Feature C: Smart area suggestion (data-driven)

- **Problem:** User filters to 4-5 rooms but doesn't know typical area
- **Approach:** Aggregate query on actual DB data for the filtered room range
- **UX:** When room filter is active, show: "Typowy metraż dla 4-5 pokoi: 80-120 m² — Dodaj filtr?"
- **Fallback:** If <5 listings match, don't show suggestion
- **Why not AI:** Real data is more defensible

## Frontend Architecture

### Route map

| Route | Page | Description |
|---|---|---|
| `/` | `Listings/Index` | Browse + search + filter + grid/map toggle |
| `/listings/{id}` | `Listings/Show` | Detail with image gallery + map |

### Component tree

```
Layout
├── Navbar ("Nieruchomości Kraków")
└── Pages
    ├── Listings/Index
    │   ├── SearchModeToggle (Filtry / Zapytaj)
    │   ├── [Filtry mode]
    │   │   ├── SearchBar (keyword search)
    │   │   ├── ActiveFilters (removable chips)
    │   │   └── FilterSidebar
    │   │       ├── PropertyTypeFilter (Mieszkanie / Dom)
    │   │       ├── MarketTypeFilter (Sprzedaż / Wynajem)
    │   │       ├── PriceRangeFilter
    │   │       ├── AreaRangeFilter
    │   │       ├── RoomsFilter (min-max strict range)
    │   │       ├── DistrictFilter (dropdown)
    │   │       └── AreaSuggestion (conditional, data-driven)
    │   ├── [Zapytaj mode — chat-style vague intent]
    │   │   └── ChatBox
    │   │       ├── ChatInput ("Opisz czego szukasz...")
    │   │       ├── ChatMessage (AI interpretation bubble)
    │   │       └── ParsedFiltersCard (editable, confirm/reset)
    │   ├── ViewToggle (Lista / Mapa)
    │   ├── SortDropdown (Cena, Metraż, Najnowsze)
    │   ├── ListingGrid (grid view)
    │   │   └── ListingCard
    │   ├── ListingMap (Leaflet + OSM)
    │   │   └── MapMarker → popup with mini card
    │   ├── Pagination
    │   ├── EmptyState ("Brak wyników...")
    │   └── LoadingState
    └── Listings/Show
        ├── ImageGallery (carousel/lightbox)
        ├── ListingHeader (title, price, badges)
        ├── ListingDetails (formatted table)
        ├── DescriptionSection
        ├── LocationMap (single-marker Leaflet)
        ├── SourceAttribution (Otodom link)
        └── BackToResults

```

### Responsive behavior

- FilterSidebar → slide-out drawer on mobile
- Map view full-width
- ListingGrid: 3-col → 2-col → 1-col
- Image gallery swipeable on mobile

### Data contract — Index page

```typescript
interface IndexPageProps {
  listings: Paginated<ListingSummary>;
  filters: ActiveFilters;
  districts: string[];
  areaSuggestion?: { min: number; max: number; count: number };
  intentParsed?: ParsedIntent;
}

interface ListingSummary {
  id: number;
  title: string;
  price: number | null;
  currency: string;
  area_m2: number | null;
  rooms: number | null;
  district: string | null;
  property_type: 'flat' | 'house';
  market_type: 'sale' | 'rent';
  thumbnail_url: string | null;
  latitude: number | null;
  longitude: number | null;
}
```

## Deployment

- App: Railway (Docker or buildpack)
- DB: MySQL Cloud Starter
- Seed data on deploy via `php artisan db:seed`
- Leaflet/OSM tiles: free, no API key
- Claude API: env var for vague-intent feature
