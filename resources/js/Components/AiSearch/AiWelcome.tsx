import { Sparkles, Search } from 'lucide-react';
import { useState } from 'react';

interface Props {
    onSend: (message: string) => void;
}

const EXAMPLES = [
    'Jasne 2-pokojowe mieszkanie blisko parku, do 500 tys., najlepiej Krowodrza lub Bronowice',
    'Spokojne 3 pokoje z balkonem, po remoncie, dobry dojazd komunikacją',
    'Mieszkanie inwestycyjne do 400 tys., blisko uczelni, dowolna dzielnica',
];

export default function AiWelcome({ onSend }: Props) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <div className="flex flex-col items-center justify-center h-full px-6 py-12 bg-white">
            <Sparkles className="w-12 h-12 text-blue-800 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Asystent wyszukiwania</h2>
            <p className="text-[15px] text-gray-500 text-center max-w-[500px] leading-relaxed mb-8">
                Opisz swoje wymarzone mieszkanie własnymi słowami.
                <br />
                Znajdę najlepsze dopasowania i wyjaśnię, dlaczego pasują.
            </p>

            <div className="w-full max-w-[500px] space-y-2.5 mb-8">
                <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase">Spróbuj na przykład:</p>
                {EXAMPLES.map((example, i) => (
                    <button
                        key={i}
                        onClick={() => onSend(example)}
                        className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                    >
                        „{example}"
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-[500px]">
                <div className="flex items-center gap-2 px-4 h-12 rounded-lg bg-gray-50 border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                    <Search className="w-[18px] h-[18px] text-gray-400 shrink-0" />
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Opisz swoje wymarzone mieszkanie..."
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400"
                    />
                </div>
            </form>
        </div>
    );
}
