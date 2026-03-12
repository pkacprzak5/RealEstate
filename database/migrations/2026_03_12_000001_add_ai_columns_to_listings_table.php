<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->text('description_summary')->nullable()->after('raw_snapshot');
            $table->json('description_features')->nullable()->after('description_summary');
            $table->json('image_tags')->nullable()->after('description_features');
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn(['description_summary', 'description_features', 'image_tags']);
        });
    }
};
