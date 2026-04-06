---
phase: 01-compliance-and-prerequisites
plan: 01
subsystem: compliance
tags: [strava, tos, data-model, leaderboard, json-schema, privacy]

# Dependency graph
requires: []
provides:
  - Approved data model document defining per-athlete JSON schema
  - Explicit public/private field boundary for leaderboard display
  - Strava November 2024 ToS compliance rationale (field-by-field)
  - Session-only raw-to-score display contract for submission confirmation
  - Re-submission, identity-lock, and deauth rules
affects:
  - 01-compliance-and-prerequisites (plans 02-04 reference this boundary)
  - All future phases touching submission logic, leaderboard rendering, or type definitions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compute-and-discard: raw Strava values stored for scoring computation, never rendered publicly"
    - "Rider-chosen identity: display name and category are self-reported, not pulled from Strava"
    - "Schema-first compliance: data model signed off before any UI or backend code is written"

key-files:
  created:
    - .planning/phases/01-compliance-and-prerequisites/DATA-MODEL.md
  modified: []

key-decisions:
  - "Public leaderboard shows only computed point scores (Day 1, Sector, KOM, Total) and rider-chosen display name — no raw Strava fields"
  - "athleteId stored as plain string (not hashed) — numeric identifier, not a profile field, never surfaced in UI"
  - "activityId stored for operational deduplication only — not displayed anywhere"
  - "Display name and category locked after first submission — Day 2 reuses existing identity"
  - "Re-submission for same day overwrites the day1/day2 object; identity fields remain locked"
  - "Strava deauth deletes the entire athlete JSON file — no partial retention"
  - "Raw-to-score breakdown shown to submitting rider in session only — not stored in public JSON, not visible to others"
  - "hometown field intentionally not collected — RiderResult.hometown should be empty or removed from type"

patterns-established:
  - "DATA-MODEL.md is the compliance gate: no display code or submission logic before sign-off"
  - "All computed scores are derived from stored raw values at serve-time — not stored as precomputed values in JSON"
  - "Leaderboard table columns: Rank, Display Name, Category, Day 1 Score, Sector Score, KOM Score, Total Score — nothing else"

# Metrics
duration: ~10min (plus checkpoint pause for product owner review)
completed: 2026-04-06
---

# Phase 1 Plan 01: Data Model Document Summary

**Strava ToS compliance boundary documented and approved: leaderboard renders only computed point scores and rider-chosen display names, with raw Strava fields compute-and-discarded from public JSON**

## Performance

- **Duration:** ~10 min (execution) + checkpoint pause (product owner review)
- **Started:** 2026-04-06
- **Completed:** 2026-04-06
- **Tasks:** 2 (1 auto + 1 checkpoint:human-verify)
- **Files modified:** 1

## Accomplishments

- Authored DATA-MODEL.md with five sections: per-athlete JSON schema, public leaderboard display fields, rider session-only view, Strava ToS compliance rationale, and re-submission/identity rules
- Established the core compliance boundary: raw Strava values (moving_time, segment elapsed_time) are stored in private JSON for scoring computation but never rendered on the public leaderboard
- Documented the field-by-field compliance table mapping every stored or displayed value to its ToS status
- Defined the session-only raw-to-score breakdown contract for the submission confirmation view (Phase 5 scope, boundary documented now)
- Received product owner sign-off on the data model before any UI or backend code is written

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the data model document** - `e907bfe` (docs)
2. **Task 2: Checkpoint — product owner review** - (no commit; checkpoint resolved by approval)

**Plan metadata:** (committed with this SUMMARY.md)

## Files Created/Modified

- `.planning/phases/01-compliance-and-prerequisites/DATA-MODEL.md` — Full compliance data model: JSON schema, public display fields, session-only view, Strava ToS boundary, re-submission rules

## Decisions Made

- **athleteId as plain string (not hashed):** Consistent with mkUltraGravel production approach. Numeric ID is not a profile field; it is never surfaced in the UI. Hash migration path documented if Strava clarifies otherwise.
- **Computed scores at serve-time, not pre-stored:** `day1Score`, `sectorScore`, `komScore` are derived from stored raw values at leaderboard render time — they are not persisted in the per-athlete JSON. This keeps the JSON as a faithful record and lets scoring weights change without a data migration.
- **No hometown collection:** Product decision. `RiderResult.hometown` in `src/lib/types.ts` should be emptied or removed — it must never be populated from Strava profile data.
- **Full-file deletion on deauth:** No partial retention of computed scores. Entire athlete JSON deleted on Strava deauthorization webhook.

## Deviations from Plan

None — plan executed exactly as written. DATA-MODEL.md covers all five required sections. Checkpoint resolved with product owner approval on first review.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DATA-MODEL.md is approved and serves as the compliance reference for all subsequent phases
- Plans 01-02, 01-03, and 01-04 can proceed in parallel — none depend on DATA-MODEL.md being unresolved
- Phase 2+ implementation must reference DATA-MODEL.md §2 Schema Alignment Checklist before writing any leaderboard rendering or submission logic
- **Concern (carry forward):** `RiderResult.hometown` in `src/lib/types.ts` currently exists as a field — Phase 2 must remove or empty it; it must not be populated from Strava

---
*Phase: 01-compliance-and-prerequisites*
*Completed: 2026-04-06*
