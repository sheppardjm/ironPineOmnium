# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** v1.2 Scoring Integrity shipped — planning next milestone

## Current Position

Phase: — (no active phase)
Plan: — (no active plan)
Status: v1.2 Scoring Integrity milestone complete and archived
Last activity: 2026-05-29 — v1.2 milestone archived (ROADMAP, REQUIREMENTS, audit moved to milestones/)

Progress: [████████████████████] v1.2 complete — ready for next milestone (`/gsd-new-milestone`)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions carried into next milestone planning:
- v1.2 validation is binary-gate only — moving time stays as the Day 1 scoring metric
- All event constants live in `src/lib/event-config.ts` — no magic numbers elsewhere
- Validation lives in the fetch pipeline (`strava-fetch-activity.js`), not at submit-result time
- Gate ordering pattern: privacy/obfuscation → correctness → window

### Pending Todos

- Strava athlete limit follow-up overdue — was 2026-04-22; current date 2026-05-29. Decide between resubmission, escalation, or activating CSV fallback ahead of 2026-06-01 deadline.
- Update companion sites (mkUltraGravel, hiawathasRevenge) to link to ironpineomnium.com
- Roll out "Powered by Neucadia" footer across event sites per project memory

### Blockers/Concerns

- **[Open]**: Strava athlete limit review — submitted 2026-04-08, follow-up window (2026-04-22) elapsed. Risk: if not approved by 2026-06-01, CSV manual entry fallback must be activated (`scripts/csv-fallback.ts`).

### Tech Debt (Deferred from v1.2)

Captured in `.planning/milestones/v1.2-MILESTONE-AUDIT.md` and `.planning/milestones/v1.2-ROADMAP.md`:
- `submit-confirm.astro` renderPreview hardcoded display dates (UI labels, not validation)
- `distanceMeters` / `startDate` transported but not persisted in athlete JSON (no audit-trail consumer)
- `strava_api_error` falls through to generic submit.astro handler (acceptable degradation)

## Session Continuity

Last session: 2026-05-29
Stopped at: v1.2 milestone archival complete — next step is `/gsd-new-milestone`
Resume file: None
