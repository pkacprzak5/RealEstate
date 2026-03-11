<?php

namespace Tests\Feature;

use App\Models\Listing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ListingControllerTest extends TestCase
{
    use RefreshDatabase;

    private function createListing(array $attrs = []): Listing
    {
        return Listing::create(array_merge([
            'external_id' => 'test-' . uniqid(),
            'source_name' => 'otodom',
            'source_url' => 'https://otodom.pl/test',
            'title' => 'Mieszkanie testowe',
            'price' => 400000,
            'currency' => 'PLN',
            'area_m2' => 55.0,
            'rooms' => 2,
            'property_type' => 'flat',
            'market_type' => 'sale',
            'district' => 'Krowodrza',
            'imported_at' => now(),
        ], $attrs));
    }

    public function test_index_returns_listings(): void
    {
        $this->createListing();
        $this->createListing(['external_id' => 'test-2']);

        $response = $this->get('/');
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('Listings/Index')
                ->has('listings.data', 2)
                ->has('districts')
        );
    }

    public function test_index_filters_by_property_type(): void
    {
        $this->createListing(['property_type' => 'flat']);
        $this->createListing(['external_id' => 'h1', 'property_type' => 'house']);

        $response = $this->get('/?property_type=flat');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 1)
        );
    }

    public function test_index_filters_rooms_strictly(): void
    {
        $this->createListing(['rooms' => 2]);
        $this->createListing(['external_id' => 'r3', 'rooms' => 3]);
        $this->createListing(['external_id' => 'r4', 'rooms' => 4]);
        $this->createListing(['external_id' => 'r5', 'rooms' => 5]);

        $response = $this->get('/?min_rooms=3&max_rooms=4');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 2)
        );
    }

    public function test_index_filters_by_price_range(): void
    {
        $this->createListing(['price' => 300000]);
        $this->createListing(['external_id' => 'exp', 'price' => 800000]);

        $response = $this->get('/?min_price=200000&max_price=500000');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 1)
        );
    }

    public function test_show_returns_listing(): void
    {
        $listing = $this->createListing();

        $response = $this->get("/listings/{$listing->id}");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) =>
            $page->component('Listings/Show')
                ->has('listing')
                ->where('listing.id', $listing->id)
        );
    }

    public function test_show_returns_404_for_missing(): void
    {
        $response = $this->get('/listings/999');
        $response->assertStatus(404);
    }

    public function test_index_keyword_search(): void
    {
        $this->createListing(['title' => 'Piękne mieszkanie na Kazimierzu']);
        $this->createListing(['external_id' => 's2', 'title' => 'Dom w Nowej Hucie']);

        $response = $this->get('/?keywords=Kazimierz');
        $response->assertInertia(fn ($page) =>
            $page->has('listings.data', 1)
        );
    }

    public function test_index_does_not_include_raw_snapshot(): void
    {
        $this->createListing(['raw_snapshot' => '<html>large data</html>']);

        $response = $this->get('/');
        $response->assertInertia(fn ($page) =>
            $page->missing('listings.data.0.raw_snapshot')
        );
    }
}
