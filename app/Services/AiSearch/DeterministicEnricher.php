<?php

namespace App\Services\AiSearch;

use App\Models\Listing;

/**
 * Deterministic listing enrichment using keyword extraction from Polish descriptions.
 * No LLM calls — parses Polish real-estate vocabulary directly.
 */
class DeterministicEnricher
{
    private const CONDITION_KEYWORDS = [
        'do remontu' => 'needs-renovation',
        'do odświeżenia' => 'needs-renovation',
        'wymaga remontu' => 'needs-renovation',
        'stan deweloperski' => 'developer-state',
        'stan surowy' => 'developer-state',
        'do adaptacji' => 'developer-state',
        'po generalnym remoncie' => 'renovated',
        'po remoncie' => 'renovated',
        'wyremontowane' => 'renovated',
        'wyremontowany' => 'renovated',
        'odnowione' => 'renovated',
        'świeżo' => 'renovated',
        'nowe budownictwo' => 'new',
        'nowy budynek' => 'new',
        'nowe mieszkanie' => 'new',
        'z rynku pierwotnego' => 'new',
        'rynek pierwotny' => 'new',
        'bardzo dobrym stanie' => 'good',
        'dobry stan' => 'good',
        'dobrym stanie' => 'good',
        'zadbane' => 'good',
        'zadbany' => 'good',
        'gotowe do zamieszkania' => 'good',
        'do zamieszkania' => 'good',
    ];

    private const HEATING_KEYWORDS = [
        'ogrzewanie miejskie' => 'central',
        'c.o. miejskie' => 'central',
        'c.o. z sieci' => 'central',
        'sieci miejskiej' => 'central',
        'centralne ogrzewanie' => 'central',
        'ogrzewanie centralne' => 'central',
        'c.o.' => 'central',
        'ogrzewanie gazowe' => 'gas',
        'piec gazowy' => 'gas',
        'piecyk gazowy' => 'gas',
        'kocioł gazowy' => 'gas',
        'ogrzewanie elektryczne' => 'electric',
        'podłogowe' => 'underfloor',
        'ogrzewanie indywidualne' => 'individual',
        'ogrzewanie własne' => 'individual',
    ];

    private const PARKING_KEYWORDS = [
        'garaż podziemny' => 'underground',
        'hala garażowa' => 'underground',
        'miejsce w hali' => 'underground',
        'parking podziemny' => 'underground',
        'miejsce postojowe podziemne' => 'underground',
        'garaż' => 'garage',
        'miejsce w garażu' => 'garage',
        'parking naziemny' => 'outdoor',
        'miejsce parkingowe' => 'outdoor',
        'miejsce postojowe' => 'outdoor',
        'parking' => 'outdoor',
        'parkowania' => 'outdoor',
        'parkowanie' => 'outdoor',
    ];

    private const KITCHEN_KEYWORDS = [
        'aneks kuchenny' => 'open',
        'aneksem kuchennym' => 'open',
        'kuchnia otwarta' => 'open',
        'otwarta kuchnia' => 'open',
        'salon z aneksem' => 'open',
        'salon z kuchnią' => 'open',
        'kuchnia oddzielna' => 'separate',
        'oddzielna kuchnia' => 'separate',
        'osobna kuchnia' => 'separate',
        'jasna kuchnia' => 'separate',
        'jasnej kuchni' => 'separate',
        'kuchni' => 'separate',
        'kuchnia' => 'separate',
    ];

    private const BOOLEAN_FEATURES = [
        'balcony' => ['balkon', 'balkonem', 'balkonu', 'balkon francuski', 'loggia', 'loggią', 'taras', 'tarasem'],
        'garden' => ['ogród', 'ogrodem', 'ogródek', 'ogródkiem', 'działka'],
        'elevator' => ['winda', 'windą', 'windy'],
        'storage' => ['piwnica', 'piwnicą', 'piwnicy', 'piwnice', 'komórka lokatorska', 'schowek'],
        'air_conditioning' => ['klimatyzacja', 'klimatyzacją', 'klimatyzację', 'klimatyzowany'],
        'furnished' => ['umeblowane', 'umeblowany', 'meble w cenie', 'w pełni wyposażone', 'wyposażone', 'wyposażony'],
        'bright' => ['jasne', 'jasny', 'jasna', 'doświetlone', 'doświetlony', 'słoneczne', 'słoneczny', 'nasłonecznione', 'nasłoneczniony'],
        'quiet' => ['spokojne', 'spokojny', 'spokojna', 'cisza', 'cicha', 'cichy', 'ciche'],
        'green_area_nearby' => ['park', 'parku', 'parkiem', 'zieleń', 'zieleni', 'zielona', 'zielone', 'bulwary', 'planty', 'las', 'lasu'],
        'public_transport_nearby' => ['tramwaj', 'tramwaju', 'tramwajowy', 'autobus', 'autobusu', 'przystanek', 'przystanku', 'komunikacja', 'komunikacji', 'mpk', 'kolej', 'ska'],
    ];

