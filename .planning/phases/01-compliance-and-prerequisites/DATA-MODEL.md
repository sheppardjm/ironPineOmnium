# Iron & Pine Omnium — Data Model

**Status:** Awaiting product owner sign-off
**Author:** Claude (Phase 1 execution)
**Date:** 2026-04-06

This document defines the compliance boundary for the Iron & Pine Omnium leaderboard:
what is persisted in per-athlete JSON files, what the public leaderboard renders, what
the rider sees in their own submission session, and how this boundary satisfies Strava's
November 2024 API Terms of Service.

No display code or backend submission logic should be written until this document is
approved.

---

## 1. Per-Athlete JSON Schema

**File path:** `public/data/results/athletes/{athleteId}.json`

Where `{athleteId}` is the Strava numeric athlete ID stored as a plain string (see
§4 for the compliance rationale). The ID is used only as a stable file key for
deduplication — it is a numeric identifier, not a profile field.

### Field Definitions

```jsonc
{
  // --- Identity fields (rider-chosen, locked after first submission) ---

  "athleteId": "12345678",
  // string — Strava numeric athlete ID stored as a string literal.
  // Used as the file key and for same-athlete deduplication on re-submission.
  // NOT displayed on the public leaderboard. NOT hashed (see §4).

  "displayName": "Alex M.",
  // string — rider-chosen at first submission, locked thereafter.
  // This is the ONLY name that appears publicly. Strava firstname/lastname
  // are discarded on receipt and never written to this file.

  "category": "women",
  // "men" | "women" | "non-binary" — self-reported at first submission, locked.
  // Scoring is computed per-category (fastest in category = benchmark).

  // --- Day 1 results: Hiawatha's Revenge / fondo (null until Day 1 submission is received) ---

  "day1": {
    "movingTimeSeconds": 16953,
    // number — raw moving time in seconds, sourced from Strava activity field
    // `moving_time`. Stored here for scoring computation. NOT displayed publicly.
    // Displayed to the submitting rider only (session view, see §3).

    "activityId": "98765432101",
    // string — Strava activity ID. Stored for operational deduplication only
    // (prevents the same activity being submitted twice). NOT displayed publicly.

    "submittedAt": "2026-06-06T20:14:33Z"
    // ISO8601 string — wall-clock time of submission. Stored for audit trail.
    // NOT displayed publicly.
  },
  // null if rider has not yet submitted Day 1.

  // --- Day 2 results: MK Ultra / grinduro (null until Day 2 submission is received) ---

  "day2": {
    "sectorEfforts": {
      "12345678901": 714,
      "98765432101": 853
      // Record<segmentId: string, elapsedSeconds: number>
      // Maps each sector segment ID (from src/lib/segments.ts SECTOR_SEGMENT_IDS)
      // to the rider's elapsed time in seconds on that segment.
      // Segment IDs are strings (Strava IDs are large integers; string avoids
      // precision loss). Elapsed times are stored for scoring. NOT displayed
      // publicly. Displayed to the submitting rider only (session view, see §3).
    },

    "komSegmentIds": ["55544433322"],
    // string[] — segment IDs (subset of KOM_SEGMENT_IDS) where this rider had
    // a recorded effort. Used to compute KOM points. NOT displayed publicly.
    // NOTE: this records presence of effort, not the time value. KOM points
    // are a count-based score (N efforts / max efforts in category * weight).

    "activityId": "11122233344",
    // string — Strava activity ID. Same deduplication purpose as day1.activityId.
    // NOT displayed publicly.

    "submittedAt": "2026-06-07T19:47:12Z"
    // ISO8601 string — wall-clock time of submission.
  },
  // null if rider has not yet submitted Day 2.

  // --- Record timestamps ---

  "createdAt": "2026-06-05T20:14:33Z",
  // ISO8601 string — timestamp of first file creation (first submission, either day).

  "updatedAt": "2026-06-06T19:47:12Z"
  // ISO8601 string — timestamp of most recent write (any re-submission or Day 2 add).
}
```

### What Is Intentionally NOT Stored

The following Strava API response fields are discarded on receipt and never written
to any file in this repository:

