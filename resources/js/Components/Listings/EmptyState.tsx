import { SearchX } from 'lucide-react';

interface Props {
    onClear: () => void;
}

export default function EmptyState({ onClear }: Props) {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <SearchX className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Nie znaleziono ofert
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
                Spróbuj zmienić kryteria wyszukiwania lub wyczyść filtry, aby zobaczyć wszystkie oferty.
            </p>
            <button
                type="button"
                onClick={onClear}
                className="px-4 py-2 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-700 transition-colors"
            >
                Wyczyść filtry
            </button>
        </div>
    );
}
