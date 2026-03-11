interface SortDropdownProps {
  sort: string;
  onChange: (sort: string) => void;
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Najnowsze' },
  { value: 'price_asc', label: 'Cena rosnąco' },
  { value: 'price_desc', label: 'Cena malejąco' },
  { value: 'area_asc', label: 'Metraż rosnąco' },
  { value: 'area_desc', label: 'Metraż malejąco' },
];

export default function SortDropdown({ sort, onChange }: SortDropdownProps) {
  return (
    <select
      value={sort}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white"
    >
      {SORT_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
