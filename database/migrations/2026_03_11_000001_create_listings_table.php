<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('source_name', 50)->default('otodom');
            $table->string('source_url', 500);
            $table->string('title', 500);
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->nullable();
            $table->string('currency', 3)->default('PLN');
            $table->decimal('price_per_m2', 10, 2)->nullable();
            $table->decimal('area_m2', 8, 2)->nullable();
            $table->unsignedTinyInteger('rooms')->nullable();
            $table->tinyInteger('floor')->nullable();
            $table->unsignedTinyInteger('building_floors')->nullable();
            $table->enum('property_type', ['flat', 'house']);
            $table->enum('market_type', ['sale', 'rent']);
            $table->string('district', 100)->nullable();
            $table->string('street', 200)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('thumbnail_url', 500)->nullable();
            $table->json('image_urls')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('imported_at');
            $table->enum('normalization_status', ['complete', 'partial', 'failed'])->default('partial');
            $table->mediumText('raw_snapshot')->nullable();
            $table->timestamps();

            $table->index(['property_type', 'market_type'], 'idx_property_market');
            $table->index('district', 'idx_district');
            $table->index('price', 'idx_price');
            $table->index('area_m2', 'idx_area');
            $table->index('rooms', 'idx_rooms');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listings');
    }
};
