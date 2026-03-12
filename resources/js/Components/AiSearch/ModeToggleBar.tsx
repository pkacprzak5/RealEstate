import { SlidersHorizontal, Sparkles } from 'lucide-react';

interface Props {
    mode: 'filters' | 'ai';
    onModeChange: (mode: 'filters' | 'ai') => void;
}

export default function ModeToggleBar({ mode, onModeChange }: Props) {
    return (
        <div className="flex items-center gap-1 shrink-0">
            <button
                onClick={() => onModeChange('filters')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    mode === 'filters'
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtry
            </button>
            <button
                onClick={() => onModeChange('ai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    mode === 'ai'
                        ? 'bg-blue-800 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
            >
                <Sparkles className="w-3.5 h-3.5" />
                Asystent AI
            </button>
        </div>
    );
}
