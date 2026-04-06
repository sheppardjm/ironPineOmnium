---
phase: 01-compliance-and-prerequisites
plan: "04"
subsystem: infra
tags: [csv, fallback, github-api, typescript, tsx, manual-entry, event-operations]

# Dependency graph
requires:
  - phase: 01-01
    provides: per-athlete JSON schema and categoryIds type
  - phase: 01-03
    provides: SECTOR_SEGMENT_IDS and KOM_SEGMENT_IDS constants used as column validators
provides:
  - Manual CSV ingestion script (scripts/csv-fallback.ts) with dry-run and --commit modes
  - Sample CSV template (scripts/sample-fallback.csv) with correct column headers keyed to real segment IDs
  - Operational runbook (.planning/phases/01-compliance-and-prerequisites/CSV-FALLBACK.md) for event-day use
affects:
  - All phases using athlete JSON format (Phase 2 onward) — fallback IDs (manual-001, etc.) must not collide with Strava numeric IDs
  - Phase 5 (scoring) — fallback entries have activityId "manual" and no Strava profile link

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zero-dependency CSV parsing: manual RFC 4180 parser using Node.js built-ins only"
    - "Fallback athlete ID scheme: manual-NNN (zero-padded sequential) to avoid collision with Strava numeric IDs"
    - "GitHub Contents API: GET + PUT with SHA for idempotent file upserts"
    - "Dry-run default: --commit flag required to write; safe to run repeatedly for inspection"

key-files:
  created:
    - scripts/csv-fallback.ts
    - scripts/sample-fallback.csv
    - .planning/phases/01-compliance-and-prerequisites/CSV-FALLBACK.md
  modified: []

key-decisions:
  - "Fallback athlete IDs use manual-NNN scheme — string prefix ensures no collision with Strava numeric IDs in athleteId field"
  - "activityId set to literal string 'manual' for fallback entries — scoring and dedup logic must handle this sentinel value"
  - "Zero external dependencies for CSV parsing — Node.js built-ins only so script runs without npm install"
  - "Dry-run is the default mode — --commit flag required to prevent accidental writes at the event"
  - "KOM data recorded as completion flags per rider (yes/no per segment) — cross-rider ranking must be computed separately in scoring phase"

patterns-established:
  - "CSV column naming: day2_sector_{segmentId} and day2_kom_{segmentId} mirrors segment constant key names from src/lib/segments.ts"
  - "Validation-then-skip: invalid rows are logged and skipped, not batch-aborted — maximizes recovery on event day"

# Metrics
duration: ~15min
completed: 2026-04-06
---

# Phase 1 Plan 04: CSV Fallback Procedure Summary

**TypeScript CSV ingestion script (zero deps, dry-run default) + operational runbook for manual event-day result entry when Strava API is unavailable**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-06
- **Completed:** 2026-04-06
- **Tasks:** 3 (2 auto + 1 checkpoint — approved)
- **Files modified:** 3 created

## Accomplishments

- Sample CSV template with column headers keyed directly to real segment IDs from `src/lib/segments.ts`
- TypeScript ingestion script using Node.js built-ins only — validates category, sector IDs, and KOM IDs; assigns sequential `manual-NNN` athlete IDs; commits to GitHub via Contents API with SHA-based upsert; dry-run by default
- Operational runbook covering trigger conditions, data collection workflow, script execution steps, correction procedure, and known limitations

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the sample CSV template and fallback script** — `7573070` (feat)
2. **Task 2: Write the fallback procedure document** — `9301fa3` (docs)
3. **Task 3: Checkpoint — product owner approval** — approved (no commit; checkpoint resolved)

**Plan metadata:** (this commit — docs(01-04): complete CSV fallback procedure plan)

## Files Created/Modified

- `scripts/csv-fallback.ts` — TypeScript ingestion script: parses CSV, validates against segment constants, builds per-athlete JSON, optionally commits to GitHub via Contents API
- `scripts/sample-fallback.csv` — Sample CSV template with real segment ID column headers and three example rows (both-days, day-1-only, day-2-only)
- `.planning/phases/01-compliance-and-prerequisites/CSV-FALLBACK.md` — Operational runbook: when to use, prerequisites, data collection steps, script commands, correction procedure, limitations

## Decisions Made

- **Fallback athlete ID scheme (`manual-NNN`):** String prefix guarantees no collision with Strava numeric IDs in the `athleteId` field. Sequential numbering matches CSV row order.
- **`activityId: "manual"` sentinel:** Fallback entries set `activityId` to the literal string `"manual"`. The scoring phase must handle this case (no Strava activity link, no deduplication check against Strava).
- **Zero-dependency CSV parser:** Hand-rolled RFC 4180 parser using Node.js `fs` and built-ins only. No `npm install` step required — critical for reliability on event day.
- **Dry-run as default:** Script produces full output with athlete JSON but writes nothing unless `--commit` is passed. Prevents accidental GitHub writes during rehearsal or debugging.
- **KOM as per-rider flags, not cross-rider ranking:** The fallback records which KOM segments each rider completed (`yes`/`no`). Cross-rider KOM ranking must be computed in the scoring phase — not attempted in the fallback ingestion step.

## Deviations from Plan

None — plan executed exactly as written. Checkpoint resolved with product owner approval.

## Issues Encountered

None.

## User Setup Required

None for this plan. The fallback script itself requires environment variables at event time:
- `GITHUB_TOKEN` — personal access token with repo write access
- `GITHUB_OWNER` — GitHub repository owner
- `GITHUB_REPO` — GitHub repository name

These are documented in `CSV-FALLBACK.md` under Prerequisites.

## Next Phase Readiness

- Strava compliance plans (01-01 through 01-04) are complete. Phase 1 blockers resolved.
- Plan 01-02 (Strava athlete limit review submission) was drafted earlier but lacks a SUMMARY.md — should be formally closed before Phase 2 begins.
- Phase 2 (scoring engine) must handle `activityId: "manual"` and `athleteId: "manual-NNN"` as valid sentinel values — do not treat them as Strava data.
- Fallback and live Strava submission paths write the same per-athlete JSON schema — the leaderboard rendering layer needs no special casing for fallback entries.

---
*Phase: 01-compliance-and-prerequisites*
*Completed: 2026-04-06*
