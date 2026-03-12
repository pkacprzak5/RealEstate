---
name: intentional-ai-search
description: Keep AI usage intentional, limited, explainable, and backed by deterministic fallbacks for search and enrichment.
user-invocable: false
---

Use this skill whenever AI features, LLM parsing, natural-language search, summarization, or ranking are discussed.

## Rule
AI is optional in this assignment, so do not add it for novelty.

Every AI feature must answer:
- what concrete problem does it solve?
- why is deterministic code not enough?
- what is the fallback if AI is unavailable?
- how will the result be stored or traced?
- how will this be explained in the reasoning document?

## Approved use cases
Strong candidates:
1. vague natural-language query -> structured filters / ranking hints
2. messy description cleanup or concise summary generation
3. low-confidence normalization assistance

## Discouraged use cases
Avoid:
- AI for basic CRUD or filtering
- AI where regex/rules are sufficient
- open-ended agent loops
- hidden AI behavior without traceability
- infrastructure-heavy retrieval systems for this MVP

## Implementation expectations
For each AI feature, define:
- input
- prompt contract
- output schema
- validation
- fallback behavior
- storage strategy
- failure behavior
- test strategy

## Fallback examples
Examples of acceptable fallbacks:
- vague query falls back to keyword search + no structured enrichment
- summary feature falls back to truncated normalized description
- low-confidence normalization falls back to null + parse note

## Deliverables whenever this skill is active
Produce:
- AI feature shortlist
- chosen AI feature(s)
- fallback design
- user-visible behavior
- reasoning-doc explanation