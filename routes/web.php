<?php

use App\Http\Controllers\AiSearchController;
use App\Http\Controllers\ListingController;
use Illuminate\Support\Facades\Route;

Route::get('/debug-health', function () {
    try {
        $db = \Illuminate\Support\Facades\DB::connection()->getPdo() ? 'connected' : 'failed';
        $count = \App\Models\Listing::count();
        return response()->json([
            'status' => 'ok',
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'db' => $db,
            'listings' => $count,
            'env' => app()->environment(),
            'debug' => config('app.debug'),
            'key_set' => !empty(config('app.key')),
        ]);
    } catch (\Throwable $e) {
        return response()->json([
            'status' => 'error',
            'message' => $e->getMessage(),
            'file' => $e->getFile() . ':' . $e->getLine(),
        ], 500);
    }
});

Route::get('/', [ListingController::class, 'index'])->name('listings.index');
Route::get('/listings/{listing}', [ListingController::class, 'show'])->name('listings.show');

Route::post('/api/ai-search', [AiSearchController::class, 'search'])
    ->name('ai-search')
    ->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
