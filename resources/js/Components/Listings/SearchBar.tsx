import { Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
    keywords: string;
    onKeywordsChange: (value: string) => void;
}

export default function SearchBar({ keywords, onKeywordsChange }: Props) {
    const [value, setValue] = useState(keywords);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onKeywordsChange(value.trim());
    };

    return (
        <form onSubmit={handleSubmit} className="flex-1">
            <div className="relative flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
                    <input
                        type="text"
                        value={value}
                        onChange={handleChange}
                        placeholder="Szukaj po słowie kluczowym, dzielnicy lub opisz czego szukasz..."
                        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-navy-50 focus:border-navy"
                    />
                </div>
                <button
                    type="submit"
                    className="h-11 px-5 bg-navy text-white text-sm font-semibold rounded-md hover:bg-blue-900 transition-colors flex-shrink-0"
                >
                    Szukaj
                </button>
            </div>
        </form>
    );
}
