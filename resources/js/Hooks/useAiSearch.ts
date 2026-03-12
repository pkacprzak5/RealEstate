import { useCallback, useRef, useState } from 'react';
import { AiMessage, AiRecommendation, AiSearchResponse, AiSearchStatus } from '@/types';

interface AiSearchState {
    messages: AiMessage[];
    status: AiSearchStatus;
    recommendations: AiRecommendation[];
    questionCount: number;
    assistantMessage: string | null;
    options: string[];
    suggestions: string[];
    summary: string | null;
    fallback: boolean;
    error: string | null;
    latencyMs: number | null;
}

const initialState: AiSearchState = {
    messages: [],
    status: 'idle',
    recommendations: [],
    questionCount: 0,
    assistantMessage: null,
    options: [],
    suggestions: [],
    summary: null,
    fallback: false,
    error: null,
    latencyMs: null,
};

// Persist across both Inertia navigations and full page refreshes
const STORAGE_KEY = 'ai_search_state';

function loadPersistedState(): AiSearchState {
    if (typeof window === 'undefined') return initialState;
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return initialState;
        const parsed = JSON.parse(raw) as AiSearchState;
        // Don't restore loading status — the request is gone after refresh
        if (parsed.status === 'loading') parsed.status = parsed.messages.length > 0 ? 'results' : 'idle';
        return parsed;
    } catch {
        return initialState;
    }
}

let persistedState: AiSearchState = loadPersistedState();

export function useAiSearch() {
    const [state, _setState] = useState<AiSearchState>(persistedState);
    const abortRef = useRef<AbortController | null>(null);

    // Wrap setState to persist to module-level variable + sessionStorage
    const setState = useCallback((updater: AiSearchState | ((prev: AiSearchState) => AiSearchState)) => {
        _setState(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            persistedState = next;
            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
            return next;
        });
    }, []);

    const sendMessage = useCallback(async (content: string) => {
        const userMessage: AiMessage = { role: 'user', content };
        const newMessages = [...state.messages, userMessage];

        setState(prev => ({
            ...prev,
            messages: newMessages,
            status: 'loading',
            error: null,
        }));

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const res = await fetch('/api/ai-search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({
                    messages: newMessages,
                    question_count: state.questionCount,
                }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => null);
                throw new Error(errorData?.message || `Błąd serwera (${res.status})`);
            }

            const data: AiSearchResponse = await res.json();

            setState(prev => {
                const updatedMessages = [...newMessages];

                if (data.type === 'question' && data.message) {
                    updatedMessages.push({ role: 'assistant', content: data.message });
                    return {
                        ...prev,
                        messages: updatedMessages,
                        status: 'question',
                        assistantMessage: data.message,
                        options: data.options || [],
                        questionCount: prev.questionCount + 1,
                        recommendations: [],
                        summary: null,
                        fallback: false,
                        latencyMs: data.latency_ms || null,
                    };
                }

                if (data.type === 'recommendations' && data.recommendations) {
                    const summaryMsg = data.summary || 'Oto Twoje rekomendacje:';
                    updatedMessages.push({ role: 'assistant', content: summaryMsg });
                    return {
                        ...prev,
                        messages: updatedMessages,
                        status: 'results',
                        recommendations: data.recommendations,
                        assistantMessage: summaryMsg,
                        options: [],
                        summary: data.summary || null,
                        fallback: data.fallback || false,
                        latencyMs: data.latency_ms || null,
                    };
                }

                if (data.type === 'no_results') {
                    const noResultsMsg = data.message || 'Brak ofert spełniających Twoje kryteria.';
                    updatedMessages.push({ role: 'assistant', content: noResultsMsg });
                    return {
                        ...prev,
                        messages: updatedMessages,
                        status: 'no_results',
                        recommendations: [],
                        assistantMessage: noResultsMsg,
                        suggestions: data.suggestions || [],
                        summary: data.summary || null,
                        fallback: false,
                        latencyMs: data.latency_ms || null,
                    };
                }

                return {
                    ...prev,
                    messages: newMessages,
                    status: 'error',
                    error: data.message || 'Wystąpił nieoczekiwany błąd.',
                    latencyMs: data.latency_ms || null,
                };
            });
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            setState(prev => ({
                ...prev,
                status: 'error',
                error: err instanceof Error ? err.message : 'Błąd sieci. Spróbuj ponownie.',
            }));
        }
    }, [state.messages, state.questionCount, setState]);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        setState(initialState);
        try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* */ }
    }, [setState]);

    const selectOption = useCallback((option: string) => {
        sendMessage(option);
    }, [sendMessage]);

    return {
        ...state,
        sendMessage,
        selectOption,
        reset,
    };
}
