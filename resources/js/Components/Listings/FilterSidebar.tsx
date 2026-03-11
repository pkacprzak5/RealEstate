import { ListingFilters, AreaSuggestion } from '@/types';
import { useState } from 'react';

interface FilterSidebarProps {
  filters: ListingFilters;
  districts: string[];
  areaSuggestion: AreaSuggestion | null;
  onFilterChange: (key: keyof ListingFilters, value: string | number | undefined) => void;
  onAreaSuggestionApply: (min: number, max: number) => void;
}

export default function FilterSidebar({ filters, districts, areaSuggestion, onFilterChange, onAreaSuggestionApply }: FilterSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Typ nieruchomości */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Typ nieruchomości</label>
        <div className="flex gap-2">
          {[
            { value: undefined, label: 'Wszystkie' },
            { value: 'flat', label: 'Mieszkanie' },
            { value: 'house', label: 'Dom' },
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => onFilterChange('property_type', opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                filters.property_type === opt.value || (!filters.property_type && !opt.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Typ transakcji */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Typ transakcji</label>
        <div className="flex gap-2">
          {[
            { value: undefined, label: 'Wszystkie' },
            { value: 'sale', label: 'Sprzedaż' },
            { value: 'rent', label: 'Wynajem' },
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => onFilterChange('market_type', opt.value)}
              className={`px-3 py-1.5 text-sm rounded-md border ${
                filters.market_type === opt.value || (!filters.market_type && !opt.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cena */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Cena (PLN)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Od"
            value={filters.min_price ?? ''}
            onChange={e => onFilterChange('min_price', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Do"
            value={filters.max_price ?? ''}
            onChange={e => onFilterChange('max_price', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Metraż */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Metraż (m²)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Od"
            value={filters.min_area ?? ''}
            onChange={e => onFilterChange('min_area', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
          <input
            type="number"
            placeholder="Do"
            value={filters.max_area ?? ''}
            onChange={e => onFilterChange('max_area', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Pokoje */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pokoje</label>
        <div className="flex gap-2">
          <select
            value={filters.min_rooms ?? ''}
            onChange={e => onFilterChange('min_rooms', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          >
            <option value="">Od</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <select
            value={filters.max_rooms ?? ''}
            onChange={e => onFilterChange('max_rooms', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          >
            <option value="">Do</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Area suggestion */}
      {areaSuggestion && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">{areaSuggestion.label}</p>
          <p className="text-xs text-blue-600 mt-1">Na podstawie {areaSuggestion.count} ogłoszeń</p>
          <button
            onClick={() => onAreaSuggestionApply(areaSuggestion.min, areaSuggestion.max)}
            className="mt-2 text-sm text-blue-700 font-medium hover:text-blue-800"
          >
            Dodaj filtr metrażu
          </button>
        </div>
      )}

      {/* Dzielnica */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Dzielnica</label>
        <select
          value={filters.district ?? ''}
          onChange={e => onFilterChange('district', e.target.value || undefined)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md"
        >
          <option value="">Wszystkie dzielnice</option>
          {districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
