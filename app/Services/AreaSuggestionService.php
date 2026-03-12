<?php

namespace App\Services;

use App\Models\Listing;

class AreaSuggestionService
{
    private const MIN_LISTINGS_FOR_SUGGESTION = 5;

    /**
     * Returns a suggested area range for listings with the given room count.
     * Uses 10th and 90th percentile of actual data.
     */
    public function suggest(int $minRooms, int $maxRooms, ?string $propertyType = null): ?array
    {
        $query = Listing::query()
            ->whereNotNull('area_m2')
            ->where('rooms', '>=', $minRooms)
            ->where('rooms', '<=', $maxRooms);

        if ($propertyType) {
            $query->where('property_type', $propertyType);
        }

        $areas = $query->orderBy('area_m2')->pluck('area_m2')->toArray();

        if (count($areas) < self::MIN_LISTINGS_FOR_SUGGESTION) {
            return null;
        }

        $count = count($areas);
        $p10Index = (int) floor($count * 0.1);
        $p90Index = (int) floor($count * 0.9);

        $min = round((float) $areas[$p10Index], 0);
        $max = round((float) $areas[$p90Index], 0);

        if ($min >= $max) {
            return null;
        }

        $roomLabel = $minRooms === $maxRooms
            ? "{$minRooms}"
            : "{$minRooms}-{$maxRooms}";

        return [
            'min' => $min,
            'max' => $max,
            'count' => $count,
            'label' => "Typowy metraż dla {$roomLabel} pokoi: {$min}-{$max} m²",
        ];
    }
}
