# Research Summary: Iron & Pine Omnium — Scoring Integrity (v1.2)

**Project:** Iron & Pine Omnium
**Domain:** Strava-integrated gravel cycling omnium — gun time scoring + distance validation
**Researched:** 2026-04-14
**Confidence:** HIGH

---

## Key Consensus

All four research dimensions are tightly aligned on the core implementation. One significant
disagreement exists between the Stack researcher and the Features/Architecture researchers on
timezone handling — resolved below. Key consensus points:

1. **Zero new npm packages.** No date library is needed. `elapsed_time` and `distance` are
   already returned by the existing `GET /activities/{id}?include_all_efforts=true` endpoint
   under the existing `activity:read_all` scope.

2. **Gun time uses `start_date` (UTC epoch), not `start_date_local`.** See the resolution
   below. This is the position endorsed by Features, Architecture, and Pitfalls research.

3. **Distance validation belongs in `strava-fetch-activity.js` at fetch time**, not in
   `submit-result.js`. Fast-fail with a user-readable error before the rider reaches the
   confirm screen.

4. **A new `src/lib/event-config.ts` file** holds the gun epoch constant and distance
   thresholds as a single source of truth. This prevents drift between the Netlify function
   and any build-time code that needs the same values.

5. **The scoring formula structure is unchanged.** `fastestRaceTime / riderRaceTime * weight`
   is identical to the existing formula; only the input metric changes from `movingTimeSeconds`
   to `raceTimeSeconds`.

6. **"Hide Start Time" privacy** returns `start_date = "YYYY-MM-DDT00:00:01Z"`, making gun
   time impossible to compute. This must be detected and rejected before the calculation runs.

---

## Timezone Disagreement -- Resolution

The Stack researcher proposed: parse `start_date_local` as a string, extract the hour/minute/
second components, compute seconds-from-midnight, then subtract the gun start's
seconds-from-midnight. This avoids UTC arithmetic entirely.

The Features and Architecture researchers proposed: parse `start_date` as a true UTC epoch,
add `elapsed_time` to get the finish epoch, subtract the hardcoded gun epoch (1780660800).

**This summary adopts the Features/Architecture approach (UTC epoch arithmetic) for the
following reasons:**

- `start_date` is the only field Strava guarantees to be true UTC. `start_date_local` carries
  a Z suffix that is not a timezone indicator -- it is Strava's formatting convention for local
  civil time. This is acknowledged in the Stack research itself and called out explicitly in the
  Pitfalls research as a documented source of 4-hour errors if parsed as UTC.

- Device timezone setting: a rider whose Garmin is set to Central Time will produce a
  `start_date_local` that reads one hour behind Eastern Time, but `start_date` will still be
  correct UTC. The Stack approach would compute the wrong offset in this scenario. The
  UTC epoch approach is immune to device timezone configuration.

- The UTC approach is simpler logic at the formula level: two additions and a subtraction on
  integers. The `start_date_local` approach requires string slicing, split, map, and
  multiplication.

- The gun epoch is a fixed, pre-computable constant for June 6 2026 08:00:00 EDT = 12:00:00 UTC.
  Cross-check: `new Date(GUN_START_EPOCH_SECONDS * 1000).toISOString()` must return
  `"2026-06-06T12:00:00.000Z"`. Verify this constant before shipping.

**The correct formula:**

```typescript
// June 6 2026, 8:00 AM EDT = 12:00:00 UTC
const GUN_START_EPOCH_SECONDS = /* verify independently */;

const startEpoch = Math.floor(new Date(activity.start_date).getTime() / 1000);
const finishEpoch = startEpoch + activity.elapsed_time;
const raceTimeSeconds = finishEpoch - GUN_START_EPOCH_SECONDS;
// raceTimeSeconds <= 0 is an error condition -- reject
```

---

## Stack Additions

The existing stack (Astro 6, TypeScript, Netlify Functions v1 ESM, pnpm, GitHub Contents API)
is **unchanged**. This milestone is additive.

**New source file (one):**
- `src/lib/event-config.ts` -- exports the gun epoch constant, distance thresholds, and event
  date strings as a single source of truth importable by both `.ts` source files and Netlify
  `.js` functions via relative path (same pattern already used by `segments.ts`).

**New npm packages: zero.**

