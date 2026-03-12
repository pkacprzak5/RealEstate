# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a professional Otodom-like real-estate marketplace UI from scratch, matching the approved Pencil design in `pencil-new.pen`.

**Architecture:** Inertia.js + React 18 SPA with two page components (Index, Show). Shared AppLayout with navbar. Filter state managed via URL query params through Inertia router. Leaflet map lazy-loaded. All UI text in Polish.

**Tech Stack:** React 18, Inertia v2, Tailwind CSS 3, HeadlessUI v2, Leaflet + react-leaflet, TypeScript strict mode, Lucide React icons.

---

## File Structure

### Config changes
- Modify: `tailwind.config.js` — add custom colors (navy, teal), change font to Inter
- Modify: `resources/css/app.css` — replace custom utilities with new design system
- Modify: `resources/views/app.blade.php` — change font import from Figtree to Inter
- Modify: `package.json` — add `lucide-react` dependency

### Layout
- Create: `resources/js/Layouts/AppLayout.tsx` — navbar with pill nav items, centered container

### Shared UI Components
- Create: `resources/js/Components/UI/Pagination.tsx` — page number pagination
- Create: `resources/js/Components/UI/FilterDropdown.tsx` — reusable filter dropdown (HeadlessUI Popover)
- Create: `resources/js/Components/UI/Badge.tsx` — property type / market type badges

### Listing Components
- Create: `resources/js/Components/Listings/SearchBar.tsx` — search input with icon
- Create: `resources/js/Components/Listings/FilterBar.tsx` — inline filter controls (price, area, rooms, district, type toggles)
- Create: `resources/js/Components/Listings/ActiveFilters.tsx` — dismissible filter chips
- Create: `resources/js/Components/Listings/ListingCard.tsx` — property card with image, badges, price, meta
- Create: `resources/js/Components/Listings/ListingGrid.tsx` — responsive 3/2/1 column grid
- Create: `resources/js/Components/Listings/SortDropdown.tsx` — sort control
- Create: `resources/js/Components/Listings/ViewToggle.tsx` — grid/map toggle
- Create: `resources/js/Components/Listings/MapView.tsx` — Leaflet split-view with price pins + card panel
- Create: `resources/js/Components/Listings/EmptyState.tsx` — no results state
- Create: `resources/js/Components/Listings/LoadingOverlay.tsx` — loading indicator
- Create: `resources/js/Components/Listings/ImageGallery.tsx` — detail page photo gallery

### Hooks
- Create: `resources/js/Hooks/useListingFilters.ts` — filter/sort state via Inertia router

### Pages
- Create: `resources/js/Pages/Listings/Index.tsx` — listings page (list + map modes)
- Create: `resources/js/Pages/Listings/Show.tsx` — detail page

---

## Chunk 1: Foundation

### Task 1: Install dependencies and update config

**Files:**
- Modify: `package.json`
- Modify: `tailwind.config.js`
- Modify: `resources/css/app.css`
- Modify: `resources/views/app.blade.php`

- [ ] **Step 1: Install lucide-react**

```bash
cd /Users/piotrkacprzak/programow/RealEstate && npm install lucide-react --legacy-peer-deps
```

- [ ] **Step 2: Update tailwind.config.js with design system colors and font**

```js
import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                navy: {
                    DEFAULT: '#1E3A5F',
                    50: '#EFF6FF',
                    600: '#1E3A5F',
                    700: '#172E4A',
                },
                teal: {
                    DEFAULT: '#0F766E',
                    600: '#0F766E',
                    700: '#0D6358',
                },
            },
        },
    },
    plugins: [forms],
};
```

- [ ] **Step 3: Update app.blade.php font import**

Change the font link from Figtree to Inter (400,500,600,700 weights):
```html
<link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />
```

- [ ] **Step 4: Update app.css with new design system utilities**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    scroll-behavior: smooth;
  }
  body {
    @apply antialiased bg-gray-50 text-gray-900;
  }
}

@layer components {
  .container-main {
    @apply max-w-[1200px] mx-auto px-6 lg:px-8;
  }
}
```

- [ ] **Step 5: Verify build works**

```bash
cd /Users/piotrkacprzak/programow/RealEstate && npx vite build 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js resources/css/app.css resources/views/app.blade.php package.json package-lock.json
git commit -m "feat: update design system foundation — Inter font, navy/teal palette, container utility"
```

### Task 2: AppLayout with navbar

**Files:**
- Create: `resources/js/Layouts/AppLayout.tsx`

- [ ] **Step 1: Create AppLayout**

The layout renders:
- Fixed navbar (64px) with logo left, pill nav items right
- Active nav item gets `bg-navy-50 text-navy font-semibold` pill, inactive gets transparent
- Children rendered below with `bg-gray-50 min-h-screen`
- Uses Inertia `Link` for navigation
- All text in Polish: "Oferty", "Mapa", "O nas"

```tsx
import { Link, usePage } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { PropsWithChildren } from 'react';

