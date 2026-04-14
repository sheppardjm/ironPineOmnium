# Feature Landscape: Scoring Integrity (v1.2)

**Domain:** Gravel cycling event — gun time scoring + distance validation via Strava
**Researched:** 2026-04-14
**Overall confidence:** HIGH for Strava API mechanics (official docs verified); MEDIUM for distance tolerance thresholds (no authoritative standard exists for GPS-based events — rationale documented)

---

## Context

This document focuses specifically on the scoring integrity features for v1.2: replacing moving time scoring with gun time scoring on Day 1, and adding minimum distance validation on both days. It is additive to the original FEATURES.md written in April 2026 for v1.0.

**What already exists:**
- Moving time scoring for Day 1 (35% weight)
- Sector time scoring for Day 2 (45% weight)
- KOM scoring for Day 2 (20% weight)
- Score preview on submission confirm page
- Leaderboard with per-component score columns

**What v1.2 adds:**
- Gun time scoring: race time from 8:00 AM ET gun start, replacing moving time
- Minimum distance validation on Day 1 and Day 2

---

## How Gun Time Works in Non-Chip-Timed Events

### The standard model

In mass-start cycling events without chip timing, gun time is universal: every rider shares the same official start moment, and race time is measured from that moment to when the rider crosses the finish. There is no net/chip time because there is no start-mat infrastructure. Finishing position is determined by who crosses the line first — gun time is the only valid metric.

Source: Finish Line Timing ("Gun Time vs. Net Time"), ChronoTrack, USA Track & Field. HIGH confidence.

### Why moving time fails for race scoring

Moving time strips paused and stopped intervals from the total. In a fondo, this creates sandbagging vectors: a rider who stops for 45 minutes and then rides hard produces a better "moving time" than their actual race performance deserves. In traditional fondos with chip timing, "net time" (mat-to-mat) solves this because the rider physically crosses a mat and cannot manipulate their start. Without mats, Strava moving time is the closest analog to net time — but it can be gamed by starting the Strava recording before the gun, riding slowly until the gun fires, then riding hard.

### The gun time approach for Strava-based events

Gun time must be computed, not read from Strava. The formula is:

```
gunTimeSeconds = (activity.start_date UTC epoch) + activity.elapsed_time - gunStartEpoch
```

Where `gunStartEpoch` is the Unix timestamp for 8:00:00 AM Eastern Daylight Time on June 6, 2026.

**June 6, 2026 at 8:00 AM EDT = 12:00:00 UTC = Unix epoch 1780660800**

Strava's `start_date` field is UTC ISO 8601 (e.g., `"2026-06-06T12:45:00Z"`). Parsing this to a Unix epoch, adding `elapsed_time` in seconds, and subtracting the gun epoch gives the official race time.

`start_date_local` has the same wall-clock value as local time but is labeled with a Z suffix — it is not a proper UTC timestamp. Do not use `start_date_local` for epoch arithmetic. Use `start_date` (UTC) only.

Source: Strava API reference (DetailedActivity model), Strava API developer changelog. HIGH confidence.

**Eastern Daylight Time offset:** Michigan observes EDT in June. EDT = UTC-4. So `utc_offset` from the API will be `-14400` seconds for activities recorded in the Upper Peninsula in June.

### What happens with elapsed_time vs moving_time

Strava's `elapsed_time` is the wall-clock duration of the activity from record-start to record-stop, including all pauses. `moving_time` excludes intervals below a speed threshold. For a race, elapsed_time is correct — it cannot be shortened by stopping. The gun time formula uses `elapsed_time`.

Source: Strava Activity Time support documentation, Strava API changelog. HIGH confidence.

---

## Strava API Fields Required for v1.2

The `GET /activities/{id}?include_all_efforts=true` endpoint returns:

