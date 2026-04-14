# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** v1.2 Scoring Integrity — Phase 19: Fetch Pipeline Validation Gates

## Current Position

Phase: 19 — Fetch Pipeline Validation Gates
Plan: —
Status: Pending (needs planning)
Last activity: 2026-04-14 — Phase 18 complete, verified, and committed

Progress: [██████████░░░░░░░░░] v1.2 Phase 18 complete, Phase 19 pending

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.2 scope revision: Moving time scoring is NOT replaced — validation gates only (distance + start time window)
- v1.2 scoping: Day 1 minimum distance 156 km (95% of ~164 km / ~102 miles route)
- v1.2 scoping: Day 2 minimum distance 153 km (95% of ~161 km / ~100 miles route)
- v1.2 scoping: Day 1 start window — reject if start_date > 30 minutes after 8:00 AM ET gun time
- v1.2 scoping: Hidden start time detection — reject if start_date ends in T00:00:01Z
- v1.2 phases reduced from 3 to 2 — no Phase 20 (scoring formula/UI) because scoring is unchanged
- Files NOT touched: scoring.ts, leaderboard display, score preview, athlete JSON schema, athlete-loader.ts
- Phase 18 shipped: event-config.ts (7 constants), strava-fetch-activity.js (distanceMeters/startDate extraction), submit-confirm.astro (transport layer), submit-result.js (dates from event-config)
- Gun epoch: June 6 2026 08:00:00 EDT = 12:00:00 UTC = 1780747200
- Hidden start detection: start_date ending in T00:00:01Z — reject before computation
- Zero new npm packages for v1.2 implementation
- event-config.ts naming: follows segments.ts pattern (named exports, as const, no default export)
- startDate in fetch payload uses activity.start_date (UTC ISO string) for epoch comparison in Phase 19

### Pending Todos

- Follow up on Strava athlete limit review by 2026-04-22 if no response (developers@strava.com)
- Update companion sites (mkUltraGravel, hiawathasRevenge) to link to ironpineomnium.com

### Blockers/Concerns

- **[Pending]**: Strava athlete limit review submitted 2026-04-08 — awaiting approval (7-10 business day window, follow up by 2026-04-22)
- **[Note]**: If not approved by 2026-06-01, activate CSV manual entry fallback procedure (scripts/csv-fallback.ts)

## Session Continuity

Last session: 2026-04-14
Stopped at: Phase 18 complete — ready to plan Phase 19
Resume file: None
