import { useState } from 'react';
import { ParsedIntent } from '@/types';

interface ChatBoxProps {
  query: string | null;
  intentParsed: ParsedIntent | null;
  onSubmit: (query: string) => void;
  onApplyFilters: (intent: ParsedIntent) => void;
}

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

export default function ChatBox({ query, intentParsed, onSubmit, onApplyFilters }: ChatBoxProps) {
  const [value, setValue] = useState(query ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="Opisz czego szukasz, np. &quot;przytulne 2-pokojowe blisko centrum do 500 tys&quot;..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Zapytaj
        </button>
      </form>

      {query && intentParsed && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold flex-shrink-0">
              AI
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Rozumiem, szukasz:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(intentParsed)
                  .filter(([, v]) => v !== undefined && v !== null)
                  .map(([key, value]) => {
                    const label = FILTER_LABELS[key] || key;
                    const displayValue = VALUE_LABELS[key]?.[String(value)] || String(value);
                    return (
                      <span key={key} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {label}: {displayValue}
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 ml-11">
            <button
              onClick={() => onApplyFilters(intentParsed)}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              Zastosuj filtry
            </button>
            <button
              onClick={() => setValue('')}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              Zmień zapytanie
            </button>
          </div>
        </div>
      )}

      {query && !intentParsed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            Nie udało się zinterpretować zapytania. Wyniki oparte na wyszukiwaniu słów kluczowych.
          </p>
        </div>
      )}
    </div>
  );
}