| Package | Decision | Reason |
|---------|----------|--------|
| luxon, dayjs, moment-timezone | No | UTC epoch arithmetic needs only `new Date().getTime()` -- built into Node/V8 |
| Any date parsing library | No | ISO 8601 to epoch is `new Date(str).getTime()` -- no library needed |

**Modified files (five):**

| File | Type of change |
|------|----------------|
| `netlify/functions/strava-fetch-activity.js` | Extract `elapsed_time`, `distance`, `start_date`; add hidden-start detection; compute `raceTimeSeconds`; add distance gate |
| `netlify/functions/submit-result.js` | Store `raceTimeSeconds` + `distanceMeters` in athlete JSON; drop `movingTimeSeconds` from Day 1 |
| `src/lib/athlete-loader.ts` | Update `AthleteJson` interface; map `raceTimeSeconds` to score input; add `movingTimeSeconds` fallback for legacy data |
| `src/pages/submit-confirm.astro` | Add hidden fields; update Day 1 preview label to "Race Time"; show distance |
| `src/components/Leaderboard.astro` | Rename column header "Moving Time" to "Race Time" |

---

## Feature Categories

### Table Stakes (must ship -- scoring is wrong without all of these)

| Feature | Notes |
|---------|-------|
| Extract `elapsed_time` and `distance` from Strava API | Already in response; add to returned payload |
| Hidden start time detection | Reject if `start_date` ends in `T00:00:01Z`; clear error message to rider |
| Gun time computation | `(parse(start_date).epoch + elapsed_time) - GUN_START_EPOCH` |
| Day 1 distance validation | Reject if `distance < 128,748 m` (80 miles); at fetch time with user-readable error |
| Gun time sanity cap | Reject if `raceTimeSeconds > 50,400` (14 hours) |
| `RiderResult` schema update | Add `raceTimeSeconds`; `distanceMeters` optional for legacy compat |
| Scoring formula switch | Use `raceTimeSeconds` in `fastestTime / riderTime * 0.35` |
| Score preview: Race Time label | Show computed gun time, not `movingTimeSeconds` |
| Leaderboard column rename | "Moving Time" to "Race Time" |
| `submit-result.js` storage update | Write `raceTimeSeconds` + `distanceMeters` to athlete JSON |

### Differentiators (high value, low effort -- ship in v1.2)

| Feature | Value |
|---------|-------|
| Show moving time alongside race time in preview | Builds rider trust; explains why times differ from Strava |
| Distance with pass/fail signal in preview | Catches wrong-activity submissions before confirm |
| Pre-gun start advisory note in preview | Informs riders their early start adds to official race time |
| Race time in HH:MM:SS on leaderboard | Direct time comparison, not just relative score |

### Anti-Features (do not build)

| Anti-Feature | Why Not |
|--------------|---------|
| Use `elapsed_time` directly as race time | Wrong: ignores pre-gun recording offset |
| Use `moving_time` for scoring | Gameable; defeats the point of gun time |
| Tight distance threshold (90%+) | GPS variance on forested gravel is 3-5%; would produce false rejections |
| Distance as a scoring component | It is a binary gate, not a differentiator |
| Retroactive recomputation of existing entries | `start_date` not stored pre-v1.2; handle operationally (delete + resubmit) |
| Admin race time override UI | Out of scope; correct data files directly |
| Day 2 distance gate | Day 2 is sectors-based; a DNF who completed sectors should not be blocked by distance |

---

## Architecture Approach

The data flow change is a straight-line substitution: `moving_time` to `raceTimeSeconds` at
every stage of the pipeline. The existing pipeline shape requires no structural changes.

Gun time calculation belongs in `strava-fetch-activity.js`, not `submit-result.js`. All other
activity-domain logic lives in the fetch function (date validation, ownership check, segment
extraction). This keeps `submit-result.js` as a pure storage function with no event-domain
logic. `submit-result.js` receives a clean `raceTimeSeconds` integer and stores it.

Distance validation also lives in `strava-fetch-activity.js` at fetch time, returning
`{ error: "distance_too_short", distanceMeters: X }` so the confirm UI can show the rider
their actual recorded distance in the error message.

**Build order (enforced by TypeScript compile dependencies):**

