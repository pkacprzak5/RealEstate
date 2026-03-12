import { RotateCcw, Sparkles } from 'lucide-react';
import { useAiSearch } from '@/Hooks/useAiSearch';
import AiWelcome from './AiWelcome';
import ConversationThread from './ConversationThread';
import ChatInput from './ChatInput';
import RecommendationsPanel from './RecommendationsPanel';

export default function AiSearchPanel() {
    const {
        messages,
        status,
        recommendations,
        options,
        suggestions,
        summary,
        fallback,
        error,
        sendMessage,
        selectOption,
        reset,
    } = useAiSearch();

    // Welcome state — no messages yet
    if (messages.length === 0 && status === 'idle') {
        return <AiWelcome onSend={sendMessage} />;
    }

    // Conversation started — show split view (desktop) or stacked (mobile)
    return (
        <div className="flex flex-col md:flex-row h-[calc(100vh-120px)]">
            {/* Conversation Panel */}
            <div className="flex flex-col w-full md:w-[520px] md:border-r border-gray-200 bg-white shrink-0">
                {/* Header */}
                <div className="flex items-center justify-between gap-2 h-12 px-5 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-800" />
                        <span className="text-sm font-semibold text-gray-900">Asystent AI</span>
                    </div>
                    <button
                        onClick={reset}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Nowe szukanie
                    </button>
                </div>

                {/* Thread */}
                <ConversationThread
                    messages={messages}
                    options={status === 'question' ? options : []}
                    onSelectOption={selectOption}
                    isLoading={status === 'loading'}
                />

                {/* Input */}
                <ChatInput
                    onSend={sendMessage}
                    disabled={status === 'loading'}
                    placeholder={status === 'question' ? 'Wpisz odpowiedź lub wybierz opcję powyżej...' : 'Doprecyzuj wyszukiwanie...'}
                />
            </div>

            {/* Recommendations Panel — hidden on mobile when only question state, shown on results */}
            <div className={`flex-1 min-h-0 ${
                status !== 'results' && status !== 'error' && status !== 'no_results' ? 'hidden md:flex' : 'flex'
            }`}>
                <div className="w-full">
                    <RecommendationsPanel
                        status={status}
                        recommendations={recommendations}
                        fallback={fallback}
                        error={error}
                        suggestions={suggestions}
                        summary={summary}
                        onRetry={() => {
                            if (messages.length > 0) {
                                const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                                if (lastUserMsg) sendMessage(lastUserMsg.content);
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
