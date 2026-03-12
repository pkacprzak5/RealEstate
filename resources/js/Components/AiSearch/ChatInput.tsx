import { ArrowUp } from 'lucide-react';
import { useState } from 'react';

interface Props {
    onSend: (message: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export default function ChatInput({ onSend, disabled, placeholder = 'Doprecyzuj wyszukiwanie...' }: Props) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || disabled) return;
        onSend(input.trim());
        setInput('');
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 h-14 px-4 bg-white border-t border-gray-200"
        >
            <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder-gray-400 disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={!input.trim() || disabled}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-800 text-white disabled:opacity-40 hover:bg-blue-900 transition-colors shrink-0"
            >
                <ArrowUp className="w-4 h-4" />
            </button>
        </form>
    );
}
