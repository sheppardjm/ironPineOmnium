# Iron & Pine Omnium — CSV Fallback Procedure

**Version:** 1.0
**Last Updated:** 2026-04-06
**Audience:** Event organizer only (not volunteer- or rider-facing)

This is the Plan B runbook. If Strava athlete limit review approval has not arrived by
event day (June 6–7, 2026), or if the Strava API is unavailable on the day, use this
procedure to manually enter rider results and populate the leaderboard.

---

## When to Use This

Use this procedure when either of the following is true:

1. **Strava approval not received:** The Strava athlete limit review submitted in Plan
   01-02 has not been approved and the event starts in fewer than 24 hours.
2. **Strava API unavailable on event day:** The API is returning errors and riders
   cannot authenticate or submit activities via the normal flow.

Do not use this procedure alongside the Strava flow. If some riders have submitted via
Strava and others need manual entry, the two sets of athlete JSON files coexist
harmlessly — Strava-submitted athletes have numeric `athleteId` values; manually-entered
athletes have `manual-001`, `manual-002`, etc. There is no collision.

---

## Prerequisites

Before event day, verify these are in place:

- [ ] **GITHUB_TOKEN** — a GitHub personal access token (PAT) scoped to `repo` write
  access for the `ironPineOmnium` repository. Store in the local `.env` file:
  ```
  GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
  GITHUB_OWNER=sheppardjm
  GITHUB_REPO=ironPineOmnium
  ```
- [ ] **Node.js 18+** installed locally (`node --version` to verify)
- [ ] **npx / tsx** available (`npx tsx --version` to verify)
- [ ] The repository is cloned locally at your working directory
- [ ] `scripts/csv-fallback.ts` and `scripts/sample-fallback.csv` exist in the repo

---

## Data Collection Workflow at the Event

### What to collect from each rider at the finish line

Collect the following on paper or a shared spreadsheet as riders finish:

| Field | What to Collect | Notes |
|---|---|---|
| `display_name` | Rider's chosen display name | Any format — first name, nickname, initials |
| `category` | One of: `men`, `women`, `non-binary` | Self-reported |
| `day1_moving_time_seconds` | Moving time in seconds (Day 1 / Hiawatha) | From Strava activity page or GPS watch |
| `day2_sector_*` | Elapsed seconds per sector (Day 2 / MK Ultra) | One column per sector — see headers below |
| `day2_kom_*` | `yes` or `no` per KOM segment (Day 2 / MK Ultra) | Did the rider complete this KOM? |

### Day 1 time source (Hiawatha's Revenge)

Moving time (not elapsed time) is the scoring input. Options for collecting it:

1. Ask the rider to share their Strava activity link — moving time is visible on the
   activity page to the rider and any follower.
2. Read it from their GPS device (Garmin, Wahoo, etc.) at the finish line.
3. Use race timing chip data if the event uses chip timing.

Convert `h:mm:ss` to seconds for the CSV:
- `4:42:33` = (4 × 3600) + (42 × 60) + 33 = **16,953 seconds**

### Day 2 sector times (MK Ultra)

Sector times are per-segment elapsed times in seconds. The segment IDs and labels are:

| CSV Column | Segment Name | Segment ID |
|---|---|---|
| `day2_sector_41159670` | BAA | 41159670 |
| `day2_sector_24479292` | Sandstrom | 24479292 |
| `day2_sector_24479426` | Akkala Rd | 24479426 |
| `day2_sector_24479467` | Haavisto | 24479467 |
| `day2_sector_24479496` | Forest Service Rd | 24479496 |
| `day2_sector_34573011` | C4 | 34573011 |
| `day2_sector_6809754` | Down Jeep | 6809754 |

Read elapsed time (not moving time) for each segment from the rider's Strava activity
page, under "Matched Segments" or "Segment Efforts."

### Day 2 KOM segments (MK Ultra)

For each KOM segment, record `yes` if the rider has an effort on that segment in their
Day 2 activity, `no` otherwise.

| CSV Column | Segment Name | Segment ID |
|---|---|---|
| `day2_kom_24479270` | Billie Helmer | 24479270 |
| `day2_kom_41126651` | Leaving Chatham | 41126651 |
| `day2_kom_16438243` | Silver Creek | 16438243 |

### Partial data is fine

- A rider who only completed Day 1: leave all `day2_*` columns empty.
- A rider who only completed Day 2: leave `day1_moving_time_seconds` empty.
- A rider who completed both days: fill all applicable columns.
- Leave sector/KOM columns empty if a rider did not attempt that segment.

---

## Script Execution

### Step 1: Prepare the CSV

Copy the sample template to a working file:

```bash
cp scripts/sample-fallback.csv scripts/event-results.csv
```

Open `scripts/event-results.csv` in a spreadsheet editor (Excel, Numbers, LibreOffice)
or a text editor. The first row is the header — do not modify it.