export default function AppLayout({ children }: PropsWithChildren) {
    const { url } = usePage();
    const isMap = new URLSearchParams(url.split('?')[1]).get('view') === 'map';

    const navItems = [
        { label: 'Oferty', href: '/', active: url.startsWith('/') && !isMap },
        { label: 'Mapa', href: '/?view=map', active: isMap },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="sticky top-0 z-40 h-16 bg-white border-b border-gray-200">
                <div className="h-full max-w-[1440px] mx-auto px-8 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Building2 className="w-6 h-6 text-navy" />
                        <span className="text-lg font-bold text-navy tracking-tight">
                            NieruchomościKRK
                        </span>
                    </Link>
                    <div className="flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`px-3.5 py-1.5 rounded-full text-sm transition-colors ${
                                    item.active
                                        ? 'bg-navy-50 text-navy font-semibold'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>
            <main>{children}</main>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Layouts/AppLayout.tsx
git commit -m "feat: add AppLayout with navbar and pill nav items"
```

---

## Chunk 2: Shared UI Components

### Task 3: Badge component

**Files:**
- Create: `resources/js/Components/UI/Badge.tsx`

- [ ] **Step 1: Create Badge**

```tsx
const variants = {
    property: 'bg-navy-50 text-navy',
    market: 'bg-emerald-50 text-emerald-700',
    neutral: 'bg-gray-100 text-gray-700',
} as const;

interface BadgeProps {
    children: React.ReactNode;
    variant?: keyof typeof variants;
}

export default function Badge({ children, variant = 'neutral' }: BadgeProps) {
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
            {children}
        </span>
    );
}
```

### Task 4: Pagination component

**Files:**
- Create: `resources/js/Components/UI/Pagination.tsx`

- [ ] **Step 1: Create Pagination**

Uses Inertia Link for page navigation. Renders page numbers with active state (navy bg), prev/next arrows. Takes `links`, `currentPage`, `lastPage` from Laravel paginator.

```tsx
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationLink } from '@/types';

interface Props {
    links: PaginationLink[];
    currentPage: number;
    lastPage: number;
}

