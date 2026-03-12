---
name: deploy-readiness
description: Prepare the Laravel + TiDB + TypeScript app for temporary public deployment on Koyeb and verify readiness.
disable-model-invocation: true
argument-hint: [target]
---

Prepare this project for public deployment on $ARGUMENTS.

If no argument is given, default to:
- app: Koyeb
- database: TiDB Cloud Starter

## Deployment objective
The app must be realistically ready for a temporary public, clickable URL.

## Checklist
1. Verify Laravel production boot assumptions
2. Verify env var list is complete
3. Verify TiDB connection settings for Laravel/PDO
4. Verify database migration strategy
5. Verify import/seed strategy for deployed demo data
6. Verify frontend build strategy
7. Verify Koyeb start command / web entrypoint
8. Verify storage, cache, queue assumptions
9. Verify post-deploy smoke tests
10. Update README with deployment steps
11. Identify the exact final human-only steps if provider credentials are missing

## Output format
Return:
- readiness summary
- missing blockers
- exact files to change
- exact commands to run
- exact env vars required
- smoke-test checklist
- final public-demo checklist

## Guardrails
Do not claim deployment is complete if provider credentials or required secrets are missing.
Do everything else that can be done in-repo first.

Optimize for:
- temporary demo stability
- lowest practical cost
- easiest public access
- easiest explanation in submission docs