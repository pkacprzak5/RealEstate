---
name: real-estate-mvp-guardrails
description: Guardrails for this take-home assignment: enforce MVP scope, defensible tradeoffs, public deployment, and interview-friendly implementation choices.
user-invocable: false
---

Use this skill whenever discussing scope, architecture, backlog, tradeoffs, or feature additions.

## Goal
Keep the project inside a strong, defensible take-home MVP.

## Core priorities
Optimize for:
1. reasoning quality
2. correctness of ingestion/normalization/storage
3. browse/search/details completeness
4. public demo readiness
5. readability and maintainability

## Default stance
Choose the narrowest product scope that still demonstrates strong engineering judgment.

Prefer:
- one city
- one listing segment
- one source
- deterministic code first
- simple search
- one or two intentional AI features
- straightforward infra

Push back on:
- unnecessary abstractions
- speculative extensibility
- multi-source ingestion
- infrastructure that is hard to explain
- broad but incomplete UX

## Decision rule
When evaluating a proposed feature or architecture choice, explicitly classify it:
- required now
- useful but optional
- out of scope for MVP

Default to “out of scope” unless it materially improves:
- assignment compliance
- demo clarity
- data quality
- deployment readiness
- the 1-page reasoning document

## Communication rule
Assume the user understands technical details.
Do not ask routine questions when a strong default exists.
If a technical decision is worth surfacing, present:
- recommended option
- strongest alternative
- main tradeoff
Then continue.

## Always preserve
- source provenance
- import repeatability
- missing-field strategy
- duplicate strategy
- explainability of AI usage
- deployment readiness