<?php

namespace App\Console\Commands;

use App\Models\Listing;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class ImportListings extends Command
{
    protected $signature = 'listings:import
        {file? : Path to JSON file (default: storage/app/scraped-listings.json)}
        {--seed : Use seed file from database/seeders/data/listings.json}
        {--dry-run : Parse and validate without inserting}';

    protected $description = 'Import listings from a JSON file into the database';

    public function handle(): int
    {
        $file = $this->resolveFile();

        if (!file_exists($file)) {
            $this->error("File not found: {$file}");
            return self::FAILURE;
        }

        $raw = json_decode(file_get_contents($file), true);

        if (!is_array($raw)) {
            $this->error('Invalid JSON: expected an array of listings');
            return self::FAILURE;
        }

        $this->info("Importing from: {$file}");
        $count = count($raw);
        $this->info("Found {$count} listings");

        $stats = ['imported' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0];

        $bar = $this->output->createProgressBar(count($raw));
        $bar->start();

        foreach ($raw as $item) {
            try {
                $result = $this->upsertListing($item);
                $stats[$result]++;
            } catch (\Throwable $e) {
                $stats['failed']++;
                Log::warning('Import failed for listing', [
                    'external_id' => $item['external_id'] ?? 'unknown',
                    'error' => $e->getMessage(),
                ]);
                if ($this->output->isVerbose()) {
                    $this->warn("  Failed: {$e->getMessage()}");
                }
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $this->table(
            ['Imported', 'Updated', 'Skipped', 'Failed'],
            [[$stats['imported'], $stats['updated'], $stats['skipped'], $stats['failed']]]
        );

        return self::SUCCESS;
    }

    private function resolveFile(): string
    {
        if ($this->option('seed')) {
            return database_path('seeders/data/listings.json');
        }
        return $this->argument('file') ?? storage_path('app/scraped-listings.json');
    }

    private function upsertListing(array $item): string
    {
        $externalId = $item['external_id'] ?? null;

        if (!$externalId) {
            return 'skipped';
        }

        $sourceUrl = $item['source_url'] ?? '';
        if (empty($sourceUrl)) {
            Log::warning('Import: listing has no source_url, skipping', ['external_id' => $externalId]);
            return 'skipped';
        }

        if ($this->option('dry-run')) {
            return 'imported';
        }

        $data = [
            'external_id' => $externalId,
            'source_name' => 'otodom',
            'source_url' => $sourceUrl,
            'title' => $item['title'] ?? 'Brak tytułu',
            'description' => $item['description'] ?? null,
            'price' => $item['price'] ?? null,
            'currency' => $item['currency'] ?? 'PLN',
            'price_per_m2' => $item['price_per_m2'] ?? null,
            'area_m2' => $item['area_m2'] ?? null,
            'rooms' => $item['rooms'] ?? null,
            'floor' => $item['floor'] ?? null,
            'building_floors' => $item['building_floors'] ?? null,
            'property_type' => $item['property_type'] ?? 'flat',
            'market_type' => $item['market_type'] ?? 'sale',
            'district' => $item['district'] ?? null,
            'street' => $item['street'] ?? null,
            'latitude' => $item['latitude'] ?? null,
            'longitude' => $item['longitude'] ?? null,
            'thumbnail_url' => $item['thumbnail_url'] ?? null,
            'image_urls' => $item['image_urls'] ?? [],
            'published_at' => isset($item['published_at']) ? Carbon::parse($item['published_at']) : null,
            'imported_at' => now(),
            'normalization_status' => $item['normalization_status'] ?? 'partial',
            'raw_snapshot' => $item['raw_snapshot'] ?? null,
        ];

        $existing = Listing::where('external_id', $externalId)->first();

        if ($existing) {
            $existing->update($data);
            return 'updated';
        }

        Listing::create($data);
        return 'imported';
    }
}