    /**
     * Specific detail extractors that produce richer notable features.
     * Each entry: [regex pattern => label template].
     * $1, $2 etc. in the label are replaced with matched groups.
     */
    private const SPECIFIC_EXTRACTIONS = [
        // Exposure / orientation
        '/ekspozycj\w*\s+(?:okien\s+)?(?:na\s+)?(północ|południe|wschód|zachód|południow|północn|wschodni|zachodni)[\w\s,]*/u' => 'exposure',
        // Balcony/terrace size
        '/(?:balkon|taras|loggia)\w*\s+(?:o\s+)?(?:pow\.?\s*)?(\d+[.,]?\d*)\s*m/u' => 'outdoor_area',
        // Garden size
        '/(?:ogr[óo]d\w*|działk\w*)\s+(?:o\s+)?(?:pow\.?\s*)?(\d+[.,]?\d*)\s*m/u' => 'garden_area',
        // Storage/basement size
        '/piwnic\w*\s+(?:o\s+)?(?:pow\.?\s*)?(\d+[.,]?\d*)\s*m/u' => 'storage_area',
        // Admin fee / czynsz
        '/czynsz\w*\s+(?:ok\.?\s*)?(\d[\d\s]*)\s*(?:zł|pln)/iu' => 'admin_fee',
        // Currently rented
        '/(?:wynajęt|wynajmowane|aktualnie.*najm)/u' => 'currently_rented',
        // Duplex / two-level
        '/(?:dwupoziomow|duplex|antresol|dwa poziomy|dwóch poziom)/u' => 'duplex',
        // French balcony
        '/balkon\w*\s+francusk/u' => 'french_balcony',
        // Ceiling height
        '/wysoko[śsc]\w*\s+(?:pomieszczeń\s+)?(\d[.,]\d+)\s*m/u' => 'ceiling_height',
        // Number of bathrooms
        '/(\d)\s*(?:łazienk|toalet)/u' => 'bathrooms',
        // Walk-in closet / garderoba
        '/garderob/u' => 'walk_in_closet',
        // Photovoltaics / EV
        '/fotowoltai/u' => 'photovoltaics',
        '/ładowark\w+\s+(?:do\s+)?(?:samochod|ev|elektr)/u' => 'ev_charging',
        // Specific nearby landmarks (extract the actual name)
        '/(?:blisko|w pobliżu|sąsiedztwie|przy)\s+(?:do\s+)?([A-ZĄĆĘŁŃÓŚŻŹ][\wąćęłńóśżźĄĆĘŁŃÓŚŻŹ\s]+(?:Park\w*|Bulwar\w*|Ryn\w*|Uniwersytet\w*|AGH|Politechnik\w*|Wawel\w*|Wisł\w*|Plac\w*|Błoni\w*|Galeri\w*))/u' => 'nearby_landmark',
    ];

    public function enrich(Listing $listing): ?array
    {
        $raw = $listing->description;
        if (!$raw || trim(strip_tags($raw)) === '') {
            return null;
        }

        $text = strip_tags($raw);
        $textLower = mb_strtolower($text);

        $features = $this->extractFeatures($textLower);
        $specifics = $this->extractSpecificDetails($text, $textLower);
        $features['notable'] = $this->buildNotableList($textLower, $specifics);
        $summary = $this->generateSummary($listing, $features, $specifics);

        return [
            'summary' => $summary,
            'features' => $features,
        ];
    }

