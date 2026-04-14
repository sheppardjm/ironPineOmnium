# Technology Stack — Gun Time Scoring + Distance Validation Milestone

**Project:** Iron & Pine Omnium
**Milestone:** Gun time scoring (Day 1) + distance validation at submission
**Researched:** 2026-04-14
**Overall confidence:** HIGH

---

## Scope

This document covers only the stack additions and changes needed to implement:

1. **Gun time scoring** — replace `moving_time` with race time (wall-clock finish minus fixed gun start)
2. **Distance validation** — reject submissions below minimum distance threshold at fetch time

The existing stack (Astro 6, TypeScript, Netlify Functions v1 ESM, pnpm, GitHub Contents API,
Netlify rebuild hooks) is preserved unchanged. No new packages are needed.

---

## Strava API Field Reference

All fields are returned by the existing endpoint:
`GET https://www.strava.com/api/v3/activities/{id}?include_all_efforts=true`

No endpoint change is required.

### Fields Currently Captured

| Field | Type | Unit | Example | Notes |
|-------|------|------|---------|-------|
| `moving_time` | integer | seconds | `16200` | Already extracted; used as Day 1 score |
| `start_date_local` | string (ISO 8601) | — | `"2026-06-06T08:03:22Z"` | Already used for date validation |

### New Fields to Capture

| Field | Type | Unit | Example | Notes |
|-------|------|------|---------|-------|
| `elapsed_time` | integer | seconds | `17405` | Total wall-clock duration (includes stops) |
| `distance` | float | meters | `163,934.0` | GPS-measured distance for the full activity |
| `start_date` | string (ISO 8601, UTC) | — | `"2026-06-06T12:03:22Z"` | UTC absolute instant — NOT needed (see below) |

**Confidence:** HIGH — field names, types, and example values confirmed from official Strava API
reference at `https://developers.strava.com/docs/reference/#api-models-DetailedActivity`.

---

## Field Semantics — Critical Distinctions

### `start_date` vs `start_date_local`

Both are ISO 8601 strings ending in `Z`. This is misleading:

- `start_date` — TRUE UTC. `"2026-06-06T12:03:22Z"` means 12:03 UTC = 8:03 AM EDT.
- `start_date_local` — Local civil time, formatted AS IF UTC. `"2026-06-06T08:03:22Z"` means
  "the athlete's device showed 8:03 AM." The `Z` suffix is technically wrong; Strava attaches it
  as a formatting convention, not a timezone indicator.

This is documented Strava behavior and already handled correctly in `strava-fetch-activity.js`
via `activity.start_date_local.slice(0, 10)` for date comparison. The comment on line 156
explicitly notes the misleading `Z` suffix.

### `elapsed_time`

Wall-clock seconds from the moment the device started recording to the moment it stopped.
Includes all pauses, stops, and rest time. For a bike race where the rider stops at an aid station,
`elapsed_time` captures the full duration. `moving_time` strips pauses. Gun time scoring requires
`elapsed_time` — not `moving_time`.

### `distance`

Total GPS-measured distance in meters (float). For a ~102-mile ride, expect approximately
`164,000` meters (1 mile ≈ 1,609.344 meters). The value reflects the actual GPS track distance;
it may be slightly higher than the nominal course distance due to GPS drift.

---

## Scope Authorization

The existing `activity:read_all` scope covers `elapsed_time` and `distance` without any change.

**Why:** Scope controls which activities are visible (public vs "Only You"), not which fields
within an activity are returned. All `DetailedActivity` fields — including `elapsed_time`,
`distance`, `start_date`, `start_date_local`, `timezone`, and `utc_offset` — are returned for
any activity the scope permits the app to read. The app already holds `activity:read_all`, so
no re-authorization and no scope change is needed.

**Confidence:** HIGH — confirmed from Strava authentication documentation at
`https://developers.strava.com/docs/authentication/`. The scope page describes access by
visibility level only, with no per-field restrictions documented.

---

## Gun Time Calculation

### Approach: Fixed Gun Start + elapsed_time

**Do not compute finish_time = start_date_local + elapsed_time for race scoring.**

Gun time in a mass-start race is:
```
race_time = finish_time - gun_start_time
          = (rider_device_start + elapsed_time) - gun_start
```

