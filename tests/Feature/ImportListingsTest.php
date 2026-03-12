<?php

namespace Tests\Feature;

use App\Models\Listing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ImportListingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_import_creates_listings(): void
    {
        $data = [
            [
                'external_id' => 'test-1',
                'source_url' => 'https://otodom.pl/test-1',
                'title' => 'Test Listing',
                'property_type' => 'flat',
                'market_type' => 'sale',
            ],
        ];

        $path = storage_path('app/test-import.json');
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])
            ->assertSuccessful();

        $this->assertDatabaseCount('listings', 1);
        $this->assertDatabaseHas('listings', ['external_id' => 'test-1', 'title' => 'Test Listing']);

        File::delete($path);
    }

    public function test_reimport_updates_existing(): void
    {
        $data = [
            [
                'external_id' => 'test-1',
                'source_url' => 'https://otodom.pl/test-1',
                'title' => 'Original Title',
                'property_type' => 'flat',
                'market_type' => 'sale',
            ],
        ];

        $path = storage_path('app/test-import.json');
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])->assertSuccessful();

        // Update title and reimport
        $data[0]['title'] = 'Updated Title';
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])->assertSuccessful();

        $this->assertDatabaseCount('listings', 1);
        $this->assertDatabaseHas('listings', ['external_id' => 'test-1', 'title' => 'Updated Title']);

        File::delete($path);
    }

    public function test_skips_listings_without_source_url(): void
    {
        $data = [
            ['external_id' => 'no-url', 'title' => 'No URL', 'property_type' => 'flat', 'market_type' => 'sale'],
        ];

        $path = storage_path('app/test-import.json');
        File::put($path, json_encode($data));

        $this->artisan('listings:import', ['file' => $path])->assertSuccessful();
        $this->assertDatabaseCount('listings', 0);

        File::delete($path);
    }
}
