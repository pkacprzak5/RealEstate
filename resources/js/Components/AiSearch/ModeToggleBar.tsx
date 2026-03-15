import { SlidersHorizontal, Sparkles } from 'lucide-react';

interface Props {
    mode: 'filters' | 'ai';
    onModeChange: (mode: 'filters' | 'ai') => void;
}

export default function ModeToggleBar({ mode, onModeChange }: Props) {
    return (
        <div className="inline-flex rounded-md bg-gray-100 p-0.5" role="tablist" aria-label="Tryb wyszukiwania">
            <button
                role="tab"
                aria-selected={mode === 'filters'}
                aria-label="Wyszukiwanie z filtrami"
                onClick={() => onModeChange('filters')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all ${
                    mode === 'filters'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <SlidersHorizontal className="w-4 h-4" />
                Filtry
            </button>
            <button
                role="tab"
                aria-selected={mode === 'ai'}
                aria-label="Wyszukiwanie z asystentem AI"
                onClick={() => onModeChange('ai')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-all ${
                    mode === 'ai'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Sparkles className="w-4 h-4" />
                Asystent AI
            </button>
        </div>
    );
}
