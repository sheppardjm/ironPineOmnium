---
phase: 19-fetch-pipeline-validation-gates
verified: 2026-04-14T23:59:22Z
status: passed
score: 6/6 must-haves verified
gaps: []
---

# Phase 19: Fetch Pipeline Validation Gates — Verification Report

**Phase Goal:** Activities that are too short or started outside the allowed window are rejected at fetch time with errors that tell the rider exactly what was wrong and what the threshold is — no invalid data ever reaches the data store.
**Verified:** 2026-04-14T23:59:22Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Day 1 activity shorter than 156 km is rejected at fetch time with rider's distance and 156 km minimum | VERIFIED | `distanceMeters < minDistanceMeters` gate at line 237; returns `distance_too_short` with `actualDistanceKm` and `minDistanceKm: 156` |
| 2 | Day 2 activity shorter than 153 km is rejected at fetch time with rider's distance and 153 km minimum | VERIFIED | Same gate, `isDay1 = false` path selects `DAY2_MIN_DISTANCE_METERS` (153000) and `minDistanceKm: 153` |
| 3 | Day 1 activity with start_date ending in T00:00:01Z is rejected before any epoch arithmetic | VERIFIED | `startDate.endsWith("T00:00:01Z")` check at line 223, executes before any `new Date()` epoch parse; returns `hidden_start_time` |
| 4 | Day 1 activity starting more than 30 minutes after 8:00 AM ET gun is rejected with rider's start time and 8:30 AM ET cutoff | VERIFIED | `startEpoch > cutoffEpoch` gate at line 255; returns `start_too_late` with `actualStartTime` and `cutoffTime` |
| 5 | Day 2 activities are NOT subject to the start-time window check | VERIFIED | Gate is guarded by `if (isDay1)` at line 252; Day 2 activities skip the block entirely |
| 6 | All three new error codes render human-readable messages on the submit page | VERIFIED | Three `else if` branches at submit.astro lines 127/129/136; each composes message from payload fields |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `netlify/functions/strava-fetch-activity.js` | Validation gates after Phase 18 field extraction; contains all three error codes | VERIFIED | 289 lines; three gates in correct order (hidden_start_time → distance_too_short → start_too_late); all contain multiValueHeaders spread |
| `src/pages/submit.astro` | Error message handlers for three new error codes | VERIFIED | 228 lines; three `else if` branches after `wrong_date` handler; each renders dynamic message from response payload |
| `src/lib/event-config.ts` | Six constants available for import | VERIFIED | All six constants exported: DAY1_DATE, DAY2_DATE, EVENT_DATES, GUN_EPOCH_SECONDS, START_WINDOW_SECONDS, DAY1_MIN_DISTANCE_METERS, DAY2_MIN_DISTANCE_METERS |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `strava-fetch-activity.js` | `event-config.ts` | import of all six validation constants | WIRED | Lines 16-23: imports EVENT_DATES, DAY1_DATE, DAY2_DATE, DAY1_MIN_DISTANCE_METERS, DAY2_MIN_DISTANCE_METERS, GUN_EPOCH_SECONDS, START_WINDOW_SECONDS |
| `strava-fetch-activity.js` | `submit.astro` | error code strings match client-side handler conditions | WIRED | Server emits `"distance_too_short"`, `"start_too_late"`, `"hidden_start_time"`; client `data.error ===` checks match exactly |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| Day 1 activity shorter than 156 km rejected with rider's distance and minimum | SATISFIED | Gate at line 237; payload includes actualDistanceKm and minDistanceKm |
| Day 2 activity shorter than 153 km rejected with rider's distance and minimum | SATISFIED | Same gate, DAY2 path selects 153000 m / 153 km |
| Day 1 activity with T00:00:01Z start_date rejected before further processing | SATISFIED | endsWith check at line 223 is first gate, before any epoch arithmetic |
| Day 1 activity starting more than 30 min after gun rejected with rider's start time and cutoff | SATISFIED | Gate at line 252-267; cutoffEpoch = GUN_EPOCH_SECONDS + START_WINDOW_SECONDS (1780747200 + 1800) |
| submit.astro surfaces each error code as human-readable message | SATISFIED | All three handlers present and compose messages from payload fields |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `strava-fetch-activity.js` | 273 | Success return uses `undefined` instead of `{}` in multiValueHeaders spread: `{ multiValueHeaders } : undefined` | Info | Functionally identical — `undefined` properties are ignored in object spread; no cookie loss |

No blockers. No stub patterns. No TODO/FIXME in validation gate code.

### Human Verification Required

None. All critical behaviors are structurally verifiable:

- Gate ordering confirmed by line numbers (223, 237, 252)
- Day 1 guard confirmed by `if (isDay1)` wrapping the start-time block
- Payload field names match between server JSON and client template literals
- Distance constants imported from event-config.ts (no magic numbers in gate logic)

### Summary

Phase 19 fully achieves its goal. Both modified files contain substantive, correctly wired implementations:

`netlify/functions/strava-fetch-activity.js` has three validation gates inserted at Step 7.5 (after field extraction, before success return) in the correct order. The hidden-start-time check (`T00:00:01Z`) precedes all epoch arithmetic as required. The distance gate selects the correct per-day minimum from imported constants. The start-time window gate is strictly Day 1 only. Every new return path preserves the multiValueHeaders spread for token-refresh cookie integrity.

`src/pages/submit.astro` has three new `else if` branches that compose human-readable messages using the actual values from the response payload — the distance message shows the rider's exact km and the day's minimum; the start-time message formats the rider's start time in ET and states the 8:30 AM cutoff; the hidden-start message tells the rider which privacy setting to disable. No invalid data can reach the data store because all rejection happens in the Netlify function before any write path is reached.

---
_Verified: 2026-04-14T23:59:22Z_
_Verifier: Claude (gsd-verifier)_
