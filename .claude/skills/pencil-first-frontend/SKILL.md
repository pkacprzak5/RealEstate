---
name: pencil-first-frontend
description: Force wireframe-level UX design before frontend implementation for the listings, filters, vague-intent entry point, states, and details page.
user-invocable: false
---

Use this skill whenever any frontend or UI implementation is proposed.

## Rule
Do not write frontend implementation code until the UX has been described at wireframe level.

If Pencil is available, use it first.
If Pencil is unavailable in the current context, produce a wireframe-level UX spec that is explicit enough to implement directly.

## Required screens
Design these before implementation:
- listings page
- filter/search region
- loading state
- empty-results state
- error state if meaningful
- listing details page
- natural-language / vague-intent entry point

## For each screen, specify
- user goal
- layout regions
- primary actions
- components
- data shown
- responsive behavior
- what is intentionally omitted from MVP

## Frontend implementation handoff
Before implementation, produce:
- route map
- page map
- component tree
- props/data contract per page
- state model
- validation/error handling notes
- accessibility notes

## UI guardrails
Prefer:
- clear hierarchy
- compact but readable cards
- obvious filters
- predictable details view
- minimal but credible styling
- mobile-safe layout

Avoid:
- decorative complexity
- excessive animations
- component abstractions that save little
- fancy UI patterns that make the MVP harder to explain