    private function extractFeatures(string $text): array
    {
        $features = [
            'condition' => $this->matchFirst($text, self::CONDITION_KEYWORDS),
            'balcony' => null,
            'garden' => null,
            'parking' => $this->matchFirst($text, self::PARKING_KEYWORDS),
            'elevator' => null,
            'storage' => null,
            'air_conditioning' => null,
            'furnished' => null,
            'bright' => null,
            'quiet' => null,
            'green_area_nearby' => null,
            'public_transport_nearby' => null,
            'year_built' => $this->extractYearBuilt($text),
            'heating' => $this->matchFirst($text, self::HEATING_KEYWORDS),
            'kitchen_type' => $this->matchFirst($text, self::KITCHEN_KEYWORDS),
            'notable' => [],
        ];

        foreach (self::BOOLEAN_FEATURES as $feature => $keywords) {
            foreach ($keywords as $kw) {
                if (mb_strpos($text, $kw) !== false) {
                    $features[$feature] = true;
                    break;
                }
            }
        }

        // Negation detection
        if (mb_strpos($text, 'bez windy') !== false || mb_strpos($text, 'brak windy') !== false) {
            $features['elevator'] = false;
        }
        if (mb_strpos($text, 'bez balkonu') !== false || mb_strpos($text, 'brak balkonu') !== false) {
            $features['balcony'] = false;
        }

        return $features;
    }

    /**
     * Extract specific measurable details from the description.
     */
    private function extractSpecificDetails(string $text, string $textLower): array
    {
        $details = [];

        // Exposure directions
        $dirMap = [
            'północ' => 'north', 'północn' => 'north',
            'południe' => 'south', 'południow' => 'south',
            'wschód' => 'east', 'wschodni' => 'east',
            'zachód' => 'west', 'zachodni' => 'west',
        ];
        if (preg_match_all('/(?:ekspozycj\w*|okn\w+|strony)\s+(?:na\s+)?((?:(?:północ|południe|wschód|zachód|południow|północn|wschodni|zachodni)\w*[\s,iora]*)+)/u', $textLower, $exposureMatches)) {
            $dirs = [];
            foreach ($exposureMatches[1] as $match) {
                foreach ($dirMap as $pl => $en) {
                    if (mb_strpos($match, $pl) !== false) {
                        $dirs[] = $en;
                    }
                }
            }
            if ($dirs) {
                $details['exposure'] = array_values(array_unique($dirs));
            }
        }

        // Balcony/terrace area
        if (preg_match('/(?:balkon|taras|loggia)\w*\s+(?:o\s+)?(?:pow\.?\s*)?(\d+[.,]?\d*)\s*m/u', $textLower, $m)) {
            $details['outdoor_area_m2'] = (float) str_replace(',', '.', $m[1]);
        }

        // Garden area
        if (preg_match('/(?:ogr[óo]d\w*|działk\w*)\s+(?:o\s+)?(?:pow\.?\s*)?(\d+[.,]?\d*)\s*m/u', $textLower, $m)) {
            $details['garden_area_m2'] = (float) str_replace(',', '.', $m[1]);
        }

        // Storage area
        if (preg_match('/piwnic\w*\s+(?:o\s+)?(?:pow\.?\s*)?(\d+[.,]?\d*)\s*m/u', $textLower, $m)) {
            $details['storage_area_m2'] = (float) str_replace(',', '.', $m[1]);
        }

        // Admin fee
        if (preg_match('/czynsz\w*\s+(?:ok\.?\s*|około\s+)?(\d[\d\s,.]*\d)\s*(?:zł|pln)/iu', $textLower, $m)) {
            $details['admin_fee_pln'] = (int) preg_replace('/\D/', '', $m[1]);
        }

        // Ceiling height
        if (preg_match('/wysoko[śsc]\w*\s+(?:pomieszczeń\s+)?(\d[.,]\d+)\s*m/u', $textLower, $m)) {
            $details['ceiling_height_m'] = (float) str_replace(',', '.', $m[1]);
        }

        // Number of bathrooms
        if (preg_match('/(\d)\s*(?:łazienk|toalet)/u', $textLower, $m)) {
            $val = (int) $m[1];
            if ($val >= 2) {
                $details['bathrooms'] = $val;
            }
        }

        // Duplex
        if (preg_match('/(?:dwupoziomow|duplex|dwa poziomy|dwóch poziom)/u', $textLower)) {
            $details['duplex'] = true;
        }

        // French balcony
        if (mb_strpos($textLower, 'balkon') !== false && mb_strpos($textLower, 'francusk') !== false) {
            $details['french_balcony'] = true;
        }

        // Walk-in closet
        if (mb_strpos($textLower, 'garderob') !== false) {
            $details['walk_in_closet'] = true;
        }

        // Currently rented
        if (preg_match('/(?:wynajęt|wynajmowane|aktualnie\s+\w*najm)/u', $textLower)) {
            $details['currently_rented'] = true;
        }

        // Building material
        if (preg_match('/(?:technologi\w+\s+)?tradycyjn\w+\s+z\s+cegł/u', $textLower) || mb_strpos($textLower, 'z cegły') !== false) {
            $details['building_material'] = 'brick';
        } elseif (mb_strpos($textLower, 'wielka płyta') !== false) {
            $details['building_material'] = 'prefabricated panel';
        }

        // Specific appliances mentioned
        $appliances = [];
        $applianceMap = [
            'zmywark' => 'dishwasher', 'pralka' => 'washing machine', 'pralki' => 'washing machine',
            'lodówk' => 'fridge', 'piekarnik' => 'oven', 'kuchenk' => 'stove',
            'indukcj' => 'induction hob', 'okap' => 'range hood',
            'suszark' => 'dryer', 'mikrofalów' => 'microwave',
        ];
        foreach ($applianceMap as $kw => $label) {
            if (mb_strpos($textLower, $kw) !== false) {
                $appliances[] = $label;
            }
        }
        if ($appliances) {
            $details['appliances'] = $appliances;
        }

        // Flooring
        if (mb_strpos($textLower, 'parkiet') !== false || mb_strpos($textLower, 'podłoga drewnian') !== false) {
            $details['flooring'] = 'hardwood/parquet';
        } elseif (mb_strpos($textLower, 'panele') !== false) {
            $details['flooring'] = 'laminate panels';
        }

        // Photovoltaics / EV
        if (mb_strpos($textLower, 'fotowoltai') !== false) {
            $details['photovoltaics'] = true;
        }
        if (preg_match('/ładowark\w+.*(?:samochod|ev|elektr)/u', $textLower) || mb_strpos($textLower, 'stacj') !== false && mb_strpos($textLower, 'ładowan') !== false) {
            $details['ev_charging'] = true;
        }

        // Specific nearby POIs (extract actual names from original case text)
        $details['nearby_pois'] = $this->extractNearbyPois($text);

        return $details;
    }

