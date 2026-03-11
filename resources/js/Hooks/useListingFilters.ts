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
    const cleaned: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== null && value !== '') {
        cleaned[key] = value;
      }
    }
    if (newSort || sort !== 'newest') {
      cleaned.sort = newSort || sort;
    }
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