Fill in one row per rider. Example:

```
display_name,category,day1_moving_time_seconds,day2_sector_41159670,...,day2_kom_16438243
"Alex M.",women,15153,418,1210,485,503,2510,2042,398,yes,no,yes
"Jordan K.",men,14208,,,,,,,,,
```

Save as CSV (not xlsx). If your spreadsheet app adds a BOM or CRLF line endings,
the script handles both.

### Step 2: Dry run — validate before committing

Run the script without `--commit` to preview what it will do:

```bash
npx tsx scripts/csv-fallback.ts scripts/event-results.csv
```

Expected output for each row:
- The athlete ID that will be assigned (`manual-001`, `manual-002`, etc.)
- The full JSON that would be committed
- `[DRY RUN] Would commit to: public/data/results/athletes/manual-XXX.json`

A summary at the end shows how many rows passed validation and how many had errors.

**Validation errors to watch for:**

| Error | Fix |
|---|---|
| `category "..." is invalid` | Must be exactly `men`, `women`, or `non-binary` |
| `day1_moving_time_seconds "..." is invalid` | Must be a positive integer (seconds) |
| `day2_sector_* "..." is invalid` | Must be a positive integer |
| `day2_kom_* "..." is invalid` | Must be `yes` or `no` (case-insensitive) |
| `row has no day1 or day2 data` | At least one day must have data |

Fix errors in the CSV and re-run the dry run until all rows pass.

### Step 3: Commit to GitHub

Once the dry run shows clean output, commit:

```bash
npx tsx scripts/csv-fallback.ts scripts/event-results.csv --commit
```

The script will:
1. Check if each athlete file already exists in the repo (GET request)
2. Create or update the file (PUT request)
3. Log `SUCCESS: committed public/data/results/athletes/manual-XXX.json` for each

If any row fails during the commit phase (network error, API error), the script logs
the error and continues with the remaining rows. Failed rows are reported in the
final summary — re-run `--commit` to retry; the script is idempotent (existing files
are updated by SHA, not duplicated).

### Step 4: Trigger a leaderboard rebuild

After committing all athlete JSON files, trigger a Netlify rebuild to update the
live leaderboard:

1. Go to the Netlify dashboard for the `ironPineOmnium` site.
2. Click "Deploys" → "Trigger deploy" → "Deploy site."
3. Wait ~1–2 minutes for the build to complete.
4. Verify the leaderboard shows the new athletes at the expected URL.

Netlify also rebuilds automatically on any push to `main` — if you committed files
directly via this script (to `main`), a rebuild may already be in progress.

---

## Handling Corrections

### Correcting a rider's data after committing

1. Edit the row in `scripts/event-results.csv`.
2. Run dry run to confirm the corrected JSON looks right:
   ```bash
   npx tsx scripts/csv-fallback.ts scripts/event-results.csv
   ```
3. Re-run with `--commit`:
   ```bash
   npx tsx scripts/csv-fallback.ts scripts/event-results.csv --commit
   ```
   The script fetches the current file SHA and overwrites the file. The row's athlete
   ID is determined by its position in the CSV (row 1 = `manual-001`, row 2 =
   `manual-002`, etc.) — keep row order stable across correction runs.

### Removing a rider

The script does not support deletion. To remove a rider:

1. Go to the GitHub repository: `https://github.com/sheppardjm/ironPineOmnium`
2. Navigate to `public/data/results/athletes/manual-XXX.json`
3. Click the trash icon to delete the file and commit.
4. Trigger a Netlify rebuild.

### Adding late finishers

Add new rows to the end of `scripts/event-results.csv` and re-run `--commit`. New
rows get the next sequential athlete ID. Do not insert rows in the middle — it would
shift existing IDs and cause the script to overwrite wrong files.

---

## Limitations

- **KOM ranking is not auto-computed across riders:** The script records which KOM
  segments each rider completed (`komSegmentIds`), but the scoring function computes
  KOM points by comparing all riders' counts at leaderboard render time. KOM scores
  will appear correctly on the leaderboard as more athletes are added.

- **Display names cannot be changed after commit:** Consistent with the identity-lock
  rule from DATA-MODEL.md §5. If a rider wants a different display name, delete their
  file and re-add with a new row in the CSV.

- **No real Strava activity linking:** Fallback athletes have `activityId: "manual"`.
  If Strava approval later arrives and riders re-submit via the Strava flow, a new
  file with their Strava numeric `athleteId` will be created alongside the manual one.
  The manual file should be manually deleted to avoid duplicate leaderboard entries.

- **Sector times must be entered individually per segment:** There is no bulk import
  from a GPX or FIT file — all times come from manual lookup on the Strava activity
  page or GPS device. Budget ~2–3 minutes per rider for data entry.

---

*Procedure Version: 1.0*
*Phase: 01-compliance-and-prerequisites*
*Created: 2026-04-06*
