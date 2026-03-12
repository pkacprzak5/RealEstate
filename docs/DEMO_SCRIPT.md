# Demo Script

Estimated time: 5 minutes.

## 1. Overview (30s)

Open the app. Point out:
- 100 real Kraków listings from Otodom
- Polish UI throughout
- Grid view with property cards showing thumbnails, prices, badges

## 2. Structured Filtering (1.5 min)

1. Click **"Mieszkanie"** → notice results filter, chip appears
2. Set rooms to **2–3** → area suggestion banner appears
3. Click **"Dodaj filtr metrażu"** → area filters auto-populated
4. Select a **district** from dropdown
5. Point out **active filter chips** — click × on one to remove
6. Click **"Wyczyść wszystkie"** to reset

## 3. Sorting & View Toggle (30s)

1. Change sort to **"Cena rosnąco"** — cheapest first
2. Click **"Mapa"** toggle → Leaflet map with markers centered on Kraków
3. Click a **marker** → popup shows title, price, area with link
4. Switch back to **"Lista"**

## 4. AI-Powered Search (1 min)

1. Click **"Zapytaj"** tab
2. Type: *"duże mieszkanie 3-pokojowe w centrum do 800 tys"*
3. Press Enter → AI interpretation bubble shows extracted filters
4. Click **"Zastosuj filtry"** → switches to Filtry mode with values pre-filled
5. Mention: if API key is missing, falls back to keyword search gracefully

## 5. Listing Detail (1 min)

1. Click any listing card
2. Walk through:
   - **Image gallery** — click arrows, click image for lightbox
   - **Details table** — area, rooms, floor, district
   - **Description** — full text from Otodom
   - **Location map** — single marker on Leaflet
   - **Source attribution** — link to original Otodom listing
3. Click **"← Wróć do wyników"** — filters preserved

## 6. Responsive Design (30s)

1. Resize browser to mobile width (or use DevTools)
2. Show: filter button → slide-out drawer, single-column grid, simplified pagination

## Key Talking Points

- **Deterministic first:** All features work without AI. AI is additive.
- **Idempotent pipeline:** Scraper → JSON → seeder → upsert. Safe to re-run.
- **Real data:** 100 actual Kraków listings, not mock data.
- **Simple search:** LIKE-based for 100 rows, acknowledged limitation with clear upgrade path.
- **Docker-ready:** Multi-stage build, auto-migrate, auto-seed on first deploy.
