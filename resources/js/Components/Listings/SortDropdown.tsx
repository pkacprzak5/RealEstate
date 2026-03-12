import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronDown } from 'lucide-react';

interface Props {
    value: string;
    onChange: (value: string) => void;
}

const sortOptions = [
    { value: 'newest', label: 'Najnowsze' },
    { value: 'price_asc', label: 'Cena rosnąco' },
    { value: 'price_desc', label: 'Cena malejąco' },
    { value: 'area_asc', label: 'Powierzchnia rosnąco' },
    { value: 'area_desc', label: 'Powierzchnia malejąco' },
];

export default function SortDropdown({ value, onChange }: Props) {
    const current = sortOptions.find((o) => o.value === value) || sortOptions[0];

    return (
        <Listbox value={value} onChange={onChange}>
            <div className="relative">
                <ListboxButton className="h-9 pl-3 pr-8 flex items-center gap-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                    {current.label}
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </ListboxButton>
                <ListboxOptions className="absolute right-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1">
                    {sortOptions.map((opt) => (
                        <ListboxOption
                            key={opt.value}
                            value={opt.value}
                            className={({ active, selected }) =>
                                `px-3 py-2 text-sm cursor-pointer ${active ? 'bg-gray-50' : ''} ${selected ? 'text-navy font-semibold' : 'text-gray-700'}`
                            }
                        >
                            {opt.label}
                        </ListboxOption>
                    ))}
                </ListboxOptions>
            </div>
        </Listbox>
    );
}
