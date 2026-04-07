---
phase: 06-scoring-extraction
verified: 2026-04-07T00:00:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 6: Scoring Extraction Verification Report

**Phase Goal:** Extend the submission pipeline to capture KOM elapsed times (not just presence), surface them in the confirm page UI, and add Day 2 zero-match warnings — completing the raw data capture needed for Phase 8 scoring
**Verified:** 2026-04-07
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Day 1 extraction (movingTimeSeconds) and Day 2 sector extraction (sectorEfforts) complete from Phase 4 | VERIFIED | `strava-fetch-activity.js` lines 175–183, 217–219: sectorEfforts loop with fastest-effort deduplication against SECTOR_SEGMENT_IDS; movingTimeSeconds = activity.moving_time returned at line 217 |
| 2  | komEfforts map (segmentId -> elapsedSeconds) captured with fastest-effort deduplication | VERIFIED | `strava-fetch-activity.js` lines 196–205: explicit komEfforts loop iterating efforts, filtering by KOM_SEGMENT_IDS, deduplicating to lowest elapsed_time per segment; returned at line 221 alongside komSegmentIds |
| 3  | Confirm page displays KOM climb times and carries komEfforts in a hidden field | VERIFIED | `submit-confirm.astro` lines 192–203: komTimeTotal summed from komEfforts.values(), displayed as "N of 3 KOM segments · HH:MM:SS total climb time" when komCount > 0; line 63: `<input type="hidden" name="komEfforts" id="h-komEfforts" />`; lines 239–240: populateHiddenFields sets h-komEfforts via JSON.stringify |
| 4  | Day 2 activity with zero sector/KOM matches shows amber warning without blocking submission | VERIFIED | `submit-confirm.astro` lines 169–185: isDay2 check (startDateLocal === "2026-06-07") renders `.zero-match-warning` with `.warning-value` (amber) for sectors zero-match; lines 206–214: same pattern for KOM zero-match; CSS lines 437–450: `.warning-value` and `.warning-explain` use `color: var(--color-ember-400, #dd8258) !important`; form submit handler still runs normally (lines 246–279) |
| 5  | Day 1 activity shows "Not applicable" neutral text for sectors and KOM | VERIFIED | `submit-confirm.astro` lines 178–184: else branch (not isDay2) renders `<p class="preview-value">—</p>` and `<p class="preview-explain">Not applicable for Day 1 activities.</p>` for both sectors (line 183) and KOM (line 218) |

**Score:** 5/5 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `netlify/functions/strava-fetch-activity.js` | komEfforts extraction loop | VERIFIED | 224 lines; komEfforts loop lines 196–205; fastest-effort deduplication confirmed; returns komEfforts in Step 8 response at line 221 |
| `src/pages/submit-confirm.astro` | KOM display, hidden field, zero-match warnings | VERIFIED | 574 lines; komEfforts Payload type at line 104; KOM preview with time display lines 192–203; h-komEfforts hidden input line 63; populateHiddenFields wires komEfforts line 240; zero-match warning with amber CSS lines 169–185, 206–214 |
| `dist/submit-confirm/index.html` | Built output includes hidden field | VERIFIED | h-komEfforts input present in built HTML; CSS references correct |
| `dist/_astro/submit-confirm*.js` | Built JS includes komEfforts logic | VERIFIED | komEfforts appears 11 times in minified JS; zero-match-warning divs present; 2026-06-07 date check present |
| `src/lib/segments.ts` | KOM_SEGMENT_IDS defined (3 segments) | VERIFIED | Lines 23–27: 3 KOM segment IDs exported as const; imported correctly in strava-fetch-activity.js line 14 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `strava-fetch-activity.js` | `KOM_SEGMENT_IDS` | import at line 14 | WIRED | `import { SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from "../../src/lib/segments.ts"` |
| `strava-fetch-activity.js` | komEfforts in response | JSON.stringify at line 221 | WIRED | `komEfforts` key present in Step 8 return body |
| `submit-confirm.astro` → komEfforts display | `payload.komEfforts` | komTimeTotal reduction lines 193–195 | WIRED | Values summed and conditionally displayed as formatted time string |
| `submit-confirm.astro` → h-komEfforts hidden field | `populateHiddenFields()` call | line 313 | WIRED | `populateHiddenFields(payload)` called in DOMContentLoaded handler; function sets h-komEfforts via JSON.stringify |
| `submit-confirm.astro` → Day 2 zero-match warning | `isDay2` check | lines 169, 206 | WIRED | `payload.startDateLocal === "2026-06-07"` gates amber warning render for both sectors and KOM blocks |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `submit-confirm.astro` | 273–278 | Comment: "Phase 7 will POST to /api/submit-result. For now, show a placeholder confirmation" | Info | Intentional — form submit handler does not yet POST; the hidden fields carry all data correctly; Phase 7 scope. Not a phase 6 gap. |

No blockers. The form submit stub is an explicit Phase 7 deferral, not a Phase 6 gap. All Phase 6 deliverables (extraction, display, hidden field, warnings) function independently of Phase 7.

---

### Human Verification Required

None for the structural goals of this phase. The following are Phase 7 concerns:
- Visual appearance of amber warning vs. design intent (minor aesthetic)
- Real form POST behavior (deferred to Phase 7)

---

## Summary

All five success criteria are structurally verified against the actual codebase:

1. Phase 4 extraction is confirmed complete in `strava-fetch-activity.js` — `movingTimeSeconds` from `activity.moving_time` and `sectorEfforts` via fastest-dedup loop against `SECTOR_SEGMENT_IDS`.

2. `komEfforts` is a new map extracted in Phase 6 (`strava-fetch-activity.js` lines 196–205), mirrors the `sectorEfforts` pattern exactly (iterate efforts, filter by `KOM_SEGMENT_IDS`, keep lowest `elapsed_time` per segment), and is returned alongside `komSegmentIds` in the Step 8 response.

3. The confirm page receives `komEfforts` via the base64url payload, sums values to `komTimeTotal`, conditionally appends it to the KOM preview card (`"N of 3 KOM segments · HH:MM:SS total climb time"`), and persists the map via `h-komEfforts` hidden field populated by `populateHiddenFields()`.

4. The Day 2 zero-match path renders a `.zero-match-warning` div with `.warning-value` and `.warning-explain` classes (both styled `color: var(--color-ember-400) !important`) for both the sectors and KOM preview cards when their respective count is zero and `startDateLocal === "2026-06-07"`. Submission is not blocked.

5. The Day 1 neutral path renders a dash value and "Not applicable for Day 1 activities." text in the sectors and KOM cards when the activity is not Day 2 — distinct from the Day 2 warning path.

The built output (`dist/submit-confirm/index.html` and compiled JS) matches the source.

---

_Verified: 2026-04-07_
_Verifier: Claude (gsd-verifier)_
