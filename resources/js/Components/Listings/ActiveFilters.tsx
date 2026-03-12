import { X } from 'lucide-react';
import { ListingFilters } from '@/types';

interface Props {
    filters: ListingFilters;
    onRemove: (key: keyof ListingFilters) => void;
    onClearAll: () => void;
}

const filterLabels: Record<string, (v: string | number) => string> = {
    property_type: (v) => v === 'flat' ? 'Mieszkanie' : 'Dom',
    market_type: (v) => v === 'sale' ? 'Sprzedaż' : 'Wynajem',
    district: (v) => String(v),
    min_price: (v) => `od ${(Number(v) / 1000).toFixed(0)}k zł`,
    max_price: (v) => `do ${(Number(v) / 1000).toFixed(0)}k zł`,
    min_area: (v) => `od ${v} m²`,
    max_area: (v) => `do ${v} m²`,
    min_rooms: (v) => `od ${v} pokoi`,
    max_rooms: (v) => `do ${v} pokoi`,
    keywords: (v) => `"${v}"`,
};

export default function ActiveFilters({ filters, onRemove, onClearAll }: Props) {
    const entries = Object.entries(filters).filter(([, v]) => v !== undefined && v !== '');
    if (entries.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2">
            {entries.map(([key, value]) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => onRemove(key as keyof ListingFilters)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-navy-50 text-navy text-xs font-medium rounded-full hover:bg-navy/10 transition-colors"
                >
                    {filterLabels[key]?.(value!) ?? String(value)}
                    <X className="w-3 h-3" />
                </button>
            ))}
            <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
                Wyczyść
            </button>
        </div>
    );
}
