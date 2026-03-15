# Demo Script

Estimated time: 5 minutes.

## 1. Overview (30s)

Open the app. Point out:
- 100 real Kraków listings from Otodom (~25 each of flat/house × sale/rent)
- Grid view with property cards showing thumbnails, prices, badges
- Professional real-estate look and feel

## 2. Structured Filtering (1.5 min)

1. Click **"Mieszkanie"** → notice results filter, chip appears
2. Set rooms to **2–3** → area suggestion banner appears
3. Click **"Dodaj filtr metrażu"** → area filters auto-populated from real data (P10–P90)
4. Select a **district** from dropdown (district hierarchy: e.g., Dębniki includes Ruczaj, Zakrzówek)
5. Point out **active filter chips** — click × on one to remove
6. Click **"Wyczyść wszystkie"** to reset

## 3. Sorting & View Toggle (30s)

1. Change sort to **"Cena rosnąco"** — cheapest first
2. Click **"Mapa"** toggle → Leaflet map with markers centered on Kraków
3. Click a **marker** → popup shows title, price, area with link
4. Switch back to **"Lista"**

## 4. AI Conversational Search (1.5 min)

This is the highlight — users can search by lifestyle, not just numbers.

1. Open the **AI Search** panel
2. Type: *"Szukam spokojnego mieszkania z balkonem blisko parku, najlepiej 2–3 pokoje"*
3. The AI may ask a **clarifying question** (e.g., budget range or preferred district) — answer it
4. Results appear as **ranked recommendations** with:
   - Match score (0–1)
   - Polish explanation of why each listing matches
   - Key details (price, area, rooms, district)
5. Click a recommendation to view the full listing
6. Mention: the pipeline is traced (`trace_id`, latency, LLM call count) for observability

**Key talking point:** The AI understands soft preferences like "quiet", "near a park", "good for a family" — not just structured filters. It matches these against features extracted from Polish descriptions (nearby POIs, balcony, green areas, etc.).

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

- **Deterministic first:** All features work without AI. AI is additive with graceful fallback.
- **Intentional AI:** Every AI feature has a clear product benefit, deterministic fallback, and tracing.
- **Soft preferences:** Users can search by lifestyle ("quiet", "near park") — not just price and rooms.
- **Idempotent pipeline:** Scraper → JSON → seeder → upsert. Safe to re-run.
- **Real data:** 100 actual Kraków listings from Otodom, not mock data.
- **Simple search:** LIKE-based for ~100 rows, acknowledged limitation with clear upgrade path.
- **Docker-ready:** Multi-stage build, auto-migrate, auto-seed on first deploy. Deployed on Railway.
