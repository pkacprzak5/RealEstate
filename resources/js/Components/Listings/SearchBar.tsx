import { useState } from 'react';

interface SearchBarProps {
  keywords: string;
  onSearch: (keywords: string) => void;
}

export default function SearchBar({ keywords: initial, onSearch }: SearchBarProps) {
  const [value, setValue] = useState(initial);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Szukaj po słowach kluczowych..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
      >
        Szukaj
      </button>
    </form>
  );
}
