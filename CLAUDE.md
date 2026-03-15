# Project operating guide

## Mission
Build a strong take-home submission for a simplified smart real-estate listings platform.

Primary goals, in order:
1. Strong reasoning and defendable tradeoffs
2. Clean, realistic MVP scope
3. Correct ingestion + normalization + persistence
4. Clear browse/search/details flow
5. Public, clickable deployment
6. Clean code and readable docs

## Assignment defaults
Unless explicitly changed, assume:
- City: Kraków
- Listing segment: flats/apartments
- Market: sale
- Target corpus size: about 100 listings
- Backend: Laravel
- Database: MySQL (Railway addon)
- Frontend: Inertia + React + TypeScript
- Styling: Tailwind
- Deployment target: Railway
- Product/demo language: English UI, source content may remain Polish where appropriate

## Interaction policy
Treat the user as technically strong.

Ask questions when the answer materially affects:
- architecture
- UX scope
- source choice or source legality/reliability
- cost
- deployment/public visibility
- evaluation strategy for the take-home

Do not ask for routine defaults if a strong recommendation exists.
When a technical decision is worth surfacing, provide:
- the recommendation
- the strongest alternative
- the tradeoff in 3-6 lines
Then proceed unless blocked.

Do not ask repeated clarification questions for things already decided in this file or earlier in the session.

## Working style
Always work in this order:
1. frame the problem
2. define the MVP
3. choose source + ingestion approach
4. define data model
5. design the UX in Pencil before frontend implementation
6. write a concrete implementation plan
7. execute in small reviewed batches
8. prepare deployment
9. prepare submission docs and demo script

Keep a running decision log in the conversation and in project docs.

## Scope guardrails
Prefer one narrow, defensible vertical slice over breadth.

Prefer:
- one city
- one listing source
- one listing segment
- deterministic normalization first
- lightweight search/filtering first
- one or two clearly justified AI features
- straightforward deployment

Avoid unless clearly necessary:
- multi-source ingestion
- multi-city complexity
- vector databases
- agentic loops inside the app
- clever ranking systems with weak justification
- infra that is difficult to explain in an interview

## Source and ingestion expectations
The source must be:
- public
- realistically acquirable
- rich enough to extract meaningful fields
- fast enough to deliver about 100 listings for the MVP

Always preserve provenance for each imported listing:
- source name
- source URL
- external listing identifier if present
- imported_at timestamp
- raw payload or normalized raw text snapshot when useful

Prefer an importer that can be re-run safely.
Always define duplicate handling and missing-field handling.

## Data modeling expectations
Normalize the data enough to show engineering judgment, but do not over-model.

Expected fields unless the chosen source makes them impossible:
- title
- description
- price and currency
- area
- rooms
- district / neighborhood when available
- street or coarse location when safe/available
- listing type / market type
- source URL
- thumbnail / image URL when available
- published date when available
- normalization status / confidence where useful

## AI usage policy
AI is optional in this assignment, so every AI feature must be intentional and explainable.

Approved AI use cases:
- convert vague natural-language intent into structured filters or ranking hints
- clean or summarize messy descriptions
- assist low-confidence normalization only when deterministic parsing is weak

Every AI feature must have:
- a clear product or data-quality benefit
- deterministic fallback behavior
- logging or traceability of what happened
- a concise explanation suitable for the 1-page reasoning document

Do not use AI where deterministic code is simpler and more defensible.

## Frontend expectations
Use Inertia + React + TypeScript.

Before writing UI code:
- produce Pencil wireframes or a wireframe-level UX spec
- define route map
- define page/component tree
- define data contract per page
- define empty/loading/error states
- define responsive behavior

Keep the UI clean and plain.
Prioritize clarity and usability over polish.

## Search expectations
Implement a simple, defendable search first.

Preferred order:
1. structured filters + keyword search
2. sensible sorting
3. optional natural-language entry point that maps to structured intent

Do not introduce heavyweight search infrastructure unless absolutely necessary.

## Testing and verification
Prefer targeted tests over broad shallow coverage.

Always verify:
- importer works on sample data
- normalization handles missing/messy fields
- duplicate strategy is correct
- listings page works
- search/filter flow works
- details page works
- production build works
- deployment steps are documented

## Deployment expectations
Prepare for a temporary public, clickable deployment.
Default target is Railway for the app and Railway MySQL addon for the database.

Deployment is not complete unless:
- required env vars are documented
- migrations are accounted for
- production app boot command is correct
- asset build strategy is correct
- MySQL connection settings are correct for Laravel
- data import/seed strategy is defined for the deployed environment
- smoke checks are listed
- the app is realistically one credential/login step away from public availability if secrets are missing

Optimize for:
- low cost
- temporary demo readiness
- easy public access
- minimal ops burden

Do not optimize for long-term production scale unless it materially helps the take-home.

## Submission packaging
Before finishing, always produce:
- a concise README
- a 1-page reasoning document
- 2 example user journeys
- a short demo script
- known limitations
- explicit future improvements

The 1-page reasoning document matters more than feature count.
Optimize for a solution that is easy to defend in an interview.