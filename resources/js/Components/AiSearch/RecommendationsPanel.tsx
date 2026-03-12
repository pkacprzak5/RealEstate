import { MessageCircle, Loader, TriangleAlert, SearchX, Info } from 'lucide-react';
import { AiRecommendation, AiSearchStatus } from '@/types';
import AiRecommendationCard from './AiRecommendationCard';

interface Props {
    status: AiSearchStatus;
    recommendations: AiRecommendation[];
    fallback: boolean;
    error: string | null;
    suggestions: string[];
    summary: string | null;
    onRetry?: () => void;
}

export default function RecommendationsPanel({
    status,
    recommendations,
    fallback,
    error,
    suggestions,
    summary,
    onRetry,
}: Props) {
    if (status === 'idle' || status === 'question') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
                <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-base font-semibold text-gray-500">Czekam na Twoją odpowiedź</p>
                <p className="text-[13px] text-gray-400 text-center mt-1 leading-relaxed">
                    Rekomendacje pojawią się tutaj
                    <br />
                    po zakończeniu wyszukiwania
                </p>
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
                <Loader className="w-8 h-8 text-blue-800 animate-spin mb-3" />
                <p className="text-base font-semibold text-gray-900">Przeszukuję oferty...</p>
                <p className="text-[13px] text-gray-500 text-center mt-1 leading-relaxed">
                    Analizuję oferty pod kątem Twoich preferencji.
                    <br />
                    To zwykle zajmuje 2–4 sekundy.
                </p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
                <TriangleAlert className="w-8 h-8 text-red-600 mb-3" />
                <p className="text-base font-semibold text-gray-900">Asystent AI niedostępny</p>
                <p className="text-[13px] text-gray-500 text-center mt-1 leading-relaxed max-w-[340px]">
                    {error || 'Nie udało się połączyć z usługą AI. Wyniki zostały dopasowane za pomocą standardowych filtrów.'}
                </p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Spróbuj ponownie
                    </button>
                )}
            </div>
        );
    }

    if (status === 'no_results') {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-6">
                <SearchX className="w-8 h-8 text-gray-300 mb-3" />
                <p className="text-base font-semibold text-gray-900">Brak pasujących ofert</p>
                <p className="text-[13px] text-gray-500 text-center mt-1 leading-relaxed max-w-[340px]">
                    Twoje preferencje są dość szczegółowe. Spróbuj zwiększyć budżet lub poszerzyć kryteria.
                </p>
                {suggestions.length > 0 && (
                    <div className="mt-4 w-full max-w-[340px] space-y-1.5">
                        {suggestions.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 border border-gray-200 text-xs text-gray-600">
                                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {s}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto">
            {fallback && (
                <div className="mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 border border-yellow-300">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-800">
                        Asystent AI chwilowo niedostępny. Wyniki dopasowane standardowymi filtrami.
                    </span>
                </div>
            )}

            <div className="px-6 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-gray-900">
                    {recommendations.length} {recommendations.length === 1 ? 'rekomendacja' : recommendations.length < 5 ? 'rekomendacje' : 'rekomendacji'}
                </h3>
            </div>

            <div className="flex-1 px-6 pb-6 space-y-4 overflow-y-auto">
                {recommendations.map(rec => (
                    <AiRecommendationCard key={rec.listing_id} recommendation={rec} />
                ))}
            </div>
        </div>
    );
}
