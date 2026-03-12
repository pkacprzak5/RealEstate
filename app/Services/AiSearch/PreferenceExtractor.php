<?php

namespace App\Services\AiSearch;

use App\Services\Gemini\GeminiClient;
use Illuminate\Support\Facades\Log;

class PreferenceExtractor
{
    public function __construct(private GeminiClient $gemini) {}

    /**
     * Extract structured preferences from conversation messages.
     *
     * @param array $messages [{role: 'user'|'assistant', content: string}]
     * @return array{filters: array, soft_preferences: array, confidence: string, search_summary: string}|null
     */
    public function extract(array $messages): ?array
    {
        $prompt = Prompts::preferenceExtraction($messages);
        $result = $this->gemini->generateJson($prompt, ['temperature' => 0.1]);

        if (!$result['success']) {
            Log::warning('PreferenceExtractor: Gemini failed', ['error' => $result['error']]);
            return null;
        }

        $data = $result['data'];

        // Validate required structure
        if (!isset($data['filters']) || !is_array($data['filters'])) {
            Log::warning('PreferenceExtractor: invalid structure', ['data' => $data]);
            return null;
        }

        return [
            'filters' => $this->sanitizeFilters($data['filters']),
            'soft_preferences' => array_values(array_filter($data['soft_preferences'] ?? [], 'is_string')),
            'confidence' => in_array($data['confidence'] ?? '', ['high', 'medium', 'low'])
                ? $data['confidence']
                : 'medium',
            'search_summary' => is_string($data['search_summary'] ?? null)
                ? $data['search_summary']
                : 'Wyszukiwanie nieruchomości w Krakowie',
        ];
    }

    /**
     * Decide whether to ask a follow-up question.
     *
     * @return array{should_ask: bool, question: string|null, options: array|null}
     */
    public function decideClarification(array $preferences, int $questionCount): array
    {
        // Hard limit: never ask more than 2 questions total
        if ($questionCount >= 2) {
            return ['should_ask' => false, 'question' => null, 'options' => null];
        }

        // High confidence: always search
        if ($preferences['confidence'] === 'high') {
            return ['should_ask' => false, 'question' => null, 'options' => null];
        }

        // Count non-null filters
        $filterCount = count(array_filter($preferences['filters'], fn ($v) => $v !== null));

        // If 2+ filters set, search even with medium/low confidence
        if ($filterCount >= 2) {
            return ['should_ask' => false, 'question' => null, 'options' => null];
        }

        // Ask Gemini for a clarification decision
        $prompt = Prompts::clarificationDecision($preferences);
        $result = $this->gemini->generateJson($prompt, ['temperature' => 0.1]);

        if (!$result['success'] || !is_array($result['data'])) {
            // Fallback: search rather than ask on failure
            return ['should_ask' => false, 'question' => null, 'options' => null];
        }

        $data = $result['data'];
        $shouldAsk = (bool) ($data['should_ask'] ?? false);

        if (!$shouldAsk) {
            return ['should_ask' => false, 'question' => null, 'options' => null];
        }

        $question = is_string($data['question'] ?? null) ? $data['question'] : null;
        $options = isset($data['options']) && is_array($data['options'])
            ? array_values(array_filter($data['options'], 'is_string'))
            : null;

        if (!$question) {
            return ['should_ask' => false, 'question' => null, 'options' => null];
        }

        return [
            'should_ask' => true,
            'question' => $question,
            'options' => $options,
        ];
    }

    private function sanitizeFilters(array $filters): array
    {
        $clean = [];

        // String enums
        if (isset($filters['property_type']) && in_array($filters['property_type'], ['flat', 'house'])) {
            $clean['property_type'] = $filters['property_type'];
        }
        if (isset($filters['market_type']) && in_array($filters['market_type'], ['sale', 'rent'])) {
            $clean['market_type'] = $filters['market_type'];
        }
        if (isset($filters['district']) && is_string($filters['district']) && $filters['district'] !== '') {
            $clean['district'] = $this->normalizeDistrict($filters['district']);
        }

        // Numeric filters
        foreach (['min_price', 'max_price', 'min_area', 'max_area'] as $key) {
            if (isset($filters[$key]) && is_numeric($filters[$key]) && $filters[$key] > 0) {
                $clean[$key] = (float) $filters[$key];
            }
        }
        foreach (['min_rooms', 'max_rooms', 'floor'] as $key) {
            if (isset($filters[$key]) && is_numeric($filters[$key])) {
                $clean[$key] = (int) $filters[$key];
            }
        }

        // Sanity checks
        if (isset($clean['min_price']) && $clean['min_price'] > 50_000_000) {
            unset($clean['min_price']);
        }
        if (isset($clean['max_price']) && ($clean['max_price'] < 10_000 || $clean['max_price'] > 50_000_000)) {
            unset($clean['max_price']);
        }

        return $clean;
    }

    /**
     * Fuzzy-match a district name from Gemini to the canonical DB name.
     */
    private function normalizeDistrict(string $input): ?string
    {
        $canonical = [
            'Stare Miasto', 'Grzegórzki', 'Prądnik Czerwony', 'Prądnik Biały',
            'Krowodrza', 'Bronowice', 'Zwierzyniec', 'Dębniki',
            'Łagiewniki-Borek Fałęcki', 'Swoszowice', 'Podgórze Duchackie',
            'Bieżanów-Prokocim', 'Podgórze', 'Czyżyny', 'Mistrzejowice',
            'Bieńczyce', 'Wzgórza Krzesławickie', 'Nowa Huta',
            // Sub-districts (also valid in DB)
            'Bronowice Małe', 'Bronowice Wielkie', 'Olsza', 'Rakowice',
            'Łobzów', 'Salwator', 'Wola Justowska', 'Przegorzały',
            'Ruczaj', 'Zakrzówek', 'Tyniec', 'Piaski Wielkie',
            'Rybitwy', 'Rajsko', 'Wróblowice', 'Przylasek Rusiecki', 'Tonie',
        ];

        // Common aliases
        $aliases = [
            'centrum' => 'Stare Miasto',
            'stare miasto' => 'Stare Miasto',
            'prokocim' => 'Bieżanów-Prokocim',
            'bieżanów' => 'Bieżanów-Prokocim',
            'borek fałęcki' => 'Łagiewniki-Borek Fałęcki',
            'łagiewniki' => 'Łagiewniki-Borek Fałęcki',
            'borek' => 'Łagiewniki-Borek Fałęcki',
            'wzgórza' => 'Wzgórza Krzesławickie',
            'duchackie' => 'Podgórze Duchackie',
        ];

        $lower = mb_strtolower(trim($input));

        // Check aliases first
        if (isset($aliases[$lower])) {
            return $aliases[$lower];
        }

        // Exact match (case-insensitive)
        foreach ($canonical as $name) {
            if (mb_strtolower($name) === $lower) {
                return $name;
            }
        }

        // Partial match (input is substring of canonical or vice versa)
        foreach ($canonical as $name) {
            if (mb_stripos($name, $input) !== false || mb_stripos($input, $name) !== false) {
                return $name;
            }
        }

        // No match found — return the original, the scope will handle it
        Log::debug('PreferenceExtractor: unrecognized district', ['input' => $input]);
        return $input;
    }
}
