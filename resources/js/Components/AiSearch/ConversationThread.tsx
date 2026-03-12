import { useEffect, useRef } from 'react';
import { AiMessage } from '@/types';

interface Props {
    messages: AiMessage[];
    options?: string[];
    onSelectOption?: (option: string) => void;
    isLoading?: boolean;
}

export default function ConversationThread({ messages, options = [], onSelectOption, isLoading }: Props) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length, isLoading]);

    return (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => (
                <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div
                        className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-blue-800 text-white'
                                : 'bg-gray-50 border border-gray-200 text-gray-700'
                        }`}
                    >
                        {msg.content}
                    </div>
                </div>
            ))}

            {/* Quick-select options for follow-up questions */}
            {options.length > 0 && onSelectOption && (
                <div className="flex flex-wrap gap-2">
                    {options.map((option, i) => (
                        <button
                            key={i}
                            onClick={() => onSelectOption(option)}
                            className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
}
