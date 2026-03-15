# Frontend Build Brief

## Route Map

| Route | Inertia Page | Description |
|---|---|---|
| `GET /` | `Listings/Index` | Browse, search, filter, map/grid toggle |
| `GET /listings/{id}` | `Listings/Show` | Detail with gallery, map, full info |

## Page Map

### Listings/Index
Main browse page. Two search modes ("Filtry" / "Zapytaj"), grid/map view toggle, sorting, pagination.

### Listings/Show
Single listing detail. Image gallery, key facts table, description, location map, source link, back button.

## Component Tree

```
AppLayout
├── Navbar ("Nieruchomości Kraków", link to /)
└── {children}

Listings/Index
├── SearchModeToggle (Filtry | Zapytaj)
├── [Filtry mode]
│   ├── SearchBar (keyword input + submit)
│   ├── FilterSidebar (responsive: sidebar desktop, drawer mobile)
│   │   ├── PropertyTypeFilter (Mieszkanie / Dom radio/buttons)
│   │   ├── MarketTypeFilter (Sprzedaż / Wynajem radio/buttons)
│   │   ├── PriceRangeFilter (min/max inputs)
│   │   ├── AreaRangeFilter (min/max inputs)
│   │   ├── RoomsFilter (min/max selects, strict range)
│   │   ├── DistrictFilter (select dropdown from districts[])
│   │   └── AreaSuggestion (conditional banner, "Dodaj filtr?" button)
│   └── ActiveFilters (removable chips for each active filter)
├── [AI Search mode]
│   └── AiSearchPanel (conversational AI search)
│       ├── ChatInput ("Opisz czego szukasz...")
│       ├── Conversation messages (user + AI bubbles, clarifying questions)
│       └── RecommendationsPanel
│           └── AiRecommendationCard × N (score, explanation, listing details)
├── ViewToggle (Lista | Mapa)
├── SortDropdown (Cena ↑↓, Metraż ↑↓, Najnowsze)
├── LoadingOverlay (shown during Inertia navigation)
├── ListingGrid
│   └── ListingCard × N
├── MapView (Leaflet, markers with popup mini-cards)
├── Pagination
└── EmptyState ("Brak wyników...")

Listings/Show
├── BackToResults (← Wróć do wyników)
├── ImageGallery (carousel + lightbox, swipeable on mobile)
├── ListingHeader (title, price, badges: type/market)
├── ListingDetails (formatted table: area, rooms, floor, district)
├── DescriptionSection (HTML-rendered description)
├── LocationMap (single-marker Leaflet, if coords exist)
└── SourceAttribution (Otodom link, imported date)
```

## Props / Data Contracts

### Listings/Index Props

```typescript
interface IndexPageProps {
  listings: {
    data: ListingSummary[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  filters: ActiveFilters;
  sort: string;
  districts: string[];
  areaSuggestion: AreaSuggestion | null;
  intentParsed: ParsedIntent | null;
  query: string | null;
}

interface ListingSummary {
  id: number;
  title: string;
  price: number | null;
  currency: string;
  price_per_m2: number | null;
  area_m2: number | null;
  rooms: number | null;
  property_type: 'flat' | 'house';
  market_type: 'sale' | 'rent';
  district: string | null;
  street: string | null;
  latitude: number | null;
  longitude: number | null;
  thumbnail_url: string | null;
  published_at: string | null;
  imported_at: string;
}

interface ActiveFilters {
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

interface ParsedIntent {
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

interface AreaSuggestion {
  min: number;
  max: number;
  count: number;
  label: string;
}

interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}
```

### Listings/Show Props

```typescript
interface ShowPageProps {
  listing: ListingDetail;
}

interface ListingDetail {
  id: number;
  external_id: string;
  source_name: string;
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
  image_urls: string[] | null;
  published_at: string | null;
  imported_at: string;
  normalization_status: string;
  created_at: string;
  updated_at: string;
}
```

## Filter UX Behavior

- All filters apply via GET params through Inertia `router.get('/', params, { preserveState: true })`
- `useListingFilters` hook manages filter state, debounced URL sync
- Changing any filter triggers new Inertia request (no separate submit button for filters)
- ActiveFilters shows chips for each active filter with × to remove
- Removing a filter sets its param to null and triggers new request
- SearchBar: on Enter or button click, adds `keywords` param
- AreaSuggestion: only shown when rooms filter active AND suggestion exists; "Dodaj filtr?" applies min_area/max_area in single update

## AI Conversational Search UX

- Toggle between "Filtry" and AI Search at top of filter area
- AiSearchPanel has a conversational chat interface
- On submit: `POST /ai-search` with `{messages, question_count}`
- Backend runs 4-step pipeline: PreferenceExtractor → CandidateRetriever → ListingRanker → Orchestrator
- AI may ask clarifying questions (up to 2) when confidence is low
- Results appear as ranked recommendations with scores and Polish explanations
- Each recommendation links to the full listing detail page
- Uses `useAiSearch` hook for state management (messages, loading, results)
- All AI calls use Gemini 2.5 Flash; falls back to deterministic ranking if unavailable

## Keyword Search

- In the structured filter tab, the search bar accepts plain text keywords
- On submit: Inertia GET to `/?q={text}`
- Backend runs LIKE search across title, description, district, street
- Sufficient for ~100 listings; upgrade to full-text index at scale

## Loading / Empty / Error States

- **Loading**: LoadingOverlay shown during Inertia page transitions (use `router.on('start')` / `router.on('finish')`)
- **Empty**: EmptyState component when `listings.data.length === 0`: "Brak wyników dla podanych filtrów. Spróbuj zmienić kryteria wyszukiwania."
- **Error**: No special error state needed — Inertia handles errors via Laravel's error pages
- **No image**: ListingCard shows placeholder when `thumbnail_url` is null
- **No price**: Show "Cena na zapytanie"
- **No area**: Show "Brak danych"
- **No coords**: Hide map marker for that listing; hide LocationMap on Show page

## Responsive Behavior

- **Desktop (≥1024px)**: FilterSidebar as left column, content right. Grid: 3 columns.
- **Tablet (768-1023px)**: FilterSidebar as collapsible panel above content. Grid: 2 columns.
- **Mobile (<768px)**: FilterSidebar as slide-out drawer (hamburger/filter icon). Grid: 1 column. Map full width. Gallery swipeable.
- ListingMap: always full width of content area
- ImageGallery: carousel with arrow nav on desktop, swipe on mobile
- Pagination: simplified on mobile (prev/next only, no page numbers)

## Styling Notes

- Tailwind utility classes only, no custom CSS
- Clean, minimal design — white background, subtle borders
- Cards with shadow-sm, rounded-lg
- Primary color: blue-800 for buttons and active states (navy blue, professional look)
- Rounding: rounded-lg for cards/panels, rounded-md for buttons/inputs
- Glass effect: bg-white/80 backdrop-blur-lg for navbar
- Polish language throughout all labels, buttons, placeholders
