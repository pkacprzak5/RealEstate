<?php

namespace App\Http\Controllers;

use App\Services\AiSearch\AiSearchOrchestrator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AiSearchController extends Controller
{
    public function search(Request $request, AiSearchOrchestrator $orchestrator): JsonResponse
    {
        // Force JSON validation responses (this is an API endpoint in web.php)
        $request->headers->set('Accept', 'application/json');

        $validated = $request->validate([
            'messages' => 'required|array|min:1|max:20',
            'messages.*.role' => 'required|string|in:user,assistant',
            'messages.*.content' => 'required|string|max:2000',
            'question_count' => 'integer|min:0|max:5',
        ]);

        $messages = $validated['messages'];
        $questionCount = $validated['question_count'] ?? 0;

        // Ensure the last message is from the user
        $lastMessage = end($messages);
        if ($lastMessage['role'] !== 'user') {
            return response()->json([
                'type' => 'error',
                'message' => 'Last message must be from the user',
            ], 422);
        }

        try {
            $result = $orchestrator->search($messages, $questionCount);
            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('AiSearch: unhandled exception', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'type' => 'error',
                'message' => 'AI search encountered an error. Please try again.',
                'fallback' => true,
            ], 500);
        }
    }
}
