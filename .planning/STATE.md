# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** Phase 1 — Compliance and Prerequisites

## Current Position

Phase: 1 of 10 (Compliance and Prerequisites)
Plan: 3 of 4 in current phase (01-03 complete)
Status: In progress
Last activity: 2026-04-06 — Completed 01-03-PLAN.md (segment ID constants)

Progress: [█░░░░░░░░░] ~3% (1 plan completed of ~40 estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: ~1 min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-compliance | 1/4 | ~1 min | ~1 min |

**Recent Trend:**
- Last 5 plans: 01-03 (~1 min)
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: GitHub-as-database chosen (proven in mkUltraGravel, 1-3 min rebuild latency acceptable for post-ride submission model)
- Init: Netlify Functions v1 syntax required (`exports.handler`) — v2 has confirmed env var bug as of 2026-03-28
- Init: Astro stays in static output mode — no SSR adapter
- 01-03: Segment IDs stored as strings (not numbers) — avoids JS precision issues with large Strava IDs
- 01-03: SEGMENT_LABELS as flat Record (not inline objects) — keeps as-const arrays clean for literal type inference

### Pending Todos

None yet.

### Blockers/Concerns

- **[Phase 1]**: Strava athlete limit review has multi-week lead time — must be submitted immediately, not after planning. Approval timeline is entirely outside development control and is the single largest schedule risk before June 6.
- **[Phase 1]**: Strava November 2024 API ToS display restriction must be resolved before any UI work. Conservative path: display computed scores and rider-chosen names only, no raw Strava fields.
- **[Phase 1]**: Plans 01-01 and 01-02 have no SUMMARY.md — may need completion before Phase 2.

## Session Continuity

Last session: 2026-04-06T13:48:41Z
Stopped at: Completed 01-03-PLAN.md — src/lib/segments.ts created with all 10 Day 2 segment ID constants
Resume file: None
