<?php

namespace App\Services\AiSearch;

use App\Models\Listing;
use Illuminate\Support\Facades\Log;

class CandidateRetriever
{
    private const MAX_CANDIDATES = 20;
    private const MIN_CANDIDATES = 3;
    private const PRICE_WIDEN_FACTOR = 0.20; // 20%

    /**
     * Retrieve candidate listings using structured filters.
     * Widens filters progressively if too few results.
     *
     * @param array $filters Sanitized structured filters
     * @return array{candidates: array, widened: bool, total_matching: int}
     */
    public function retrieve(array $filters): array
    {
        // First pass: exact filters
        $candidates = $this->queryWithFilters($filters);

        if (count($candidates) >= self::MIN_CANDIDATES) {
            Log::debug('CandidateRetriever: exact match', ['count' => count($candidates)]);
            return [
                'candidates' => array_slice($candidates, 0, self::MAX_CANDIDATES),
                'widened' => false,
                'total_matching' => count($candidates),
            ];
        }

        // Second pass: widen price by ±20%
        $widenedFilters = $this->widenPrice($filters);
        $candidates = $this->queryWithFilters($widenedFilters);

        if (count($candidates) >= self::MIN_CANDIDATES) {
            Log::debug('CandidateRetriever: price-widened match', ['count' => count($candidates)]);
            return [
                'candidates' => array_slice($candidates, 0, self::MAX_CANDIDATES),
                'widened' => true,
                'total_matching' => count($candidates),
            ];
        }

        // Third pass: remove district constraint
        $relaxedFilters = $widenedFilters;
        unset($relaxedFilters['district']);
        $candidates = $this->queryWithFilters($relaxedFilters);

        if (count($candidates) >= self::MIN_CANDIDATES) {
            Log::debug('CandidateRetriever: district-relaxed match', ['count' => count($candidates)]);
            return [
                'candidates' => array_slice($candidates, 0, self::MAX_CANDIDATES),
                'widened' => true,
                'total_matching' => count($candidates),
            ];
        }

        // Fourth pass: remove area constraint too
        unset($relaxedFilters['min_area'], $relaxedFilters['max_area']);
        $candidates = $this->queryWithFilters($relaxedFilters);

        Log::debug('CandidateRetriever: fully relaxed', ['count' => count($candidates)]);
        return [
            'candidates' => array_slice($candidates, 0, self::MAX_CANDIDATES),
            'widened' => true,
            'total_matching' => count($candidates),
        ];
    }

    private function queryWithFilters(array $filters): array
    {
        $query = Listing::query()
            ->propertyType($filters['property_type'] ?? null)
            ->marketType($filters['market_type'] ?? null)
            ->district($filters['district'] ?? null)
            ->priceBetween($filters['min_price'] ?? null, $filters['max_price'] ?? null)
            ->areaBetween($filters['min_area'] ?? null, $filters['max_area'] ?? null)
            ->roomsBetween($filters['min_rooms'] ?? null, $filters['max_rooms'] ?? null);

        if (isset($filters['floor'])) {
            $query->where('floor', $filters['floor']);
        }

        return $query->select([
            'id', 'title', 'description', 'price', 'currency', 'price_per_m2',
            'area_m2', 'rooms', 'floor', 'building_floors', 'property_type',
            'market_type', 'district', 'street', 'latitude', 'longitude',
            'thumbnail_url', 'image_urls', 'published_at',
            'description_summary', 'description_features', 'image_tags',
        ])
            ->orderByRaw('COALESCE(published_at, imported_at) DESC')
            ->limit(self::MAX_CANDIDATES)
            ->get()
            ->map(fn (Listing $l) => $this->formatCandidate($l))
            ->toArray();
    }

    private function formatCandidate(Listing $listing): array
    {
        return [
            'id' => $listing->id,
            'title' => $listing->title,
            'price' => $listing->price ? (float) $listing->price : null,
            'currency' => $listing->currency,
            'price_per_m2' => $listing->price_per_m2 ? (float) $listing->price_per_m2 : null,
            'area_m2' => $listing->area_m2 ? (float) $listing->area_m2 : null,
            'rooms' => $listing->rooms,
            'floor' => $listing->floor,
            'building_floors' => $listing->building_floors,
            'property_type' => $listing->property_type,
            'market_type' => $listing->market_type,
            'district' => $listing->district,
            'street' => $listing->street,
            'latitude' => $listing->latitude ? (float) $listing->latitude : null,
            'longitude' => $listing->longitude ? (float) $listing->longitude : null,
            'thumbnail_url' => $listing->thumbnail_url,
            'image_urls' => $listing->image_urls,
            'published_at' => $listing->published_at?->toIso8601String(),
            'description_summary' => $listing->description_summary,
            'description_features' => $listing->description_features
                ? (is_string($listing->description_features) ? json_decode($listing->description_features, true) : $listing->description_features)
                : null,
            'image_tags' => $listing->image_tags
                ? (is_string($listing->image_tags) ? json_decode($listing->image_tags, true) : $listing->image_tags)
                : null,
        ];
    }

    private function widenPrice(array $filters): array
    {
        if (isset($filters['min_price'])) {
            $filters['min_price'] = $filters['min_price'] * (1 - self::PRICE_WIDEN_FACTOR);
        }
        if (isset($filters['max_price'])) {
            $filters['max_price'] = $filters['max_price'] * (1 + self::PRICE_WIDEN_FACTOR);
        }
        return $filters;
    }
}
