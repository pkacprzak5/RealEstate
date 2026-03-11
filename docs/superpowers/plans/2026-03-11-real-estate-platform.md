# Real Estate Platform Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a smart real-estate listings platform for Kraków with Otodom ingestion (Playwright), structured search, AI-powered vague-intent search, map view, and image galleries. Polish UI throughout.

**Architecture:** Laravel 11 backend with Inertia.js serving React/TypeScript frontend. Node.js Playwright script scrapes Otodom → JSON file → PHP artisan command imports into TiDB (MySQL-compatible). Two-page app: listings index (grid/map toggle + filters + NL search) and listing detail (gallery + map). Claude Haiku powers vague-intent query parsing with keyword search fallback.

**Tech Stack:** Laravel 11, Inertia.js, React 18, TypeScript, Tailwind CSS 3, Leaflet + react-leaflet, Playwright (scraping), TiDB Cloud Starter, Koyeb (Docker), Claude API (Haiku)

**Spec:** `docs/superpowers/specs/2026-03-11-real-estate-platform-design.md`

**Spec overrides from CLAUDE.md:** Polish UI throughout (CLAUDE.md defaults to English UI; changed per user decision). LIKE keyword search instead of FULLTEXT (TiDB Cloud Starter compatibility; 100 rows = no performance concern).

---

## File Map

### Created Files

```
# Scraper
scripts/scrape-otodom.mjs              — Playwright scraper, outputs JSON

# Backend
app/Models/Listing.php                  — Eloquent model with casts, scopes, accessors
app/Http/Controllers/ListingController.php — index (filtered/sorted/paginated) + show
app/Services/IntentParserService.php    — Claude Haiku vague-intent → structured filters
app/Services/AreaSuggestionService.php  — Data-driven area range for room count
app/Console/Commands/ImportListings.php — Reads JSON, normalizes, upserts into DB

# Database
database/migrations/2026_03_11_000001_create_listings_table.php
database/seeders/ListingSeeder.php      — Reads seed JSON, inserts listings
database/seeders/data/listings.json     — Pre-scraped ~100 listings (demo fallback)

# Frontend - Pages
resources/js/types/index.ts             — Shared TypeScript interfaces
resources/js/Layouts/AppLayout.tsx       — Shell layout with Navbar
resources/js/Pages/Listings/Index.tsx    — Browse/search/filter/map page
resources/js/Pages/Listings/Show.tsx     — Detail with gallery + map

# Frontend - Components
resources/js/Components/Listings/SearchBar.tsx
resources/js/Components/Listings/ChatBox.tsx          — Chat-style vague-intent search (assignment Example B)
resources/js/Components/Listings/ActiveFilters.tsx
resources/js/Components/Listings/FilterSidebar.tsx
resources/js/Components/Listings/ListingGrid.tsx
resources/js/Components/Listings/ListingCard.tsx
resources/js/Components/Listings/ListingMap.tsx
resources/js/Components/Listings/ImageGallery.tsx
resources/js/Components/Listings/AreaSuggestion.tsx
resources/js/Components/Listings/ViewToggle.tsx
resources/js/Components/Listings/SortDropdown.tsx
resources/js/Components/Listings/EmptyState.tsx
resources/js/Components/Listings/LoadingOverlay.tsx
resources/js/Components/UI/Pagination.tsx

# Frontend - Hooks
resources/js/Hooks/useListingFilters.ts — Filter state management + URL sync

# Deployment
Dockerfile                              — Multi-stage: build assets + PHP runtime
docker-entrypoint.sh                    — Runtime: config cache + migrate + conditional seed
docker-compose.yml                      — Local dev with MySQL
.dockerignore

# Docs
docs/README.md
docs/REASONING.md
docs/USER_JOURNEYS.md
docs/DEMO_SCRIPT.md
```

### Modified Files

```
routes/web.php                          — Add listing routes
config/services.php                     — Add anthropic config
database/seeders/DatabaseSeeder.php     — Call ListingSeeder
.env.example                            — Add all required env vars
package.json                            — Add leaflet, react-leaflet, playwright
vite.config.js                          — Ensure aliases work
```

---

## Chunk 1: Project Bootstrap + Database

### Task 1: Scaffold Laravel with Inertia + React + TypeScript + Tailwind

**Files:**
- Create: entire Laravel project in current directory
- Preserve: `CLAUDE.md`, `.claude/`, `.mcp.json`, `docs/`, `.git/`

**Why Breeze:** Gives us Inertia + React + TS + Tailwind + Vite pre-configured. We delete auth pages but keep the infrastructure.

- [ ] **Step 1: Create Laravel project in temp directory**

```bash
composer create-project laravel/laravel /tmp/real-estate-scaffold
```

- [ ] **Step 2: Install Breeze with React + TypeScript**

```bash
cd /tmp/real-estate-scaffold
composer require laravel/breeze --dev
php artisan breeze:install react --typescript --no-interaction
npm install
```

- [ ] **Step 3: Copy scaffold to project directory (preserving existing files)**

```bash
rsync -av \
  --exclude='.git' \
  --exclude='CLAUDE.md' \
  --exclude='.claude' \
  --exclude='.mcp.json' \
  --exclude='docs' \
  /tmp/real-estate-scaffold/ /Users/piotrkacprzak/programow/RealEstate/
rm -rf /tmp/real-estate-scaffold
```

- [ ] **Step 4: Install frontend dependencies for map + scraping**

```bash
cd /Users/piotrkacprzak/programow/RealEstate
npm install leaflet react-leaflet @types/leaflet
npm install -D playwright
npx playwright install chromium
```

- [ ] **Step 5: Remove Breeze auth scaffolding we don't need**

Delete these files/directories:
- `resources/js/Pages/Auth/` (entire directory)
- `resources/js/Pages/Profile/` (entire directory)
- `resources/js/Pages/Dashboard.tsx`
- `app/Http/Controllers/Auth/` (entire directory)
- `app/Http/Controllers/ProfileController.php`

Remove auth routes from `routes/web.php` and `routes/auth.php`. Delete `routes/auth.php`.

- [ ] **Step 6: Verify scaffold works**

```bash
npm run build
php artisan serve &
# Visit http://localhost:8000 — should show Laravel welcome page
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Laravel 11 + Inertia/React/TS + Tailwind + Leaflet"
```

**Acceptance criteria:**
- `php artisan serve` starts without errors
- `npm run build` completes without errors
- `npm run dev` starts Vite dev server
- No auth pages remain
- Leaflet and react-leaflet importable

---

### Task 2: Configure database + create listings migration

**Files:**
- Modify: `.env.example`, `.env`
- Create: `database/migrations/2026_03_11_000001_create_listings_table.php`
- Create: `docker-compose.yml` (local MySQL)

- [ ] **Step 1: Create docker-compose.yml for local MySQL**

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: real_estate
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

- [ ] **Step 2: Update .env for local MySQL**

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=real_estate
DB_USERNAME=root
DB_PASSWORD=password
```

- [ ] **Step 3: Update .env.example with all project env vars**

Add to `.env.example`:
```
# Database (local: MySQL via docker-compose, prod: TiDB Cloud)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=real_estate
DB_USERNAME=root
DB_PASSWORD=password
# TiDB requires: MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt

# Claude API (for vague-intent search)
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# App
APP_LOCALE=pl
```

- [ ] **Step 4: Create listings migration**

```bash
php artisan make:migration create_listings_table
```

Migration content:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('source_name', 50)->default('otodom');
            $table->string('source_url', 500);
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency', 3)->default('PLN');
            $table->decimal('price_per_m2', 10, 2)->nullable();
            $table->decimal('area_m2', 8, 2)->nullable();
            $table->unsignedTinyInteger('rooms')->nullable();
            $table->tinyInteger('floor')->nullable();
            $table->unsignedTinyInteger('building_floors')->nullable();
            $table->enum('property_type', ['flat', 'house']);
            $table->enum('market_type', ['sale', 'rent']);
            $table->string('district', 100)->nullable();
            $table->string('street', 200)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->json('image_urls')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('imported_at');
            $table->enum('normalization_status', ['complete', 'partial', 'failed'])->default('partial');
            $table->mediumText('raw_snapshot')->nullable();
            $table->timestamps();

            $table->index(['property_type', 'market_type'], 'idx_property_market');
            $table->index('district', 'idx_district');
            $table->index('price', 'idx_price');
            $table->index('area_m2', 'idx_area');
            $table->index('rooms', 'idx_rooms');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
```

Note: No FULLTEXT index — TiDB Cloud Starter may not support it. Use `LIKE` for keyword search (100 rows = zero performance concern).

- [ ] **Step 5: Start MySQL and run migration**

```bash
docker compose up -d mysql
# Wait for healthy
php artisan migrate
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: database config + listings migration"
```

**Acceptance criteria:**
- `php artisan migrate` runs without errors
- `listings` table exists with all columns
- `.env.example` documents all required env vars

---

### Task 3: Create Listing model

**Files:**
- Create: `app/Models/Listing.php`

- [ ] **Step 1: Create Listing model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Listing extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'price_per_m2' => 'decimal:2',
            'area_m2' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'image_urls' => 'array',
            'published_at' => 'datetime',
            'imported_at' => 'datetime',
            'rooms' => 'integer',
            'floor' => 'integer',
            'building_floors' => 'integer',
        ];
    }

    // --- Scopes ---

    public function scopePropertyType(Builder $query, ?string $type): Builder
    {
        return $type ? $query->where('property_type', $type) : $query;
    }

    public function scopeMarketType(Builder $query, ?string $type): Builder
    {
        return $type ? $query->where('market_type', $type) : $query;
    }

    public function scopeDistrict(Builder $query, ?string $district): Builder
    {
        return $district ? $query->where('district', $district) : $query;
    }

    public function scopePriceBetween(Builder $query, ?float $min, ?float $max): Builder
    {
        if ($min) $query->where('price', '>=', $min);
        if ($max) $query->where('price', '<=', $max);
        return $query;
    }

    public function scopeAreaBetween(Builder $query, ?float $min, ?float $max): Builder
    {
        if ($min) $query->where('area_m2', '>=', $min);
        if ($max) $query->where('area_m2', '<=', $max);
        return $query;
    }

    public function scopeRoomsBetween(Builder $query, ?int $min, ?int $max): Builder
    {
        if ($min) $query->where('rooms', '>=', $min);
        if ($max) $query->where('rooms', '<=', $max);
        return $query;
    }

    public function scopeKeywordSearch(Builder $query, ?string $keyword): Builder
    {
        if (!$keyword) return $query;

        return $query->where(function (Builder $q) use ($keyword) {
            $term = '%' . $keyword . '%';
            $q->where('title', 'LIKE', $term)
              ->orWhere('description', 'LIKE', $term)
              ->orWhere('district', 'LIKE', $term)
              ->orWhere('street', 'LIKE', $term);
        });
    }

    // --- Accessors ---

    public function getFormattedPriceAttribute(): string
    {
        if ($this->price === null) return 'Cena na zapytanie';
        return number_format($this->price, 0, ',', ' ') . ' ' . $this->currency;
    }

    public function getFormattedAreaAttribute(): string
    {
        if ($this->area_m2 === null) return 'Brak danych';
        return number_format($this->area_m2, 1, ',', ' ') . ' m²';
    }

    public function getPropertyTypeLabelAttribute(): string
    {
        return match($this->property_type) {
            'flat' => 'Mieszkanie',
            'house' => 'Dom',
            default => $this->property_type,
        };
    }

    public function getMarketTypeLabelAttribute(): string
    {
        return match($this->market_type) {
            'sale' => 'Sprzedaż',
            'rent' => 'Wynajem',
            default => $this->market_type,
        };
    }

    public function hasCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/Models/Listing.php