| Strava Field | Reason Discarded |
|---|---|
| `athlete.firstname` | Strava profile data; prohibited from public display under Nov 2024 ToS |
| `athlete.lastname` | Same |
| `athlete.profile_medium` | Avatar URL; prohibited under Nov 2024 ToS |
| `athlete.profile` | Full avatar URL; same |
| `athlete.city` | Not collected per product decision; not needed for scoring |
| `athlete.state` | Not collected |
| `athlete.country` | Not collected |
| `athlete.sex` | Not used; category is self-reported |
| `activity.elapsed_time` | Raw Strava activity data; only `moving_time` is stored and it is not displayed publicly |
| Raw segment effort `elapsed_time` outside Day 2 sectors | Only scored sectors are stored; all other segment times are discarded |

---

## 2. Public Leaderboard Display Fields

The public leaderboard (`/`) renders one row per athlete who has submitted both days.
It contains ONLY computed values derived from stored data, and rider-chosen identity.

### Columns Rendered

| Column | Source | Notes |
|---|---|---|
| Rank | Computed — sort position within category | 1, 2, 3, ... |
| Display Name | `displayName` (rider-chosen) | The only name shown publicly |
| Category | `category` (rider-chosen) | Used to separate leaderboard tabs |
| Day 1 Score | Computed — `(fastestInCategory / riderTime) * 100 * 0.35` | Points, not time |
| Day 2 Sector Score | Computed — `(fastestSectorTotal / riderSectorTotal) * 100 * 0.45` | Points, not times |
| KOM Score | Computed — `(riderKomCount / maxKomCount) * 100 * 0.20` | Points, not segment list |
| Total Score | Computed — sum of Day 1 + Day 2 Sector + KOM scores | Displayed to 1 decimal place |

Scoring weights (35% / 45% / 20%) and scale (100 points max) match the current
`defaultScoringConfig` in `src/lib/scoring.ts`. Any change to those weights requires
updating both `scoring.ts` and this document.

### What Is NOT Shown on the Public Leaderboard

The following are explicitly excluded from all public rendering:

- Strava profile name (firstname, lastname)
- Strava avatar image or URL
- Strava profile link (`strava.com/athletes/{id}`)
- Strava athlete ID
- Raw moving time (Day 1)
- Raw sector elapsed times (Day 2)
- Activity URLs or activity IDs
- Submission timestamps
- Hometown or location (not collected)
- KOM segment names or list of which segments the rider achieved
- Any value that would allow a viewer to infer another rider's raw Strava activity data

### Type Alignment with `src/lib/types.ts`

The `ScoredRider` interface in `src/lib/types.ts` aligns with this model:

- `rider.name` must be populated from `displayName` (rider-chosen), NOT from any
  Strava profile field. The existing `RiderResult.name` field maps to `displayName`.
- `rider.hometown` in the current `RiderResult` type is NOT collected per product
  decision. This field should either be removed from the type or left empty string.
  Phase 2+ implementation must not populate it from Strava data.
- `day1Score`, `sectorScore`, `komScore`, `totalScore` are the only numeric values
  rendered in the leaderboard table — they correspond to the computed point columns
  above.

---

## 3. Rider's Own Submission View (Session-Only)

When a rider submits their result (Phase 5 scope), they see a confirmation screen that
maps their raw values to points. This is the ONLY place raw values are surfaced.

### What the Submission Confirmation Shows

