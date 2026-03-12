<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Listing extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'price_per_m2' => 'decimal:2',
            'area_m2' => 'decimal:2',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'image_urls' => 'array',
            'description_features' => 'array',
            'image_tags' => 'array',
            'published_at' => 'datetime',
            'imported_at' => 'datetime',
            'rooms' => 'integer',
            'floor' => 'integer',
            'building_floors' => 'integer',
        ];
    }

    // --- Scopes ---

    public function scopePropertyType(Builder $query, ?string $type): Builder
    {
        return $type ? $query->where('property_type', $type) : $query;
    }

    public function scopeMarketType(Builder $query, ?string $type): Builder
    {
        return $type ? $query->where('market_type', $type) : $query;
    }

    /**
     * Kraków administrative districts → sub-areas.
     * Selecting a parent district also includes its children.
     */
    private const DISTRICT_HIERARCHY = [
        'Stare Miasto' => [],
        'Grzegórzki' => ['Olsza'],
        'Prądnik Czerwony' => ['Rakowice'],
        'Prądnik Biały' => [],
        'Krowodrza' => ['Łobzów'],
        'Bronowice' => ['Bronowice Małe', 'Bronowice Wielkie'],
        'Zwierzyniec' => ['Salwator', 'Wola Justowska', 'Przegorzały'],
        'Dębniki' => ['Ruczaj', 'Zakrzówek', 'Tyniec', 'Piaski Wielkie'],
        'Łagiewniki-Borek Fałęcki' => [],
        'Swoszowice' => [],
        'Podgórze Duchackie' => [],
        'Bieżanów-Prokocim' => [],
        'Podgórze' => ['Rybitwy', 'Rajsko', 'Wróblowice'],
        'Czyżyny' => [],
        'Mistrzejowice' => [],
        'Bieńczyce' => [],
        'Wzgórza Krzesławickie' => ['Przylasek Rusiecki'],
        'Nowa Huta' => ['Tonie'],
    ];

    public function scopeDistrict(Builder $query, ?string $district): Builder
    {
        if (!$district) {
            return $query;
        }

        // If the district is a parent with children, match parent + all children
        if (isset(self::DISTRICT_HIERARCHY[$district]) && !empty(self::DISTRICT_HIERARCHY[$district])) {
            $names = array_merge([$district], self::DISTRICT_HIERARCHY[$district]);
            return $query->whereIn('district', $names);
        }

        return $query->where('district', $district);
    }

    public function scopePriceBetween(Builder $query, ?float $min, ?float $max): Builder
    {
        if ($min) $query->where('price', '>=', $min);
        if ($max) $query->where('price', '<=', $max);
        return $query;
    }

    public function scopeAreaBetween(Builder $query, ?float $min, ?float $max): Builder
    {
        if ($min) $query->where('area_m2', '>=', $min);
        if ($max) $query->where('area_m2', '<=', $max);
        return $query;
    }

    public function scopeRoomsBetween(Builder $query, ?int $min, ?int $max): Builder
    {
        if ($min) $query->where('rooms', '>=', $min);
        if ($max) $query->where('rooms', '<=', $max);
        return $query;
    }

    public function scopeKeywordSearch(Builder $query, ?string $keyword): Builder
    {
        if (!$keyword) return $query;

        return $query->where(function (Builder $q) use ($keyword) {
            $term = '%' . $keyword . '%';
            $q->where('title', 'LIKE', $term)
              ->orWhere('description', 'LIKE', $term)
              ->orWhere('district', 'LIKE', $term)
              ->orWhere('street', 'LIKE', $term);
        });
    }

    // --- Accessors ---

    public function getFormattedPriceAttribute(): string
    {
        if ($this->price === null) return 'Cena na zapytanie';
        return number_format((float) $this->price, 0, ',', ' ') . ' ' . $this->currency;
    }

    public function getFormattedAreaAttribute(): string
    {
        if ($this->area_m2 === null) return 'Brak danych';
        return number_format((float) $this->area_m2, 1, ',', ' ') . ' m²';
    }

    public function getPropertyTypeLabelAttribute(): string
    {
        return match($this->property_type) {
            'flat' => 'Mieszkanie',
            'house' => 'Dom',
            default => $this->property_type,
        };
    }

    public function getMarketTypeLabelAttribute(): string
    {
        return match($this->market_type) {
            'sale' => 'Sprzedaż',
            'rent' => 'Wynajem',
            default => $this->market_type,
        };
    }

    public function hasCoordinates(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