git commit -m "feat: Listing model with scopes, casts, accessors"
```

**Acceptance criteria:**
- Model loads without errors
- Scopes chain correctly (verify in tinker: `Listing::propertyType('flat')->marketType('sale')->toSql()`)

---

## Chunk 2: Ingestion Pipeline

### Task 4: Otodom Playwright scraper script

**Files:**
- Create: `scripts/scrape-otodom.mjs`

**Context:** Otodom returns 403 for plain HTTP requests (Cloudflare). Playwright with a real browser bypasses this. The scraper runs as a standalone Node.js script, outputting JSON that the PHP import command reads. This clean separation means the import command works identically with scraped data or seed data.

- [ ] **Step 1: Verify Otodom page structure**

Before writing the full scraper, manually verify the data structure:

```bash
cd /Users/piotrkacprzak/programow/RealEstate
node --input-type=module -e "
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow?limit=3');
await page.waitForSelector('#__NEXT_DATA__');
const data = await page.evaluate(() => {
  const el = document.querySelector('#__NEXT_DATA__');
  return el ? JSON.parse(el.textContent) : null;
});
console.log(JSON.stringify(data?.props?.pageProps, null, 2).slice(0, 3000));
await browser.close();
"
```

Inspect the output. Identify the exact paths for:
- `searchAds.items` (listing array)
- Each item's fields: id, title, price, area, rooms, location, images, estate, transaction
- Pagination info

Save a sample to `scripts/sample-search-response.json` for reference.

Then verify a detail page:
```bash
# Use a slug from the search results
node --input-type=module -e "
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto('https://www.otodom.pl/pl/oferta/SLUG_FROM_SEARCH');
await page.waitForSelector('#__NEXT_DATA__');
const data = await page.evaluate(() => {
  const el = document.querySelector('#__NEXT_DATA__');
  return el ? JSON.parse(el.textContent) : null;
});
console.log(JSON.stringify(data?.props?.pageProps, null, 2).slice(0, 5000));
await browser.close();
"
```

Save to `scripts/sample-detail-response.json`.

**Adapt the parser in Step 2 based on the actual structure found here.**

- [ ] **Step 2: Write the scraper script**

Create `scripts/scrape-otodom.mjs`:

```javascript
// scripts/scrape-otodom.mjs
//
// Scrapes Otodom listings for Kraków using Playwright.
// Outputs JSON to stdout or a file.
//
// Usage:
//   node scripts/scrape-otodom.mjs                          # stdout
//   node scripts/scrape-otodom.mjs --output storage/app/scraped-listings.json
//   node scripts/scrape-otodom.mjs --limit 25               # per category

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const CATEGORIES = [
  { url: '/pl/wyniki/sprzedaz/mieszkanie/malopolskie/krakow', property_type: 'flat', market_type: 'sale' },
  { url: '/pl/wyniki/wynajem/mieszkanie/malopolskie/krakow', property_type: 'flat', market_type: 'rent' },
  { url: '/pl/wyniki/sprzedaz/dom/malopolskie/krakow', property_type: 'house', market_type: 'sale' },
  { url: '/pl/wyniki/wynajem/dom/malopolskie/krakow', property_type: 'house', market_type: 'rent' },
];

const BASE_URL = 'https://www.otodom.pl';
const DELAY_MS = 1500; // polite delay between requests

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { output: null, limit: 25 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) opts.output = args[++i];
    if (args[i] === '--limit' && args[i + 1]) opts.limit = parseInt(args[++i], 10);
  }
  return opts;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function extractNextData(page) {
  return page.evaluate(() => {
    const el = document.querySelector('#__NEXT_DATA__');
    return el ? JSON.parse(el.textContent) : null;
  });
}

// Maps Otodom room strings to integers
// ADAPT this mapping based on actual values found in Step 1
function parseRooms(value) {
  if (typeof value === 'number') return value;
  const map = {
    'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
    'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
  };
  return map[value] ?? (typeof value === 'string' && /^\d+$/.test(value) ? parseInt(value) : null);
}

// Parse a single listing from search result item
// ADAPT field paths based on actual structure from Step 1
function parseSearchItem(item, category) {
  return {
    external_id: String(item.id),
    slug: item.slug || null,
    title: item.title || 'Brak tytułu',
    price: item.totalPrice?.value ?? null,
    currency: item.totalPrice?.currency ?? 'PLN',
    price_per_m2: item.pricePerSquareMeter?.value ?? null,
    area_m2: item.areaInSquareMeters ?? null,
    rooms: parseRooms(item.roomsNumber),
    property_type: category.property_type,
    market_type: category.market_type,
    district: item.location?.address?.district?.name ?? null,
    street: item.location?.address?.street?.name ?? null,
    latitude: item.location?.mapDetails?.latitude ?? null,
    longitude: item.location?.mapDetails?.longitude ?? null,
    thumbnail_url: item.images?.[0]?.large ?? item.images?.[0]?.medium ?? null,
    image_urls: (item.images || []).map(img => img.large || img.medium || img.small).filter(Boolean),
    published_at: item.dateCreatedFirst ?? item.dateCreated ?? null,
    source_url: item.slug ? `${BASE_URL}/pl/oferta/${item.slug}` : null,
  };
}

