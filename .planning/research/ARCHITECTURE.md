# Architecture: Gun Time Scoring and Distance Validation

**Milestone:** Gun time scoring + distance validation for Day 1
**Researched:** 2026-04-14
**Confidence:** HIGH — based on direct inspection of all six production files listed in the milestone context. No speculation required.

---

## What Is Changing and Why

Day 1 currently stores `movingTimeSeconds` (Strava's active pedaling time, pauses excluded).
Gun time scoring requires **elapsed time from the 8:00 AM gun** — not moving time. For a mass
start event, what matters is when you crossed the finish line relative to the start gun, not
how much time you spent moving.

The formula: `raceTimeSeconds = finishEpoch - gunEpoch`
where:
- `gunEpoch` = fixed timestamp for June 6 2026 08:00:00 ET (Unix seconds)
- `finishEpoch` = `start_date` (UTC epoch from Strava API) + `elapsed_time` (seconds)

Strava provides both fields in the activity response that is already being fetched.

Distance validation adds a gate: Day 1 activities shorter than a minimum threshold are
rejected before the rider reaches the confirm screen.

---

## Data Flow: Current vs New

### Current flow (moving time)

```
Strava API response
  └─ activity.moving_time
       └─ strava-fetch-activity.js returns { movingTimeSeconds }
            └─ submit-confirm.astro displays it
                 └─ submit-result.js stores { movingTimeSeconds }
                      └─ athlete.day1.movingTimeSeconds
                           └─ athlete-loader.ts maps to rider.movingTimeSeconds
                                └─ scoring.ts: fastestMovingTime / rider.movingTime * weight
                                     └─ Leaderboard.astro column "Day 1"
```

### New flow (gun time)

```
Strava API response
  └─ activity.start_date (UTC ISO string, e.g. "2026-06-06T12:00:00Z")
  └─ activity.elapsed_time (integer seconds)
  └─ activity.distance (float meters)
       └─ strava-fetch-activity.js:
            - validates distance >= MIN_DAY1_DISTANCE_METERS (if Day 1)
            - computes raceTimeSeconds = (startEpoch + elapsed_time) - gunEpoch
            - returns { raceTimeSeconds, distanceMeters, elapsedTimeSeconds }
            - continues to return { movingTimeSeconds } for Day 2 backward compat
               └─ submit-confirm.astro:
                    - Day 1 panel: shows race time (not moving time)
                    - hidden field: raceTimeSeconds (not movingTimeSeconds for Day 1)
                       └─ submit-result.js:
                            - reads raceTimeSeconds from body for Day 1
                            - stores athlete.day1 = { raceTimeSeconds, distanceMeters, activityId, submittedAt }
                               └─ athlete-loader.ts:
                                    - reads raceTimeSeconds from day1
                                    - maps to rider.movingTimeSeconds (field rename in RiderResult)
                                         └─ scoring.ts: unchanged formula, different input field name
                                              └─ Leaderboard.astro: column header "Day 1 Race Time"
                                                   benchmarks label "Fastest race time"
```

---

## File-by-File Changes

### 1. `src/lib/event-config.ts` — NEW FILE

**Why a new file:** The gun time constant (gun start epoch) must be accessible in both
`strava-fetch-activity.js` (Netlify Function, Node) and potentially `scoring.ts` (Astro
build-time, browser). A single source of truth prevents drift.

**Why not `src/lib/segments.ts`:** That file is Day 2 specific. Mixing Day 1 timing config
into it creates wrong conceptual grouping.

**Why not an env var:** The gun time is a hard event fact, not deployment-dependent
configuration. Env vars are for secrets and environment-specific values (tokens, repo names,
webhook URLs). A June 6 2026 8:00 AM ET gun start is not going to differ between production
and staging.

**Why not inline in the function:** The function is `.js` (not `.ts`) and imports from
`src/lib/segments.ts` already via a relative path. The same pattern works here. Inlining
creates a maintenance hazard — if anyone copies the constant they may get the timezone wrong.

```typescript
// src/lib/event-config.ts

/** Day 1 gun start: June 6 2026 08:00:00 Eastern Time (UTC-4 during EDT) */
export const DAY1_GUN_START_EPOCH_SECONDS = 1749211200; // 2026-06-06T12:00:00Z

/** Minimum distance for a valid Day 1 submission (meters). ~95 miles. */
export const MIN_DAY1_DISTANCE_METERS = 152_888; // 95 miles in meters

/** Day 1 event date string (local) */
export const DAY1_DATE = "2026-06-06";

/** Day 2 event date string (local) */
export const DAY2_DATE = "2026-06-07";
```

The epoch value `1749211200` should be verified before finalizing: June 6 2026 12:00:00 UTC
= 08:00:00 EDT (UTC-4). Cross-check: `new Date(1749211200 * 1000).toISOString()` should
return `"2026-06-06T12:00:00.000Z"`.

Minimum distance rationale: The route is ~102 miles. 95 miles (152,888 m) gives a 7% margin
for GPS variance and riders who start/stop recording slightly off-route. This is a judgment
call — the implementation should flag this constant with a comment so it can be adjusted.

---

### 2. `netlify/functions/strava-fetch-activity.js` — MODIFIED

**New import:**
```javascript
import { DAY1_GUN_START_EPOCH_SECONDS, MIN_DAY1_DISTANCE_METERS, DAY1_DATE } from "../../src/lib/event-config.ts";
```

**New fields to extract from API response** (Step 7 area, after existing segment extraction):
- `activity.start_date` — UTC ISO string (e.g. `"2026-06-06T12:00:00Z"`). This is the true
  UTC start, unlike `start_date_local` which has a misleading Z suffix.
- `activity.elapsed_time` — integer seconds including stopped time
- `activity.distance` — float meters

**Where distance validation happens: in this function (fetch time), not in submit-result.**
Rationale: Fast fail. If the activity is too short, the rider sees the error before reaching
the confirm screen. submit-result cannot show user-facing error messages with context — it
returns a JSON error code that gets mapped to a generic message. The fetch function already
returns `{ error: "wrong_date" }` — this pattern extends cleanly to `{ error: "distance_too_short", distanceMeters: X }` so the confirm UI can show the actual distance.

Distance check applies only when `localDateStr === DAY1_DATE`. Day 2 has no distance gate.

**Gun time computation** happens here, not in submit-result. Rationale: This is where all
other activity-level computations live (segment extraction, date validation, ownership check).
Keeping the computation here means submit-result receives a clean `raceTimeSeconds` value and
does not need to know about the gun time constant. submit-result is a storage function; it
should not contain event-domain logic.

**Computation:**
```javascript
// Only for Day 1 activities
const startEpoch = Math.floor(new Date(activity.start_date).getTime() / 1000);
const finishEpoch = startEpoch + activity.elapsed_time;
const raceTimeSeconds = finishEpoch - DAY1_GUN_START_EPOCH_SECONDS;
```

If `raceTimeSeconds <= 0`, the activity started after the gun — this is an error condition
(rider submitted wrong activity, or clock is wrong). Return `{ error: "invalid_race_time" }`.

**Return payload additions for Day 1:**
```javascript
// Add to existing return body
raceTimeSeconds,           // integer — gun time in seconds
distanceMeters: activity.distance,  // float — for UI display
elapsedTimeSeconds: activity.elapsed_time,  // retain for transparency
// movingTimeSeconds still returned for Day 2 backward compat
```

For Day 2 activities: no changes to return shape. `raceTimeSeconds` and `distanceMeters` are
omitted (undefined on the payload object). The confirm page conditionally renders by day.

**New error code to add to submit.astro errorMessages:**
- `distance_too_short`: "Your activity is {X} miles — Day 1 requires at least 95 miles."

---

### 3. `netlify/functions/submit-result.js` — MODIFIED

**New destructured fields from body:**
```javascript
const { name, category, activityId, athleteId, raceTimeSeconds, distanceMeters,
        movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds, komEfforts } = body;
```

`movingTimeSeconds` is kept in destructuring to avoid breaking Day 2 submissions, which still
carry it (it's used for the `movingTimeSeconds` return from fetch for Day 2, though Day 2
doesn't store it in the athlete JSON today — this is just defensive destructuring).

**Day 1 storage object changes:**
```javascript
// Old
athleteData.day1 = {
  movingTimeSeconds: Number(body.movingTimeSeconds),
  activityId: body.activityId,
  submittedAt: now,
};

// New
athleteData.day1 = {
  raceTimeSeconds: Number(body.raceTimeSeconds),
  distanceMeters: Number(body.distanceMeters),
  activityId: body.activityId,
  submittedAt: now,
};
```

`movingTimeSeconds` is dropped from Day 1 storage. It was never used for anything in the
existing system after scoring moved to `raceTimeSeconds`. Keeping it would create ambiguity
about which field is authoritative.

**Validation to add:**
```javascript
if (isDay1) {
  if (!raceTimeSeconds || Number(raceTimeSeconds) <= 0) {
    return { statusCode: 200, body: JSON.stringify({ error: "invalid_payload" }) };
  }
}
```

Note: Distance validation is already done in strava-fetch-activity.js. submit-result does
not re-validate distance — it trusts the fetch function screened it. The function-to-function
trust is acceptable here because submit-result already trusts athleteId from the session cookie
and re-validates against it. The distance is informational at submit time.

---

### 4. `src/lib/athlete-loader.ts` — MODIFIED

**AthleteJson interface change:**
```typescript
// Old day1 shape
day1: {
  movingTimeSeconds: number;
  activityId: string;
  submittedAt: string;
} | null;

// New day1 shape
day1: {
  raceTimeSeconds: number;
  distanceMeters?: number;   // optional — absent in legacy data before this milestone
  activityId: string;
  submittedAt: string;
} | null;
```

`distanceMeters` is optional because any athlete JSON written before this milestone will not
have it. Making it required would break the build for existing data.

**loadAthleteResults() mapping change:**
```typescript
// Old
movingTimeSeconds: athlete.day1!.movingTimeSeconds,

// New — the RiderResult field stays named movingTimeSeconds to minimize scoring.ts changes
movingTimeSeconds: athlete.day1!.raceTimeSeconds,
```

The `RiderResult.movingTimeSeconds` field in `types.ts` can optionally be renamed to
`raceTimeSeconds` for clarity, but this is a cosmetic change that touches scoring.ts and
Leaderboard.astro. See the rename trade-off note in the types section below.

**Backward compatibility for old athlete JSON files:** Any existing athlete JSON with
`day1.movingTimeSeconds` (no `raceTimeSeconds`) will fail to score because
`athlete.day1!.raceTimeSeconds` will be `undefined`, resulting in `NaN` in scoring. This
must be handled explicitly:

```typescript
movingTimeSeconds: athlete.day1!.raceTimeSeconds ?? athlete.day1!.movingTimeSeconds ?? 0,
```

This three-way fallback ensures old records (movingTimeSeconds) still score during any
transition period, and `0` prevents NaN propagation. Once all pre-milestone athletes
resubmit, the fallback becomes dead code but causes no harm.

---

### 5. `src/lib/types.ts` — DECISION POINT

**Option A: Rename field**
```typescript
interface RiderResult {
  raceTimeSeconds: number;  // was movingTimeSeconds
  ...
}
```
This requires updating: `scoring.ts` (4 references), `Leaderboard.astro` (2 references),
`athlete-loader.ts` (1 reference). Total: 7 touch points. Benefit: correct naming.

**Option B: Keep field name as `movingTimeSeconds`**
Touch points: 0 additional changes. Benefit: surgical change, lower risk. Cost: misleading
field name in types.

**Recommendation: Option B for this milestone.** The field is internal to the scoring engine.
The rename is cosmetic and carries non-trivial risk of introducing a typo across 7 files. The
label "Moving Time" only appears to users in the UI, which IS changing (see Leaderboard.astro
below). Internal field naming can be addressed in a cleanup milestone.

---

### 6. `src/lib/scoring.ts` — MINIMAL CHANGES

The scoring formula is **unchanged**:
```
raceTimeScore = (fastest / rider) * scoreScale * movingTimeWeight
```

The formula is correct for gun time. Fastest rider scores 100 * 0.35 = 35 points. All others
score proportionally less. This is exactly the desired behavior for a time-scored component.

**Weight:** `movingTimeWeight: 0.35` stays the same. The milestone context confirms 35% for
Day 1.

**`defaultScoringConfig` field name:** `movingTimeWeight` stays as-is (matching Option B
above). No changes to scoring.ts.

**`benchmarks.fastestMovingTimeSeconds`:** Will now hold the fastest race time in seconds.
The name is internal — only Leaderboard.astro surfaces it to users.

**`formatDuration` function:** No changes needed. It formats any integer seconds as HH:MM:SS,
which is correct for race times.

---

### 7. `src/pages/submit-confirm.astro` — MODIFIED

**New hidden field:**
```html
<input type="hidden" name="raceTimeSeconds" id="h-raceTimeSeconds" />
<input type="hidden" name="distanceMeters" id="h-distanceMeters" />
```

The `movingTimeSeconds` hidden field should remain for Day 2 submissions (which still pass
`movingTimeSeconds` from the fetch function). For Day 1, `movingTimeSeconds` hidden field
will be empty — that is fine, submit-result.js only reads `raceTimeSeconds` for Day 1.

**Payload type extension:**
```typescript
type Payload = {
  // ... existing fields
  raceTimeSeconds?: number;   // Day 1 only
  distanceMeters?: number;    // Day 1 only
  // movingTimeSeconds kept for Day 2
};
```

**Day 1 preview panel (id="day1-preview") — label and explain text change:**
- Old label: `"Day 1 · Moving Time"`
- New label: `"Day 1 · Race Time"`
- Old explain: "Your moving time counts for 35% of your overall score..."
- New explain: "Your race time from the 8:00 AM gun counts for 35% of your overall score, benchmarked against the fastest rider in your category."
- Value display: `formatTime(payload.raceTimeSeconds ?? 0)` instead of `formatTime(movingTime)`

The distance can optionally be shown in the Day 1 preview as a sub-label:
```
Race Time: 6:42:17
Distance: 103.2 mi
```
This gives the rider confirmation their activity is the right one.

**populateHiddenFields() additions:**
```typescript
set("h-raceTimeSeconds", payload.raceTimeSeconds);
set("h-distanceMeters", payload.distanceMeters);
```

**Form submit payload additions:**
```typescript
raceTimeSeconds: Number(fd.get("raceTimeSeconds")),
distanceMeters: Number(fd.get("distanceMeters")),
```

---

### 8. `src/components/Leaderboard.astro` — MODIFIED

**Winner banner benchmark label:**
- Old: `"Fastest moving time"`
- New: `"Fastest race time"`

**Table column header:**
- Old: `<th scope="col">Day 1</th>`
- New: `<th scope="col">Day 1 Race Time</th>`

**Score note under Day 1 score:**
- Old: `{formatDuration(entry.rider.movingTimeSeconds)}`
- New: `{formatDuration(entry.rider.movingTimeSeconds)}` — unchanged if using Option B
  (field still named movingTimeSeconds internally, value is now race time in seconds)

No structural changes to the leaderboard table. The per-column score display pattern
(score + sub-label with raw time) is correct and just needs the label text updated.

---

### 9. `src/pages/submit.astro` — MINOR MODIFICATION

Add new error code to `errorMessages`:
```javascript
distance_too_short: "Your Day 1 activity is too short. Please submit your full Hiawatha's Revenge activity.",
```

Optionally include the actual distance in the error response from the function and display it:
`"Your activity was recorded as 87.3 miles. Day 1 requires at least 95 miles."`
This requires the function to return `{ error: "distance_too_short", distanceMeters: X }` and
the submit.astro error handler to read `result.distanceMeters` dynamically.

---

## Athlete JSON Schema: Before and After

### Before (day1)
```json
{
  "day1": {
    "movingTimeSeconds": 24537,
    "activityId": "12345678",
    "submittedAt": "2026-06-06T18:00:00.000Z"
  }
}
```

### After (day1)
```json
{
  "day1": {
    "raceTimeSeconds": 24137,
    "distanceMeters": 164523.4,
    "activityId": "12345678",
    "submittedAt": "2026-06-07T14:00:00.000Z"
  }
}
```

Note: `raceTimeSeconds` will typically be less than the old `movingTimeSeconds` — race time
includes only the time from gun to finish, which may be close to or less than moving time
depending on how much the rider stopped. Race time starts from 8:00 AM regardless of when
the rider actually started recording their activity (GPS warm-up, false starts, etc.).

### Day 2 (unchanged)
```json
{
  "day2": {
    "sectorEfforts": { "41159670": 1203, ... },
    "komSegmentIds": ["24479270", "16438243"],
    "komEfforts": { "24479270": 312, "16438243": 782 },
    "activityId": "87654321",
    "submittedAt": "2026-06-07T20:00:00.000Z"
  }
}
```

---

## Build Order and Dependencies

The dependencies flow strictly top-down. Changes must be implemented in this order to avoid
TypeScript errors during Astro's build step:

```
1. src/lib/event-config.ts          (new — no dependencies)
2. netlify/functions/strava-fetch-activity.js  (imports event-config)
3. src/lib/athlete-loader.ts        (AthleteJson interface, loadAthleteResults mapping)
4. src/lib/types.ts                 (if renaming field — depends on loader decision)
5. src/lib/scoring.ts               (depends on types.ts — likely no changes)
6. src/pages/submit-confirm.astro   (client-side only, no TS build dependency)
7. src/components/Leaderboard.astro (depends on scoring.ts types via leaderboard data)
8. src/pages/submit.astro           (errorMessages only — independent)
9. netlify/functions/submit-result.js  (independent of TS build — Node runtime)
```

Steps 1-5 must be complete before running `pnpm build` to verify types. Steps 6-9 can
be implemented in any order but should be tested together as a flow.

**Why submit-result.js is last:** It stores data that athlete-loader.ts reads at build time.
Testing the full pipeline (fetch → confirm → submit → rebuild → leaderboard) requires all
prior steps to be working.

---

## Gun Time Constant Placement: Decision Summary

| Option | Pros | Cons |
|--------|------|------|
| `src/lib/event-config.ts` | Single source of truth, importable by both TS and JS files, version controlled, self-documenting | Requires new file |
| Inline in strava-fetch-activity.js | Zero new files | Buried in function, duplicated if needed elsewhere |
| Environment variable | Flexible per environment | Wrong conceptual fit — gun time is a fact, not config |
| inline in scoring.ts | Near where it's used | scoring.ts is build-time only; function can't import it cleanly |

**Decision: `src/lib/event-config.ts`.**
The function already imports from `../../src/lib/segments.ts` using the same relative path
pattern. This is established precedent in the codebase. The gun start epoch is an event fact
that belongs alongside other event facts (dates, distances) in a dedicated config module.

---

## Risk Areas

**Timezone calculation for gun epoch.** Eastern Daylight Time on June 6 2026 is UTC-4. The
epoch `1749211200` must be verified independently — a one-hour error here silently corrupts
every Day 1 race time. Recommended: add a test or a dev-time assertion that logs the
computed epoch date as a sanity check.

**Negative race times.** If a rider starts recording after the gun fires but finishes before
others, their `start_date + elapsed_time` (finish epoch) minus the gun epoch is still
positive and correct. The edge case is if a rider's Strava clock is severely wrong, or if
they submit the wrong activity. The `raceTimeSeconds <= 0` guard in strava-fetch-activity.js
catches the most obvious case.

**Old athlete JSON files.** Any athlete JSON written before this milestone has
`day1.movingTimeSeconds` not `day1.raceTimeSeconds`. The fallback in athlete-loader.ts
(`?? athlete.day1!.movingTimeSeconds`) handles this gracefully but means old scores use
moving time (pre-gun-time methodology). If this matters for fairness, old data should be
re-submitted or migrated.

**Distance threshold calibration.** The 95-mile minimum is a judgment call. If GPS tracks
routinely come in under 95 miles due to recording gaps on forest roads, riders will see
false rejections. This threshold should be confirmed with route GPS data before launch.
