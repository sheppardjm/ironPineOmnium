# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** v1.2 Scoring Integrity — Phase 18: Configuration Foundation

## Current Position

Phase: 18 — Configuration Foundation
Plan: —
Status: Ready to plan
Last activity: 2026-04-14 — Roadmap revised for v1.2 (scope narrowed to validation gates only, 2 phases)

Progress: [░░░░░░░░░░░░░░░░░░░] v1.2 Phase 18 of 19

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
- Files NOT touched: scoring.ts, leaderboard display, score preview, athlete JSON schema, submit-result.js, athlete-loader.ts
- Files changed: NEW src/lib/event-config.ts, MODIFIED strava-fetch-activity.js, MODIFIED submit.astro
- Gun epoch: June 6 2026 08:00:00 EDT = 12:00:00 UTC (verify independently before hardcoding)
- Hidden start detection: start_date ending in T00:00:01Z — reject before computation
- Zero new npm packages for v1.2 implementation

### Pending Todos

- Follow up on Strava athlete limit review by 2026-04-22 if no response (developers@strava.com)
- Update companion sites (mkUltraGravel, hiawathasRevenge) to link to ironpineomnium.com

### Blockers/Concerns

- **[Pending]**: Strava athlete limit review submitted 2026-04-08 — awaiting approval (7-10 business day window, follow up by 2026-04-22)
- **[Note]**: If not approved by 2026-06-01, activate CSV manual entry fallback procedure (scripts/csv-fallback.ts)

## Session Continuity

Last session: 2026-04-14
Stopped at: v1.2 roadmap revised — ready to plan Phase 18
Resume file: None
