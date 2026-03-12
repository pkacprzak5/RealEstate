---
name: source-selection-and-ingestion
description: Choose the listing source, define ingestion, normalization, duplicate handling, and provenance rules for the real-estate dataset.
user-invocable: false
---

Use this skill whenever choosing a data source, scraping/importing listings, defining the schema, or handling raw listing data.

## Mission
Acquire about 100 listings from a public source in the fastest credible way, while preserving provenance and making normalization easy to explain.

## Source selection checklist
Prefer a source that scores well on:
- public accessibility
- low anti-bot friction
- stable HTML or API structure
- rich fields
- clear listing URLs
- realistic time-to-first-import
- repeatable import flow

If multiple sources are possible, recommend one and briefly compare it against the next best alternative.

## Required provenance fields
For every imported listing, preserve:
- source_name
- source_url
- external_id if available
- imported_at
- raw_snapshot or raw_text when useful for debugging/traceability

## Importer rules
Prefer:
- a single Laravel artisan command for import
- idempotent or near-idempotent behavior
- explicit duplicate detection
- explicit logging of failures/skips
- safe re-run behavior

## Normalization strategy
Use deterministic parsing first.

Normalize into the most interview-defensible set of fields:
- title
- description
- price
- currency
- area_m2
- rooms
- location_text
- district / neighborhood if available
- market_type
- property_type
- image_url / thumbnail_url when available
- published_at when available
- source_url
- external_id
- normalization_status
- normalization_confidence when appropriate

## Missing data handling
Never hide uncertainty.
For each field:
- parse if reliable
- leave null if not reliable
- record why if the pipeline tracks parse notes/confidence

Do not hallucinate values from weak text hints.

## Duplicate strategy
Prefer a layered duplicate approach:
1. exact external_id match
2. exact source_url match
3. normalized fingerprint fallback using stable attributes such as price + area + location + title similarity

Document the final duplicate rule in the reasoning doc.

## Deliverables whenever this skill is active
Produce:
- source recommendation
- import plan
- normalized field map
- duplicate strategy
- missing-field strategy
- risks and fallback source