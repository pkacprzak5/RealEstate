# User Journeys

## Journey 1: Structured Search — "Family looking for a 3-room flat in Krowodrza"

1. **Land on homepage** — User sees all 100 listings in grid view, sorted by newest.

2. **Set property type** — Clicks "Mieszkanie" in the filter sidebar. Page reloads with only flats (~50 listings). Active filter chip appears: "Typ: Mieszkanie".

3. **Set room count** — Selects "3" in both "Od" and "Do" room dropdowns. Results narrow to 3-room flats. An area suggestion banner appears: *"Typowa powierzchnia dla 3-pokojowych to 55–85 m²"*.

4. **Apply area suggestion** — Clicks "Dodaj filtr metrażu". Area range filters are populated automatically from real listing data (P10–P90 percentiles). Filter chips update.

5. **Filter by district** — Selects "Krowodrza" from the district dropdown. Results narrow further (includes sub-districts like Łobzów, Azory).

6. **Sort by price** — Changes sort to "Cena rosnąco" to see cheapest options first.

7. **Check map** — Clicks "Mapa" toggle. Sees remaining listings as pins on the Leaflet map centered on Kraków. Clicks a marker to see a popup with title, price, and area.

8. **Open listing** — Clicks a listing card (or popup link). Lands on the detail page with:
   - Image gallery (arrows to browse, click to open lightbox)
   - Key facts: 65 m², 3 pokoje, piętro 3/5, Krowodrza
   - Full description from Otodom
   - Location map showing exact position
   - Source link to original Otodom listing

9. **Return to results** — Clicks "← Wróć do wyników". All filters are preserved.

---

## Journey 2: AI Conversational Search — "Young professional looking for a quiet flat with a balcony near a park"

1. **Open AI Search** — User opens the AI Search panel on the listings page.

2. **Describe what they want** — Types: *"Szukam spokojnego mieszkania z balkonem w okolicy parku, najlepiej 2 pokoje, do wynajęcia"*.

3. **Clarifying question** — The AI detects low confidence (no budget specified) and asks: *"Jaki masz budżet miesięczny na wynajem?"*. User replies: *"do 3000 zł"*.

4. **See ranked recommendations** — The AI returns the top 5 matching listings, each with:
   - A match score (e.g., 0.87)
   - A Polish explanation: *"Spokojne mieszkanie na Dębnikach z balkonem, blisko Parku Zakrzówek. 2 pokoje, 2400 zł/mies."*
   - Key details: price, area, rooms, district

5. **Explore a recommendation** — Clicks through to the detail page. Reviews the gallery, description, and map. Notes the source link for contacting the landlord.

6. **Return and try again** — Goes back, refines the query: *"A może coś na Kazimierzu?"*. The AI re-ranks based on the updated preference.

**What makes this different:** The user never touched a single filter dropdown. They described their lifestyle needs ("quiet", "balcony", "near a park") and the AI matched those against features extracted from Polish descriptions — nearby POIs, amenities, noise indicators.

