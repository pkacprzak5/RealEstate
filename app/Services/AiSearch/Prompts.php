<?php

namespace App\Services\AiSearch;

class Prompts
{
    /** Valid Kraków district names for the AI to choose from. */
    private const DISTRICT_MAP = [
        'Stare Miasto' => [],
        'Grzegórzki' => [],
        'Prądnik Czerwony' => [],
        'Prądnik Biały' => [],
        'Krowodrza' => [],
        'Bronowice' => [],
        'Zwierzyniec' => [],
        'Dębniki' => [],
        'Łagiewniki-Borek Fałęcki' => [],
        'Swoszowice' => [],
        'Podgórze Duchackie' => [],
        'Bieżanów-Prokocim' => [],
        'Podgórze' => [],
        'Czyżyny' => [],
        'Mistrzejowice' => [],
        'Bieńczyce' => [],
        'Wzgórza Krzesławickie' => [],
        'Nowa Huta' => [],
    ];

    /**
     * Extract structured preferences from natural-language input.
     * Conversation history is included so refinements are contextual.
     */
    public static function preferenceExtraction(array $messages): string
    {
        $conversation = self::formatConversation($messages);

        $districts = implode(', ', array_keys(self::DISTRICT_MAP));

        return <<<PROMPT
Jesteś asystentem wyszukiwania nieruchomości w Krakowie. Przeanalizuj rozmowę i wyodrębnij preferencje użytkownika.

ROZMOWA:
{$conversation}

Wyodrębnij filtry i miękkie preferencje. Zwróć TYLKO poprawny JSON:
{
  "filters": {
    "property_type": "flat" or "house" or null,
    "market_type": "sale" or "rent" or null,
    "min_price": number or null,
    "max_price": number or null,
    "min_rooms": integer or null,
    "max_rooms": integer or null,
    "min_area": number or null,
    "max_area": number or null,
    "district": string or null,
    "floor": integer or null
  },
  "soft_preferences": ["tablica preferencji jakościowych po polsku"],
  "confidence": "high" or "medium" or "low",
  "search_summary": "jedno zdanie po polsku opisujące czego szuka użytkownik"
}

ZASADY:
- Domyślnie property_type = "flat" chyba że użytkownik mówi o domu
- Domyślnie market_type = "sale" chyba że użytkownik mówi o wynajmie
- Miasto to zawsze Kraków — ignoruj wzmianki o mieście
- Ceny w PLN: "500k"=500000, "pół miliona"=500000, "500 tys"=500000
- "2-pokojowe"/"2 pokoje" → min_rooms:2, max_rooms:2
- district MUSI być jedną z dozwolonych nazw: {$districts}
- Jeśli użytkownik pisze np. "bronowice", "centrum", "stare miasto" — dopasuj do najbliższej nazwy z listy
- "centrum" → "Stare Miasto", "prokocim" → "Bieżanów-Prokocim", "borek" → "Łagiewniki-Borek Fałęcki"
- Wyodrębnij WSZYSTKIE miękkie preferencje: jasność, cisza, styl, udogodnienia, bliskość, stan, widok, parking, balkon, ogród, nowoczesny/klasyczny, rodzinny
- confidence="high" gdy >=2 konkretne ograniczenia, "medium" gdy 1-2, "low" gdy ogólne
- search_summary i soft_preferences MUSZĄ być po polsku
- Uwzględniaj tylko filtry wyraźnie wymienione lub jednoznacznie domniemane
- Późniejsze wiadomości nadpisują wcześniejsze
PROMPT;
    }

    /**
     * Decide whether to ask a follow-up question or proceed to search.
     */
    public static function clarificationDecision(array $extractedPreferences): string
    {
        $prefs = json_encode($extractedPreferences, JSON_PRETTY_PRINT);

        return <<<PROMPT
Decydujesz, czy zadać pytanie doprecyzowujące przed wyszukaniem ofert nieruchomości.

WYODRĘBNIONE PREFERENCJE:
{$prefs}

Zdecyduj: zadać pytanie, czy szukać od razu?

Zwróć TYLKO poprawny JSON:
{
  "should_ask": true or false,
  "reason": "krótkie wyjaśnienie decyzji",
  "question": "pytanie po polsku, jeśli should_ask jest true" or null,
  "options": ["3-5 konkretnych opcji po polsku do kliknięcia"] or null
}

ZASADY:
- Pytaj TYLKO gdy zapytanie jest naprawdę zbyt ogólne
- confidence="high" → NIGDY nie pytaj, szukaj od razu
- confidence="medium" → szukaj od razu chyba że brakuje kluczowej informacji
- confidence="low" I mniej niż 2 filtry → zadaj JEDNO pytanie
- Wartościowe pytania: budżet, liczba pokoi, preferowana dzielnica
- NIGDY nie pytaj o: typ nieruchomości (domyślnie mieszkanie), typ transakcji (domyślnie sprzedaż), miasto (zawsze Kraków)
- Opcje MUSZĄ być po polsku i konkretne
- Pytanie musi być pomocne, nie przesłuchujące
- Maksymalnie 1 pytanie na turę — preferuj szukanie nad pytaniem
PROMPT;
    }

