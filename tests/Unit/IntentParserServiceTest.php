<?php

namespace Tests\Unit;

use App\Services\IntentParserService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntentParserServiceTest extends TestCase
{
    public function test_returns_null_when_no_api_key(): void
    {
        config(['services.anthropic.api_key' => null]);
        $service = new IntentParserService();
        $this->assertNull($service->parse('mieszkanie 3 pokoje'));
    }

    public function test_parses_successful_api_response(): void
    {
        config(['services.anthropic.api_key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => '{"property_type": "flat", "min_rooms": 3, "max_rooms": 3, "max_price": 500000}'],
                ],
            ]),
        ]);

        $service = new IntentParserService();
        $result = $service->parse('mieszkanie 3-pokojowe do 500 tys');

        $this->assertIsArray($result);
        $this->assertEquals('flat', $result['property_type']);
        $this->assertEquals(3, $result['min_rooms']);
        $this->assertEquals(500000.0, $result['max_price']);
    }

    public function test_returns_null_on_api_error(): void
    {
        config(['services.anthropic.api_key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([], 500),
        ]);

        $service = new IntentParserService();
        $this->assertNull($service->parse('test query'));
    }

    public function test_sanitizes_invalid_enum_values(): void
    {
        config(['services.anthropic.api_key' => 'test-key']);

        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [
                    ['type' => 'text', 'text' => '{"property_type": "invalid", "min_rooms": 2}'],
                ],
            ]),
        ]);

        $service = new IntentParserService();
        $result = $service->parse('test');

        $this->assertArrayNotHasKey('property_type', $result);
        $this->assertEquals(2, $result['min_rooms']);
    }
}