1. `src/lib/event-config.ts` -- no dependencies; establishes constants
2. `netlify/functions/strava-fetch-activity.js` -- imports event-config; core computation
3. `src/lib/athlete-loader.ts` -- AthleteJson interface; legacy fallback
4. `src/lib/types.ts` -- field rename if desired (optional cosmetic change)
5. `src/lib/scoring.ts` -- likely no changes if field stays named `movingTimeSeconds` internally
6. `src/pages/submit-confirm.astro` -- client-side; no TS build dependency
7. `src/components/Leaderboard.astro` -- depends on scoring types
8. `src/pages/submit.astro` -- error message additions; independent
9. `netlify/functions/submit-result.js` -- storage; independent of TS build

**Field naming:** Architecture research recommends keeping the internal `RiderResult` field
named `movingTimeSeconds` for this milestone to avoid touching 7 files for a cosmetic rename.
The displayed label changes to "Race Time" for users. Internal cleanup can follow in a later pass.

**Athlete JSON schema change:**

```json
// Before (Day 1)
{ "day1": { "movingTimeSeconds": 24537, "activityId": "...", "submittedAt": "..." } }

// After (Day 1)
{ "day1": { "raceTimeSeconds": 24137, "distanceMeters": 164523.4, "activityId": "...", "submittedAt": "..." } }
```

Legacy records fallback in athlete-loader.ts:
`raceTimeSeconds ?? movingTimeSeconds ?? 0` -- prevents NaN propagation during any transition.

---

## Top Pitfalls

1. **Gun epoch constant computed incorrectly.** If the EDT/UTC offset is wrong by one hour,
   every race time is silently off by 3,600 seconds. Two researchers computed different epoch
   values (see Open Questions). Prevention: independently verify
   `new Date(GUN_START_EPOCH_SECONDS * 1000).toISOString() === "2026-06-06T12:00:00.000Z"`
   before writing `event-config.ts`.

2. **Hidden start time produces a wildly wrong race time.** "Hide Start Time" privacy returns
   `start_date = "2026-06-06T00:00:01Z"`. Without detection, the gun time formula computes
   roughly -46,799 seconds. Always check for the `T00:00:01Z` suffix before computing gun time.
   The detection must be a separate explicit check -- the existing date validation does not
   catch this because the date portion (2026-06-06) is still correct.

3. **`start_date_local` has a misleading Z suffix -- do not use for epoch arithmetic.** It
   looks like UTC but is not. A rider with a device set to Central Time produces a
   `start_date_local` one hour behind Eastern Time. `start_date` is the only safe field for
   UTC epoch arithmetic.

4. **Distance threshold calibration.** ARCHITECTURE.md proposes 95 miles (152,888 m); FEATURES.md
   proposes 80 miles (128,748 m). GPS variance on forested gravel can be 3-5%. The 80-mile
   threshold provides a 20% buffer; the 95-mile threshold provides only 7%. Recommend 80 miles
   for a first-year event. Confirm against actual route GPS data before launch.

5. **Legacy athlete JSON missing `raceTimeSeconds` causes NaN in scoring.** Any JSON written
   before this milestone has `movingTimeSeconds` only. The loader must include the three-way
   fallback or the scoring engine propagates NaN across the entire leaderboard.

---

## Open Questions

1. **Gun epoch constant -- resolve before coding.** The Features researcher computed
   `1780660800` and the Architecture researcher proposed `1749211200`. These differ by
   ~363 days -- one is wrong. The implementer must independently compute:
   June 6, 2026 08:00:00 EDT = June 6, 2026 12:00:00 UTC. Verify with
   `new Date(epoch * 1000).toISOString()`.

2. **Distance threshold: 80 miles or 95 miles?** Product decision. Recommend 80 miles
   (128,748 m) -- more forgiving, fewer false rejections in Year 1.

3. **Day 2 distance gate: add or skip?** Features says add it (80 miles). Stack and
   Architecture say skip it (sectors-based scoring makes it unnecessary). Recommend skipping
   it in v1.2; riders who DNF mid-course but completed all sector segments should not be
   blocked.

4. **`start_date` vs `start_date_local` in existing date validation.** The current date check
   uses `start_date_local.slice(0, 10)`. Hidden-start-time detection must run as a separate,
   explicit check -- the `start_date_local` date portion is still correct even when hidden.

---

