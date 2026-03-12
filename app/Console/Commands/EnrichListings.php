<?php

namespace App\Console\Commands;

use App\Models\Listing;
use App\Services\AiSearch\DeterministicEnricher;
use App\Services\AiSearch\Prompts;
use App\Services\Gemini\GeminiClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class EnrichListings extends Command
{
    protected $signature = 'listings:enrich
        {--force : Re-enrich listings that already have summaries}
        {--limit=0 : Maximum listings to process (0 = all)}
        {--local : Use deterministic keyword extraction instead of Gemini API}
        {--dry-run : Show what would be enriched without making changes}';

    protected $description = 'Enrich listings with AI-generated summaries, features, and image tags';

    public function handle(GeminiClient $gemini, DeterministicEnricher $localEnricher): int
    {
        $useLocal = $this->option('local');

        if (!$useLocal && !$gemini->isAvailable()) {
            $this->error('Gemini is not configured. Set GEMINI_API_KEY and GEMINI_API_ENDPOINT in .env, or use --local');
            return self::FAILURE;
        }

        $mode = $useLocal ? 'local (deterministic)' : 'Gemini API';
        $this->info("Mode: {$mode}");

        $query = Listing::query()->whereNotNull('description');

        if (!$this->option('force')) {
            $query->whereNull('description_summary');
        }

        $limit = (int) $this->option('limit');
        if ($limit > 0) {
            $query->limit($limit);
        }

        $listings = $query->get();
        $total = $listings->count();

        if ($total === 0) {
            $this->info('No listings to enrich.');
            return self::SUCCESS;
        }

        $this->info("Enriching {$total} listings...");
        $bar = $this->output->createProgressBar($total);

        $enriched = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($listings as $listing) {
            $bar->advance();

            if ($this->option('dry-run')) {
                $this->line(" [DRY-RUN] Would enrich: {$listing->title}");
                $skipped++;
                continue;
            }

            $descResult = $useLocal
                ? $localEnricher->enrich($listing)
                : $this->enrichViaGemini($gemini, $listing);

            if ($descResult) {
                $listing->description_summary = $descResult['summary'] ?? null;
                $listing->description_features = $descResult['features'] ?? null;
                $listing->save();
                $enriched++;
            } else {
                $failed++;
            }

            // Rate limit only needed for API calls
            if (!$useLocal) {
                usleep(1_000_000);
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Done: {$enriched} enriched, {$failed} failed, {$skipped} skipped");

        Log::info('listings:enrich completed', [
            'mode' => $mode,
            'enriched' => $enriched,
            'failed' => $failed,
            'skipped' => $skipped,
        ]);

        return self::SUCCESS;
    }

    private function enrichViaGemini(GeminiClient $gemini, Listing $listing): ?array
    {
        $description = $listing->description;
        if (!$description || trim(strip_tags($description)) === '') {
            return null;
        }

        $prompt = Prompts::descriptionEnrichment($listing->title, $description);
        $result = $gemini->generateJson($prompt, ['temperature' => 0.1]);

        if (!$result['success']) {
            $this->warn(" Failed: {$listing->title} — {$result['error']}");
            return null;
        }

        $data = $result['data'];

        if (!isset($data['summary']) || !is_string($data['summary'])) {
            $this->warn(" Invalid response for: {$listing->title}");
            return null;
        }

        return $data;
    }
}