    /**
     * Rank candidates against user preferences and generate explanations.
     */
    public static function rankAndExplain(
        array $preferences,
        array $candidates,
        int $maxResults = 5
    ): string {
        $filtersJson = json_encode($preferences['filters'] ?? [], JSON_UNESCAPED_UNICODE);
        $softPrefs = implode(', ', $preferences['soft_preferences'] ?? []);
        $candidatesJson = self::formatCandidatesCompact($candidates);
        $count = count($candidates);

        return <<<PROMPT
Jesteś doradcą ds. nieruchomości w Krakowie. Kupujący ma następujące wymagania:

Twarde filtry: {$filtersJson}
Miękkie preferencje: {$softPrefs}

Oto {$count} ofert (format: ID|cena|powierzchnia|pokoje|dzielnica|cechy):
{$candidatesJson}

Oceń każdą ofertę 0.0–1.0 wg dopasowania. Wybierz top {$maxResults}.

ZASADY OCENIANIA:
- Oferty spełniające wszystkie filtry: 0.7–1.0
- Oferty lekko powyżej budżetu (do 20%): obniż o 0.1–0.2, nie zeruj
- Oferty w innej dzielnicy: obniż o 0.1–0.2, nie zeruj — bliskość i cechy mogą to kompensować
- Dopasowanie miękkich preferencji (jasność, cisza, balkon): dodaj 0.05–0.15
- NIE dawaj score 0.0 chyba że oferta totalnie nie pasuje
- Każda oferta MUSI mieć score > 0 jeśli jest w tej samej kategorii (mieszkanie/sprzedaż)

Zwróć TYLKO ten JSON (bez dodatkowego tekstu):
{
  "rankings": [
    {"listing_id": 1, "score": 0.85, "confidence": "high", "explanation": "Jedno zdanie po polsku opisujące cenę, metraż, dzielnicę i kluczowe cechy."}
  ]
}
PROMPT;
    }

    /**
     * Summarize a listing description and extract structured features.
     * Used for batch enrichment.
     */
    public static function descriptionEnrichment(string $title, string $description): string
    {
        // Truncate description to avoid token limits
        $desc = mb_substr(strip_tags($description), 0, 3000);

        return <<<PROMPT
Analyze this Polish real-estate listing and extract information.

TITLE: {$title}
DESCRIPTION: {$desc}

Output ONLY valid JSON:
{
  "summary": "3-5 sentence English summary covering: location, layout, condition, key amenities, notable features",
  "features": {
    "condition": "new/renovated/good/needs-renovation/developer-state" or null,
    "balcony": true/false/null,
    "garden": true/false/null,
    "parking": "underground/garage/outdoor/street" or null,
    "elevator": true/false/null,
    "storage": true/false/null,
    "air_conditioning": true/false/null,
    "furnished": true/false/null,
    "bright": true/false/null,
    "quiet": true/false/null,
    "green_area_nearby": true/false/null,
    "public_transport_nearby": true/false/null,
    "year_built": integer or null,
    "heating": "central/individual/gas/electric" or null,
    "kitchen_type": "open/separate/kitchenette" or null,
    "notable": ["array of other notable features not covered above"]
  }
}

RULES:
- Extract only what is explicitly stated or strongly implied
- Use null when information is not present — do NOT guess
- summary must be in English
- features.notable should capture unique selling points
PROMPT;
    }

    private static function formatConversation(array $messages): string
    {
        $lines = [];
        foreach ($messages as $msg) {
            $role = strtoupper($msg['role'] ?? 'user');
            $content = $msg['content'] ?? '';
            $lines[] = "[{$role}]: {$content}";
        }
        return implode("\n", $lines);
    }

    private static function formatCandidatesCompact(array $candidates): string
    {
        $lines = [];
        foreach ($candidates as $c) {
            $id = $c['id'] ?? '?';
            $price = $c['price'] ?? '?';
            $area = $c['area_m2'] ?? '?';
            $rooms = $c['rooms'] ?? '?';
            $district = $c['district'] ?? '?';

            // Extract key boolean features compactly
            $feats = [];
            $df = $c['description_features'] ?? [];
            if (is_array($df)) {
                if (!empty($df['balcony'])) $feats[] = 'balcony';
                if (!empty($df['garden'])) $feats[] = 'garden';
                if (!empty($df['elevator'])) $feats[] = 'elevator';
                if (!empty($df['air_conditioning'])) $feats[] = 'AC';
                if (!empty($df['bright'])) $feats[] = 'bright';
                if (!empty($df['quiet'])) $feats[] = 'quiet';
                if (!empty($df['parking'])) $feats[] = $df['parking'] . '-parking';
                if (!empty($df['condition'])) $feats[] = $df['condition'];
            }
            $featStr = $feats ? implode(',', $feats) : '-';

            $lines[] = "ID:{$id}|{$price}PLN|{$area}m²|{$rooms}r|{$district}|{$featStr}";
        }
        return implode("\n", $lines);
    }
}