    /**
     * Extract named places/landmarks from the text.
     */
    private function extractNearbyPois(string $text): array
    {
        $pois = [];

        $knownPlaces = [
            'Rynek Główny' => 'Main Market Square',
            'Stare Miasto' => 'Old Town',
            'Kazimierz' => 'Kazimierz district',
            'Wawel' => 'Wawel Castle',
            'Planty' => 'Planty Park',
            'Błonia' => 'Błonia meadows',
            'Park Jordana' => 'Jordan Park',
            'Bulwary Wiślane' => 'Vistula Boulevards',
            'Bulwary' => 'Vistula Boulevards',
            'Wisła' => 'Vistula river',
            'Wisły' => 'Vistula river',
            'Galeria Krakowska' => 'Galeria Krakowska shopping mall',
            'Galeria Bonarka' => 'Bonarka City Center mall',
            'Bonarka' => 'Bonarka City Center',
            'AGH' => 'AGH University of Science and Technology',
            'Uniwersytet Jagielloński' => 'Jagiellonian University',
            'UJ' => 'Jagiellonian University',
            'Politechnika Krakowska' => 'Kraków University of Technology',
            'Nowa Huta' => 'Nowa Huta',
            'Kopiec Kościuszki' => 'Kościuszko Mound',
            'Kopiec Krakusa' => 'Krakus Mound',
            'Las Wolski' => 'Wolski Forest',
            'Park Bednarskiego' => 'Bednarski Park',
            'Park Lotników' => 'Aviators\' Park',
            'Zakrzówek' => 'Zakrzówek lagoon',
            'Kurdwanów' => 'Kurdwanów',
            'Łagiewniki' => 'Łagiewniki',
            'A4' => 'A4 highway',
            'autostrad' => 'highway access',
            'lotnisk' => 'airport',
            'Balice' => 'Kraków Airport',
        ];

        foreach ($knownPlaces as $pl => $en) {
            if (mb_strpos($text, $pl) !== false) {
                $pois[$en] = true;
            }
        }

        return array_keys($pois);
    }

