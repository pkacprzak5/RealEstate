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

    const setFilters = useCallback((updates: Partial<ListingFilters>) => {
        const next = { ...currentFilters };
        for (const [key, value] of Object.entries(updates)) {
            if (value === undefined || value === '' || value === null) {
                delete next[key as keyof ListingFilters];
            } else {
                (next as any)[key] = value;
            }
        }
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

    return { setFilter, setFilters, removeFilter, clearAll, setSort, setKeywords, currentFilters, currentSort };
}
