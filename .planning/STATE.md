# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** Phase 2 — Netlify Infrastructure

## Current Position

Phase: 2 of 10 (Netlify Infrastructure)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-04-06 — Completed 02-01-PLAN.md (Netlify infrastructure foundation)

Progress: [█░░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~8 min
- Total execution time: ~34 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-compliance | 3/4 | ~26 min | ~9 min |
| 02-netlify-infrastructure | 1/4 | ~8 min | ~8 min |

**Recent Trend:**
- Last 5 plans: 02-01 (~8 min), 01-04 (~15 min), 01-03 (~1 min), 01-01 (~10 min)
- Trend: Consistent 8-10 min/plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: GitHub-as-database chosen (proven in mkUltraGravel, 1-3 min rebuild latency acceptable for post-ride submission model)
- Init: Netlify Functions v1 syntax required (`export const handler`) — v2 has confirmed env var bug as of 2026-03-28
- Init: Astro stays in static output mode — no SSR adapter
- 01-01: Public leaderboard renders only computed point scores + rider-chosen display name — no raw Strava fields ever displayed publicly
- 01-01: athleteId stored as plain string (not hashed) — numeric identifier, not a profile field, never surfaced in UI
- 01-01: activityId stored for deduplication only — not displayed anywhere
- 01-01: Display name and category locked after first submission — cannot be changed by re-submission
- 01-01: Strava deauth deletes entire athlete JSON file — no partial retention
- 01-01: hometown not collected — removed from RiderResult in 02-01
- 01-03: Segment IDs stored as strings (not numbers) — avoids JS precision issues with large Strava IDs
- 01-04: Fallback athlete IDs use manual-NNN scheme — string prefix prevents collision with Strava numeric IDs
- 01-04: activityId set to literal "manual" for fallback entries — scoring/dedup must handle this sentinel
- Phase 1: Strava athlete limit review (01-02) deferred until UI is complete — Strava requires screenshots of finished product before approving
- 02-01: v1 ESM handler syntax confirmed: `export const handler` (not `export default`, not `exports.handler`)
- 02-01: health.js boolean-maps 8 required env vars for runtime verification in 02-02

### Pending Todos

- Submit Strava athlete limit review after UI is built (around Phase 5+) — draft content in 01-02-PLAN.md

### Blockers/Concerns

- **[Deferred]**: Strava athlete limit review not yet submitted — 7-10 business day lead time. Submit as soon as UI shows all Strava data touchpoints.
- **[Note]**: pnpm approve-builds may need to be run interactively before netlify-cli build scripts execute fully. Run `pnpm approve-builds` if netlify dev fails to start.

## Session Continuity

Last session: 2026-04-06T15:28Z
Stopped at: Completed 02-01-PLAN.md. Ready for 02-02 (netlify dev setup and env var wiring).
Resume file: None