| Field | Type | Units | Use in v1.2 |
|-------|------|-------|-------------|
| `start_date` | ISO 8601 datetime (UTC) | — | Gun time calculation: parse to epoch |
| `elapsed_time` | int | seconds | Gun time calculation: add to start epoch |
| `moving_time` | int | seconds | Retained for reference / display; no longer used for scoring |
| `distance` | float | meters | Distance validation: compare to minimum threshold |
| `start_date_local` | ISO 8601 datetime (local, Z-labeled) | — | Already used for date validation; do not use for epoch math |
| `utc_offset` | int | seconds | Verify timezone for debugging; not needed in formula |

All fields already exist in the Strava DetailedActivity response. No new API scope is needed.

**Critical note:** Activities with "Hide Start Time" privacy enabled return `start_date` and `start_date_local` as `00:00:01Z` on the activity date (documented in Strava API changelog, July 3, 2024). If a rider enables this setting, gun time cannot be computed. This must be detected and rejected at submission time.

---

## Table Stakes (Must Have for Scoring Integrity)

Features that must be present for this milestone to function correctly. Missing any of these means the scoring integrity goal is not achieved.

### 1. Gun time computed from `start_date` + `elapsed_time` minus gun epoch

**Why required:** Moving time is gameable in a mass-start event. Gun time is the correct metric for events without chip timing infrastructure.

**Formula:**
```
gunTimeSeconds = parse(activity.start_date).epoch + activity.elapsed_time - GUN_START_EPOCH
```

Where `GUN_START_EPOCH = 1780660800` (June 6, 2026 08:00:00 ET / 12:00:00 UTC).

**Complexity:** LOW — arithmetic on values already fetched.

**Edge case:** If `gunTimeSeconds < 0`, the rider started their Strava recording after the gun. Their start epoch + elapsed_time still gives the correct finish time, so gun time is still positive. This is fine.

If `gunTimeSeconds > 86400` (24 hours), something is wrong. Reject with an error. A 102-mile gravel fondo has a realistic ceiling of about 10-12 hours for the slowest riders.

### 2. `distance` field captured at submission time