// Enrich listing with detail page data (description, more images, floor)
// ADAPT field paths based on actual structure from Step 1
async function enrichFromDetailPage(page, listing) {
  if (!listing.source_url) return listing;

  try {
    await page.goto(listing.source_url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#__NEXT_DATA__', { timeout: 5000 });
    const data = await extractNextData(page);
    const ad = data?.props?.pageProps?.ad;

    if (ad) {
      listing.description = ad.description ?? listing.description ?? null;
      listing.floor = ad.target?.Floor_no?.[0] != null ? parseInt(ad.target.Floor_no[0]) : null;
      listing.building_floors = ad.target?.Building_floors_num?.[0] != null
        ? parseInt(ad.target.Building_floors_num[0]) : null;

      // Get all images from detail page (usually more than search results)
      if (ad.images?.length) {
        listing.image_urls = ad.images.map(img => img.large || img.medium || img.small).filter(Boolean);
        listing.thumbnail_url = listing.image_urls[0] ?? listing.thumbnail_url;
      }
    }

    listing.raw_snapshot = JSON.stringify(data?.props?.pageProps ?? {});
  } catch (err) {
    console.error(`  Warning: could not enrich ${listing.external_id}: ${err.message}`);
  }

  return listing;
}

async function scrapeCategory(browser, category, limit) {
  const page = await browser.newPage();
  const listings = [];

  try {
    // Fetch search results (first page, or paginate if needed)
    const pagesNeeded = Math.ceil(limit / 24); // Otodom typically shows 24 per page
    for (let p = 1; p <= pagesNeeded && listings.length < limit; p++) {
      const url = `${BASE_URL}${category.url}?page=${p}&limit=24`;
      console.error(`  Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('#__NEXT_DATA__', { timeout: 5000 });

      const data = await extractNextData(page);
      // ADAPT this path based on actual structure
      const items = data?.props?.pageProps?.data?.searchAds?.items || [];

      if (items.length === 0) {
        console.error(`  No items found on page ${p}`);
        break;
      }

      for (const item of items) {
        if (listings.length >= limit) break;
        const parsed = parseSearchItem(item, category);
        listings.push(parsed);
      }

      await sleep(DELAY_MS);
    }

    // Enrich each listing with detail page data
    console.error(`  Enriching ${listings.length} listings from detail pages...`);
    for (let i = 0; i < listings.length; i++) {
      console.error(`  [${i + 1}/${listings.length}] ${listings[i].external_id}`);
      await enrichFromDetailPage(page, listings[i]);
      await sleep(DELAY_MS);
    }
  } catch (err) {
    console.error(`  Error in category ${category.property_type}/${category.market_type}: ${err.message}`);
  } finally {
    await page.close();
  }

  return listings;
}

async function main() {
  const opts = parseArgs();
  const browser = await chromium.launch({ headless: true });
  const allListings = [];

  try {
    for (const category of CATEGORIES) {
      console.error(`\nScraping: ${category.property_type} / ${category.market_type}`);
      const listings = await scrapeCategory(browser, category, opts.limit);
      console.error(`  Got ${listings.length} listings`);
      allListings.push(...listings);
    }
  } finally {
    await browser.close();
  }

  // Compute normalization status
  for (const l of allListings) {
    const hasCore = l.title && l.price != null && l.area_m2 != null && l.rooms != null;
    const hasFull = hasCore && l.description && l.district;
    l.normalization_status = hasFull ? 'complete' : hasCore ? 'partial' : 'failed';
  }

  const output = JSON.stringify(allListings, null, 2);

  if (opts.output) {
    const outPath = resolve(opts.output);
    writeFileSync(outPath, output);
    console.error(`\nWrote ${allListings.length} listings to ${outPath}`);
  } else {
    process.stdout.write(output);
  }

  // Print stats
  const stats = {
    total: allListings.length,
    complete: allListings.filter(l => l.normalization_status === 'complete').length,
    partial: allListings.filter(l => l.normalization_status === 'partial').length,
    failed: allListings.filter(l => l.normalization_status === 'failed').length,
    withImages: allListings.filter(l => l.image_urls?.length > 0).length,
    withCoordinates: allListings.filter(l => l.latitude != null).length,
  };
  console.error('\nStats:', JSON.stringify(stats, null, 2));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
```

- [ ] **Step 3: Test the scraper with small limit**

```bash
node scripts/scrape-otodom.mjs --limit 2 --output storage/app/test-scrape.json
cat storage/app/test-scrape.json | head -100
```

Verify: JSON contains listings with expected fields. Adapt parser paths if needed based on actual Otodom structure.

- [ ] **Step 4: Run full scrape (~25 per category)**

```bash
node scripts/scrape-otodom.mjs --limit 25 --output storage/app/scraped-listings.json
```

Expected: ~100 listings in JSON. Takes ~5-10 minutes with polite delays.

- [ ] **Step 5: Copy scraped data as seed file**

```bash
cp storage/app/scraped-listings.json database/seeders/data/listings.json
```

- [ ] **Step 6: Commit scraper**

```bash
git add scripts/scrape-otodom.mjs database/seeders/data/listings.json
git commit -m "feat: Otodom Playwright scraper + seed data"
```

**Acceptance criteria:**
- Scraper runs without errors
- Output JSON has ~100 listings with: external_id, title, price, area_m2, rooms, property_type, market_type, image_urls, latitude/longitude (most listings)
- Seed JSON file committed to repo

---

### Task 5: Import artisan command

**Files:**
- Create: `app/Console/Commands/ImportListings.php`

- [ ] **Step 1: Write the import command**

```php
<?php

namespace App\Console\Commands;

use App\Models\Listing;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class ImportListings extends Command
{
    protected $signature = 'listings:import
        {file? : Path to JSON file (default: storage/app/scraped-listings.json)}
        {--seed : Use seed file from database/seeders/data/listings.json}
        {--dry-run : Parse and validate without inserting}';

    protected $description = 'Import listings from a JSON file into the database';

    public function handle(): int
    {
        $file = $this->resolveFile();

        if (!file_exists($file)) {
            $this->error("File not found: {$file}");
            return self::FAILURE;
        }

        $raw = json_decode(file_get_contents($file), true);

        if (!is_array($raw)) {
            $this->error('Invalid JSON: expected an array of listings');
            return self::FAILURE;
        }

        $this->info("Importing from: {$file}");
        $count = count($raw);
        $this->info("Found {$count} listings");

        $stats = ['imported' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0];

        $bar = $this->output->createProgressBar(count($raw));
        $bar->start();

        foreach ($raw as $item) {
            try {
                $result = $this->upsertListing($item);
                $stats[$result]++;
            } catch (\Throwable $e) {
                $stats['failed']++;
                Log::warning('Import failed for listing', [
                    'external_id' => $item['external_id'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ]);
                if ($this->output->isVerbose()) {
                    $this->warn("  Failed: {$e->getMessage()}");
                }
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(
            ['Imported', 'Updated', 'Skipped', 'Failed'],
            [[$stats['imported'], $stats['updated'], $stats['skipped'], $stats['failed']]]
        );

        return self::SUCCESS;
    }

    private function resolveFile(): string
    {
        if ($this->option('seed')) {
            return database_path('seeders/data/listings.json');
        }
        return $this->argument('file') ?? storage_path('app/scraped-listings.json');
    }

    private function upsertListing(array $item): string
    {
        $externalId = $item['external_id'] ?? null;

        if (!$externalId) {
            return 'skipped';
        }

        $sourceUrl = $item['source_url'] ?? '';
        if (empty($sourceUrl)) {
            Log::warning('Import: listing has no source_url, skipping', ['external_id' => $externalId]);
            return 'skipped';
        }

        if ($this->option('dry-run')) {
            return 'imported';
        }

        $data = [
            'external_id' => $externalId,
            'source_name' => 'otodom',
            'source_url' => $sourceUrl,
            'title' => $item['title'] ?? 'Brak tytułu',
            'description' => $item['description'] ?? null,
            'price' => $item['price'] ?? null,
            'currency' => $item['currency'] ?? 'PLN',
            'price_per_m2' => $item['price_per_m2'] ?? null,
            'area_m2' => $item['area_m2'] ?? null,
            'rooms' => $item['rooms'] ?? null,
            'floor' => $item['floor'] ?? null,
            'building_floors' => $item['building_floors'] ?? null,
            'property_type' => $item['property_type'] ?? 'flat',
            'market_type' => $item['market_type'] ?? 'sale',
            'district' => $item['district'] ?? null,
            'street' => $item['street'] ?? null,
            'latitude' => $item['latitude'] ?? null,
            'longitude' => $item['longitude'] ?? null,
            'thumbnail_url' => $item['thumbnail_url'] ?? null,
            'image_urls' => $item['image_urls'] ?? [],
            'published_at' => isset($item['published_at']) ? Carbon::parse($item['published_at']) : null,
            'imported_at' => now(),
            'normalization_status' => $item['normalization_status'] ?? 'partial',
            'raw_snapshot' => $item['raw_snapshot'] ?? null,
        ];

        $existing = Listing::where('external_id', $externalId)->first();

        if ($existing) {
            $existing->update($data);
            return 'updated';
        }

        Listing::create($data);
        return 'imported';
    }
}
```

- [ ] **Step 2: Test the import command with seed data**

```bash
php artisan listings:import --seed
php artisan tinker --execute="echo App\Models\Listing::count();"
```

Expected: ~100 listings in database.

- [ ] **Step 3: Verify data quality in tinker**

```bash
php artisan tinker --execute="
  \$l = App\Models\Listing::first();
  echo \$l->title . PHP_EOL;
  echo \$l->formatted_price . PHP_EOL;
  echo \$l->property_type_label . PHP_EOL;
  echo count(\$l->image_urls) . ' images' . PHP_EOL;
"
```

- [ ] **Step 4: Commit**

```bash
git add app/Console/Commands/ImportListings.php
git commit -m "feat: listings:import artisan command with upsert + stats"
```

**Acceptance criteria:**
- `php artisan listings:import --seed` imports all seed listings
- Re-running updates existing records (idempotent)
- `--dry-run` flag works
- Failed imports are logged, don't crash the batch

---

### Task 6: ListingSeeder for database seeding

**Files:**
- Create: `database/seeders/ListingSeeder.php`
- Modify: `database/seeders/DatabaseSeeder.php`

- [ ] **Step 1: Create ListingSeeder**

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class ListingSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('listings:import', ['--seed' => true]);
        $this->command->info(Artisan::output());
    }
}
```

- [ ] **Step 2: Register in DatabaseSeeder**

In `database/seeders/DatabaseSeeder.php`:

```php
public function run(): void
{
    $this->call([
        ListingSeeder::class,
    ]);
}
```

- [ ] **Step 3: Test**

```bash
php artisan migrate:fresh --seed
php artisan tinker --execute="echo App\Models\Listing::count();"
```

- [ ] **Step 4: Commit**

```bash
git add database/seeders/
git commit -m "feat: ListingSeeder delegates to import command"
```

**Acceptance criteria:**
- `php artisan db:seed` imports all listings from seed JSON
- `php artisan migrate:fresh --seed` gives a clean, populated database

---

## Chunk 3: Backend API + AI

### Task 7: Routes + ListingController::index

**Files:**
- Create: `app/Http/Controllers/ListingController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Define routes**

Replace content of `routes/web.php`:

```php
<?php

use App\Http\Controllers\ListingController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ListingController::class, 'index'])->name('listings.index');
Route::get('/listings/{listing}', [ListingController::class, 'show'])->name('listings.show');
```

- [ ] **Step 2: Write ListingController**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Services\AreaSuggestionService;
use App\Services\IntentParserService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends Controller
{
    public function index(Request $request, IntentParserService $intentParser, AreaSuggestionService $areaSuggestion): Response
    {
        $filters = $this->extractFilters($request);
        $intentParsed = null;

        // Always parse NL query when present; structured filters override AI-parsed ones
        $nlQuery = $request->input('q');
        if ($nlQuery) {
            $intentParsed = $intentParser->parse($nlQuery);
            if ($intentParsed) {
                // AI-parsed filters are defaults; explicit structured filters take priority
                $filters = array_merge(array_filter($intentParsed), $filters);
            }
        }

        $query = Listing::query()
            ->propertyType($filters['property_type'] ?? null)
            ->marketType($filters['market_type'] ?? null)
            ->district($filters['district'] ?? null)
            ->priceBetween($filters['min_price'] ?? null, $filters['max_price'] ?? null)
            ->areaBetween($filters['min_area'] ?? null, $filters['max_area'] ?? null)
            ->roomsBetween($filters['min_rooms'] ?? null, $filters['max_rooms'] ?? null)
            ->keywordSearch($filters['keywords'] ?? $nlQuery);

        // Sorting
        // Sorting: push nulls to end rather than excluding them
        $sort = $request->input('sort', 'newest');
        $query = match ($sort) {
            'price_asc' => $query->orderByRaw('price IS NULL, price ASC'),
            'price_desc' => $query->orderByRaw('price IS NULL, price DESC'),
            'area_asc' => $query->orderByRaw('area_m2 IS NULL, area_m2 ASC'),
            'area_desc' => $query->orderByRaw('area_m2 IS NULL, area_m2 DESC'),
            default => $query->orderByRaw('COALESCE(published_at, imported_at) DESC'),
        };

        // Exclude heavy fields from index page payload
        $query->select([
            'id', 'title', 'price', 'currency', 'price_per_m2', 'area_m2',
            'rooms', 'property_type', 'market_type', 'district', 'street',
            'latitude', 'longitude', 'thumbnail_url', 'published_at', 'imported_at',
        ]);

        $listings = $query->paginate(24)->withQueryString();

        // Area suggestion (only when rooms filter is active)
        $areaSuggestionData = null;
        $minRooms = $filters['min_rooms'] ?? null;
        $maxRooms = $filters['max_rooms'] ?? null;
        if ($minRooms || $maxRooms) {
            $areaSuggestionData = $areaSuggestion->suggest(
                (int) ($minRooms ?? $maxRooms),
                (int) ($maxRooms ?? $minRooms),
                $filters['property_type'] ?? null,
            );
        }

        // Distinct districts for filter dropdown
        $districts = Listing::whereNotNull('district')
            ->distinct()
            ->orderBy('district')
            ->pluck('district')
            ->toArray();

        return Inertia::render('Listings/Index', [
            'listings' => $listings,
            'filters' => $filters,
            'sort' => $sort,
            'districts' => $districts,
            'areaSuggestion' => $areaSuggestionData,
            'intentParsed' => $intentParsed,
            'query' => $nlQuery,
        ]);
    }

    public function show(Listing $listing): Response
    {
        return Inertia::render('Listings/Show', [
            'listing' => $listing->makeHidden('raw_snapshot'),
        ]);
    }

    private function extractFilters(Request $request): array
    {
        return array_filter([
            'property_type' => $request->input('property_type'),
            'market_type' => $request->input('market_type'),
            'district' => $request->input('district'),
            'min_price' => $request->input('min_price') ? (float) $request->input('min_price') : null,
            'max_price' => $request->input('max_price') ? (float) $request->input('max_price') : null,
            'min_area' => $request->input('min_area') ? (float) $request->input('min_area') : null,
            'max_area' => $request->input('max_area') ? (float) $request->input('max_area') : null,
            'min_rooms' => $request->input('min_rooms') ? (int) $request->input('min_rooms') : null,
            'max_rooms' => $request->input('max_rooms') ? (int) $request->input('max_rooms') : null,
            'keywords' => $request->input('keywords'),
        ], fn ($v) => $v !== null);
    }

}
```

- [ ] **Step 3: Verify routes work**

```bash
php artisan route:list
# Should show GET / and GET /listings/{listing}
```

```bash
php artisan serve &
curl -s http://localhost:8000/ | head -50
# Should return Inertia HTML (will error on missing React page, that's OK)
```

- [ ] **Step 4: Commit**

```bash
git add routes/web.php app/Http/Controllers/ListingController.php
git commit -m "feat: ListingController with filtered index + show"
```

**Acceptance criteria:**
- `GET /` returns Inertia response with listings, filters, districts
- `GET /listings/1` returns single listing
- All filter scopes chain correctly
- Sorting works for all options
- Pagination preserves query string

---

### Task 8: IntentParserService (Claude Haiku)

**Files:**
- Create: `app/Services/IntentParserService.php`
- Modify: `config/services.php`

- [ ] **Step 1: Add Anthropic config**

In `config/services.php`, add:

```php
'anthropic' => [
    'key' => env('ANTHROPIC_API_KEY'),
    'model' => env('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001'),
    'base_url' => env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
],
```

- [ ] **Step 2: Write IntentParserService**

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntentParserService
{
    private const PROMPT_TEMPLATE = <<<'PROMPT'
Jesteś asystentem wyszukiwania nieruchomości. Przeanalizuj zapytanie użytkownika i wyodrębnij ustrukturyzowane filtry.

Zwróć WYŁĄCZNIE prawidłowy JSON z następującymi opcjonalnymi polami:
- property_type: "flat" lub "house"
- market_type: "sale" lub "rent"
- min_price: liczba (w PLN)
- max_price: liczba (w PLN)
- min_rooms: liczba całkowita
- max_rooms: liczba całkowita
- min_area: liczba (m²)
- max_area: liczba (m²)
- district: string (dzielnica Krakowa)
- keywords: string (pozostały tekst, który nie został przechwycony przez filtry)

Zasady:
- "do 500 tys" / "do 500000" → max_price: 500000
- "od 300 tys" → min_price: 300000
- "2-pokojowe" / "2 pokoje" → min_rooms: 2, max_rooms: 2
- "3-4 pokoje" → min_rooms: 3, max_rooms: 4
- "mieszkanie" → property_type: "flat"
- "dom" → property_type: "house"
- "wynajem" / "do wynajęcia" → market_type: "rent"
- "sprzedaż" / "na sprzedaż" / "kupno" → market_type: "sale"
- Rozpoznaj dzielnice Krakowa: Stare Miasto, Kazimierz, Podgórze, Krowodrza, Nowa Huta, Bronowice, Prądnik, Dębniki, Zwierzyniec, Łagiewniki, Ruczaj, Czyżyny, Bieżanów, Prokocim, Mistrzejowice, itp.
- Jeśli pole nie jest wspomniane, NIE uwzględniaj go w odpowiedzi.

Zapytanie użytkownika: "{query}"
PROMPT;

    public function parse(string $query): ?array
    {
        $apiKey = config('services.anthropic.key');

        if (!$apiKey) {
            Log::info('IntentParser: No API key, falling back to keyword search');
            return null;
        }

        try {
            $prompt = str_replace('{query}', $query, self::PROMPT_TEMPLATE);

            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])->timeout(10)->post(config('services.anthropic.base_url') . '/v1/messages', [
                'model' => config('services.anthropic.model'),
                'max_tokens' => 300,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if (!$response->successful()) {
                Log::warning('IntentParser: API error', ['status' => $response->status()]);
                return null;
            }

            $text = $response->json('content.0.text', '');

            // Extract JSON from response (greedy match handles nested braces)
            if (preg_match('/\{.*\}/s', $text, $matches)) {
                $parsed = json_decode($matches[0], true);

                if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
                    Log::info('IntentParser: Parsed intent', [
                        'query' => $query,
                        'intent' => $parsed,
                    ]);
                    return $this->sanitize($parsed);
                }
            }

            Log::warning('IntentParser: Could not parse response', ['text' => $text]);
            return null;
        } catch (\Throwable $e) {
            Log::warning('IntentParser: Exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function sanitize(array $parsed): array
    {
        $allowed = [
            'property_type', 'market_type', 'district', 'keywords',
            'min_price', 'max_price', 'min_area', 'max_area',
            'min_rooms', 'max_rooms',
        ];

        $result = [];
        foreach ($allowed as $key) {
            if (isset($parsed[$key]) && $parsed[$key] !== '' && $parsed[$key] !== null) {
                $result[$key] = $parsed[$key];
            }
        }

        // Type coercion
        foreach (['min_price', 'max_price', 'min_area', 'max_area'] as $k) {
            if (isset($result[$k])) $result[$k] = (float) $result[$k];
        }
        foreach (['min_rooms', 'max_rooms'] as $k) {
            if (isset($result[$k])) $result[$k] = (int) $result[$k];
        }
        foreach (['property_type', 'market_type'] as $k) {
            if (isset($result[$k])) {
                $valid = $k === 'property_type' ? ['flat', 'house'] : ['sale', 'rent'];
                if (!in_array($result[$k], $valid)) unset($result[$k]);
            }
        }

        return $result;
    }
}
```

- [ ] **Step 3: Test intent parser manually**

```bash
php artisan tinker --execute="
  \$svc = app(App\Services\IntentParserService::class);
  \$result = \$svc->parse('przytulne 2-pokojowe mieszkanie blisko centrum do 500 tys');
  var_dump(\$result);
"
```

Expected: `['property_type' => 'flat', 'max_price' => 500000, 'min_rooms' => 2, 'max_rooms' => 2, 'keywords' => 'przytulne blisko centrum']` (approximately).

- [ ] **Step 4: Commit**

```bash
git add app/Services/IntentParserService.php config/services.php
git commit -m "feat: IntentParserService with Claude Haiku + fallback"
```

**Acceptance criteria:**
- Returns structured filters from Polish natural language
- Returns `null` when API key missing (graceful fallback)
- Returns `null` on API error (no crash)
- Sanitizes output to only allowed fields and valid enum values
- Logs all parse results for traceability

---

### Task 9: AreaSuggestionService

**Files:**
- Create: `app/Services/AreaSuggestionService.php`

- [ ] **Step 1: Write AreaSuggestionService**

```php
<?php

namespace App\Services;

use App\Models\Listing;
use Illuminate\Support\Facades\DB;

class AreaSuggestionService
{
    private const MIN_LISTINGS_FOR_SUGGESTION = 5;

    /**
     * Returns a suggested area range for listings with the given room count.
     * Uses 10th and 90th percentile of actual data.
     */
    public function suggest(int $minRooms, int $maxRooms, ?string $propertyType = null): ?array
    {
        $query = Listing::query()
            ->whereNotNull('area_m2')
            ->where('rooms', '>=', $minRooms)
            ->where('rooms', '<=', $maxRooms);

        if ($propertyType) {
            $query->where('property_type', $propertyType);
        }

        $areas = $query->orderBy('area_m2')->pluck('area_m2')->toArray();

        if (count($areas) < self::MIN_LISTINGS_FOR_SUGGESTION) {
            return null;
        }

        $count = count($areas);
        $p10Index = (int) floor($count * 0.1);
        $p90Index = (int) floor($count * 0.9);

        $min = round($areas[$p10Index], 0);
        $max = round($areas[$p90Index], 0);

        if ($min >= $max) {
            return null;
        }

        $roomLabel = $minRooms === $maxRooms
            ? "{$minRooms}"
            : "{$minRooms}-{$maxRooms}";

        return [
            'min' => $min,
            'max' => $max,
            'count' => $count,
            'label' => "Typowy metraż dla {$roomLabel} pokoi: {$min}-{$max} m²",
        ];
    }
}
```

- [ ] **Step 2: Test in tinker**

```bash
php artisan tinker --execute="
  \$svc = app(App\Services\AreaSuggestionService::class);
  var_dump(\$svc->suggest(2, 3, 'flat'));
"
```

- [ ] **Step 3: Commit**

```bash
git add app/Services/AreaSuggestionService.php
git commit -m "feat: AreaSuggestionService with percentile-based area ranges"
```

**Acceptance criteria:**
- Returns `null` when fewer than 5 matching listings
- Returns `{min, max, count, label}` with 10th/90th percentile
- Filters by property_type when provided
- Label is in Polish

---

### Task 10: Backend tests

**Files:**
- Create: `tests/Feature/ListingControllerTest.php`
- Create: `tests/Unit/IntentParserServiceTest.php`

- [ ] **Step 1: Write ListingController feature test**

```php
<?php

namespace Tests\Feature;

use App\Models\Listing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingControllerTest extends TestCase
{
    use RefreshDatabase;

    private function createListing(array $attrs = []): Listing
    {
        return Listing::create(array_merge([
            'external_id' => 'test-' . uniqid(),
            'source_name' => 'otodom',
            'source_url' => 'https://otodom.pl/test',
            'title' => 'Mieszkanie testowe',
            'price' => 400000,
            'currency' => 'PLN',
            'area_m2' => 55.0,
            'rooms' => 2,
            'property_type' => 'flat',
            'market_type' => 'sale',
            'district' => 'Krowodrza',
            'imported_at' => now(),
        ], $attrs));
    }

    public function test_index_returns_listings(): void
    {
        $this->createListing();
        $this->createListing(['external_id' => 'test-2']);

        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('Listings/Index')
                ->has('listings.data', 2)
                ->has('districts')
        );
    }

    public function test_index_filters_by_property_type(): void
    {
        $this->createListing(['property_type' => 'flat']);
        $this->createListing(['external_id' => 'h1', 'property_type' => 'house']);

        $response = $this->get('/?property_type=flat');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 1)
        );
    }

    public function test_index_filters_rooms_strictly(): void
    {
        $this->createListing(['rooms' => 2]);
        $this->createListing(['external_id' => 'r3', 'rooms' => 3]);
        $this->createListing(['external_id' => 'r4', 'rooms' => 4]);
        $this->createListing(['external_id' => 'r5', 'rooms' => 5]);

        $response = $this->get('/?min_rooms=3&max_rooms=4');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 2)
        );
    }

    public function test_index_filters_by_price_range(): void
    {
        $this->createListing(['price' => 300000]);
        $this->createListing(['external_id' => 'exp', 'price' => 800000]);

        $response = $this->get('/?min_price=200000&max_price=500000');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 1)
        );
    }

    public function test_show_returns_listing(): void
    {
        $listing = $this->createListing();

        $response = $this->get("/listings/{$listing->id}");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('Listings/Show')
                ->has('listing')
                ->where('listing.id', $listing->id)
        );
    }

    public function test_show_returns_404_for_missing(): void
    {
        $response = $this->get('/listings/999');
        $response->assertStatus(404);
    }

    public function test_index_keyword_search(): void
    {
        $this->createListing(['title' => 'Piękne mieszkanie na Kazimierzu']);
        $this->createListing(['external_id' => 's2', 'title' => 'Dom w Nowej Hucie']);

        $response = $this->get('/?keywords=Kazimierz');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 1)
        );
    }

    public function test_index_does_not_include_raw_snapshot(): void
    {
        $this->createListing(['raw_snapshot' => '<html>large data</html>']);

        $response = $this->get('/');
        $response->assertInertia(fn ($page) =>
            $page->missing('listings.data.0.raw_snapshot')
        );
    }
}
```

- [ ] **Step 2: Write IntentParserService unit test**

```php
<?php

namespace Tests\Unit;

use App\Services\IntentParserService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntentParserServiceTest extends TestCase
{
    public function test_returns_null_when_no_api_key(): void
    {
        config(['services.anthropic.key' => null]);
        $service = new IntentParserService();
        $this->assertNull($service->parse('mieszkanie 3 pokoje'));
    }

    public function test_parses_successful_api_response(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => '{"property_type": "flat", "min_rooms": 3, "max_rooms": 3, "max_price": 500000}'],
                ],
            ]),
        ]);

        $service = new IntentParserService();
        $result = $service->parse('mieszkanie 3-pokojowe do 500 tys');

        $this->assertIsArray($result);
        $this->assertEquals('flat', $result['property_type']);
        $this->assertEquals(3, $result['min_rooms']);
        $this->assertEquals(500000.0, $result['max_price']);
    }

    public function test_returns_null_on_api_error(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([], 500),
        ]);

        $service = new IntentParserService();
        $this->assertNull($service->parse('test query'));
    }

    public function test_sanitizes_invalid_enum_values(): void
    {
        config(['services.anthropic.key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => '{"property_type": "invalid", "min_rooms": 2}'],
                ],
            ]),
        ]);

        $service = new IntentParserService();
        $result = $service->parse('test');

        $this->assertArrayNotHasKey('property_type', $result);
        $this->assertEquals(2, $result['min_rooms']);
    }
}
```

- [ ] **Step 3: Write AreaSuggestionService test**

```php
<?php

namespace Tests\Unit;

use App\Models\Listing;
use App\Services\AreaSuggestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AreaSuggestionServiceTest extends TestCase
{
    use RefreshDatabase;

    private function seedListings(int $count, array $attrs = []): void
    {
        for ($i = 0; $i < $count; $i++) {
            Listing::create(array_merge([
                'external_id' => "area-test-{$i}",
                'source_name' => 'otodom',
                'source_url' => "https://otodom.pl/test-{$i}",
                'title' => 'Test',
                'property_type' => 'flat',
                'market_type' => 'sale',
                'imported_at' => now(),
                'rooms' => 3,
                'area_m2' => 50 + ($i * 5),
            ], $attrs));
        }
    }

    public function test_returns_null_when_too_few_listings(): void
    {
        $this->seedListings(3);
        $service = new AreaSuggestionService();
        $this->assertNull($service->suggest(3, 3));
    }

    public function test_returns_suggestion_when_enough_listings(): void
    {
        $this->seedListings(10);
        $service = new AreaSuggestionService();
        $result = $service->suggest(3, 3);

        $this->assertNotNull($result);
        $this->assertArrayHasKey('min', $result);
        $this->assertArrayHasKey('max', $result);
        $this->assertArrayHasKey('count', $result);
        $this->assertEquals(10, $result['count']);
        $this->assertLessThan($result['max'], $result['min']);
    }

    public function test_filters_by_property_type(): void
    {
        $this->seedListings(10, ['property_type' => 'flat']);
        $this->seedListings(3, ['property_type' => 'house', 'external_id' => 'house']);

        $service = new AreaSuggestionService();
        $this->assertNotNull($service->suggest(3, 3, 'flat'));
        $this->assertNull($service->suggest(3, 3, 'house')); // only 3, below threshold
    }
}
```

- [ ] **Step 4: Write ImportListings upsert test**

```php
<?php

namespace Tests\Feature;

use App\Models\Listing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImportListingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_creates_listings(): void
    {
        $data = [
            [
                'external_id' => 'test-1',
                'source_url' => 'https://otodom.pl/test-1',
                'title' => 'Test Listing',
                'property_type' => 'flat',
                'market_type' => 'sale',
            ],
        ];

        $path = storage_path('app/test-import.json');
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])
            ->assertSuccessful();

        $this->assertDatabaseCount('listings', 1);
        $this->assertDatabaseHas('listings', ['external_id' => 'test-1', 'title' => 'Test Listing']);

        File::delete($path);
    }

    public function test_reimport_updates_existing(): void
    {
        $data = [
            [
                'external_id' => 'test-1',
                'source_url' => 'https://otodom.pl/test-1',
                'title' => 'Original Title',
                'property_type' => 'flat',
                'market_type' => 'sale',
            ],
        ];

        $path = storage_path('app/test-import.json');
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])->assertSuccessful();

        // Update title and reimport
        $data[0]['title'] = 'Updated Title';
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])->assertSuccessful();

        $this->assertDatabaseCount('listings', 1);
        $this->assertDatabaseHas('listings', ['external_id' => 'test-1', 'title' => 'Updated Title']);

        File::delete($path);
    }

    public function test_skips_listings_without_source_url(): void
    {
        $data = [
            ['external_id' => 'no-url', 'title' => 'No URL', 'property_type' => 'flat', 'market_type' => 'sale'],
        ];

        $path = storage_path('app/test-import.json');
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])->assertSuccessful();
        $this->assertDatabaseCount('listings', 0);

        File::delete($path);
    }
}
```

- [ ] **Step 5: Run tests**

```bash
php artisan test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/
git commit -m "test: ListingController + IntentParserService + AreaSuggestion + Import tests"
```

**Acceptance criteria:**
- All tests pass
- Controller tests verify filtering, sorting, pagination, show, 404
- IntentParser tests verify: no API key → null, success → parsed, error → null, sanitization

---

## Chunk 4: Frontend — Index Page

### Task 11: TypeScript types + Layout + Navbar

**Files:**
- Create: `resources/js/types/index.ts`
- Create: `resources/js/Layouts/AppLayout.tsx`

- [ ] **Step 1: Define shared TypeScript types**

```typescript
// resources/js/types/index.ts

export interface Listing {
  id: number;
  external_id: string;
  source_url: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  price_per_m2: number | null;
  area_m2: number | null;
  rooms: number | null;
  floor: number | null;
  building_floors: number | null;
  property_type: 'flat' | 'house';
  market_type: 'sale' | 'rent';
  district: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  image_urls: string[];
  published_at: string | null;
  imported_at: string;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  links: PaginationLink[];
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface ListingFilters {
  property_type?: string;
  market_type?: string;
  district?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  min_rooms?: number;
  max_rooms?: number;
  keywords?: string;
}

export interface AreaSuggestion {
  min: number;
  max: number;
  count: number;
  label: string;
}

export interface ParsedIntent {
  property_type?: string;
  market_type?: string;
  district?: string;
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
  min_rooms?: number;
  max_rooms?: number;
  keywords?: string;
}

export interface IndexPageProps {
  listings: Paginated<Listing>;
  filters: ListingFilters;
  sort: string;
  districts: string[];
  areaSuggestion: AreaSuggestion | null;
  intentParsed: ParsedIntent | null;
  query: string | null;
}

export interface ShowPageProps {
  listing: Listing;
}
```

- [ ] **Step 2: Create AppLayout**

```tsx
// resources/js/Layouts/AppLayout.tsx
import { Link, Head } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function AppLayout({ children, title }: PropsWithChildren<{ title?: string }>) {
  return (
    <>
      <Head title={title ? `${title} | Nieruchomości Kraków` : 'Nieruchomości Kraków'} />

      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Nieruchomości Kraków
              </Link>
              <div className="text-sm text-gray-500">
                Mieszkania i domy na sprzedaż i wynajem
              </div>
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/ resources/js/Layouts/
git commit -m "feat: TypeScript types + AppLayout with navbar"
```

**Acceptance criteria:**
- Types compile without errors (`npm run build`)
- Layout renders navbar with "Nieruchomości Kraków"

---

### Task 12: useListingFilters hook

**Files:**
- Create: `resources/js/Hooks/useListingFilters.ts`

- [ ] **Step 1: Write the filter hook**

This hook manages filter state and syncs it with the URL via Inertia router.

```typescript
// resources/js/Hooks/useListingFilters.ts
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import { ListingFilters } from '@/types';

interface UseListingFiltersOptions {
  filters: ListingFilters;
  sort: string;
  query: string | null;
}

export function useListingFilters({ filters, sort, query }: UseListingFiltersOptions) {
  const updateFilters = useCallback((newFilters: Partial<ListingFilters>, newSort?: string) => {
    const merged = { ...filters, ...newFilters };
    // Remove empty values
    const cleaned: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    if (newSort || sort !== 'newest') {
      cleaned.sort = newSort || sort;
    }
    // Preserve NL query
    if (query) {
      cleaned.q = query;
    }

    router.get('/', cleaned, {
      preserveState: true,
      preserveScroll: true,
    });
  }, [filters, sort, query]);

  const setFilter = useCallback((key: keyof ListingFilters, value: string | number | undefined) => {
    updateFilters({ [key]: value });
  }, [updateFilters]);

  const removeFilter = useCallback((key: keyof ListingFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    updateFilters(newFilters);
  }, [filters, updateFilters]);

  const clearAllFilters = useCallback(() => {
    router.get('/', {}, { preserveState: true });
  }, []);

  const setSort = useCallback((newSort: string) => {
    updateFilters({}, newSort);
  }, [updateFilters]);

  const submitSearch = useCallback((searchQuery: string) => {
    // NL search: clear structured filters, send query
    router.get('/', { q: searchQuery }, { preserveState: true });
  }, []);

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;
  }, [filters]);

  return {
    filters,
    sort,
    query,
    updateFilters,
    setFilter,
    removeFilter,
    clearAllFilters,
    setSort,
    submitSearch,
    activeFilterCount,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Hooks/
git commit -m "feat: useListingFilters hook with URL sync"
```

---

### Task 13: FilterSidebar + filter components

**Files:**
- Create: `resources/js/Components/Listings/FilterSidebar.tsx`

All filters are in one file for simplicity (they're small, related, change together).

- [ ] **Step 1: Write FilterSidebar with all filter controls**

```tsx
// resources/js/Components/Listings/FilterSidebar.tsx
import { ListingFilters, AreaSuggestion } from '@/types';

interface FilterSidebarProps {
  filters: ListingFilters;
  districts: string[];
  areaSuggestion: AreaSuggestion | null;
  onFilterChange: (key: keyof ListingFilters, value: string | number | undefined) => void;
  onAreaSuggestionApply: (min: number, max: number) => void;
}

export default function FilterSidebar({
  filters,
  districts,
  areaSuggestion,
  onFilterChange,
  onAreaSuggestionApply,
}: FilterSidebarProps) {
  return (
    <aside className="w-full lg:w-64 space-y-6">
      {/* Property Type */}
      <FilterSection title="Typ nieruchomości">
        <div className="flex gap-2">
          <ToggleButton
            active={filters.property_type === 'flat'}
            onClick={() => onFilterChange('property_type', filters.property_type === 'flat' ? undefined : 'flat')}
          >
            Mieszkanie
          </ToggleButton>
          <ToggleButton
            active={filters.property_type === 'house'}
            onClick={() => onFilterChange('property_type', filters.property_type === 'house' ? undefined : 'house')}
          >
            Dom
          </ToggleButton>
        </div>
      </FilterSection>

      {/* Market Type */}
      <FilterSection title="Rynek">
        <div className="flex gap-2">
          <ToggleButton
            active={filters.market_type === 'sale'}
            onClick={() => onFilterChange('market_type', filters.market_type === 'sale' ? undefined : 'sale')}
          >
            Sprzedaż
          </ToggleButton>
          <ToggleButton
            active={filters.market_type === 'rent'}
            onClick={() => onFilterChange('market_type', filters.market_type === 'rent' ? undefined : 'rent')}
          >
            Wynajem
          </ToggleButton>
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Cena (PLN)">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Od"
            value={filters.min_price ?? ''}
            onChange={(e) => onFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border-gray-300 text-sm"
          />
          <input
            type="number"
            placeholder="Do"
            value={filters.max_price ?? ''}
            onChange={(e) => onFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border-gray-300 text-sm"
          />
        </div>
      </FilterSection>

      {/* Area Range */}
      <FilterSection title="Powierzchnia (m²)">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Od"
            value={filters.min_area ?? ''}
            onChange={(e) => onFilterChange('min_area', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border-gray-300 text-sm"
          />
          <input
            type="number"
            placeholder="Do"
            value={filters.max_area ?? ''}
            onChange={(e) => onFilterChange('max_area', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border-gray-300 text-sm"
          />
        </div>
      </FilterSection>

      {/* Rooms */}
      <FilterSection title="Liczba pokoi">
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="10"
            placeholder="Od"
            value={filters.min_rooms ?? ''}
            onChange={(e) => onFilterChange('min_rooms', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border-gray-300 text-sm"
          />
          <input
            type="number"
            min="1"
            max="10"
            placeholder="Do"
            value={filters.max_rooms ?? ''}
            onChange={(e) => onFilterChange('max_rooms', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded border-gray-300 text-sm"
          />
        </div>
      </FilterSection>

      {/* Area Suggestion */}
      {areaSuggestion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="text-blue-800">{areaSuggestion.label}</p>
          <p className="text-blue-600 text-xs mt-1">Na podstawie {areaSuggestion.count} ofert</p>
          <button
            onClick={() => onAreaSuggestionApply(areaSuggestion.min, areaSuggestion.max)}
            className="mt-2 text-blue-700 underline text-xs font-medium hover:text-blue-900"
          >
            Dodaj filtr metrażu
          </button>
        </div>
      )}

      {/* District */}
      <FilterSection title="Dzielnica">
        <select
          value={filters.district ?? ''}
          onChange={(e) => onFilterChange('district', e.target.value || undefined)}
          className="w-full rounded border-gray-300 text-sm"
        >
          <option value="">Wszystkie</option>
          {districts.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </FilterSection>
    </aside>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm font-medium border transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Components/Listings/FilterSidebar.tsx
git commit -m "feat: FilterSidebar with all filter controls + area suggestion"
```

---

### Task 14: SearchBar + ActiveFilters

**Files:**
- Create: `resources/js/Components/Listings/SearchBar.tsx`
- Create: `resources/js/Components/Listings/ActiveFilters.tsx`

- [ ] **Step 1: Write SearchBar**

```tsx
// resources/js/Components/Listings/SearchBar.tsx
import { useState, FormEvent } from 'react';

interface SearchBarProps {
  initialQuery: string | null;
  onSubmit: (query: string) => void;
}

export default function SearchBar({ initialQuery, onSubmit }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmit(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj: przytulne 3-pokojowe mieszkanie blisko centrum do 500 tys..."
          className="w-full rounded-lg border-gray-300 pl-4 pr-24 py-3 text-sm shadow-sm focus:border-gray-500 focus:ring-gray-500"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800"
        >
          Szukaj
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Write ActiveFilters**

```tsx
// resources/js/Components/Listings/ActiveFilters.tsx
import { ListingFilters } from '@/types';

interface ActiveFiltersProps {
  filters: ListingFilters;
  query: string | null;
  onRemove: (key: keyof ListingFilters) => void;
  onClearAll: () => void;
}

const FILTER_LABELS: Record<string, (v: any) => string> = {
  property_type: (v) => v === 'flat' ? 'Mieszkanie' : 'Dom',
  market_type: (v) => v === 'sale' ? 'Sprzedaż' : 'Wynajem',
  district: (v) => v,
  min_price: (v) => `Cena od ${Number(v).toLocaleString('pl')} PLN`,
  max_price: (v) => `Cena do ${Number(v).toLocaleString('pl')} PLN`,
  min_area: (v) => `Od ${v} m²`,
  max_area: (v) => `Do ${v} m²`,
  min_rooms: (v) => `Od ${v} pokoi`,
  max_rooms: (v) => `Do ${v} pokoi`,
  keywords: (v) => `"${v}"`,
};

export default function ActiveFilters({ filters, query, onRemove, onClearAll }: ActiveFiltersProps) {
  const entries = Object.entries(filters).filter(([_, v]) => v !== undefined && v !== null && v !== '');

  if (entries.length === 0 && !query) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {query && (
        <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-1 rounded-full">
          Zapytanie: "{query}"
        </span>
      )}
      {entries.map(([key, value]) => (
        <button
          key={key}
          onClick={() => onRemove(key as keyof ListingFilters)}
          className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-gray-200"
        >
          {FILTER_LABELS[key]?.(value) ?? `${key}: ${value}`}
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      ))}
      {(entries.length > 0 || query) && (
        <button
          onClick={onClearAll}
          className="text-xs text-gray-500 underline hover:text-gray-700"
        >
          Wyczyść wszystko
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Components/Listings/SearchBar.tsx resources/js/Components/Listings/ActiveFilters.tsx
git commit -m "feat: SearchBar + ActiveFilters components"
```

---

### Task 14b: ChatBox component (vague-intent chat interface)

**Files:**
- Create: `resources/js/Components/Listings/ChatBox.tsx`

**Context:** The assignment requires a "chat box instead of a search input" for vague-intent search (Example B). This is a conversational UI that sends the query to the same IntentParserService backend, but presents the AI interpretation as a chat message before applying filters.

- [ ] **Step 1: Write ChatBox component**

```tsx
// resources/js/Components/Listings/ChatBox.tsx
import { useState, FormEvent } from 'react';
import { router } from '@inertiajs/react';
import { ParsedIntent } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  filters?: ParsedIntent;
}

interface ChatBoxProps {
  intentParsed: ParsedIntent | null;
  query: string | null;
}

const FILTER_LABELS: Record<string, (v: any) => string> = {
  property_type: (v) => v === 'flat' ? 'Mieszkanie' : 'Dom',
  market_type: (v) => v === 'sale' ? 'Sprzedaż' : 'Wynajem',
  district: (v) => `Dzielnica: ${v}`,
  min_price: (v) => `Cena od ${Number(v).toLocaleString('pl')} PLN`,
  max_price: (v) => `Cena do ${Number(v).toLocaleString('pl')} PLN`,
  min_area: (v) => `Od ${v} m²`,
  max_area: (v) => `Do ${v} m²`,
  min_rooms: (v) => `Od ${v} pokoi`,
  max_rooms: (v) => `Do ${v} pokoi`,
  keywords: (v) => `Słowa kluczowe: "${v}"`,
};

export default function ChatBox({ intentParsed, query }: ChatBoxProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial: ChatMessage[] = [];
    if (query) {
      initial.push({ role: 'user', content: query });
      if (intentParsed) {
        initial.push({
          role: 'assistant',
          content: 'Rozumiem! Oto co znalazłem na podstawie Twojego opisu:',
          filters: intentParsed,
        });
      }
    }
    return initial;
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;

    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setInput('');

    // Send to backend — NL query triggers IntentParserService
    router.get('/', { q, mode: 'chat' }, {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleApplyFilters = (filters: ParsedIntent) => {
    // Convert parsed intent to structured filter params
    const params: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = value;
      }
    }
    router.get('/', params, { preserveState: true });
  };

  const handleReset = () => {
    setMessages([]);
    router.get('/', {}, { preserveState: true });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Chat messages */}
      <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            Opisz czego szukasz, np. "Szukam przytulnego mieszkania 40m² w Krakowie, niedrogo"
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p>{msg.content}</p>
              {msg.filters && (
                <div className="mt-2 space-y-1">
                  {Object.entries(msg.filters)
                    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
                    .map(([key, value]) => (
                      <span
                        key={key}
                        className="inline-block bg-white/20 text-xs px-2 py-0.5 rounded mr-1 mb-1"
                      >
                        {FILTER_LABELS[key]?.(value) ?? `${key}: ${value}`}
                      </span>
                    ))}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleApplyFilters(msg.filters!)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                      Zastosuj filtry
                    </button>
                    <button
                      onClick={handleReset}
                      className="text-xs text-gray-500 underline hover:text-gray-700"
                    >
                      Zacznij od nowa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Opisz czego szukasz..."
          className="flex-1 rounded border-gray-300 text-sm focus:border-gray-500 focus:ring-gray-500"
        />
        <button
          type="submit"
          className="bg-gray-900 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-gray-800"
        >
          Wyślij
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Components/Listings/ChatBox.tsx
git commit -m "feat: ChatBox component for vague-intent conversational search"
```

**Acceptance criteria:**
- Shows empty state with example prompt
- User message appears as right-aligned dark bubble
- AI interpretation appears as left-aligned light bubble with filter tags
- "Zastosuj filtry" button applies parsed filters to listing results
- "Zacznij od nowa" clears chat and filters

---

### Task 15: ListingCard + ListingGrid + EmptyState

**Files:**
- Create: `resources/js/Components/Listings/ListingCard.tsx`
- Create: `resources/js/Components/Listings/ListingGrid.tsx`
- Create: `resources/js/Components/Listings/EmptyState.tsx`

- [ ] **Step 1: Write ListingCard**

```tsx
// resources/js/Components/Listings/ListingCard.tsx
import { Link } from '@inertiajs/react';
import { Listing } from '@/types';

interface ListingCardProps {
  listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'Cena na zapytanie';
    return `${price.toLocaleString('pl-PL')} ${currency}`;
  };

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gray-100 relative">
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={listing.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Brak zdjęcia
          </div>
        )}
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded">
            {listing.property_type === 'flat' ? 'Mieszkanie' : 'Dom'}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${
            listing.market_type === 'sale'
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white'
          }`}>
            {listing.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
          {listing.title}
        </h3>
        <p className="text-lg font-bold text-gray-900 mb-2">
          {formatPrice(listing.price, listing.currency)}
          {listing.market_type === 'rent' && listing.price !== null && (
            <span className="text-sm font-normal text-gray-500">/mies.</span>
          )}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {listing.area_m2 !== null && (
            <span>{listing.area_m2} m²</span>
          )}
          {listing.rooms !== null && (
            <span>{listing.rooms} {listing.rooms === 1 ? 'pokój' : listing.rooms < 5 ? 'pokoje' : 'pokoi'}</span>
          )}
          {listing.district && (
            <span>{listing.district}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Write ListingGrid**

```tsx
// resources/js/Components/Listings/ListingGrid.tsx
import { Listing } from '@/types';
import ListingCard from './ListingCard';

interface ListingGridProps {
  listings: Listing[];
}

export default function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write EmptyState**

```tsx
// resources/js/Components/Listings/EmptyState.tsx

interface EmptyStateProps {
  onClearFilters: () => void;
}

export default function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <div className="text-gray-400 text-4xl mb-4">🏠</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Brak wyników</h3>
      <p className="text-gray-500 text-sm mb-4">
        Nie znaleziono ofert spełniających podane kryteria.
      </p>
      <button
        onClick={onClearFilters}
        className="text-sm text-gray-700 underline hover:text-gray-900"
      >
        Wyczyść filtry i pokaż wszystkie oferty
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/Components/Listings/ListingCard.tsx resources/js/Components/Listings/ListingGrid.tsx resources/js/Components/Listings/EmptyState.tsx
git commit -m "feat: ListingCard, ListingGrid, EmptyState components"
```

---

### Task 15b: LoadingOverlay component

**Files:**
- Create: `resources/js/Components/Listings/LoadingOverlay.tsx`

- [ ] **Step 1: Write LoadingOverlay**

Uses Inertia's `router.on()` events to show a loading indicator during page transitions (filter changes, pagination, etc.).

```tsx
// resources/js/Components/Listings/LoadingOverlay.tsx
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function LoadingOverlay() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const startHandler = router.on('start', () => setLoading(true));
    const finishHandler = router.on('finish', () => setLoading(false));

    return () => {
      startHandler();
      finishHandler();
    };
  }, []);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white/50 flex items-center justify-center pointer-events-none">
      <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-900 rounded-full" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Components/Listings/LoadingOverlay.tsx
git commit -m "feat: LoadingOverlay for Inertia page transitions"
```

---

### Task 16: Listings/Index page (full assembly)

**Files:**
- Create: `resources/js/Pages/Listings/Index.tsx`
- Create: `resources/js/Components/Listings/ViewToggle.tsx`
- Create: `resources/js/Components/Listings/SortDropdown.tsx`
- Create: `resources/js/Components/UI/Pagination.tsx`

- [ ] **Step 1: Write ViewToggle**

```tsx
// resources/js/Components/Listings/ViewToggle.tsx
interface ViewToggleProps {
  view: 'grid' | 'map';
  onChange: (view: 'grid' | 'map') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md border border-gray-300 overflow-hidden">
      <button
        onClick={() => onChange('grid')}
        className={`px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
      >
        Lista
      </button>
      <button
        onClick={() => onChange('map')}
        className={`px-3 py-1.5 text-sm ${view === 'map' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
      >
        Mapa
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Write SortDropdown**

```tsx
// resources/js/Components/Listings/SortDropdown.tsx
interface SortDropdownProps {
  sort: string;
  onChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena: rosnąco' },
  { value: 'price_desc', label: 'Cena: malejąco' },
  { value: 'area_asc', label: 'Metraż: rosnąco' },
  { value: 'area_desc', label: 'Metraż: malejąco' },
];

export default function SortDropdown({ sort, onChange }: SortDropdownProps) {
  return (
    <select
      value={sort}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border-gray-300 text-sm"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
```

- [ ] **Step 3: Write Pagination**

```tsx
// resources/js/Components/UI/Pagination.tsx
import { Link } from '@inertiajs/react';
import { PaginationLink } from '@/types';

interface PaginationProps {
  links: PaginationLink[];
  currentPage: number;
  lastPage: number;
}

export default function Pagination({ links, currentPage, lastPage }: PaginationProps) {
  if (lastPage <= 1) return null;

  return (
    <nav className="flex justify-center gap-1 mt-6">
      {links.map((link, i) => (
        <span key={i}>
          {link.url ? (
            <Link
              href={link.url}
              className={`px-3 py-1.5 text-sm rounded ${
                link.active
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
              preserveState
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          ) : (
            <span
              className="px-3 py-1.5 text-sm text-gray-400"
              dangerouslySetInnerHTML={{ __html: link.label }}
            />
          )}
        </span>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Write Listings/Index page**

```tsx
// resources/js/Pages/Listings/Index.tsx
import { useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import SearchBar from '@/Components/Listings/SearchBar';
import ActiveFilters from '@/Components/Listings/ActiveFilters';
import FilterSidebar from '@/Components/Listings/FilterSidebar';
import ChatBox from '@/Components/Listings/ChatBox';
import ListingGrid from '@/Components/Listings/ListingGrid';
import EmptyState from '@/Components/Listings/EmptyState';
import LoadingOverlay from '@/Components/Listings/LoadingOverlay';
import ViewToggle from '@/Components/Listings/ViewToggle';
import SortDropdown from '@/Components/Listings/SortDropdown';
import Pagination from '@/Components/UI/Pagination';
import { useListingFilters } from '@/Hooks/useListingFilters';
import { IndexPageProps } from '@/types';

// Lazy-load map to avoid SSR issues with Leaflet
import { lazy, Suspense } from 'react';
const ListingMap = lazy(() => import('@/Components/Listings/ListingMap'));

export default function Index({
  listings,
  filters: initialFilters,
  sort: initialSort,
  districts,
  areaSuggestion,
  intentParsed,
  query,
}: IndexPageProps) {
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [searchMode, setSearchMode] = useState<'filters' | 'chat'>('filters');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const {
    filters,
    sort,
    updateFilters,
    setFilter,
    removeFilter,
    clearAllFilters,
    setSort,
    submitSearch,
  } = useListingFilters({
    filters: initialFilters,
    sort: initialSort,
    query,
  });

  const handleAreaSuggestionApply = (min: number, max: number) => {
    updateFilters({ min_area: min, max_area: max });
  };

  return (
    <AppLayout title="Oferty">
      <LoadingOverlay />
      <div className="space-y-4">
        {/* Search mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSearchMode('filters')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              searchMode === 'filters' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Filtry
          </button>
          <button
            onClick={() => setSearchMode('chat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              searchMode === 'chat' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Zapytaj
          </button>
        </div>

        {/* Chat mode */}
        {searchMode === 'chat' && (
          <ChatBox intentParsed={intentParsed} query={query} />
        )}

        {/* Filter mode: search bar + active filters */}
        {searchMode === 'filters' && (
          <>
            <SearchBar initialQuery={query} onSubmit={submitSearch} />
            <ActiveFilters
              filters={filters}
              query={query}
              onRemove={removeFilter}
              onClearAll={clearAllFilters}
            />
          </>
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              {listings.total} {listings.total === 1 ? 'oferta' : listings.total < 5 ? 'oferty' : 'ofert'}
            </p>
            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="lg:hidden px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
            >
              Filtry
            </button>
          </div>
          <div className="flex items-center gap-3">
            <SortDropdown sort={sort} onChange={setSort} />
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar — hidden on mobile, shown in slide-out drawer */}
          <div className="hidden lg:block">
            <FilterSidebar
              filters={filters}
              districts={districts}
              areaSuggestion={areaSuggestion}
              onFilterChange={setFilter}
              onAreaSuggestionApply={handleAreaSuggestionApply}
            />
          </div>

          {/* Mobile filter drawer */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowMobileFilters(false)} />
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white p-6 overflow-y-auto shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Filtry</h2>
                  <button onClick={() => setShowMobileFilters(false)} className="text-gray-500 text-xl">✕</button>
                </div>
                <FilterSidebar
                  filters={filters}
                  districts={districts}
                  areaSuggestion={areaSuggestion}
                  onFilterChange={(key, value) => { setFilter(key, value); }}
                  onAreaSuggestionApply={handleAreaSuggestionApply}
                />
              </div>
            </div>
          )}

          {/* Main */}
          <div className="flex-1">
            {listings.data.length === 0 ? (
              <EmptyState onClearFilters={clearAllFilters} />
            ) : view === 'grid' ? (
              <>
                <ListingGrid listings={listings.data} />
                <Pagination
                  links={listings.links}
                  currentPage={listings.current_page}
                  lastPage={listings.last_page}
                />
              </>
            ) : (
              <Suspense fallback={<div className="h-[600px] bg-gray-100 animate-pulse rounded-lg" />}>
                <ListingMap listings={listings.data} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Listings/Index.tsx resources/js/Components/Listings/ViewToggle.tsx resources/js/Components/Listings/SortDropdown.tsx resources/js/Components/UI/Pagination.tsx
git commit -m "feat: Listings/Index page with filters, sort, grid/map, pagination"
```

**Acceptance criteria:**
- Page renders with listings grid
- Filters work and update URL
- Sort changes listing order
- Pagination navigates between pages
- Active filters show as removable chips
- "Filtry"/"Zapytaj" tabs toggle between filter mode and chat mode
- Chat mode: user message appears, AI response with filter chips appears
- "Zastosuj filtry" in chat applies parsed filters to results
- Area suggestion appears when rooms filter is active
- View toggle switches between grid and map placeholders

---

## Chunk 5: Frontend — Detail + Map + Gallery

### Task 17: ListingMap (Leaflet)

**Files:**
- Create: `resources/js/Components/Listings/ListingMap.tsx`

- [ ] **Step 1: Write ListingMap component**

```tsx
// resources/js/Components/Listings/ListingMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Listing } from '@/types';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon issue with bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface ListingMapProps {
  listings: Listing[];
  singleListing?: boolean;
  className?: string;
}

// Kraków center
const KRAKOW_CENTER: [number, number] = [50.0647, 19.9450];

export default function ListingMap({ listings, singleListing = false, className = '' }: ListingMapProps) {
  const markersData = listings.filter(l => l.latitude != null && l.longitude != null);

  if (markersData.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm ${className || 'h-[600px]'}`}>
        Brak danych lokalizacji
      </div>
    );
  }

  const center: [number, number] = singleListing && markersData[0]
    ? [markersData[0].latitude!, markersData[0].longitude!]
    : KRAKOW_CENTER;

  const zoom = singleListing ? 15 : 12;

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'Cena na zapytanie';
    return `${price.toLocaleString('pl-PL')} ${currency}`;
  };

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className={`rounded-lg ${className || 'h-[600px] w-full'}`}
      scrollWheelZoom={!singleListing}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markersData.map((listing) => (
        <Marker key={listing.id} position={[listing.latitude!, listing.longitude!]}>
          <Popup>
            <div className="min-w-[200px]">
              {listing.thumbnail_url && (
                <img src={listing.thumbnail_url} alt="" className="w-full h-24 object-cover rounded mb-2" />
              )}
              <p className="font-semibold text-sm">{listing.title}</p>
              <p className="text-sm font-bold">{formatPrice(listing.price, listing.currency)}</p>
              <p className="text-xs text-gray-500">
                {listing.area_m2 && `${listing.area_m2} m²`}
                {listing.rooms && ` · ${listing.rooms} pok.`}
              </p>
              {!singleListing && (
                <a href={`/listings/${listing.id}`} className="text-xs text-blue-600 underline mt-1 block">
                  Zobacz szczegóły
                </a>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Components/Listings/ListingMap.tsx
git commit -m "feat: ListingMap component with Leaflet + OSM"
```

---

### Task 18: ImageGallery

**Files:**
- Create: `resources/js/Components/Listings/ImageGallery.tsx`

- [ ] **Step 1: Write ImageGallery with modal lightbox**

```tsx
// resources/js/Components/Listings/ImageGallery.tsx
import { useState, useCallback, useEffect } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goNext = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % images.length);
    }
  }, [lightboxIndex, images.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + images.length) % images.length);
    }
  }, [lightboxIndex, images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, goNext, goPrev]);

  // Touch swipe navigation for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { // minimum swipe distance
      diff > 0 ? goNext() : goPrev();
    }
    setTouchStart(null);
  };

  if (images.length === 0) {
    return (
      <div className="aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        Brak zdjęć
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Main image */}
        <div
          className="col-span-4 sm:col-span-2 sm:row-span-2 cursor-pointer"
          onClick={() => openLightbox(0)}
        >
          <img
            src={images[0]}
            alt={title}
            className="w-full h-64 sm:h-full object-cover rounded-lg"
          />
        </div>

        {/* Secondary images */}
        {images.slice(1, 5).map((url, i) => (
          <div
            key={i}
            className="hidden sm:block cursor-pointer relative"
            onClick={() => openLightbox(i + 1)}
          >
            <img src={url} alt="" className="w-full h-32 object-cover rounded-lg" />
            {i === 3 && images.length > 5 && (
              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white font-semibold">
                +{images.length - 5} zdjęć
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: show count */}
      {images.length > 1 && (
        <button
          onClick={() => openLightbox(0)}
          className="sm:hidden mt-2 text-sm text-gray-600 underline"
        >
          Zobacz wszystkie {images.length} zdjęć
        </button>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
          >
            ✕
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-4 text-white text-3xl hover:text-gray-300 z-10"
          >
            ‹
          </button>

          <img
            src={images[lightboxIndex]}
            alt={`${title} - ${lightboxIndex + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-4 text-white text-3xl hover:text-gray-300 z-10"
          >
            ›
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {lightboxIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Components/Listings/ImageGallery.tsx
git commit -m "feat: ImageGallery with thumbnail grid + lightbox"
```

---

### Task 19: Listings/Show page

**Files:**
- Create: `resources/js/Pages/Listings/Show.tsx`

- [ ] **Step 1: Write Show page**

```tsx
// resources/js/Pages/Listings/Show.tsx
import { Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import ImageGallery from '@/Components/Listings/ImageGallery';
import { ShowPageProps } from '@/types';
import { lazy, Suspense } from 'react';

const ListingMap = lazy(() => import('@/Components/Listings/ListingMap'));

export default function Show({ listing }: ShowPageProps) {
  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return 'Cena na zapytanie';
    return `${price.toLocaleString('pl-PL')} ${currency}`;
  };

  return (
    <AppLayout title={listing.title}>
      {/* Back link */}
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        ← Wróć do wyników
      </Link>

      <div className="space-y-6">
        {/* Image Gallery */}
        <ImageGallery images={listing.image_urls ?? []} title={listing.title} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex gap-2 mb-2">
              <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded">
                {listing.property_type === 'flat' ? 'Mieszkanie' : 'Dom'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                listing.market_type === 'sale' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
              }`}>
                {listing.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            {listing.district && (
              <p className="text-gray-500 mt-1">
                {listing.district}{listing.street ? `, ${listing.street}` : ''}, Kraków
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(listing.price, listing.currency)}
              {listing.market_type === 'rent' && listing.price !== null && (
                <span className="text-sm font-normal text-gray-500">/mies.</span>
              )}
            </p>
            {listing.price_per_m2 && (
              <p className="text-sm text-gray-500">{listing.price_per_m2.toLocaleString('pl-PL')} PLN/m²</p>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <DetailItem label="Powierzchnia" value={listing.area_m2 ? `${listing.area_m2} m²` : null} />
          <DetailItem label="Pokoje" value={listing.rooms?.toString()} />
          <DetailItem label="Piętro" value={
            listing.floor !== null
              ? `${listing.floor}${listing.building_floors ? ` / ${listing.building_floors}` : ''}`
              : null
          } />
          <DetailItem label="Rynek" value={listing.market_type === 'sale' ? 'Sprzedaż' : 'Wynajem'} />
        </div>

        {/* Description */}
        {listing.description && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Opis</h2>
            <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
              {listing.description}
            </div>
          </div>
        )}

        {/* Location map */}
        {listing.latitude && listing.longitude && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Lokalizacja</h2>
            <Suspense fallback={<div className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />}>
              <ListingMap listings={[listing]} singleListing className="h-[300px]" />
            </Suspense>
          </div>
        )}

        {/* Source */}
        <div className="border-t pt-4 text-sm text-gray-500">
          <p>
            Źródło:{' '}
            <a href={listing.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Otodom
            </a>
          </p>
          {listing.published_at && (
            <p>Opublikowano: {new Date(listing.published_at).toLocaleDateString('pl-PL')}</p>
          )}
          <p>Zaimportowano: {new Date(listing.imported_at).toLocaleDateString('pl-PL')}</p>
        </div>
      </div>
    </AppLayout>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-semibold text-gray-900">{value ?? 'Brak danych'}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Listings/Show.tsx
git commit -m "feat: Listings/Show page with gallery, details, map"
```

- [ ] **Step 3: Verify full flow**

```bash
npm run build
php artisan serve
# Visit http://localhost:8000 — listings grid
# Click a listing — detail page with images + map
# Toggle to map view — markers on Leaflet map
# Use search bar — chips appear
# Use filters — listings update
```

**Acceptance criteria:**
- Index page: grid view shows listing cards
- Index page: map view shows markers with popups
- Index page: filters narrow results
- Index page: NL search shows parsed chips
- Detail page: image gallery with lightbox
- Detail page: detail grid with all fields
- Detail page: location map (when coordinates exist)
- Detail page: back link returns to results
- Responsive on mobile

---

## Chunk 6: Deployment + Submission Docs

### Task 20: Dockerfile + production config

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Modify: `.env.example`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
# Dockerfile
FROM node:20-alpine AS assets
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js tailwind.config.js postcss.config.js tsconfig.json ./
COPY resources/ resources/
RUN npm run build

FROM serversideup/php:8.3-fpm-nginx AS runtime
WORKDIR /var/www/html

# Install PHP extensions for MySQL
RUN install-php-extensions pdo_mysql

# Copy composer files and install
COPY composer.json composer.lock ./
RUN composer install --no-dev --optimize-autoloader --no-scripts

# Copy application
COPY . .

# Copy built assets from build stage
COPY --from=assets /app/public/build public/build

# Run post-install scripts (skip config:cache — APP_KEY not available at build time)
RUN composer dump-autoload --optimize
RUN php artisan route:cache
RUN php artisan view:cache

# Ensure storage directories exist with correct permissions
RUN mkdir -p storage/framework/{sessions,views,cache/data} bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

# Entrypoint: cache config at runtime (when env vars are available), run migrations + seed
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]

EXPOSE 8080
```

- [ ] **Step 2: Write .dockerignore**

```
node_modules
.git
.claude
.env
storage/app/scraped-listings.json
scripts/
tests/
docs/superpowers/
vendor/
```

- [ ] **Step 3: Write docker-entrypoint.sh**

```bash
#!/bin/sh
set -e

# Cache config at runtime (APP_KEY now available via env)
php artisan config:cache

# Run migrations (idempotent)
php artisan migrate --force

# Seed only if listings table is empty
php artisan tinker --execute="if(App\Models\Listing::count()===0){Artisan::call('db:seed',['--force'=>true]);echo 'Seeded.';} else {echo 'Already seeded.';}"

# Start the server (serversideup default)
exec /init
```

- [ ] **Step 4: Update .env.example with TiDB production config notes**

Add comments:
```
# Production (TiDB Cloud Starter):
# DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
# DB_PORT=4000
# DB_DATABASE=real_estate
# DB_USERNAME=<from TiDB console>
# DB_PASSWORD=<from TiDB console>
# MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
#
# Koyeb:
# APP_URL=https://<your-app>.koyeb.app
# APP_ENV=production
# APP_DEBUG=false
```

- [ ] **Step 5: Test Docker build locally**

```bash
docker build -t real-estate .
docker run --rm -p 8080:8080 --env-file .env real-estate
# Visit http://localhost:8080
```

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore docker-entrypoint.sh .env.example
git commit -m "feat: production Dockerfile + entrypoint + deploy config"
```

**Acceptance criteria:**
- Docker image builds successfully
- App serves on port 8080
- Assets are compiled and served
- PHP artisan commands work in container

---

### Task 21: Koyeb deployment setup

**Files:** No new files — deployment is configured via Koyeb dashboard + env vars.

- [ ] **Step 1: Document Koyeb deployment steps**

Koyeb deployment (via GitHub integration or Docker):

1. Push code to GitHub
2. Create Koyeb app → connect to GitHub repo
3. Set build type: Dockerfile
4. Set environment variables:
   - `APP_KEY` — generate with `php artisan key:generate --show`
   - `APP_ENV=production`
   - `APP_DEBUG=false`
   - `APP_URL=https://<app>.koyeb.app`
   - `DB_CONNECTION=mysql`
   - `DB_HOST=<tidb-host>`
   - `DB_PORT=4000`
   - `DB_DATABASE=real_estate`
   - `DB_USERNAME=<tidb-user>`
   - `DB_PASSWORD=<tidb-password>`
   - `MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt`
   - `ANTHROPIC_API_KEY=<key>`
5. Set port: 8080
6. Set health check: HTTP GET /
7. Deploy

Post-deploy commands (via Koyeb web terminal or SSH):
```bash
php artisan migrate --force
php artisan db:seed --force
```

- [ ] **Step 2: Test TiDB connection locally**

```bash
# Set TiDB env vars in .env temporarily
php artisan migrate --pretend
# Verify SQL is compatible
```

- [ ] **Step 3: Commit deployment docs**

(Included in README, Task 22)

**Acceptance criteria:**
- Deployment steps are documented and reproducible
- One person with credentials can deploy in <15 minutes
- App boots on Koyeb with TiDB backend

---

### Task 22: Submission documents

**Files:**
- Create: `docs/README.md` (project-level README content)
- Create: `docs/REASONING.md`
- Create: `docs/USER_JOURNEYS.md`

- [ ] **Step 1: Write README**

Key sections:
- Project overview (1 paragraph)
- Tech stack
- Quick start (local dev: docker compose + artisan + npm)
- Scraping + importing data
- Environment variables table
- Deployment (Koyeb + TiDB)
- Architecture decisions (link to REASONING.md)
- Known limitations

- [ ] **Step 2: Write 1-page REASONING.md**

Structure:
1. **Source choice** — Why Otodom, why Playwright, why seed fallback
2. **Data model** — Normalized schema rationale, missing-field strategy, duplicate handling
3. **Search** — Structured filters + LIKE keyword search (no heavyweight infra for 100 rows)
4. **AI features** — Vague-intent only, with deterministic fallback. Area suggestion is data-driven, not AI. Intentional, explainable, logged.
5. **Frontend** — Inertia for simplicity (no separate API), Leaflet for free maps, custom gallery over library deps
6. **Deployment** — Koyeb for simplicity, TiDB for MySQL compat with free tier, Docker for reproducibility
7. **Explicit tradeoffs** — LIKE instead of FULLTEXT (TiDB compat, 100 rows = no concern); Polish UI override from CLAUDE.md English default (user decision); nulls pushed to end in sort, not excluded
8. **Known limitations** — No auth, no image proxy/CDN, no map clustering, LIKE search, no E2E tests, Polish pluralization simplified, Leaflet popups use full page reload
9. **What I would do with more time** — Auth, saved searches, Elasticsearch, image optimization, map clustering, more tests

- [ ] **Step 3: Write USER_JOURNEYS.md**

**Journey A: Structured search — flats 40-80 m² in Kraków**
(Matches assignment Example A)
> Kasia szuka mieszkania o metrażu 40-80 m² w Krakowie.
> 1. Opens the app → sees all ~100 listings in grid view
> 2. Clicks "Filtry" tab (default active)
> 3. Selects "Mieszkanie" in property type filter
> 4. Sets area range: 40 - 80 m²
> 5. Browses filtered results — sees 15-20 matching listings
> 6. Sees area suggestion when adding rooms filter: "Typowy metraż dla 2-3 pokoi: 45-75 m²"
> 7. Switches to map view → sees markers in different Kraków districts
> 8. Clicks a card → detail page: image gallery, description, location map
> 9. Clicks "Otodom" source link to see original listing

**Journey B: Chat box with vague intent — "nice, cheap flat, 40m"**
(Matches assignment Example B)
> Marek nie wie dokładnie czego szuka — opisuje to własnymi słowami.
> 1. Opens the app
> 2. Clicks "Zapytaj" tab → chat box appears
> 3. Types: "Szukam fajnego, taniego mieszkania, około 40m w Krakowie"
> 4. AI responds in chat bubble: "Rozumiem! Oto co znalazłem:" with parsed filters:
>    - Typ: Mieszkanie, Metraż: ~40 m², Cena: rosnąco
> 5. Clicks "Zastosuj filtry" → listings update to show matching results
> 6. Switches to map view to compare locations
> 7. Clicks a marker popup → detail page with gallery + map

- [ ] **Step 4: Write DEMO_SCRIPT.md**

A 2-3 minute walkthrough for an evaluator:

```markdown
# Demo Script

## Setup (already deployed)
Open: https://<app>.koyeb.app

## 1. Browse all listings (30s)
- Homepage shows ~100 listings as cards
- Note badges: Mieszkanie/Dom, Sprzedaż/Wynajem
- Scroll down → pagination works

## 2. Filter with structured controls (30s)
- Click "Mieszkanie" → only flats shown
- Click "Sprzedaż" → sale only
- Set rooms: 3-4 → notice area suggestion appears below
- Click "Dodaj filtr metrażu" → area filter applied
- Note result count updates

## 3. Try chat-style vague-intent search (30s)
- Click "Zapytaj" tab → chat box appears
- Type: "Szukam fajnego, taniego mieszkania, około 40m w Krakowie"
- AI responds with interpreted filters in chat bubble
- Click "Zastosuj filtry" → listings update
- Switch back to "Filtry" tab to see applied structured filters

## 4. Switch to map view (15s)
- Click "Mapa" toggle
- See markers on Kraków map
- Click a marker → popup with mini card

## 5. View listing details (30s)
- Click a listing (from grid or map popup)
- Image gallery: click images, use arrows / swipe
- Scroll to see: details grid, description, location map
- Note "Źródło: Otodom" link at bottom

## 6. Mobile (15s)
- Resize browser or open on phone
- Cards stack vertically
- "Filtry" button opens slide-out drawer
```

- [ ] **Step 5: Update root README.md**

Replace content with a pointer to `docs/README.md` or consolidate.

- [ ] **Step 6: Commit**

```bash
git add docs/ README.md
git commit -m "docs: README, reasoning document, user journeys, demo script"
```

**Acceptance criteria:**
- README has clear setup + deploy instructions
- REASONING.md fits on one page, covers all key decisions
- USER_JOURNEYS.md has two complete journeys with specific steps
- DEMO_SCRIPT.md provides 2-3 minute evaluator walkthrough
- All docs reference actual features and routes in the code

---

## Out of Scope (Explicit)

- User accounts / authentication
- Favorites / saved searches
- Multi-city support
- Real-time price tracking / alerts
- Image optimization / CDN
- Map marker clustering
- Server-side caching (Redis)
- Queue-based import
- CI/CD pipeline
- E2E browser tests
- Accessibility audit (basic a11y included but no formal audit)
- SEO optimization
- PWA / offline support

## Smoke Test Checklist (Post-Deploy)

- [ ] Homepage loads, shows listings grid
- [ ] Filter by property type works
- [ ] Filter by market type works
- [ ] Filter by price range works
- [ ] Filter by rooms (strict range) works
- [ ] Filter by district works
- [ ] Sort options work
- [ ] Map view shows markers
- [ ] Click listing → detail page loads
- [ ] Image gallery + lightbox works
- [ ] Location map shows on detail page
- [ ] NL search returns parsed filters as chips
- [ ] Area suggestion appears when rooms filter active
- [ ] Empty state shows when no results
- [ ] Pagination works
- [ ] Source attribution link works
- [ ] Mobile responsive
