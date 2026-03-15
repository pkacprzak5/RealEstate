import { Head, router } from '@inertiajs/react';
import { lazy, Suspense, useEffect, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import SearchBar from '@/Components/Listings/SearchBar';
import FilterBar from '@/Components/Listings/FilterBar';
import ActiveFilters from '@/Components/Listings/ActiveFilters';
import ListingGrid from '@/Components/Listings/ListingGrid';
import SortDropdown from '@/Components/Listings/SortDropdown';
import ViewToggle from '@/Components/Listings/ViewToggle';
import EmptyState from '@/Components/Listings/EmptyState';
import LoadingOverlay from '@/Components/Listings/LoadingOverlay';
import Pagination from '@/Components/UI/Pagination';
import ModeToggleBar from '@/Components/AiSearch/ModeToggleBar';
import AiSearchPanel from '@/Components/AiSearch/AiSearchPanel';
import { useListingFilters } from '@/Hooks/useListingFilters';
import { pluralizePl } from '@/utils/format';
import { IndexPageProps } from '@/types';

const MapView = lazy(() => import('@/Components/Listings/MapView'));

// Persist mode across Inertia navigations AND full page refreshes
const MODE_KEY = 'ai_search_mode';

function getPersistedMode(): 'filters' | 'ai' {
    if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(MODE_KEY);
        if (stored === 'ai') return 'ai';
    }
    return 'filters';
}

let persistedMode: 'filters' | 'ai' = getPersistedMode();

export default function Index({ listings, mapPins, filters, sort, districts, areaSuggestion, query }: IndexPageProps) {
    const { setFilter, setFilters, removeFilter, clearAll, setSort, setKeywords } = useListingFilters(filters, sort);
    const [view, setView] = useState<'list' | 'map'>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'map' ? 'map' : 'list';
        }
        return 'list';
    });
    const [mode, _setMode] = useState<'filters' | 'ai'>(persistedMode);
    const setMode = (m: 'filters' | 'ai') => {
        persistedMode = m;
        sessionStorage.setItem(MODE_KEY, m);
        _setMode(m);
    };
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const removeStart = router.on('start', () => setLoading(true));
        const removeFinish = router.on('finish', () => setLoading(false));
        return () => { removeStart(); removeFinish(); };
    }, []);

    const handleViewChange = (newView: 'list' | 'map') => {
        setView(newView);
        const params = new URLSearchParams(window.location.search);
        if (newView === 'map') {
            params.set('view', 'map');
        } else {
            params.delete('view');
        }
        window.history.replaceState({}, '', `/?${params.toString()}`);
    };

    return (
        <AppLayout>
            <Head title="Oferty nieruchomości w Krakowie" />

            {/* Mode toggle — always visible */}
            <div className="container-main pt-5 pb-4">
                <ModeToggleBar mode={mode} onModeChange={setMode} />
            </div>

            {mode === 'ai' ? (
                <AiSearchPanel />
            ) : (
                <div className="container-main py-4">
                    {/* Search */}
                    <div className="relative z-30 space-y-4 mb-6">
                        <SearchBar
                            keywords={filters.keywords || ''}
                            onKeywordsChange={setKeywords}
                        />
                        <FilterBar
                            filters={filters}
                            districts={districts}
                            onFilterChange={setFilter}
                            onFiltersChange={setFilters}
                        />
                        <ActiveFilters
                            filters={filters}
                            onRemove={removeFilter}
                            onClearAll={clearAll}
                        />
                    </div>

                    {/* Results bar */}
                    <div className="flex items-center justify-between mb-5">
                        <p className="text-sm text-gray-500">
                            {listings.total} {pluralizePl(listings.total, 'oferta', 'oferty', 'ofert')}
                        </p>
                        <div className="flex items-center gap-3">
                            <SortDropdown value={sort} onChange={setSort} />
                            <ViewToggle view={view} onChange={handleViewChange} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-0 isolation-auto" style={{ isolation: 'isolate' }}>
                        {loading && <LoadingOverlay />}

                        {listings.data.length === 0 ? (
                            <EmptyState onClear={clearAll} />
                        ) : view === 'map' ? (
                            <Suspense fallback={
                                <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">
                                    <div className="w-8 h-8 border-3 border-navy/20 border-t-navy rounded-full animate-spin" />
                                </div>
                            }>
                                <MapView pins={mapPins} />
                            </Suspense>
                        ) : (
                            <>
                                <ListingGrid listings={listings.data} />
                                <div className="mt-8">
                                    <Pagination
                                        links={listings.links}
                                        currentPage={listings.current_page}
                                        lastPage={listings.last_page}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
