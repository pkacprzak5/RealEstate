import { LayoutGrid, Map } from 'lucide-react';

interface Props {
    view: 'list' | 'map';
    onChange: (view: 'list' | 'map') => void;
}

export default function ViewToggle({ view, onChange }: Props) {
    return (
        <div className="flex items-center rounded-md border border-gray-300 overflow-hidden">
            <button
                type="button"
                onClick={() => onChange('list')}
                className={`h-9 px-3 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    view === 'list' ? 'bg-navy text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
                <LayoutGrid className="w-4 h-4" />
                Lista
            </button>
            <button
                type="button"
                onClick={() => onChange('map')}
                className={`h-9 px-3 flex items-center gap-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                    view === 'map' ? 'bg-navy text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
            >
                <Map className="w-4 h-4" />
                Mapa
            </button>
        </div>
    );
}