    /**
     * Build the notable features array from generic keywords + specific details.
     */
    private function buildNotableList(string $textLower, array $specifics): array
    {
        $notable = [];

        // Specific details first (higher quality)
        if (!empty($specifics['duplex'])) {
            $notable[] = 'Duplex / two-level apartment';
        }
        if (!empty($specifics['french_balcony'])) {
            $notable[] = 'French balcony';
        }
        if (!empty($specifics['walk_in_closet'])) {
            $notable[] = 'Walk-in closet';
        }
        if (!empty($specifics['currently_rented'])) {
            $notable[] = 'Currently rented (investment opportunity)';
        }
        if (!empty($specifics['photovoltaics'])) {
            $notable[] = 'Photovoltaics for common areas';
        }
        if (!empty($specifics['ev_charging'])) {
            $notable[] = 'EV charging station';
        }
        if (!empty($specifics['building_material'])) {
            $notable[] = ucfirst($specifics['building_material']) . ' construction';
        }
        if (!empty($specifics['flooring'])) {
            $notable[] = ucfirst($specifics['flooring']) . ' floors';
        }
        if (!empty($specifics['ceiling_height_m']) && $specifics['ceiling_height_m'] >= 2.8) {
            $notable[] = "High ceilings ({$specifics['ceiling_height_m']}m)";
        }
        if (!empty($specifics['bathrooms']) && $specifics['bathrooms'] >= 2) {
            $notable[] = "{$specifics['bathrooms']} bathrooms";
        }
        if (!empty($specifics['admin_fee_pln'])) {
            $notable[] = "Administrative fee: {$specifics['admin_fee_pln']} PLN/month";
        }
        if (!empty($specifics['appliances'])) {
            $notable[] = 'Kitchen equipped with ' . implode(', ', $specifics['appliances']);
        }

        // Named POIs
        foreach ($specifics['nearby_pois'] ?? [] as $poi) {
            $notable[] = "Near {$poi}";
        }

        // Generic keyword-based notable features (only what's not already covered)
        $genericKeywords = [
            'widok' => 'Scenic view',
            'panoram' => 'Panoramic view',
            'rower' => 'Bicycle storage/paths nearby',
            'plac zabaw' => 'Playground nearby',
            'monitoring' => 'Security monitoring',
            'ochrona' => '24/7 security',
            'domofon' => 'Intercom system',
            'videodomofon' => 'Video intercom',
            'wideofon' => 'Video intercom',
            'światłowód' => 'Fiber optic internet',
            'kominek' => 'Fireplace',
            'antresol' => 'Mezzanine',
            'patio' => 'Patio',
            'dwustronn' => 'Dual-aspect (windows on two sides)',
            'narożn' => 'Corner apartment',
            'wysoki standard' => 'High standard finish',
            'luksus' => 'Luxury finish',
            'premium' => 'Premium finish',
            'inwestyc' => 'Suitable for investment',
            'rekuperac' => 'Mechanical ventilation with heat recovery',
            'smart' => 'Smart home features',
            'inteligent' => 'Smart home features',
            'jacuzzi' => 'Jacuzzi',
            'saun' => 'Sauna',
            'basen' => 'Swimming pool / pool nearby',
            'siłowni' => 'Gym / fitness nearby',
        ];

        $existingLower = mb_strtolower(implode(' ', $notable));
        foreach ($genericKeywords as $keyword => $label) {
            if (mb_strpos($textLower, $keyword) !== false && mb_strpos($existingLower, mb_strtolower($label)) === false) {
                $notable[] = $label;
            }
        }

        return array_values(array_unique($notable));
    }

    private function matchFirst(string $text, array $keywordMap): ?string
    {
        uksort($keywordMap, fn ($a, $b) => mb_strlen($b) - mb_strlen($a));

        foreach ($keywordMap as $keyword => $value) {
            if (mb_strpos($text, $keyword) !== false) {
                return $value;
            }
        }

        return null;
    }

