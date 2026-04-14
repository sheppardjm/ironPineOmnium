# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-14)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** v1.2 Scoring Integrity — not started (defining requirements)

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-14 — Milestone v1.2 started

Progress: [░░░░░░░░░░░░░░░░░░░] v1.2 not started

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.2 scoping: Gun time scoring replaces moving_time for Day 1 — prevents sandbagging by anchoring to 8:00 AM ET gun start
- v1.2 scoping: Minimum distance validation on both days (80% of expected route distance)
- Day 1 route: ~102 miles (±2-3), gun time 8:00 AM ET on 2026-06-06
- Day 2 route: ~100 miles (±2-3), sectors/KOM scoring unchanged

### Pending Todos

- Follow up on Strava athlete limit review by 2026-04-22 if no response (developers@strava.com)
- Update companion sites (mkUltraGravel, hiawathasRevenge) to link to ironpineomnium.com

### Blockers/Concerns

- **[Pending]**: Strava athlete limit review submitted 2026-04-08 — awaiting approval (7-10 business day window, follow up by 2026-04-22)
- **[Note]**: If not approved by 2026-06-01, activate CSV manual entry fallback procedure (scripts/csv-fallback.ts)

## Session Continuity

Last session: 2026-04-14
Stopped at: Milestone v1.2 initialization — defining requirements
Resume file: None