But since the gun start is fixed and known, and riders start their devices near gun time, a
simpler and more auditable formula is:

```
gun_time_seconds = elapsed_time + (device_start_offset_from_gun)
```

The cleanest implementation for this event:

```typescript
// Day 1: Hiawatha's Revenge, June 6 2026, gun start 8:00 AM EDT
// Gun time = elapsed_time on the activity, anchored relative to gun start.
//
// start_date_local "2026-06-06T08:03:22Z" means device started at 8:03:22 AM local.
// Gun went off at 8:00:00 AM local.
// device_start_offset = 3 minutes 22 seconds = 202 seconds late start
//
// race_time = elapsed_time + device_start_offset
//           = elapsed_time + (device_local_start_seconds - gun_start_seconds)

const GUN_START_SECONDS_FROM_MIDNIGHT = 8 * 3600; // 8:00:00 AM = 28800 seconds

function computeGunTimeSeconds(
  startDateLocal: string,  // e.g. "2026-06-06T08:03:22Z"
  elapsedTime: number      // seconds from Strava API
): number {
  // Extract local time components — treat the string as local time ignoring the Z
  const [, timePart] = startDateLocal.split('T');
  const [hh, mm, ss] = timePart.replace('Z', '').split(':').map(Number);
  const deviceStartSecondsFromMidnight = hh * 3600 + mm * 60 + ss;

  const startOffset = deviceStartSecondsFromMidnight - GUN_START_SECONDS_FROM_MIDNIGHT;
  // startOffset > 0 means rider started device AFTER the gun (common)
  // startOffset < 0 means rider started device BEFORE the gun (pre-staging)

  return elapsedTime + startOffset;
}
```

This approach:
- Uses `start_date_local` (already in the response, already understood)
- Requires no timezone library — the local time IS the correct civil time
- Does not use `start_date` (UTC) at all — avoids UTC/local conversion entirely
- Is fully deterministic from the two values Strava returns

### Why NOT to use `start_date` (UTC) for this calculation

The tempting approach of `finish_UTC = new Date(start_date) + elapsed_time` then converting to
EDT introduces unnecessary complexity. The gun start is defined in local civil time (8:00 AM EDT).
`start_date_local` is already in local civil time. No conversion needed.

### Edge cases to handle in implementation

| Scenario | Expected behavior |
|----------|-------------------|
| Rider started device 5+ min before gun | `startOffset` is negative; subtract from elapsed_time |
| Rider forgot to stop device at finish | `elapsed_time` is inflated; leaderboard shows slow time naturally |
| Rider paused/resumed mid-ride | `elapsed_time` captures full wall clock; correct for gun time |
| `start_date_local` is midnight+1s (hidden activity) | Date validation already rejects this (wrong date) |

---

## Distance Validation

### Threshold Values

| Day | Event | Nominal Distance | Minimum Threshold | Rationale |
|-----|-------|-----------------|-------------------|-----------|
| Day 1 (June 6) | Hiawatha's Revenge | ~102 miles (~164 km) | 145 km (90 mi) | ~10% under nominal; allows GPS drift shortfall |
| Day 2 (June 7) | MK Ultra Gravel | ~100 miles (~161 km) | No change (sectors/KOM scoring) | Distance not used as score; threshold optional |

**Recommended:** For Day 1, reject if `activity.distance < 145_000` (meters). This is a sanity
check against someone submitting a partial ride, not a precise finish validator.

### Implementation pattern

```typescript
// In strava-fetch-activity.js, after date validation:
const MIN_DISTANCE_METERS = {
  "2026-06-06": 145_000,  // Hiawatha: ~90 miles minimum
  "2026-06-07": 0,         // MK Ultra: no distance floor (sectors-based scoring)
};

const minDist = MIN_DISTANCE_METERS[localDateStr] ?? 0;
if (activity.distance < minDist) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      error: "distance_too_short",
      actualDistanceMeters: activity.distance,
      minimumDistanceMeters: minDist,
    }),
  };
}
```

**Confidence:** HIGH — `distance` field behavior and units confirmed from official docs. Threshold
values are a product/event decision, not a Strava constraint.

---

## Timezone Handling

### Verdict: No library needed.

The gun start is defined in local civil time. `start_date_local` already contains local civil time.
The calculation (extract hours/minutes/seconds from the string) requires only basic string parsing —
no timezone awareness, no DST handling, no IANA database lookup.