    private function extractYearBuilt(string $text): ?int
    {
        $patterns = [
            '/(?:rok budowy|rocznik|budow\w*|z roku|z)\s*(\d{4})\b/u',
            '/(\d{4})\s*(?:rok|roku|r\.)/u',
            '/oddanie\s*(?:do użytku\s*)?(?:w\s*)?(?:(?:I|II|III|IV)\s*(?:kwartał|kw)\.?\s*)?(\d{4})/u',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m)) {
                $year = (int) $m[1];
                if ($year >= 1800 && $year <= 2030) {
                    return $year;
                }
            }
        }

        return null;
    }

    /**
     * Generate a rich English summary that reads like the Gemini-produced ones.
     */
    private function generateSummary(Listing $listing, array $features, array $specifics): string
    {
        $parts = [];

        // --- Sentence 1: Core identity (type, layout, location, building context) ---
        $type = $this->translatePropertyType($listing->property_type);
        $rooms = $listing->rooms ? "{$listing->rooms}-room" : null;
        $area = $listing->area_m2 ? number_format((float) $listing->area_m2, 0) . ' m²' : null;

        $district = $listing->district;
        $street = $listing->street;

        // Build location string with Kraków context
        $locParts = [];
        if ($street) $locParts[] = $street;
        if ($district) $locParts[] = "Kraków's {$district} district";
        elseif (!$street) $locParts[] = 'Kraków';
        $location = implode(', ', $locParts);

        // Condition/year inline
        $conditionInline = '';
        if ($features['condition']) {
            $condLabel = match ($features['condition']) {
                'needs-renovation' => 'offered for renovation',
                'developer-state' => 'in developer state',
                'renovated' => 'recently renovated',
                'new' => 'newly built',
                'good' => 'in good condition',
                default => '',
            };
            $conditionInline = $condLabel ? ", {$condLabel}" : '';
        }

        $yearInline = '';
        if ($features['year_built']) {
            $yearInline = $features['condition'] === 'new' || $features['year_built'] >= 2020
                ? " ({$features['year_built']})"
                : ", built in {$features['year_built']}";
        }

        $sizeDesc = implode(', ', array_filter([$rooms, $area]));
        if (!empty($specifics['duplex'])) {
            $type = "duplex {$type}";
        }

        // Use "on" for streets (ul., al.), "in" for districts/estates (os.)/city
        $isStreet = $street && preg_match('/^(ul\.|al\.|aleja|ulica|\d)/i', $street);
        $locPrep = ($street && $isStreet) ? 'on' : 'in';
        $opening = "This {$sizeDesc} {$type}{$conditionInline}{$yearInline} is located {$locPrep} {$location}.";
        $parts[] = trim(preg_replace('/\s+/', ' ', $opening));

        // --- Sentence 2: Floor + layout + key spatial details ---
        $layoutDetails = [];

        $floor = $listing->floor;
        $totalFloors = $listing->building_floors;
        if ($floor !== null && $totalFloors !== null) {
            $floorLabel = $floor == 0 ? 'the ground floor' : "floor {$floor}";
            $buildingDesc = $totalFloors <= 4 ? "a {$totalFloors}-storey building" : "a {$totalFloors}-storey block";
            if (!empty($specifics['building_material'])) {
                $buildingDesc = "a {$specifics['building_material']} {$totalFloors}-storey building";
            }
            $layoutDetails[] = "situated on {$floorLabel} of {$buildingDesc}";
        } elseif ($floor !== null) {
            $floorLabel = $floor == 0 ? 'the ground floor' : "floor {$floor}";
            $layoutDetails[] = "situated on {$floorLabel}";
        }

        // Kitchen and layout
        if ($features['kitchen_type'] === 'open') {
            $layoutDetails[] = 'features an open-plan kitchen/living area';
        } elseif ($features['kitchen_type'] === 'separate') {
            $layoutDetails[] = 'has a separate kitchen';
        }

        // Exposure and ceiling as a separate sentence to avoid grammar issues
        $spatialDetails = [];
        if (!empty($specifics['exposure'])) {
            $dirs = implode('-', $specifics['exposure']);
            $spatialDetails[] = "{$dirs} exposure";
        }
        if (!empty($specifics['ceiling_height_m'])) {
            $spatialDetails[] = "{$specifics['ceiling_height_m']}m ceiling height";
        }

        if ($layoutDetails) {
            $joined = $this->naturalJoin($layoutDetails);
            $startsWithVerb = preg_match('/^(has |features |situated )/i', $joined);
            $parts[] = ($startsWithVerb ? 'It ' : 'It is ') . $joined . '.';
        }

        if ($spatialDetails) {
            $parts[] = 'The apartment has ' . $this->naturalJoin($spatialDetails) . '.';
        }

        // --- Sentence 3: Key amenities + outdoor spaces with specifics ---
        $amenityPhrases = [];

        if ($features['balcony'] === true) {
            if (!empty($specifics['french_balcony'])) {
                $amenityPhrases[] = 'a French balcony';
            } elseif (!empty($specifics['outdoor_area_m2'])) {
                $amenityPhrases[] = "a {$specifics['outdoor_area_m2']} m² balcony";
            } else {
                $amenityPhrases[] = 'a balcony';
            }
        }
        if ($features['garden'] === true) {
            if (!empty($specifics['garden_area_m2'])) {
                $amenityPhrases[] = "a {$specifics['garden_area_m2']} m² garden";
            } else {
                $amenityPhrases[] = 'a garden';
            }
        }
        if ($features['elevator'] === true) $amenityPhrases[] = 'elevator access';
        if ($features['storage'] === true) {
            if (!empty($specifics['storage_area_m2'])) {
                $amenityPhrases[] = "a {$specifics['storage_area_m2']} m² storage unit";
            } else {
                $amenityPhrases[] = 'a storage unit';
            }
        }
        if ($features['air_conditioning'] === true) $amenityPhrases[] = 'air conditioning';
        if ($features['parking']) {
            $amenityPhrases[] = $features['parking'] . ' parking';
        }
        if (!empty($specifics['walk_in_closet'])) $amenityPhrases[] = 'a walk-in closet';

        if ($amenityPhrases) {
            $parts[] = 'It offers ' . $this->naturalJoin($amenityPhrases) . '.';
        }

        // --- Sentence 4: Atmosphere and surroundings ---
        $atmospherePhrases = [];
        if ($features['bright'] === true) $atmospherePhrases[] = 'bright and well-lit';
        if ($features['quiet'] === true) $atmospherePhrases[] = 'in a quiet area';

        $surroundings = [];
        if ($features['green_area_nearby'] === true) {
            // Use specific POI if available
            $greenPois = array_filter($specifics['nearby_pois'] ?? [], fn ($p) => preg_match('/park|garden|forest|meadow|boulevard/i', $p));
            if ($greenPois) {
                $surroundings[] = 'near ' . $this->naturalJoin(array_values($greenPois));
            } else {
                $surroundings[] = 'surrounded by green areas';
            }
        }
        if ($features['public_transport_nearby'] === true) {
            $surroundings[] = 'with excellent public transport access';
        }

        $combined = array_merge($atmospherePhrases, $surroundings);
        if ($combined) {
            $parts[] = 'The property is ' . $this->naturalJoin($combined) . '.';
        }

        // --- Sentence 5: Unique selling points (admin fee, appliances, rented, etc.) ---
        $extras = [];
        if (!empty($specifics['admin_fee_pln'])) {
            $extras[] = "the administrative fee is {$specifics['admin_fee_pln']} PLN/month";
        }
        if (!empty($specifics['currently_rented'])) {
            $extras[] = 'the property is currently rented (suitable for investors)';
        }
        if ($features['furnished'] === true) {
            $extras[] = 'it comes fully furnished';
        }
        if (!empty($specifics['appliances']) && count($specifics['appliances']) >= 2) {
            $extras[] = 'the kitchen is equipped with ' . $this->naturalJoin($specifics['appliances']);
        }

        if ($extras) {
            $extraSentence = ucfirst($extras[0]);
            if (count($extras) > 1) {
                $extraSentence .= ', and ' . $extras[1];
            }
            $parts[] = $extraSentence . '.';
        }

        return implode(' ', $parts);
    }

    private function translatePropertyType(?string $type): string
    {
        return match ($type) {
            'apartment' => 'apartment',
            'house' => 'house',
            'room' => 'room',
            'studio' => 'studio',
            default => 'property',
        };
    }

    private function naturalJoin(array $items): string
    {
        $items = array_values($items);
        if (count($items) <= 1) {
            return implode('', $items);
        }

        $last = array_pop($items);
        return implode(', ', $items) . ' and ' . $last;
    }
}
