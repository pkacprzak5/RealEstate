<?php

namespace Tests\Unit;

use App\Models\Listing;
use App\Services\AreaSuggestionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AreaSuggestionServiceTest extends TestCase
{
    use RefreshDatabase;

    private function seedListings(int $count, array $attrs = []): void
    {
        for ($i = 0; $i < $count; $i++) {
            Listing::create(array_merge([
                'external_id' => "area-test-{$i}-" . uniqid(),
                'source_name' => 'otodom',
                'source_url' => "https://otodom.pl/test-{$i}",
                'title' => 'Test',
                'property_type' => 'flat',
                'market_type' => 'sale',
                'imported_at' => now(),
                'rooms' => 3,
                'area_m2' => 50 + ($i * 5),
            ], $attrs));
        }
    }

    public function test_returns_null_when_too_few_listings(): void
    {
        $this->seedListings(3);
        $service = new AreaSuggestionService();
        $this->assertNull($service->suggest(3, 3));
    }

    public function test_returns_suggestion_when_enough_listings(): void
    {
        $this->seedListings(10);
        $service = new AreaSuggestionService();
        $result = $service->suggest(3, 3);

        $this->assertNotNull($result);
        $this->assertArrayHasKey('min', $result);
        $this->assertArrayHasKey('max', $result);
        $this->assertArrayHasKey('count', $result);
        $this->assertEquals(10, $result['count']);
        $this->assertLessThan($result['max'], $result['min']);
    }

    public function test_filters_by_property_type(): void
    {
        $this->seedListings(10, ['property_type' => 'flat']);
        $this->seedListings(3, ['property_type' => 'house']);

        $service = new AreaSuggestionService();
        $this->assertNotNull($service->suggest(3, 3, 'flat'));
        $this->assertNull($service->suggest(3, 3, 'house'));
    }
}