export default function Pagination({ links, currentPage, lastPage }: Props) {
    if (lastPage <= 1) return null;

    const pageLinks = links.slice(1, -1); // remove prev/next wrappers

    return (
        <div className="flex items-center gap-1 justify-center">
            {currentPage > 1 && links[0].url && (
                <Link href={links[0].url} className="w-9 h-9 flex items-center justify-center rounded bg-white border border-gray-300 hover:bg-gray-50">
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                </Link>
            )}
            {pageLinks.map((link) => (
                <Link
                    key={link.label}
                    href={link.url || '#'}
                    className={`w-9 h-9 flex items-center justify-center rounded text-sm ${
                        link.active
                            ? 'bg-navy text-white font-semibold'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
            {currentPage < lastPage && links[links.length - 1].url && (
                <Link href={links[links.length - 1].url!} className="w-9 h-9 flex items-center justify-center rounded bg-white border border-gray-300 hover:bg-gray-50">
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                </Link>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit chunk 2**

```bash
git add resources/js/Components/UI/Badge.tsx resources/js/Components/UI/Pagination.tsx
git commit -m "feat: add Badge and Pagination UI components"
```

---

## Chunk 3: Listing Components — Search, Filters, Cards

### Task 5: useListingFilters hook

**Files:**
- Create: `resources/js/Hooks/useListingFilters.ts`

- [ ] **Step 1: Create filter hook**

Manages filter state and syncs with URL via Inertia router.visit(). Debounces search input. Provides `setFilter`, `removeFilter`, `clearAll`, `setSort`, `activeFilterCount`.

```tsx
import { router } from '@inertiajs/react';
import { useCallback, useRef } from 'react';
import { ListingFilters } from '@/types';

export function useListingFilters(currentFilters: ListingFilters, currentSort: string) {
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const navigate = useCallback((filters: ListingFilters, sort: string, options?: { debounce?: number }) => {
        const params: Record<string, string> = {};
        if (filters.property_type) params.property_type = filters.property_type;
        if (filters.market_type) params.market_type = filters.market_type;
        if (filters.district) params.district = filters.district;
        if (filters.min_price) params.min_price = String(filters.min_price);
        if (filters.max_price) params.max_price = String(filters.max_price);
        if (filters.min_area) params.min_area = String(filters.min_area);
        if (filters.max_area) params.max_area = String(filters.max_area);
        if (filters.min_rooms) params.min_rooms = String(filters.min_rooms);
        if (filters.max_rooms) params.max_rooms = String(filters.max_rooms);
        if (filters.keywords) params.keywords = filters.keywords;
        if (sort && sort !== 'newest') params.sort = sort;

        const visit = () => router.get('/', params, { preserveState: true, preserveScroll: true });

        if (options?.debounce) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(visit, options.debounce);
        } else {
            visit();
        }
    }, []);

    const setFilter = useCallback((key: keyof ListingFilters, value: string | number | undefined) => {
        const next = { ...currentFilters, [key]: value || undefined };
        navigate(next, currentSort);
    }, [currentFilters, currentSort, navigate]);

    const removeFilter = useCallback((key: keyof ListingFilters) => {
        const next = { ...currentFilters };
        delete next[key];
        navigate(next, currentSort);
    }, [currentFilters, currentSort, navigate]);

    const clearAll = useCallback(() => {
        navigate({}, 'newest');
    }, [navigate]);

    const setSort = useCallback((sort: string) => {
        navigate(currentFilters, sort);
    }, [currentFilters, navigate]);

    const setKeywords = useCallback((keywords: string) => {
        const next = { ...currentFilters, keywords: keywords || undefined };
        navigate(next, currentSort, { debounce: 400 });
    }, [currentFilters, currentSort, navigate]);

    return { setFilter, removeFilter, clearAll, setSort, setKeywords, currentFilters, currentSort };
}
```

### Task 6: SearchBar component

**Files:**
- Create: `resources/js/Components/Listings/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar**

Full-width search input with search icon, supports both keyword search and AI natural-language query. Polish placeholder text.

```tsx
import { Search } from 'lucide-react';
import { useState } from 'react';
import { router } from '@inertiajs/react';

interface Props {
    keywords: string;
    onKeywordsChange: (value: string) => void;
}

export default function SearchBar({ keywords, onKeywordsChange }: Props) {
    const [value, setValue] = useState(keywords);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        onKeywordsChange(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (value.trim()) {
            router.get('/', { q: value.trim() }, { preserveState: true });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex-1">
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                <input
                    type="text"
                    value={value}
                    onChange={handleChange}
                    placeholder="Szukaj po słowie kluczowym, dzielnicy lub opisz czego szukasz..."
                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-navy-50 focus:border-navy"
                />
            </div>
        </form>
    );
}
```

### Task 7: FilterBar component

**Files:**
- Create: `resources/js/Components/Listings/FilterBar.tsx`

- [ ] **Step 1: Create FilterBar**

Renders inline filter controls: district dropdown, price range, area range, rooms selector, property type, market type toggle (Sprzedaż/Wynajem). Uses HeadlessUI Popover for dropdowns.

The component is complex (~200 lines). Key sections:
- District select (HeadlessUI Listbox)
- Price range popover (min/max inputs + quick pills)
- Area range popover (min/max inputs)
- Rooms selector (button group: Wszystkie, 1, 2, 3, 4, 5+)
- Market type toggle (segmented control: Sprzedaż / Wynajem)
- Active property type pill with X to dismiss

### Task 8: ActiveFilters component

**Files:**
- Create: `resources/js/Components/Listings/ActiveFilters.tsx`

- [ ] **Step 1: Create ActiveFilters**

Renders dismissible chips for each active filter. Shows "Wyczyść" (clear) link when filters are active. Each chip has text + X icon.

### Task 9: ListingCard component

**Files:**
- Create: `resources/js/Components/Listings/ListingCard.tsx`

- [ ] **Step 1: Create ListingCard**

Property card with: image (220px, with fallback), badges (property type + market type), title (2-line truncate), price (navy bold), meta row (area, rooms, district with icons), price per m². Links to detail page. Hover: elevated shadow + subtle border.

### Task 10: ListingGrid + SortDropdown + ViewToggle

**Files:**
- Create: `resources/js/Components/Listings/ListingGrid.tsx`
- Create: `resources/js/Components/Listings/SortDropdown.tsx`
- Create: `resources/js/Components/Listings/ViewToggle.tsx`

- [ ] **Step 1: Create all three**

ListingGrid: responsive CSS grid (3-col desktop, 2-col tablet, 1-col mobile) rendering ListingCards.
SortDropdown: HeadlessUI Listbox with sort options (Najnowsze, Cena rosnąco, Cena malejąco, Powierzchnia rosnąco, Powierzchnia malejąco).
ViewToggle: segmented control with Grid/Map icons using the same design as the Pencil mockup.

### Task 11: EmptyState + LoadingOverlay

**Files:**
- Create: `resources/js/Components/Listings/EmptyState.tsx`
- Create: `resources/js/Components/Listings/LoadingOverlay.tsx`

- [ ] **Step 1: Create EmptyState**

Centered card with SearchX icon, "Nie znaleziono ofert" title, description, "Wyczyść filtry" button.

- [ ] **Step 2: Create LoadingOverlay**

Semi-transparent overlay with spinner, shown during Inertia page transitions.

- [ ] **Step 3: Commit chunk 3**

```bash
git add resources/js/Hooks/ resources/js/Components/Listings/ resources/js/Components/UI/
git commit -m "feat: add listing components — search, filters, cards, grid, sort, empty state"
```

---

## Chunk 4: Map View

### Task 12: MapView component

**Files:**
- Create: `resources/js/Components/Listings/MapView.tsx`

- [ ] **Step 1: Create MapView**

Split-view layout: 55% Leaflet map (left) + 45% scrollable card panel (right). Lazy-loaded with React.lazy + Suspense.

Map features:
- Price pins (navy background, white text showing abbreviated price like "549k")
- Active pin highlighted (white bg, navy border, shadow)
- Click pin → scroll to card + highlight
- Card click → center map on listing

Card panel:
- Compact horizontal cards (image left 140px, body right)
- Active card has navy border + shadow
- Scrollable with overflow-y-auto

Leaflet CSS imported in component. Uses `react-leaflet` MapContainer, TileLayer, Marker with custom DivIcon for price pins.

---

## Chunk 5: Pages Assembly

### Task 13: Listings Index page

**Files:**
- Create: `resources/js/Pages/Listings/Index.tsx`

- [ ] **Step 1: Create Index page**

Combines all components:
- AppLayout wrapper
- SearchBar + district dropdown row
- FilterBar (price, area, rooms, type toggle)
- ActiveFilters chips
- Results bar (count + SortDropdown + ViewToggle)
- Conditional: ListingGrid (list mode) or MapView (map mode)
- Pagination (list mode only)
- LoadingOverlay during transitions
- EmptyState when no results

Props from backend: `IndexPageProps` (listings, filters, sort, districts, areaSuggestion, intentParsed, query).

View mode tracked in URL param `view=map`.

### Task 14: Listing Detail page

**Files:**
- Create: `resources/js/Pages/Listings/Show.tsx`
- Create: `resources/js/Components/Listings/ImageGallery.tsx`

- [ ] **Step 1: Create ImageGallery**

2-column layout: main image (fill, rounded-lg) + 3 thumbnails stacked (rounded-lg). Last thumbnail has "+N zdjęć" overlay if more than 4 images. Clicking opens simple lightbox. Fallback for missing images.

- [ ] **Step 2: Create Show page**

Full detail page:
- AppLayout wrapper
- Breadcrumb (Oferty > District > Title)
- ImageGallery
- 2-column content: main (60%) + sidebar (340px)
- Main column: badges, title, location with pin icon, price (28px bold navy), price/m²
- Key facts grid (4 cards: area, rooms, PLN/m², type)
- Description (rendered HTML, Polish)
- Location map (single Leaflet map with pin, lazy-loaded)
- Details table (striped rows: type, market, area, rooms, district, street)
- Provenance block (source, published, imported, normalization badge)
- Sidebar: sticky price card with "Zobacz na Otodom" CTA (teal) + "Udostępnij" secondary button

- [ ] **Step 3: Commit chunk 5**

```bash
git add resources/js/Pages/ resources/js/Components/Listings/ImageGallery.tsx
git commit -m "feat: add Index and Show pages — complete frontend redesign"
```

---

## Chunk 6: Final Verification

### Task 15: Build verification and cleanup

- [ ] **Step 1: Run TypeScript check**

```bash
cd /Users/piotrkacprzak/programow/RealEstate && npx tsc --noEmit
```

- [ ] **Step 2: Run Vite build**

```bash
cd /Users/piotrkacprzak/programow/RealEstate && npx vite build
```

- [ ] **Step 3: Visual verification**

Start dev server and verify:
- Listings page loads with cards
- Filters work (price, rooms, district, type)
- Sort works
- Map view renders with pins
- Detail page loads with gallery, facts, map
- Empty state appears with impossible filters
- Responsive behavior at tablet/mobile widths
- No horizontal overflow at any breakpoint

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete frontend redesign — professional real-estate marketplace UI"
```
