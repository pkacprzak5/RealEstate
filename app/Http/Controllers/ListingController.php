<?php

namespace App\Http\Controllers;

use App\Models\Listing;
use App\Services\AreaSuggestionService;
use App\Services\IntentParserService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ListingController extends Controller
{
    public function index(Request $request, IntentParserService $intentParser, AreaSuggestionService $areaSuggestion): Response
    {
        $filters = $this->extractFilters($request);
        $intentParsed = null;

        // Always parse NL query when present; structured filters override AI-parsed ones
        $nlQuery = $request->input('q');
        if ($nlQuery) {
            $intentParsed = $intentParser->parse($nlQuery);
            if ($intentParsed) {
                // AI-parsed filters are defaults; explicit structured filters take priority
                $filters = array_merge(array_filter($intentParsed), $filters);
            }
        }

        $query = Listing::query()
            ->propertyType($filters['property_type'] ?? null)
            ->marketType($filters['market_type'] ?? null)
            ->district($filters['district'] ?? null)
            ->priceBetween($filters['min_price'] ?? null, $filters['max_price'] ?? null)
            ->areaBetween($filters['min_area'] ?? null, $filters['max_area'] ?? null)
            ->roomsBetween($filters['min_rooms'] ?? null, $filters['max_rooms'] ?? null)
            ->keywordSearch($filters['keywords'] ?? null);

        // Sorting: push nulls to end rather than excluding them
        $sort = $request->input('sort', 'newest');
        $query = match ($sort) {
            'price_asc' => $query->orderByRaw('price IS NULL, price ASC'),
            'price_desc' => $query->orderByRaw('price IS NULL, price DESC'),
            'area_asc' => $query->orderByRaw('area_m2 IS NULL, area_m2 ASC'),
            'area_desc' => $query->orderByRaw('area_m2 IS NULL, area_m2 DESC'),
            default => $query->orderByRaw('COALESCE(published_at, imported_at) DESC'),
        };

        // All map pins — clone BEFORE select/paginate to avoid limit/offset contamination
        $mapPins = (clone $query)->reorder()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select(['id', 'title', 'price', 'currency', 'latitude', 'longitude', 'district', 'area_m2', 'rooms', 'property_type', 'market_type', 'thumbnail_url'])
            ->get();

        // Exclude heavy fields from index page payload
        $query->select([
            'id', 'title', 'price', 'currency', 'price_per_m2', 'area_m2',
            'rooms', 'property_type', 'market_type', 'district', 'street',
            'latitude', 'longitude', 'thumbnail_url', 'published_at', 'imported_at',
        ]);

        $listings = $query->paginate(24)->withQueryString();

        // Area suggestion (only when rooms filter is active)
        $areaSuggestionData = null;
        $minRooms = $filters['min_rooms'] ?? null;
        $maxRooms = $filters['max_rooms'] ?? null;
        if ($minRooms || $maxRooms) {
            $areaSuggestionData = $areaSuggestion->suggest(
                (int) ($minRooms ?? $maxRooms),
                (int) ($maxRooms ?? $minRooms),
                $filters['property_type'] ?? null,
            );
        }

        // Distinct districts for filter dropdown
        $districts = Listing::whereNotNull('district')
            ->distinct()
            ->orderBy('district')
            ->pluck('district')
            ->toArray();

        return Inertia::render('Listings/Index', [
            'listings' => $listings,
            'mapPins' => $mapPins,
            'filters' => (object) $filters,
            'sort' => $sort,
            'districts' => $districts,
            'areaSuggestion' => $areaSuggestionData,
            'intentParsed' => $intentParsed,
            'query' => $nlQuery,
        ]);
    }

    public function show(Listing $listing): Response
    {
        return Inertia::render('Listings/Show', [
            'listing' => $listing->makeHidden('raw_snapshot'),
        ]);
    }

    private function extractFilters(Request $request): array
    {
        return array_filter([
            'property_type' => $request->input('property_type'),
            'market_type' => $request->input('market_type'),
            'district' => $request->input('district'),
            'min_price' => $request->input('min_price') ? (float) $request->input('min_price') : null,
            'max_price' => $request->input('max_price') ? (float) $request->input('max_price') : null,
            'min_area' => $request->input('min_area') ? (float) $request->input('min_area') : null,
            'max_area' => $request->input('max_area') ? (float) $request->input('max_area') : null,
            'min_rooms' => $request->input('min_rooms') ? (int) $request->input('min_rooms') : null,
            'max_rooms' => $request->input('max_rooms') ? (int) $request->input('max_rooms') : null,
            'keywords' => $request->input('keywords'),
        ], fn ($v) => $v !== null);
    }
}