**Michigan's Upper Peninsula timezone context:**

The UP observes Eastern Time. On June 6, 2026, EDT is UTC-4 (DST in effect). This means:
- Gun start: 8:00 AM EDT = 12:00 PM UTC
- `start_date` for a rider starting at 8:03 AM will show `"2026-06-06T12:03:22Z"` (UTC)
- `start_date_local` for the same rider shows `"2026-06-06T08:03:22Z"` (local, misleading Z)

The calculation only touches `start_date_local`. UTC and DST rules are irrelevant.

**If timezone conversion were ever needed** (not currently needed), the correct built-in approach
is `Intl.DateTimeFormat` with `timeZone: 'America/New_York'`. This handles DST automatically
via the V8/Node.js IANA timezone database, which is bundled in Node.js 18+. No `luxon`, `dayjs`,
or `moment-timezone` is needed.

**No new npm packages for timezone handling.**

---

## Changes to `strava-fetch-activity.js`

This is the only file that needs modification. Changes are additive:

### 1. Extract two new fields from the activity response

```javascript
// After: movingTimeSeconds: activity.moving_time,
elapsedTimeSeconds: activity.elapsed_time,   // integer, seconds
distanceMeters: activity.distance,            // float, meters
```

### 2. Add distance validation block (after date validation, before segment extraction)

Insert the distance threshold check described above.

### 3. Add gun time computation (for Day 1 only)

Compute `gunTimeSeconds` from `elapsed_time` + device start offset vs gun start. Return it
alongside `movingTimeSeconds` so the scoring layer can use the correct value.

### 4. Pass gun time in the returned JSON

```javascript
// Returned body additions:
gunTimeSeconds: computedGunTime,      // null for Day 2 (no gun time scoring)
elapsedTimeSeconds: activity.elapsed_time,
distanceMeters: activity.distance,
```

### File path

```
netlify/functions/strava-fetch-activity.js
```

No other files require stack-level changes for this milestone. The scoring logic that consumes
`gunTimeSeconds` (replacing `movingTimeSeconds` for Day 1) lives in whatever calls this function
and writes to the leaderboard JSON.

---

## New Packages

**None.** This milestone requires zero new npm packages.

| Package | Decision | Reason |
|---------|----------|--------|
| `luxon` | No | Timezone handling not needed for this calculation |
| `dayjs` + timezone plugin | No | Same — `start_date_local` already in civil time |
| `moment-timezone` | No | Deprecated; not appropriate regardless |
| Any date library | No | String slicing of ISO 8601 is sufficient and correct |

---

## What NOT to Change

| Existing element | Status |
|-----------------|--------|
| `activity:read_all` scope | No change — already covers `elapsed_time` and `distance` |
| Strava API endpoint | No change — `include_all_efforts=true` already returns both fields |
| Date validation logic (`start_date_local.slice(0, 10)`) | No change — correct as-is |
| Cookie/session handling | No change |
| GitHub Contents API persistence | Minor change — leaderboard schema adds `gunTimeSeconds`, `distanceMeters` columns |
| Day 2 scoring (sectors + KOM) | No change — `elapsed_time` is already extracted per-segment-effort, not the activity level |

---

## Sources

- Strava API DetailedActivity model (elapsed_time, distance, start_date, start_date_local types
  and examples): `https://developers.strava.com/docs/reference/#api-models-DetailedActivity` — HIGH confidence
- Strava authentication scope documentation (activity:read_all field access):
  `https://developers.strava.com/docs/authentication/` — HIGH confidence
- Strava community: end time = start_date + elapsed_time:
  `https://communityhub.strava.com/developers-api-7/how-to-get-end-date-or-calculate-end-date-2598` — HIGH confidence
- start_date_local misleading Z suffix: confirmed in existing codebase comment (line 156
  of `netlify/functions/strava-fetch-activity.js`) and consistent with Strava community docs — HIGH confidence
- Intl.DateTimeFormat + IANA timezone support in Node.js 18+ (if ever needed):
  MDN `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat` — HIGH confidence
- Distance field units (meters, float): Strava API reference — HIGH confidence

---

*Stack research for: ironPineOmnium — Gun Time Scoring + Distance Validation milestone*
*Researched: 2026-04-14*
