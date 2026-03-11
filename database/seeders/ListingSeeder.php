<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class ListingSeeder extends Seeder
{
    public function run(): void
    {
        Artisan::call('listings:import', ['--seed' => true]);
        $this->command->info(Artisan::output());
    }
}
