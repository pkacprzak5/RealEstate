<?php

use App\Http\Controllers\AiSearchController;
use Illuminate\Support\Facades\Route;

Route::post('/ai-search', [AiSearchController::class, 'search'])->name('ai-search');

// Temporary diagnostic — remove after debugging
Route::get('/ai-debug', function () {
    $checks = [];

    // 1. Check Gemini config
    $checks['gemini_api_key_set'] = config('services.gemini.api_key') !== '';
    $checks['gemini_endpoint_set'] = config('services.gemini.endpoint') !== '';
    $checks['gemini_endpoint_preview'] = substr(config('services.gemini.endpoint', ''), 0, 60) . '...';

    // 2. Check if classes resolve
    try {
        $client = app(\App\Services\Gemini\GeminiClient::class);
        $checks['gemini_client'] = 'ok';
        $checks['gemini_available'] = $client->isAvailable();
    } catch (\Throwable $e) {
        $checks['gemini_client'] = 'FAIL: ' . $e->getMessage();
    }

    try {
        app(\App\Services\AiSearch\AiSearchOrchestrator::class);
        $checks['orchestrator'] = 'ok';
    } catch (\Throwable $e) {
        $checks['orchestrator'] = 'FAIL: ' . $e->getMessage();
    }

    // 3. Check DB
    try {
        $count = \App\Models\Listing::count();
        $checks['listings_count'] = $count;
    } catch (\Throwable $e) {
        $checks['listings_count'] = 'FAIL: ' . $e->getMessage();
    }

    // 4. Test a simple Gemini call
    try {
        $client = app(\App\Services\Gemini\GeminiClient::class);
        if ($client->isAvailable()) {
            $result = $client->generate('Reply with exactly: {"status":"ok"}', [
                'temperature' => 0,
                'maxOutputTokens' => 32,
            ]);
            $checks['gemini_test'] = $result['success'] ? 'ok' : 'FAIL: ' . $result['error'];
            $checks['gemini_response_preview'] = substr($result['text'] ?? '', 0, 100);
        } else {
            $checks['gemini_test'] = 'skipped (not configured)';
        }
    } catch (\Throwable $e) {
        $checks['gemini_test'] = 'FAIL: ' . $e->getMessage();
    }

    return response()->json($checks);
});