## Roadmap Implications

This milestone is small and has no blocking unknowns beyond the epoch constant verification.
All patterns are established. Suggested phase structure:

**Phase 1: Constants and Configuration**
- Create `src/lib/event-config.ts` with gun epoch, distance thresholds, event dates
- Independently verify gun epoch before committing
- Rationale: all other phases import from this file; a wrong epoch silently corrupts every race time

**Phase 2: Fetch Layer Changes**
- Modify `strava-fetch-activity.js`: extract `start_date`, `elapsed_time`, `distance`
- Add hidden start time detection before gun time computation
- Add gun time computation (UTC epoch arithmetic)
- Add Day 1 distance validation at fetch time with user-readable error
- Return `raceTimeSeconds`, `distanceMeters`, `elapsedTimeSeconds` in payload
- Rationale: fetch function is the integration point; validate and compute here

**Phase 3: Storage Layer Changes**
- Modify `submit-result.js`: write `raceTimeSeconds` + `distanceMeters` for Day 1
- Modify `athlete-loader.ts`: update `AthleteJson` interface; add three-way legacy fallback
- Rationale: must ship before any real submissions so the data store captures the correct fields

**Phase 4: Scoring and Display**
- Verify `scoring.ts` picks up `raceTimeSeconds` correctly (likely no formula changes needed)
- Modify `submit-confirm.astro`: Race Time label, distance display, pre-gun advisory note
- Modify `Leaderboard.astro`: column rename, HH:MM:SS race time display
- Add `distance_too_short` error message in `submit.astro`
- Rationale: user-facing changes; verify end-to-end flow with a test submission

**Phase 5: End-to-End Verification**
- Submit a test activity; verify `raceTimeSeconds` in stored athlete JSON is correct
- Verify leaderboard shows "Race Time" column with correct HH:MM:SS
- Test hidden start time rejection (mock `start_date = "2026-06-06T00:00:01Z"`)
- Test distance rejection (mock `distance = 50000`)
- Test pre-gun start (device started before 8:00 AM; verify race time > elapsed time)

### Research Flags

No phase needs `/gsd:research-phase`. All patterns are established with HIGH confidence from
official Strava API docs and deterministic UTC arithmetic. The gun epoch value is a calculation,
not research.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new packages; all fields in official Strava DetailedActivity docs |
| Features | HIGH | API mechanics verified via official docs; distance threshold is judgment (MEDIUM) |
| Architecture | HIGH | Based on direct codebase inspection; build order is deterministic |
| Pitfalls | HIGH | Hidden-start-time behavior, epoch arithmetic risks, NaN propagation all documented |

**Overall confidence: HIGH**

### Gaps to Address

- **Gun epoch constant:** Two researchers computed different values. Resolve by independent
  calculation before writing `event-config.ts`. This is the highest-stakes number in the
  milestone.

- **Distance threshold:** 80 miles (Features) vs 95 miles (Architecture). Recommend 80 miles
  for Year 1.

- **Day 2 distance gate:** Features says add it; Stack and Architecture say skip it.
  Recommend skipping in v1.2.

---

## Sources

### Primary (HIGH confidence)
- Strava API DetailedActivity model (`elapsed_time`, `distance`, `start_date`, `start_date_local`):
  `https://developers.strava.com/docs/reference/#api-models-DetailedActivity`
- Strava authentication scope documentation (`activity:read_all` field access):
  `https://developers.strava.com/docs/authentication/`
- Strava API changelog -- "Hide Start Time" privacy (July 3, 2024):
  `https://developers.strava.com/docs/changelog/`
- UTC epoch arithmetic: deterministic computation
- Michigan UP observes EDT (UTC-4) in June: US timezone law

### Secondary (MEDIUM confidence)
- Strava community hub -- elapsed time vs moving time semantics:
  `https://communityhub.strava.com/developers-api-7/how-to-get-end-date-or-calculate-end-date-2598`
- Gun time vs chip time definitions: `https://www.finishlinetiming.com/gun-time-vs-chip-time`
- GPS distance variance (1-3% typical, 5% in poor conditions):
  `https://www.dcrainmaker.com/2010/11/sport-device-gps-accuracy-in-depth-part_11.html`

---

*Research completed: 2026-04-14*
*Ready for roadmap: yes*
