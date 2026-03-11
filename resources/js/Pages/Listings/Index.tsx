import { useState, useEffect, lazy, Suspense } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { IndexPageProps, ListingFilters, ParsedIntent } from '@/types';
import { useListingFilters } from '@/Hooks/useListingFilters';
import SearchBar from '@/Components/Listings/SearchBar';
import FilterSidebar from '@/Components/Listings/FilterSidebar';
import ActiveFilters from '@/Components/Listings/ActiveFilters';
import ChatBox from '@/Components/Listings/ChatBox';
import ViewToggle from '@/Components/Listings/ViewToggle';
import SortDropdown from '@/Components/Listings/SortDropdown';
import ListingGrid from '@/Components/Listings/ListingGrid';
import EmptyState from '@/Components/Listings/EmptyState';
import LoadingOverlay from '@/Components/Listings/LoadingOverlay';
import Pagination from '@/Components/UI/Pagination';

const ListingMap = lazy(() => import('@/Components/Listings/ListingMap'));

type SearchMode = 'filters' | 'chat';

export default function Index({ listings, filters, sort, districts, areaSuggestion, intentParsed, query }: IndexPageProps) {
  const [searchMode, setSearchMode] = useState<SearchMode>(query ? 'chat' : 'filters');
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const {
    setFilter,
    removeFilter,
    clearAllFilters,
    setSort,
    submitSearch,
    updateFilters,
  } = useListingFilters({ filters, sort, query });

  useEffect(() => {
    const removeStart = router.on('start', () => setLoading(true));
    const removeFinish = router.on('finish', () => setLoading(false));
    return () => { removeStart(); removeFinish(); };
  }, []);

  const handleApplyIntent = (intent: ParsedIntent) => {
    setSearchMode('filters');
    const cleaned: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(intent)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    router.get('/', cleaned, { preserveState: true });
  };

  const handleAreaSuggestionApply = (min: number, max: number) => {
    updateFilters({ min_area: min, max_area: max });
  };

  return (
    <AppLayout title="Ogłoszenia">
      {loading && <LoadingOverlay />}

      {/* Search mode toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSearchMode('filters')}
          className={`px-4 py-2 text-sm rounded-md ${
            searchMode === 'filters'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Filtry
        </button>
        <button
          onClick={() => setSearchMode('chat')}
          className={`px-4 py-2 text-sm rounded-md ${
            searchMode === 'chat'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Zapytaj
        </button>
      </div>

      {/* Chat mode */}
      {searchMode === 'chat' && (
        <div className="mb-6">
          <ChatBox
            query={query}
            intentParsed={intentParsed}
            onSubmit={submitSearch}
            onApplyFilters={handleApplyIntent}
          />
        </div>
      )}

      {/* Filters mode */}
      {searchMode === 'filters' && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filter sidebar - desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-4 bg-white rounded-lg border border-gray-200 p-4">
              <FilterSidebar
                filters={filters}
                districts={districts}
                areaSuggestion={areaSuggestion}
                onFilterChange={setFilter}
                onAreaSuggestionApply={handleAreaSuggestionApply}
              />
            </div>
          </aside>

          {/* Mobile filter button + drawer */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filtry
            </button>
          </div>

          {/* Mobile drawer overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="fixed inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
              <div className="fixed inset-y-0 left-0 w-80 max-w-full bg-white shadow-xl z-50 overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="text-lg font-medium">Filtry</h2>
                  <button onClick={() => setMobileFiltersOpen(false)} className="text-gray-400 hover:text-gray-600">
                    ×
                  </button>
                </div>
                <div className="p-4">
                  <FilterSidebar
                    filters={filters}
                    districts={districts}
                    areaSuggestion={areaSuggestion}
                    onFilterChange={(key, value) => { setFilter(key, value); }}
                    onAreaSuggestionApply={handleAreaSuggestionApply}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {/* Search bar */}
            <div className="mb-4">
              <SearchBar
                keywords={filters.keywords ?? ''}
                onSearch={(kw) => setFilter('keywords', kw || undefined)}
              />
            </div>

            {/* Active filters */}
            <div className="mb-4">
              <ActiveFilters
                filters={filters}
                onRemove={removeFilter}
                onClearAll={clearAllFilters}
              />
            </div>

            {/* Toolbar: view toggle + sort + count */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <ViewToggle view={view} onChange={setView} />
                <span className="text-sm text-gray-500">
                  {listings.total} {listings.total === 1 ? 'ogłoszenie' : 'ogłoszeń'}
                </span>
              </div>
              <SortDropdown sort={sort} onChange={setSort} />
            </div>

            {/* Results */}
            {listings.data.length === 0 ? (
              <EmptyState />
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
              <Suspense fallback={<div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">Ładowanie mapy...</div>}>
                <ListingMap listings={listings.data} />
              </Suspense>
            )}
          </div>
        </div>
      )}

      {/* Results when in chat mode (below chat box) */}
      {searchMode === 'chat' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ViewToggle view={view} onChange={setView} />
              <span className="text-sm text-gray-500">
                {listings.total} {listings.total === 1 ? 'ogłoszenie' : 'ogłoszeń'}
              </span>
            </div>
            <SortDropdown sort={sort} onChange={setSort} />
          </div>

          {listings.data.length === 0 ? (
            <EmptyState />
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
            <ListingMap listings={listings.data} />
          )}
        </div>
      )}
    </AppLayout>
  );
}
