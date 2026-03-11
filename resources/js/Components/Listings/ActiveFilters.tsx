import { ListingFilters } from '@/types';

const FILTER_LABELS: Record<string, string> = {
  property_type: 'Typ',
  market_type: 'Transakcja',
  district: 'Dzielnica',
  min_price: 'Cena od',
  max_price: 'Cena do',
  min_area: 'Metraż od',
  max_area: 'Metraż do',
  min_rooms: 'Pokoje od',
  max_rooms: 'Pokoje do',
  keywords: 'Słowa kluczowe',
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
  property_type: { flat: 'Mieszkanie', house: 'Dom' },
  market_type: { sale: 'Sprzedaż', rent: 'Wynajem' },
};

interface ActiveFiltersProps {
  filters: ListingFilters;
  onRemove: (key: keyof ListingFilters) => void;
  onClearAll: () => void;
}

export default function ActiveFilters({ filters, onRemove, onClearAll }: ActiveFiltersProps) {
  const entries = Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '');

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {entries.map(([key, value]) => {
        const label = FILTER_LABELS[key] || key;
        const displayValue = VALUE_LABELS[key]?.[String(value)] || String(value);

        return (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            {label}: {displayValue}
            <button
              onClick={() => onRemove(key as keyof ListingFilters)}
              className="ml-1 text-blue-600 hover:text-blue-800"
              aria-label={`Usuń filtr ${label}`}
            >
              ×
            </button>
          </span>
        );
      })}
      <button
        onClick={onClearAll}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Wyczyść wszystkie
      </button>
    </div>
  );
}