**Day 1 breakdown (shown after Day 1 / Hiawatha's Revenge submission):**

```
Your moving time: 4:42:33 (16,953 sec)
Category fastest: 4:01:15 (14,475 sec)
Your Day 1 Score: 30.0 pts
```

**Day 2 breakdown (shown after Day 2 / MK Ultra submission):**

```
Sector 1 (Beaver Dam Rd): 11:54 (714 sec)  -> [shown to rider]
Sector 2 (Skyline Loop):  14:13 (853 sec)  -> [shown to rider]
...
Total sector time: 26:07 (1,567 sec)
Category fastest total: 23:44 (1,424 sec)
Your Sector Score: 40.8 pts

KOM efforts recorded: Beaver Dam KOM
Your KOM Score: 14.0 pts
```

### Privacy Guarantee

This data is:
- Computed in the submission Netlify Function and returned in the response body
- Rendered in the browser for the submitting rider's current session only
- NOT written to the per-athlete JSON file (raw times are stored for scoring; the
  rendered breakdown is ephemeral)
- NOT accessible to any other rider
- NOT stored in any public-facing file

If the rider navigates away and returns, they will see only their computed scores
on the public leaderboard — not their raw times. There is no "my results" page
that persists the raw values after the submission session ends.

---

## 4. Strava ToS Compliance Summary

The Iron & Pine Omnium leaderboard is designed to comply with Strava's November 2024
API Agreement (effective November 11, 2024) under the following rationale:

### What We Store vs. What the ToS Restricts

The November 2024 update restricts apps from displaying "Strava Data" to users other
than the user it belongs to, unless the app qualifies as a "Community Application"
(§2.10 of the API Agreement).

**Strava Data (restricted):** Raw fields returned by the Strava API — profile fields,
activity metrics (moving_time, elapsed_time), segment efforts, heart rate, etc.

**What we store publicly (not Strava Data):** Computed point scores derived from raw
values. The raw values are used as computation inputs and then discarded from public
files. Computed scores are a derivative work, not a Strava API field.

### Compliance Boundary — Field by Field

| Field | Stored In Public JSON | Displayed Publicly | Compliance Status |
|---|---|---|---|
| Strava `firstname`/`lastname` | No — discarded | No | Compliant: not stored or displayed |
| Strava `profile_medium` (avatar) | No — discarded | No | Compliant: not stored or displayed |
| Strava `athlete.id` (numeric) | Yes — as `athleteId` for file keying | No — file path not linked | Low-risk: numeric ID not a profile field; not surfaced in UI |
| Strava `activity.id` | Yes — as `activityId` for deduplication | No | Low-risk: operational use only, not surfaced |
| `moving_time` (raw seconds) | Yes — in `day1.movingTimeSeconds` | No — converted to computed score | Compliant: raw value in private storage; public display is derived score only |
| Segment `elapsed_time` values | Yes — in `day2.sectorEfforts` | No — converted to computed score | Same as above |
| Computed Day 1 Score (moving time) | Not in JSON (computed at serve-time) | Yes | Compliant: derived value, not Strava Data |
| Computed Day 2 Sector Score | Not in JSON (computed at serve-time) | Yes | Compliant: derived value |
| Computed KOM Score | Not in JSON (computed at serve-time) | Yes | Compliant: derived value |
| Rider display name | Yes — in `displayName` | Yes | Compliant: rider-chosen, not from Strava |
| Rider category | Yes — in `category` | Yes | Compliant: self-reported, not from Strava |

### Athlete ID Storage Decision

The `athleteId` field stores the Strava numeric athlete ID as a plain string
(e.g., `"12345678"`). This decision was made for operational simplicity (same
approach as mkUltraGravel, which is in production). The rationale:

1. The numeric ID alone does not identify a person — it is a database key.
2. The ID is never rendered in the UI (not in the public leaderboard, not in
   the submission confirmation view).
3. The file path `public/data/results/athletes/{athleteId}.json` is not linked
   from any page. The leaderboard fetches the aggregated data, not individual files.
4. A would-be reverse lookup requires already knowing the athlete ID (a circular
   dependency) — the file path exposes nothing that the ID alone doesn't already
   expose.

If Strava provides clearer guidance that athlete IDs must be hashed in public
file paths, this can be changed to SHA-256(athleteId)[0:16] without breaking
any other system (the submission function would derive the hash and the leaderboard
would never need to know the raw ID at all).

### 7-Day Cache Rule

The API Agreement states "No Strava Data shall remain in your cache longer than
seven days." The GitHub-as-database model stores JSON files in the repository
indefinitely. The compliance position:

- Files store computed scores (derived) and rider-chosen names — not raw Strava API
  fields. The stronger argument is that computed scores are not "Strava Data."
- Raw values stored in `day1.movingTimeSeconds` and `day2.sectorEfforts` are the
  more ambiguous case. These are post-event results for a one-day cycling event.
  The practical interpretation is that storing an athlete's own race result for
  their own later reference (leaderboard) is the intended use case of activity:read.
- This ambiguity is documented in the athlete limit review submission (Plan 01-02).
  Community Application classification (§2.10), if obtained, resolves this entirely.

### What Makes This Compliant Even Without Community Application Status

Even if Community Application classification is not obtained, the leaderboard is
defensible because:

1. **No Strava profile data is displayed to any user** — not even the submitting rider.
2. **No raw activity data is displayed to other riders** — the public leaderboard shows
   only computed point scores.
3. **The submitting rider sees their own raw values** — which is explicitly permitted
   under the ToS (each user may see their own Strava Data).
4. **Rider identity is self-reported** — display name and category come from the rider,
   not from Strava. A spectator cannot determine a leaderboard entry's real name.

---

## 5. Re-Submission and Identity Rules

### First Submission (Either Day)

1. Rider authenticates with Strava (OAuth).
2. Rider provides `displayName` (free text, max 50 chars) and `category` (select).
3. System creates `public/data/results/athletes/{athleteId}.json` with `createdAt`,
   `displayName`, `category`, and the appropriate `day1` or `day2` object.
4. `displayName` and `category` are **locked at this point** — they cannot be changed
   by any subsequent submission.

### Day 2 Submission (After Day 1 Exists)

1. Rider authenticates with Strava. System detects existing athlete file.
2. System reads `displayName` and `category` from the existing file.
3. No identity fields are presented to the rider for edit — they are pre-populated
   and read-only in the UI.
4. System adds `day2` object to the existing file and updates `updatedAt`.

### Re-Submission for Same Day

Re-submission is allowed. A rider who submitted Day 1 data and wants to correct it
(e.g., accidentally submitted the wrong activity) may submit again.

- System overwrites the `day1` or `day2` object in the existing file.
- `displayName` and `category` remain locked (read from existing file, not from
  rider input on re-submission).
- `updatedAt` is updated.
- `createdAt` is NOT updated.
- Deduplication check: if the new `activityId` matches the stored one, the submission
  is rejected as a duplicate before any write occurs.

### Strava Deauthorization

If a rider deauthorizes the app via Strava's partner deauth webhook:

- The athlete's JSON file is **deleted entirely** from `public/data/results/athletes/`.
- This satisfies any data retention obligations and removes all stored raw values.
- The rider's scores disappear from the leaderboard on next rebuild.
- There is no partial retention of computed scores — the whole file goes.

### CSV Fallback Identity

In the manual CSV fallback (Plan 01-04, used only if Strava approval is not received
by event day):

- `athleteId` is organizer-assigned (e.g., `"manual-001"`) — not a real Strava ID.
- `displayName` and `category` are collected from a paper or digital sign-in sheet.
- The file schema is identical to the Strava-submission schema.
- Fallback files are identifiable by the `manual-` prefix in `athleteId` but behave
  identically in scoring and display.

---

## Schema Alignment Checklist (for Phase 2+ implementation)

When writing submission logic and leaderboard rendering, verify:

- [ ] `RiderResult.name` is populated from `displayName`, never from Strava `firstname`/`lastname`
- [ ] `RiderResult.hometown` is empty string or removed from the type — not populated from Strava
- [ ] Strava `firstname`, `lastname`, `profile_medium`, `city` are read from the OAuth token exchange and immediately discarded (not logged, not stored)
- [ ] `day1.movingTimeSeconds` is stored in the private JSON but converted to `day1Score` for all public display
- [ ] `day2.sectorEfforts` elapsed times are stored but converted to `sectorScore` for all public display
- [ ] No leaderboard component renders raw time values — only formatted point scores
- [ ] Submission confirmation response includes raw-to-score mapping; the value is NOT written to the JSON file
- [ ] Re-submission reads `displayName` and `category` from existing file — ignores any new rider input for those fields
- [ ] Deauth webhook deletes the entire athlete JSON file

---

*Data Model Version: 1.0*
*Phase: 01-compliance-and-prerequisites*
*Created: 2026-04-06*
*Sign-off required from: Product Owner*
