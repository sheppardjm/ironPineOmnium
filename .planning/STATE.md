# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** Phase 1 — Compliance and Prerequisites

## Current Position

Phase: 1 of 10 (Compliance and Prerequisites)
Plan: 3 of 4 in current phase (01-01 and 01-03 complete; 01-02 drafted; 01-04 pending)
Status: In progress
Last activity: 2026-04-06 — Completed 01-01-PLAN.md (data model document, product owner approved)

Progress: [█░░░░░░░░░] ~5% (2 plans completed of ~40 estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: ~1 min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-compliance | 2/4 | ~11 min | ~5 min |

**Recent Trend:**
- Last 5 plans: 01-03 (~1 min), 01-01 (~10 min + checkpoint pause)
- Trend: —

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: GitHub-as-database chosen (proven in mkUltraGravel, 1-3 min rebuild latency acceptable for post-ride submission model)
- Init: Netlify Functions v1 syntax required (`exports.handler`) — v2 has confirmed env var bug as of 2026-03-28
- Init: Astro stays in static output mode — no SSR adapter
- 01-01: Public leaderboard renders only computed point scores + rider-chosen display name — no raw Strava fields ever displayed publicly
- 01-01: athleteId stored as plain string (not hashed) — numeric identifier, not a profile field, never surfaced in UI
- 01-01: activityId stored for deduplication only — not displayed anywhere
- 01-01: Display name and category locked after first submission — cannot be changed by re-submission
- 01-01: Strava deauth deletes entire athlete JSON file — no partial retention
- 01-01: hometown not collected — RiderResult.hometown must be emptied or removed in Phase 2
- 01-03: Segment IDs stored as strings (not numbers) — avoids JS precision issues with large Strava IDs
- 01-03: SEGMENT_LABELS as flat Record (not inline objects) — keeps as-const arrays clean for literal type inference

### Pending Todos

None yet.

### Blockers/Concerns

- **[Phase 1]**: Strava athlete limit review has multi-week lead time — must be submitted immediately, not after planning. Approval timeline is entirely outside development control and is the single largest schedule risk before June 6.
- **[Phase 1]**: Strava November 2024 API ToS display restriction must be resolved before any UI work. Conservative path: display computed scores and rider-chosen names only, no raw Strava fields.
- **[Phase 1]**: Plan 01-02 has no SUMMARY.md — content drafted but not yet formally closed. Plan 01-04 (CSV fallback) still pending.

## Session Continuity

Last session: 2026-04-06
Stopped at: Completed 01-01-PLAN.md — DATA-MODEL.md approved by product owner, SUMMARY.md created
Resume file: None
