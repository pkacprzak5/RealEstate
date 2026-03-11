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
const DELAY_MS = 2000;

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
    const el = document.querySelector('script#__NEXT_DATA__');
    return el ? JSON.parse(el.textContent) : null;
  });
}

const ROOM_MAP = {
  'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5,
  'SIX': 6, 'SEVEN': 7, 'EIGHT': 8, 'NINE': 9, 'TEN': 10,
};

function parseRooms(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (ROOM_MAP[value]) return ROOM_MAP[value];
    if (/^\d+$/.test(value)) return parseInt(value, 10);
  }
  return null;
}

function parseFloor(value) {
  if (value == null) return null;
  const str = Array.isArray(value) ? value[0] : value;
  if (str === 'ground_floor') return 0;
  if (str === 'cellar') return -1;
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
}

function extractDistrict(location) {
  // From reverseGeocoding in search results
  const locs = location?.reverseGeocoding?.locations || [];
  const district = locs.find(l => l.locationLevel === 'district');
  return district?.name ?? null;
}

function parseSearchItem(item, category) {
  return {
    external_id: String(item.id),
    slug: item.slug || null,
    title: item.title || 'Brak tytułu',
    description: item.shortDescription || null,
    price: item.totalPrice?.value ?? null,
    currency: item.totalPrice?.currency ?? 'PLN',
    price_per_m2: item.pricePerSquareMeter?.value ?? null,
    area_m2: item.areaInSquareMeters ?? null,
    rooms: parseRooms(item.roomsNumber),
    floor: null, // enriched from detail
    building_floors: null, // enriched from detail
    property_type: category.property_type,
    market_type: category.market_type,
    district: extractDistrict(item.location),
    street: item.location?.address?.street?.name ?? null,
    latitude: null, // enriched from detail
    longitude: null, // enriched from detail
    thumbnail_url: item.images?.[0]?.large ?? item.images?.[0]?.medium ?? null,
    image_urls: (item.images || []).map(img => img.large || img.medium || img.small).filter(Boolean),
    published_at: item.createdAtFirst ?? item.dateCreated ?? null,
    source_url: item.slug ? `${BASE_URL}/pl/oferta/${item.slug}` : null,
    raw_snapshot: null,
  };
}

async function enrichFromDetailPage(page, listing) {
  if (!listing.source_url) return listing;

  try {
    await page.goto(listing.source_url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('script#__NEXT_DATA__', { state: 'attached', timeout: 10000 });
    const data = await extractNextData(page);
    const ad = data?.props?.pageProps?.ad;

    if (ad) {
      listing.description = ad.description ?? listing.description;

      // Coordinates
      if (ad.location?.coordinates) {
        listing.latitude = ad.location.coordinates.latitude ?? null;
        listing.longitude = ad.location.coordinates.longitude ?? null;
      }

      // Floor info
      listing.floor = parseFloor(ad.target?.Floor_no);
      listing.building_floors = ad.target?.Building_floors_num
        ? parseInt(ad.target.Building_floors_num, 10) || null
        : null;

      // District from detail page (more reliable)
      if (ad.location?.address?.district?.name) {
        listing.district = ad.location.address.district.name;
      }

      // More images from detail page
      if (ad.images?.length) {
        listing.image_urls = ad.images.map(img => img.large || img.medium || img.small).filter(Boolean);
        listing.thumbnail_url = listing.image_urls[0] ?? listing.thumbnail_url;
      }

      // Rooms from detail target if missing
      if (!listing.rooms && ad.target?.Rooms_num) {
        listing.rooms = parseRooms(ad.target.Rooms_num);
      }
    }

    listing.raw_snapshot = JSON.stringify(data?.props?.pageProps ?? {});
  } catch (err) {
    console.error(`  Warning: could not enrich ${listing.external_id}: ${err.message}`);
  }

  return listing;
}

async function scrapeCategory(context, category, limit) {
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  const listings = [];

  try {
    const pagesNeeded = Math.ceil(limit / 36);
    for (let p = 1; p <= pagesNeeded && listings.length < limit; p++) {
      const url = `${BASE_URL}${category.url}?page=${p}`;
      console.error(`  Fetching: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForSelector('script#__NEXT_DATA__', { state: 'attached', timeout: 10000 });

      const data = await extractNextData(page);
      const items = data?.props?.pageProps?.data?.searchAds?.items || [];

      if (items.length === 0) {
        console.error(`  No items found on page ${p}`);
        break;
      }

      console.error(`  Found ${items.length} items on page ${p}`);

      for (const item of items) {
        if (listings.length >= limit) break;
        // Skip promoted/development listings that may be duplicates
        if (item.__typename === 'InvestmentAd') continue;
        const parsed = parseSearchItem(item, category);
        if (parsed.source_url) {
          listings.push(parsed);
        }
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

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale: 'pl-PL',
  });

  const allListings = [];

  try {
    for (const category of CATEGORIES) {
      console.error(`\nScraping: ${category.property_type} / ${category.market_type}`);
      const listings = await scrapeCategory(context, category, opts.limit);
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
