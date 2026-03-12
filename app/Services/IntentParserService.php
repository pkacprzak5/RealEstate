<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntentParserService
{
    private const PROMPT_TEMPLATE = <<<'PROMPT'
Jesteś asystentem wyszukiwania nieruchomości. Przeanalizuj zapytanie użytkownika i wyodrębnij ustrukturyzowane filtry.

Zwróć WYŁĄCZNIE prawidłowy JSON z następującymi opcjonalnymi polami:
- property_type: "flat" lub "house"
- market_type: "sale" lub "rent"
- min_price: liczba (w PLN)
- max_price: liczba (w PLN)
- min_rooms: liczba całkowita
- max_rooms: liczba całkowita
- min_area: liczba (m²)
- max_area: liczba (m²)
- district: string (dzielnica Krakowa)
- keywords: string (pozostały tekst, który nie został przechwycony przez filtry)

Zasady:
- "do 500 tys" / "do 500000" → max_price: 500000
- "od 300 tys" → min_price: 300000
- "2-pokojowe" / "2 pokoje" → min_rooms: 2, max_rooms: 2
- "3-4 pokoje" → min_rooms: 3, max_rooms: 4
- "mieszkanie" → property_type: "flat"
- "dom" → property_type: "house"
- "wynajem" / "do wynajęcia" → market_type: "rent"
- "sprzedaż" / "na sprzedaż" / "kupno" → market_type: "sale"
- Rozpoznaj dzielnice Krakowa: Stare Miasto, Kazimierz, Podgórze, Krowodrza, Nowa Huta, Bronowice, Prądnik, Dębniki, Zwierzyniec, Łagiewniki, Ruczaj, Czyżyny, Bieżanów, Prokocim, Mistrzejowice, itp.
- Jeśli pole nie jest wspomniane, NIE uwzględniaj go w odpowiedzi.

Zapytanie użytkownika: "{query}"
PROMPT;

    public function parse(string $query): ?array
    {
        $apiKey = config('services.anthropic.api_key');

        if (!$apiKey) {
            Log::info('IntentParser: No API key, falling back to keyword search');
            return null;
        }

        try {
            $prompt = str_replace('{query}', $query, self::PROMPT_TEMPLATE);

            $response = Http::withHeaders([
                'x-api-key' => $apiKey,
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])->timeout(10)->post('https://api.anthropic.com/v1/messages', [
                'model' => config('services.anthropic.model', 'claude-haiku-4-5-20251001'),
                'max_tokens' => 300,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            if (!$response->successful()) {
                Log::warning('IntentParser: API error', ['status' => $response->status()]);
                return null;
            }

            $text = $response->json('content.0.text', '');

            // Extract JSON from response (greedy match handles nested braces)
            if (preg_match('/\{.*\}/s', $text, $matches)) {
                $parsed = json_decode($matches[0], true);

                if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
                    Log::info('IntentParser: Parsed intent', [
                        'query' => $query,
                        'intent' => $parsed,
                    ]);
                    return $this->sanitize($parsed);
                }
            }

            Log::warning('IntentParser: Could not parse response', ['text' => $text]);
            return null;
        } catch (\Throwable $e) {
            Log::warning('IntentParser: Exception', ['error' => $e->getMessage()]);
            return null;
        }
    }

    private function sanitize(array $parsed): array
    {
        $allowed = [
            'property_type', 'market_type', 'district', 'keywords',
            'min_price', 'max_price', 'min_area', 'max_area',
            'min_rooms', 'max_rooms',
        ];

        $result = [];
        foreach ($allowed as $key) {
            if (isset($parsed[$key]) && $parsed[$key] !== '' && $parsed[$key] !== null) {
                $result[$key] = $parsed[$key];
            }
        }

        // Type coercion
        foreach (['min_price', 'max_price', 'min_area', 'max_area'] as $k) {
            if (isset($result[$k])) $result[$k] = (float) $result[$k];
        }
        foreach (['min_rooms', 'max_rooms'] as $k) {
            if (isset($result[$k])) $result[$k] = (int) $result[$k];
        }
        foreach (['property_type', 'market_type'] as $k) {
            if (isset($result[$k])) {
                $valid = $k === 'property_type' ? ['flat', 'house'] : ['sale', 'rent'];
                if (!in_array($result[$k], $valid)) unset($result[$k]);
            }
        }

        return $result;
    }
}
