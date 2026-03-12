<?php

namespace App\Services\AiSearch;

use App\Services\Gemini\GeminiClient;
use Illuminate\Support\Facades\Log;

class ListingRanker
{
    public function __construct(private GeminiClient $gemini) {}

    /**
     * Rank candidates against user preferences and generate explanations.
     *
     * @param array $preferences {filters, soft_preferences, search_summary}
     * @param array $candidates   Formatted candidate listings
     * @param int   $maxResults   Maximum recommendations to return
     * @return array{rankings: array, fallback: bool}
     */
    public function rank(array $preferences, array $candidates, int $maxResults = 5): array
    {
        if (empty($candidates)) {
            return ['rankings' => [], 'fallback' => false];
        }

        // If Gemini is unavailable, use deterministic scoring
        if (!$this->gemini->isAvailable()) {
            Log::info('ListingRanker: Gemini unavailable, using deterministic ranking');
            return [
                'rankings' => $this->deterministicRank($preferences, $candidates, $maxResults),
                'fallback' => true,
            ];
        }

        $prompt = Prompts::rankAndExplain($preferences, $candidates, $maxResults);
        $result = $this->gemini->generateJson($prompt, [
            'temperature' => 0.2,
            'maxOutputTokens' => 2048,
        ]);

        if (!$result['success']) {
            Log::warning('ListingRanker: Gemini failed, using deterministic ranking', [
                'error' => $result['error'],
            ]);
            return [
                'rankings' => $this->deterministicRank($preferences, $candidates, $maxResults),
                'fallback' => true,
            ];
        }

        $data = $result['data'];

        if (!isset($data['rankings']) || !is_array($data['rankings'])) {
            Log::warning('ListingRanker: invalid rankings structure');
            return [
                'rankings' => $this->deterministicRank($preferences, $candidates, $maxResults),
                'fallback' => true,
            ];
        }

        // Validate and sanitize rankings
        $validIds = array_column($candidates, 'id');
        $rankings = [];

        foreach ($data['rankings'] as $rank) {
            if (!isset($rank['listing_id']) || !in_array($rank['listing_id'], $validIds)) {
                continue;
            }

            $rankings[] = [
                'listing_id' => (int) $rank['listing_id'],
                'score' => max(0.0, min(1.0, (float) ($rank['score'] ?? 0.5))),
                'confidence' => in_array($rank['confidence'] ?? '', ['high', 'medium', 'low'])
                    ? $rank['confidence']
                    : 'medium',
                'explanation' => is_string($rank['explanation'] ?? null)
                    ? mb_substr($rank['explanation'], 0, 500)
                    : 'This listing matches your search criteria.',
            ];
        }

        // Sort by score descending
        usort($rankings, fn ($a, $b) => $b['score'] <=> $a['score']);

        // Take top N
        $rankings = array_slice($rankings, 0, $maxResults);

        if (empty($rankings)) {
            return [
                'rankings' => $this->deterministicRank($preferences, $candidates, $maxResults),
                'fallback' => true,
            ];
        }

        Log::debug('ListingRanker: ranked', [
            'count' => count($rankings),
            'top_score' => $rankings[0]['score'] ?? 0,
        ]);

        return ['rankings' => $rankings, 'fallback' => false];
    }

    /**
     * Deterministic fallback ranking based on filter overlap.
     */
    private function deterministicRank(array $preferences, array $candidates, int $maxResults): array
    {
        $filters = $preferences['filters'] ?? [];
        $scored = [];

        foreach ($candidates as $candidate) {
            $score = 0.5; // base score

            // Price within budget
            $maxPrice = $filters['max_price'] ?? null;
            if ($maxPrice && isset($candidate['price'])) {
                if ($candidate['price'] <= $maxPrice) {
                    $score += 0.2;
                } else {
                    $score -= 0.3; // penalize over-budget
                }
            }

            // Rooms match
            $targetRooms = $filters['min_rooms'] ?? $filters['max_rooms'] ?? null;
            if ($targetRooms && isset($candidate['rooms'])) {
                if ($candidate['rooms'] == $targetRooms) {
                    $score += 0.15;
                }
            }

            // District match
            if (isset($filters['district']) && isset($candidate['district'])) {
                if (stripos($candidate['district'], $filters['district']) !== false) {
                    $score += 0.15;
                }
            }

            $score = max(0.0, min(1.0, $score));

            $priceStr = $candidate['price'] ? number_format($candidate['price'], 0, ',', ' ') . ' PLN' : 'brak ceny';
            $areaStr = $candidate['area_m2'] ? $candidate['area_m2'] . ' m²' : 'brak danych o powierzchni';
            $roomsStr = $candidate['rooms'] ? $candidate['rooms'] . ' pok.' : '';
            $districtStr = $candidate['district'] ?? 'lokalizacja nieznana';

            $scored[] = [
                'listing_id' => $candidate['id'],
                'score' => round($score, 2),
                'confidence' => 'low',
                'explanation' => "Oferta w dzielnicy {$districtStr} ({$priceStr}, {$areaStr}, {$roomsStr}) — dopasowana za pomocą filtrów strukturalnych.",
            ];
        }

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);
        return array_slice($scored, 0, $maxResults);
    }
}