**Why required:** Distance validation (table stake #3) requires this field. It is not currently captured.

**Complexity:** LOW — add `activity.distance` to the existing `strava-fetch-activity.js` response payload.

**Units:** meters. Store as-is; convert to miles only for display.

### 3. Minimum distance validation: Day 1 and Day 2

**Why required:** Prevents riders from submitting a short out-and-back or partial ride that still has segment efforts.

**Thresholds:**
- Day 1 (Hiawatha's Revenge, ~102 miles / ~164 km): minimum 80 miles = **128,748 meters**
- Day 2 (MK Ultra Gravel, ~100 miles / ~161 km): minimum 80 miles = **128,748 meters**

**Rationale for 80% minimum:**
GPS distance variance for a 100-mile gravel ride is typically 1-3% based on multiple GPS accuracy studies. The maximum credible negative variance from GPS error alone is about 5% (dense forest, poor signal, phone GPS). The 80% threshold (20% below course distance) is intentionally generous — it is meant to catch riders who demonstrably did not complete the course, not to penalize GPS measurement variance. A rider who completes 80+ miles of a ~100-mile route has clearly made a serious attempt at the full course. There is no authoritative industry standard for GPS-based minimum distance in self-timed cycling events; this threshold is informed judgment.

**Complexity:** LOW — compare `activity.distance` to threshold constant.

**Rejection behavior:** Return a user-readable error at submission time, not on the leaderboard. Do not silently accept and score zero.

### 4. Leaderboard: race time column replaces moving time column

**Why required:** The leaderboard currently labels the Day 1 column as "Moving Time" and uses `movingTimeSeconds` in the scoring engine. After v1.2, the stored metric is gun time, and the column label must reflect this.

**Complexity:** MEDIUM — requires changes to:
- `RiderResult` type (add `raceTimeSeconds` field, deprecate or repurpose `movingTimeSeconds`)
- `scoring.ts` scoring formula (use `raceTimeSeconds` instead of `movingTimeSeconds`)
- Leaderboard column labels
- Data file schema for stored results

**Scoring formula change:**
```
// Before (moving time):
movingTimeScore = (fastestMovingTime / riderMovingTime) * 100 * 0.35

// After (gun time):
raceTimeScore = (fastestRaceTime / riderRaceTime) * 100 * 0.35
```

The formula structure is identical; only the input metric changes.

### 5. Score preview: show race time, not moving time

**Why required:** The current confirm page shows "Day 1 · Moving Time" with the `movingTimeSeconds` value. After v1.2, the preview must show race time computed from the gun start, not Strava's moving time value.

**What to show:**
- Label: "Day 1 · Race Time"
- Value: formatted gun time (HH:MM:SS from 8:00 AM gun)
- Explanation: "Your race time is measured from the 8:00 AM gun start to when you stopped recording. It counts for 35% of your overall score."

**Complexity:** LOW — same display component, different label and value.

### 6. Hidden start time detection and rejection

**Why required:** Strava's "Hide Start Time" privacy feature causes `start_date` to return `00:00:01Z`, making gun time computation impossible and producing a wildly incorrect result (-46,799 seconds from gun).

**Detection:** If `start_date` ends in `T00:00:01Z`, reject the submission with a clear user message.

**Error message:** "Your activity has 'Hide Start Time' enabled in Strava privacy settings. Please disable it for your event day activity so we can calculate your race time from the 8:00 AM gun start, then re-submit."

**Complexity:** LOW — string check on `start_date` value before gun time calculation.

---

## Differentiators (Better Than the Baseline)

Features that improve scoring integrity or rider experience beyond the minimum required.

### 1. Race time vs. moving time displayed side by side in preview

Show riders both their gun time and their Strava moving time in the preview panel. This teaches the difference, builds trust in the new metric, and helps riders understand why their race time might be longer than their moving time.

**Value:** Makes the scoring model legible. Reduces "why is my race time longer?" support questions.

**Complexity:** LOW — already fetching both fields; display both in the preview.

**Recommended copy:**
- "Race Time (scored): 07:43:22 — measured from 8:00 AM gun to activity end"
- "Moving Time (Strava): 07:18:05 — Strava's version, not used for scoring"

### 2. Distance displayed in preview with pass/fail signal

Show the rider their recorded distance and whether it clears the minimum threshold. A green checkmark or a yellow warning if near the threshold (within 5%).

**Value:** Catches riders who submitted a partial ride before they confirm, without requiring them to understand the threshold.

**Complexity:** LOW — distance is already being validated; expose it in the UI.

**Recommended display:** "Distance: 103.2 miles (minimum 80 miles required)" with green badge.

### 3. Graceful handling of pre-gun starts

Some riders will start their Strava recording before the gun (warming up, nervous habit). The gun time formula naturally handles this correctly — their `elapsed_time` includes pre-gun time, adding to their official race time. No special handling is needed, but the preview should explain this.

**Recommended note:** "Your race time starts at 8:00 AM regardless of when you pressed record. Recording before the gun increases your official race time."

**Complexity:** LOW — text addition to score preview.

### 4. Race time shown in leaderboard in HH:MM:SS format

The existing `formatDuration()` function in `scoring.ts` already handles HH:MM:SS formatting. The leaderboard should display race time in this format alongside the score, so riders can see their actual time rather than just a score number.

**Value:** Allows riders to compare times directly, not just relative scores.

**Complexity:** LOW — pass `raceTimeSeconds` through to the leaderboard component.

---

## Anti-Features (Deliberately Avoid)

### 1. Using `elapsed_time` as the race time directly

Tempting shortcut: skip the gun epoch calculation and just display `elapsed_time`. This is wrong. A rider who starts recording at 7:30 AM and finishes at 3:30 PM has `elapsed_time = 28800` (8 hours), but their race time from gun should be 7h30m (gun to finish). Using elapsed time directly over-credits riders who start early.

**Do not build this.** Always compute from `(start_date epoch + elapsed_time) - gun_epoch`.

### 2. Using `moving_time` for gun time scoring

Moving time excludes rest stops. In a 100-mile fondo, a rider who stops for lunch takes a strategic penalty — and should. Using moving time for gun time scoring defeats the whole purpose of the change.

**Do not build this.** Moving time is irrelevant to gun time scoring. Capture and display it, but do not use it in the formula.

### 3. Distance validation with a tight threshold (90%+)

A 90% threshold (91 miles minimum for a 102-mile route) would reject riders with legitimate GPS measurement variance, especially those using phones or older GPS devices on dense forest trails. GPS variance of 3-5% on forested gravel is documented. A threshold that tight would produce false rejections.

**Do not build this.** Keep the threshold at 80% to catch clear non-completion, not GPS measurement noise.

### 4. Storing distance as the scoring metric

Distance is a binary pass/fail validation input, not a scoring input. Do not award more points for riding farther. Riders who rode 107 miles should not score higher than riders who rode 103 miles — both completed the course.

**Do not build this.** Distance is a gate, not a score component.

### 5. Retroactively recomputing existing moving time results

If any rider has already submitted before v1.2 ships (unlikely at event time, but possible in testing), their stored results used moving time. Retroactive recomputation of old entries would require the original `start_date` and `elapsed_time`, which are not currently stored.

**Do not build retroactive recomputation.** Handle this operationally (delete and resubmit) if it arises.

### 6. Admin override for gun time

An admin interface for manually adjusting race times sounds useful for edge cases (DNS, mechanical issues, timing anomalies) but is out of scope per the project's "out of scope" list. Manual corrections to JSON data files remain the appropriate path.

**Do not build this.** Handle corrections directly in data files.

---

## Edge Cases and Handling

These are specific to Strava-based gun time scoring. Each must have a defined outcome — not "we'll figure it out."

### Early Strava start (recording before gun)

**What happens:** Rider starts recording at 7:45 AM for warmup. Gun fires at 8:00 AM. Their race time = (start_epoch + elapsed_time) - gun_epoch includes the 15 pre-gun minutes.

**Correct outcome:** Race time is penalized by the early start. This is intentional and correct — do not try to detect or strip pre-gun time from the activity. The rider chose to record early.

**Action needed:** Note this in the preview ("recording before the gun adds to your official race time") but do not reject or adjust.

### Auto-pause enabled during ride

**What happens:** Rider's device auto-pauses at stop signs, mechanicals, feed zones. Strava subtracts these pauses from `moving_time` but not from `elapsed_time`.

**Correct outcome:** Gun time (using `elapsed_time`) includes these stops. This is intentional and correct for race scoring — stops are part of your race time.

**Action needed:** None. `elapsed_time` naturally handles this correctly.

### Activity split (Strava Split Tool)

**What happens:** Rider splits a single ride into two Strava activities (e.g., they stopped for lunch and resumed). Each split activity has its own `start_date` and `elapsed_time`. Neither split covers the full route. Distance on each split will likely fail the minimum threshold.

**Correct outcome:** Both splits will fail distance validation (each covers partial route). The rider cannot submit a split and pass the 80-mile minimum.

**Action needed:** None — distance validation handles this automatically. The rider must submit the original unsplit activity or re-merge it.

### Activity uploaded from a file (not live recorded)

**What happens:** Rider records on a Garmin and uploads the .fit file to Strava later. `start_date` reflects the actual ride start time in the file. `elapsed_time` is accurate.

**Correct outcome:** Gun time calculation works correctly. The `start_date` comes from the GPS file timestamp, not the upload time.

**Action needed:** None. File uploads work identically to live recording for gun time purposes.

### GPS drift on distance

**What happens:** Dense forest sections in the Hiawatha area create GPS signal degradation. A rider's actual path may measure 98 miles on GPS when they rode 102.

**Correct outcome:** 98 miles (157,720 meters) well exceeds the 80-mile minimum (128,748 meters). No issue.

**Action needed:** None for normal variance. The 80% threshold provides 22+ miles of buffer for GPS error.

### Severe GPS failure (activity shows 20 miles)

**What happens:** GPS lost lock for a major portion of the ride. Recorded distance is severely understated.

**Correct outcome:** Activity fails distance validation and is rejected.

**Action needed:** Rejection at submission with message directing rider to contact organizer. "Your activity shows only X miles recorded. If you believe this is a GPS error, contact [organizer] for manual review."

### Hidden start time privacy setting

**What happens:** `start_date` returns `"2026-06-06T00:00:01Z"` instead of actual start time.

**Correct outcome:** Gun time cannot be computed. Submission is rejected with clear instructions.

**Action needed:** Detect `T00:00:01Z` pattern before computing gun time. Return `error: "hidden_start_time"` with user message.

### Activity recorded in wrong timezone

**What happens:** Rider's device is set to wrong timezone (e.g., Central Time). `start_date` (UTC) is still correct — Strava normalizes to UTC regardless of device timezone setting. Gun time computation is unaffected.

**Correct outcome:** No issue. UTC arithmetic is timezone-agnostic.

**Action needed:** None. Use `start_date` (UTC) only.

### Rider finishes after midnight (DNF scenario)

**What happens:** Rider is still riding at midnight. `elapsed_time` exceeds 57,600 seconds (16 hours from 8 AM). Gun time would be valid but implausibly large.

**Correct outcome:** Reject activities with computed gun time > 14 hours (50,400 seconds). The course closes well before midnight. A 14-hour cap covers the absolute slowest realistic finisher.

**Action needed:** Add a gun time sanity cap check. Return `error: "implausible_race_time"` if exceeded.

### Strava activity marked as wrong type (e.g., "Walk" instead of "Ride")

**What happens:** Activity exists but is categorized incorrectly. `elapsed_time` and `distance` are still present.

**Correct outcome:** Current code does not filter by `sport_type` or `type`. This edge case is acceptable — the rider submitted the wrong activity, but date validation will catch activities from the wrong day. If the activity is from the right day and has enough distance, gun time scoring proceeds normally regardless of activity type.

**Action needed:** No change needed. Activity type filtering is an anti-feature (adds complexity for no benefit at 50-rider scale).

---

## Score Preview: What Riders Should See

The current preview shows "Day 1 · Moving Time" with the value from `movingTimeSeconds`. After v1.2, the preview must communicate:

1. **Race time (HH:MM:SS)** — the computed gun time, prominently displayed
2. **What it means** — "measured from the 8:00 AM gun start to when you stopped recording"
3. **Scoring weight** — "counts for 35% of your overall score"
4. **Moving time (secondary, smaller)** — "Strava moving time: HH:MM:SS (not used for scoring)" for rider reference
5. **Distance with pass/fail** — "XX.X miles recorded — minimum 80 miles required ✓"
6. **Warning if pre-gun start** — if start_date shows recording began before 8 AM, surface a note

**What NOT to show:**
- Raw seconds (unintuitive for riders)
- Score points (these are relative to other riders and not computable at preview time)
- Elapsed time separate from race time (confusing duplication; they're the same thing for race purposes)

---

## Leaderboard Display

### Column changes for Day 1

| Current label | v1.2 label | Data source |
|---------------|-----------|-------------|
| Moving Time | Race Time | `raceTimeSeconds` |
| Day 1 score | Day 1 score (unchanged) | `raceTimeScore` |

The leaderboard column showing time should display HH:MM:SS race time (not seconds, not score). The score column remains the normalized 0-35 point value.

### Sort order unchanged

Riders are still sorted by total score descending. Ties still broken by sector score, KOM score, sector time, then race time. No changes to sort logic.

### Historical note for any pre-v1.2 test submissions

If any submissions exist in the data store that used moving time, they will have `movingTimeSeconds` but no `raceTimeSeconds`. The scoring engine and leaderboard should handle this gracefully — if `raceTimeSeconds` is absent, either exclude the entry or display a placeholder. Given the event has not occurred yet, this is a data-cleanup concern, not a production concern.

---

## Feature Dependencies

```
[Strava API fetch (existing)] — already returns start_date, elapsed_time
    └──add──> [distance field capture]
              └──enables──> [distance validation]

[gun epoch constant (hardcoded)]
    └──combined with──> [start_date + elapsed_time]
                         └──computes──> [raceTimeSeconds]
                                        └──replaces──> [movingTimeSeconds in RiderResult]
                                                       └──flows into──> [scoring formula (35% component)]
                                                       └──flows into──> [score preview display]
                                                       └──flows into──> [leaderboard race time column]

[hidden start time detection]
    └──gates──> [gun time calculation]
               └──rejection if start_date is midnight+1]
```

---

## MVP for v1.2

All of the following are required. None can be deferred.

- [ ] Capture `distance` (meters) and `elapsed_time` from Strava API in `strava-fetch-activity.js`
- [ ] Add hidden start time detection: reject if `start_date` ends in `T00:00:01Z`
- [ ] Compute `raceTimeSeconds` = `(parse(start_date).epoch + elapsed_time) - GUN_START_EPOCH`
- [ ] Add Day 1 distance validation: reject if `distance < 128748` meters (80 miles)
- [ ] Add Day 2 distance validation: reject if `distance < 128748` meters (80 miles)
- [ ] Add gun time sanity cap: reject if `raceTimeSeconds > 50400` (14 hours)
- [ ] Update `RiderResult` type: add `raceTimeSeconds`, add `distanceMeters`
- [ ] Update `scoring.ts`: use `raceTimeSeconds` instead of `movingTimeSeconds` in Day 1 formula
- [ ] Update score preview: show race time label + value + moving time secondary + distance pass/fail
- [ ] Update leaderboard: rename Day 1 column from "Moving Time" to "Race Time"
- [ ] Update submit-result handler: store `raceTimeSeconds` and `distanceMeters` in rider JSON

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Strava API fields (`start_date`, `elapsed_time`, `distance`) | HIGH | Verified via official DetailedActivity docs |
| Gun time formula | HIGH | Derived from UTC epoch arithmetic; verified timezone offset for EDT June |
| Hidden start time behavior (midnight+1) | HIGH | Documented in Strava API changelog, July 3, 2024 |
| `elapsed_time` vs `moving_time` semantics | HIGH | Verified via Strava support docs and community hub |
| Distance field units (meters) | HIGH | Strava API reference documentation |
| GPS distance variance 1-3% typical | MEDIUM | Multiple GPS accuracy studies; no single authoritative cycling standard |
| 80% distance threshold | MEDIUM | Informed judgment — no industry standard exists for GPS-based validation |
| Eastern Daylight Time offset (UTC-4) | HIGH | US timezone law; Michigan observes EDT in June; confirmed -14400 seconds |
| Gun start epoch (1780660800) | HIGH | Calculable: June 6, 2026 08:00:00 ET = 12:00:00 UTC |

---

## Sources

- Strava API DetailedActivity reference: https://developers.strava.com/docs/reference/ (HIGH — official)
- Strava API changelog (hidden start time July 2024): https://developers.strava.com/docs/changelog/ (HIGH — official)
- DetailedActivity model fields: https://github.com/sshevlyagin/strava-api-v3.1/blob/master/docs/DetailedActivity.md (MEDIUM — unofficial but matches official reference)
- Gun time vs chip time definition: https://www.finishlinetiming.com/gun-time-vs-chip-time (MEDIUM — timing industry source)
- ChronoTrack: chip time vs gun time: https://support.chronotrack.com/hc/en-us/articles/204354494 (MEDIUM — timing industry source)
- GPS distance variance: https://www.dcrainmaker.com/2010/11/sport-device-gps-accuracy-in-depth-part_11.html (MEDIUM — established cycling tech source)
- Strava elapsed time semantics: https://communityhub.strava.com (MEDIUM — community verified against support docs)
- UTC epoch for June 6, 2026 08:00 ET: computed directly (HIGH — deterministic)

---

*Feature research for: Iron & Pine Omnium v1.2 — Scoring Integrity (gun time + distance validation)*
*Researched: 2026-04-14*
