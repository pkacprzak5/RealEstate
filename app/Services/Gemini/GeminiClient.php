<?php

namespace App\Services\Gemini;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiClient
{
    private string $apiKey;
    private string $endpoint;
    private int $timeout;
    private int $maxRetries;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', '');
        $this->endpoint = config('services.gemini.endpoint', '');
        $this->timeout = (int) config('services.gemini.timeout', 30);
        $this->maxRetries = (int) config('services.gemini.max_retries', 1);
    }

    public function isAvailable(): bool
    {
        return $this->apiKey !== '' && $this->endpoint !== '';
    }

    /**
     * Send a prompt to Gemini and return the text response.
     *
     * @param string $prompt  The user/system prompt text
     * @param array  $options Optional overrides: temperature, maxOutputTokens, responseMimeType
     * @return array{success: bool, text: string|null, error: string|null, latency_ms: int}
     */
    public function generate(string $prompt, array $options = []): array
    {
        if (!$this->isAvailable()) {
            return [
                'success' => false,
                'text' => null,
                'error' => 'Gemini not configured (missing API key or endpoint)',
                'latency_ms' => 0,
            ];
        }

        $url = $this->buildUrl();
        $payload = $this->buildPayload($prompt, $options);

        $attempt = 0;
        $lastError = null;

        while ($attempt <= $this->maxRetries) {
            $attempt++;
            $start = microtime(true);

            try {
                $response = Http::timeout($this->timeout)
                    ->withHeaders(['Content-Type' => 'application/json'])
                    ->post($url, $payload);

                $latencyMs = (int) ((microtime(true) - $start) * 1000);

                if ($response->successful()) {
                    $text = $this->extractText($response->json());

                    if ($text !== null) {
                        Log::debug('Gemini: success', [
                            'attempt' => $attempt,
                            'latency_ms' => $latencyMs,
                            'prompt_length' => strlen($prompt),
                            'response_length' => strlen($text),
                        ]);

                        return [
                            'success' => true,
                            'text' => $text,
                            'error' => null,
                            'latency_ms' => $latencyMs,
                        ];
                    }

                    // Check for safety blocks or empty candidates
                    $blockReason = $response->json('promptFeedback.blockReason');
                    $finishReason = $response->json('candidates.0.finishReason');
                    $lastError = "Empty response (block: {$blockReason}, finish: {$finishReason})";

                    Log::warning('Gemini: empty response', [
                        'attempt' => $attempt,
                        'block_reason' => $blockReason,
                        'finish_reason' => $finishReason,
                    ]);
                } else {
                    $status = $response->status();
                    $lastError = "HTTP {$status}: " . substr($response->body(), 0, 200);

                    // Rate limited — extract retry delay if present
                    $isRateLimited = $status === 429;

                    Log::warning('Gemini: API error', [
                        'attempt' => $attempt,
                        'status' => $status,
                        'rate_limited' => $isRateLimited,
                        'body' => substr($response->body(), 0, 500),
                    ]);

                    // On rate limit, fail fast — don't burn retries
                    if ($isRateLimited) {
                        return [
                            'success' => false,
                            'text' => null,
                            'error' => 'Rate limited (HTTP 429)',
                            'latency_ms' => (int) ((microtime(true) - $start) * 1000),
                        ];
                    }
                }
            } catch (\Throwable $e) {
                $latencyMs = (int) ((microtime(true) - $start) * 1000);
                $lastError = $e->getMessage();

                Log::warning('Gemini: exception', [
                    'attempt' => $attempt,
                    'error' => $lastError,
                    'latency_ms' => $latencyMs,
                ]);
            }

            // Don't retry on first attempt unless it's a transient error
            if ($attempt <= $this->maxRetries) {
                usleep(500_000); // 500ms backoff
            }
        }

        return [
            'success' => false,
            'text' => null,
            'error' => $lastError ?? 'Unknown error',
            'latency_ms' => 0,
        ];
    }

    /**
     * Send a prompt expecting JSON output. Parses and validates the response.
     *
     * @return array{success: bool, data: array|null, raw: string|null, error: string|null, latency_ms: int}
     */
    public function generateJson(string $prompt, array $options = []): array
    {
        $options['responseMimeType'] = 'application/json';
        $result = $this->generate($prompt, $options);

        if (!$result['success']) {
            return [
                'success' => false,
                'data' => null,
                'raw' => null,
                'error' => $result['error'],
                'latency_ms' => $result['latency_ms'],
            ];
        }

        $text = $result['text'];

        // Clean control characters that Gemini sometimes embeds in JSON strings
        $cleaned = preg_replace('/[\x00-\x1f\x7f]/', ' ', $text);

        // Try direct parse first
        $data = json_decode($cleaned, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return [
                'success' => true,
                'data' => $data,
                'raw' => $text,
                'error' => null,
                'latency_ms' => $result['latency_ms'],
            ];
        }

        // Try extracting JSON from markdown code block or surrounding text
        if (preg_match('/\{[\s\S]*\}/m', $cleaned, $matches)) {
            $data = json_decode($matches[0], true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                return [
                    'success' => true,
                    'data' => $data,
                    'raw' => $text,
                    'error' => null,
                    'latency_ms' => $result['latency_ms'],
                ];
            }
        }

        Log::warning('Gemini: JSON parse failed', [
            'raw' => substr($text, 0, 500),
            'json_error' => json_last_error_msg(),
        ]);

        return [
            'success' => false,
            'data' => null,
            'raw' => $text,
            'error' => 'Failed to parse JSON: ' . json_last_error_msg(),
            'latency_ms' => $result['latency_ms'],
        ];
    }

    private function buildUrl(): string
    {
        $url = $this->endpoint;
        // Replace {GEMINI_API_KEY} placeholder if present
        $url = str_replace('{GEMINI_API_KEY}', $this->apiKey, $url);
        // If URL doesn't contain the key yet, append it
        if (strpos($url, $this->apiKey) === false && strpos($url, 'key=') === false) {
            $separator = str_contains($url, '?') ? '&' : '?';
            $url .= $separator . 'key=' . $this->apiKey;
        }
        return $url;
    }

    private function buildPayload(string $prompt, array $options): array
    {
        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => $options['temperature'] ?? 0.2,
                'maxOutputTokens' => $options['maxOutputTokens'] ?? 4096,
            ],
        ];

        if (isset($options['responseMimeType'])) {
            $payload['generationConfig']['responseMimeType'] = $options['responseMimeType'];
        }

        // Disable thinking for Gemini 2.5 models — thinking tokens consume the
        // output budget and cause truncation on structured JSON responses.
        if (str_contains($this->endpoint, 'gemini-2.5')) {
            $payload['generationConfig']['thinkingConfig'] = [
                'thinkingBudget' => 0,
            ];
        }

        return $payload;
    }

    private function extractText(?array $json): ?string
    {
        if (!$json) {
            return null;
        }

        $text = $json['candidates'][0]['content']['parts'][0]['text'] ?? null;

        return $text && trim($text) !== '' ? trim($text) : null;
    }
}
