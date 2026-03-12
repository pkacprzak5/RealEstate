<?php

namespace App\Services\AiSearch;

use App\Models\Listing;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AiSearchOrchestrator
{
    public function __construct(
        private PreferenceExtractor $extractor,
        private CandidateRetriever $retriever,
        private ListingRanker $ranker,
    ) {}

    /**
     * Process an AI search request.
     *
     * @param array $messages       Conversation history [{role, content}]
     * @param int   $questionCount  Number of questions already asked in this conversation
     * @return array The response payload
     */
    public function search(array $messages, int $questionCount = 0): array
    {
        $traceId = 'ais_' . Str::random(8);
        $startTime = microtime(true);
        $llmCalls = 0;

        Log::info('AiSearch: started', [
            'trace_id' => $traceId,
            'message_count' => count($messages),
            'question_count' => $questionCount,
        ]);

        // Step 1: Extract preferences
        $preferences = $this->extractor->extract($messages);
        $llmCalls++;

        if (!$preferences) {
            Log::warning('AiSearch: preference extraction failed', ['trace_id' => $traceId]);
            return $this->fallbackResponse($messages, $traceId, $startTime);
        }

        Log::debug('AiSearch: preferences extracted', [
            'trace_id' => $traceId,
            'filters' => $preferences['filters'],
            'soft_preferences' => $preferences['soft_preferences'],
            'confidence' => $preferences['confidence'],
        ]);

        // Step 2: Decide whether to ask a follow-up question
        $clarification = $this->extractor->decideClarification($preferences, $questionCount);

        if ($clarification['should_ask']) {
            $llmCalls++;
            Log::info('AiSearch: asking follow-up', [
                'trace_id' => $traceId,
                'question' => $clarification['question'],
            ]);

            return [
                'type' => 'question',
                'message' => $clarification['question'],
                'options' => $clarification['options'],
                'extracted_filters' => $preferences['filters'],
                'soft_preferences' => $preferences['soft_preferences'],
                'trace_id' => $traceId,
                'latency_ms' => $this->elapsed($startTime),
                'llm_calls' => $llmCalls,
            ];
        }

        // Step 3: Retrieve candidates
        $retrieval = $this->retriever->retrieve($preferences['filters']);
        $candidates = $retrieval['candidates'];

        Log::debug('AiSearch: candidates retrieved', [
            'trace_id' => $traceId,
            'count' => count($candidates),
            'widened' => $retrieval['widened'],
            'total_matching' => $retrieval['total_matching'],
        ]);

        if (empty($candidates)) {
            return [
                'type' => 'no_results',
                'message' => 'Brak ofert spełniających Twoje kryteria. Spróbuj poszerzyć zakres wyszukiwania.',
                'summary' => $preferences['search_summary'],
                'extracted_filters' => $preferences['filters'],
                'soft_preferences' => $preferences['soft_preferences'],
                'suggestions' => $this->generateSuggestions($preferences['filters']),
                'trace_id' => $traceId,
                'latency_ms' => $this->elapsed($startTime),
                'llm_calls' => $llmCalls,
            ];
        }

        // Step 4: Rank and explain
        $rankResult = $this->ranker->rank($preferences, $candidates);
        $llmCalls++;

        // Attach full listing data to rankings
        $listingIds = array_column($rankResult['rankings'], 'listing_id');
        $listings = Listing::whereIn('id', $listingIds)
            ->select([
                'id', 'title', 'price', 'currency', 'price_per_m2', 'area_m2',
                'rooms', 'floor', 'building_floors', 'property_type', 'market_type',
                'district', 'street', 'latitude', 'longitude',
                'thumbnail_url', 'image_urls', 'published_at', 'source_url',
            ])
            ->get()
            ->keyBy('id');

        $recommendations = [];
        foreach ($rankResult['rankings'] as $rank) {
            $listing = $listings->get($rank['listing_id']);
            if (!$listing) {
                continue;
            }

            $recommendations[] = [
                'listing_id' => $rank['listing_id'],
                'listing' => $listing->toArray(),
                'score' => $rank['score'],
                'confidence' => $rank['confidence'],
                'explanation' => $rank['explanation'],
            ];
        }

        $latencyMs = $this->elapsed($startTime);

        Log::info('AiSearch: completed', [
            'trace_id' => $traceId,
            'recommendations' => count($recommendations),
            'candidates_considered' => count($candidates),
            'widened' => $retrieval['widened'],
            'fallback' => $rankResult['fallback'],
            'latency_ms' => $latencyMs,
            'llm_calls' => $llmCalls,
        ]);

        return [
            'type' => 'recommendations',
            'summary' => $preferences['search_summary'],
            'extracted_filters' => $preferences['filters'],
            'soft_preferences' => $preferences['soft_preferences'],
            'recommendations' => $recommendations,
            'candidates_considered' => count($candidates),
            'widened' => $retrieval['widened'],
            'fallback' => $rankResult['fallback'],
            'trace_id' => $traceId,
            'latency_ms' => $latencyMs,
            'llm_calls' => $llmCalls,
        ];
    }

    /**
     * Fallback when AI extraction fails entirely.
     * Uses keyword search from the last user message.
     */
    private function fallbackResponse(array $messages, string $traceId, float $startTime): array
    {
        $lastUserMessage = '';
        foreach (array_reverse($messages) as $msg) {
            if (($msg['role'] ?? '') === 'user') {
                $lastUserMessage = $msg['content'] ?? '';
                break;
            }
        }

        // Try keyword search first; if no results, fall back to newest listings
        $selectColumns = [
            'id', 'title', 'price', 'currency', 'price_per_m2', 'area_m2',
            'rooms', 'property_type', 'market_type', 'district', 'street',
            'latitude', 'longitude', 'thumbnail_url', 'image_urls',
            'published_at', 'source_url',
        ];

        $candidates = Listing::query()
            ->keywordSearch($lastUserMessage)
            ->select($selectColumns)
            ->orderByRaw('COALESCE(published_at, imported_at) DESC')
            ->limit(5)
            ->get();

        // If keyword search found nothing (e.g. English query vs Polish data),
        // return newest listings as a reasonable default
        if ($candidates->isEmpty()) {
            $candidates = Listing::query()
                ->select($selectColumns)
                ->orderByRaw('COALESCE(published_at, imported_at) DESC')
                ->limit(5)
                ->get();
        }

        $recommendations = $candidates->map(fn ($l) => [
            'listing_id' => $l->id,
            'listing' => $l->toArray(),
            'score' => 0.5,
            'confidence' => 'low',
            'explanation' => 'Dopasowano za pomocą wyszukiwania słów kluczowych. Analiza AI jest chwilowo niedostępna.',
        ])->toArray();

        return [
            'type' => 'recommendations',
            'summary' => 'Wyniki filtrowania (asystent AI niedostępny)',
            'extracted_filters' => [],
            'soft_preferences' => [],
            'recommendations' => $recommendations,
            'candidates_considered' => $candidates->count(),
            'widened' => false,
            'fallback' => true,
            'trace_id' => $traceId,
            'latency_ms' => $this->elapsed($startTime),
            'llm_calls' => 0,
        ];
    }

    private function generateSuggestions(array $filters): array
    {
        $suggestions = [];

        if (isset($filters['max_price'])) {
            $wider = number_format($filters['max_price'] * 1.3, 0, '', ' ');
            $suggestions[] = "Spróbuj zwiększyć budżet do {$wider} PLN";
        }

        if (isset($filters['district'])) {
            $suggestions[] = "Spróbuj szukać we wszystkich dzielnicach";
        }

        if (isset($filters['min_rooms']) && $filters['min_rooms'] >= 3) {
            $suggestions[] = "Rozważ mieszkania 2-pokojowe";
        }

        if (empty($suggestions)) {
            $suggestions[] = "Spróbuj opisać swoje potrzeby inaczej";
        }

        return $suggestions;
    }

    private function elapsed(float $start): int
    {
        return (int) ((microtime(true) - $start) * 1000);
    }
}
