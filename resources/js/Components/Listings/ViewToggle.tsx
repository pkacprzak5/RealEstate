interface ViewToggleProps {
  view: 'grid' | 'map';
  onChange: (view: 'grid' | 'map') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-md border border-gray-300 overflow-hidden">
      <button
        onClick={() => onChange('grid')}
        className={`px-3 py-1.5 text-sm ${
          view === 'grid'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Lista
      </button>
      <button
        onClick={() => onChange('map')}
        className={`px-3 py-1.5 text-sm border-l border-gray-300 ${
          view === 'map'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
      >
        Mapa
      </button>
    </div>
  );
}
