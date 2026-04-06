# Phase 1: Compliance and Prerequisites - Research

**Researched:** 2026-04-06
**Domain:** Strava API Terms of Service compliance, athlete limit review process, TypeScript constants patterns, CSV fallback pipeline
**Confidence:** MEDIUM (most claims verified via official Strava docs and direct codebase inspection; some areas lack official clarity)

---

## Summary

Phase 1 is not a code phase — it is a documentation and external process phase. The work products are: (1) a signed-off data model document, (2) a submitted athlete limit review request, (3) a `src/lib/segments.ts` constants file with verified segment IDs, and (4) a manual CSV fallback procedure document. None of these require new library dependencies.

The critical compliance finding is that Strava's November 2024 API Agreement update introduced a strict restriction: apps may only display Strava Data to the user it belongs to — not to other users — unless the app qualifies as a "Community Application" (under 9,999 registered users, group activity/collaboration purpose, classified by Strava in their sole discretion). This app qualifies in intent but has **no documented formal application process** to obtain that classification. The planned data model — showing only computed point scores and rider-chosen display names publicly — is the safest compliance path regardless of Community Application status, because computed scores may fall outside the "Strava Data" definition. This is the correct design and must be documented clearly.

The athlete limit review uses a single HubSpot form at `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8` and requires screenshots of all places Strava data is shown in the app, plus app description and use case. Review takes 7–10 business days per Strava's documentation. All new apps start at athlete limit = 1 ("Single Player Mode") until approved.

The mkUltraGravel codebase provides a directly reusable pattern for the segment constants file: string-typed segment IDs in a named export array with inline comments. The CSV fallback is best implemented as a Node.js local script (not a Netlify Function) that takes a CSV, validates against the segment constants, and commits per-athlete JSON directly to GitHub using the same Contents API pattern already proven in mkUltraGravel.

**Primary recommendation:** Document the data model and get sign-off first (01-01), then submit the athlete limit review (01-02) — these are the long-lead-time items. The constants file (01-03) is user-blocked waiting for segment IDs. The CSV fallback (01-04) is a script + template, no external dependency.

---

## Standard Stack

This phase has no new npm dependencies. All tooling is already in the project.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| TypeScript | ^5.9.3 (already in project) | Segment constants file | Already configured in project |
| Node.js | 22.22.2 (already in project via Volta) | CSV fallback script | Already configured |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `node:fs` | built-in | Read CSV in fallback script | No external CSV library needed at this scale |
| GitHub Contents API | REST v3 | Commit athlete JSON from fallback script | Same pattern as mkUltraGravel submit-result.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Plain `node:fs` + manual parsing | `papaparse` or `csv-parse` | Overkill for a one-time organizer-only script with a known fixed schema |
| Direct GitHub commit in script | Netlify Function endpoint | Netlify Function adds complexity and requires deployment; local script is simpler for single-operator use |

**Installation:**
```bash
# No new packages needed for this phase
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── segments.ts       # NEW: segment ID constants (01-03)
│   ├── types.ts          # existing
│   └── scoring.ts        # existing
scripts/
│   └── import-csv.ts    # NEW: manual fallback ingestion (01-04)
docs/
│   └── csv-fallback-procedure.md  # NEW: procedure doc (01-04)
.planning/
│   └── phases/01-compliance-and-prerequisites/
│       ├── data-model.md   # NEW: approved data model doc (01-01)
│       └── ...
```

### Pattern 1: Segment Constants File (TypeScript `as const`)
**What:** Export segment ID arrays and a typed record mapping segment IDs to human-readable labels. Use `as const` for immutability and to enable literal type inference.

**When to use:** Constants used by both Netlify Functions (CommonJS) and Astro build-time (ESM). Requires the file to be importable in both contexts. The mkUltraGravel project uses plain string IDs stored as string literals (not numbers), which avoids integer overflow on large Strava segment IDs.

**Example (modeled on mkUltraGravel `src/lib/scoring.js`):**
```typescript
// src/lib/segments.ts
// Source: mkUltraGravel/src/lib/scoring.js pattern, adapted to TypeScript

/** Day 2 sector segment IDs used for sector scoring. */
export const SECTOR_SEGMENT_IDS = [
  "XXXXXXXXX", // Sector 1 name
  "XXXXXXXXX", // Sector 2 name
  // ...
] as const;

export type SectorSegmentId = (typeof SECTOR_SEGMENT_IDS)[number];

/** KOM segment IDs used for KOM points scoring. */
export const KOM_SEGMENT_IDS = [
  "XXXXXXXXX", // KOM 1 name
  // ...
] as const;

export type KomSegmentId = (typeof KOM_SEGMENT_IDS)[number];

/** Human-readable labels for all scored segments. */
export const SEGMENT_LABELS: Record<string, string> = {
  "XXXXXXXXX": "Sector 1 Name",
  // ...
};
```

**Key detail:** Strava segment IDs are stored as strings, not numbers. JavaScript's `number` type loses precision on IDs above ~9 quadrillion, but using strings avoids any risk and matches how mkUltraGravel already handles them.

### Pattern 2: Data Model Document
**What:** A written document defining exactly what is stored in each per-athlete JSON file vs. what is displayed publicly vs. what is visible only to the submitting rider.

**When to use:** Before any backend code is written. This document is the compliance anchor — everything else references it.

**Document must cover:**
- What fields are stored in `public/data/results/athletes/{athleteId}.json`
- What the public leaderboard renders (computed scores + rider-chosen display name only)
- What the rider's own submission confirmation view renders (raw value → score breakdown)
- How Strava athlete ID is stored (plain numeric string vs. hashed — see Open Questions)
- What Strava data is intentionally discarded (firstname, lastname, avatar, profile URL, city, etc.)
- Re-submission behavior (new file replaces old; display name and category locked after first submission)

### Pattern 3: CSV Fallback Script
**What:** A local Node.js/TypeScript script (not a Netlify Function) that reads a CSV of manual results, validates against the segment constants, builds per-athlete JSON matching the main app's schema, and commits each file to GitHub using the Contents API.

**When to use:** Only when Strava API approval has not been received by event day. Operated by event organizer only.

**Ingestion flow:**
```
CSV file (rider fills out manually / organizer populates from Strava)
  → scripts/import-csv.ts validates fields against SECTOR_SEGMENT_IDS + KOM_SEGMENT_IDS
  → builds per-athlete JSON matching main app schema
  → commits to public/data/results/athletes/{athleteId}.json via GitHub Contents API
  → triggers Netlify rebuild hook
```

**CSV template columns (minimum):**
```
display_name, category, day1_moving_time_seconds, sector_1_seconds, sector_2_seconds, ..., kom_points, manual_athlete_id
```

Note: `manual_athlete_id` is a fallback-only identifier (can be organizer-assigned, e.g., `manual-001`) since real Strava athlete IDs are unavailable in fallback mode. This must be documented in the procedure so there is no confusion about why IDs differ.

### Anti-Patterns to Avoid
- **Storing Strava firstname/lastname in public JSON:** Prohibited under Nov 2024 API terms. The `name` field in per-athlete JSON must be the rider-chosen display name, not Strava name.
- **Storing Strava profile avatar URL:** Never surfaced. Discard it on receipt.
- **Storing raw activity times in public JSON:** The public file should store computed point scores only. Raw times may be stored privately for debugging (see Open Questions), but must not appear on the public leaderboard.
- **Numeric segment IDs:** Always use string literals. Strava IDs are large integers; JavaScript number precision is irrelevant when stored as strings.
- **Segment IDs as magic strings scattered through code:** All segment IDs belong in `src/lib/segments.ts`. Import from there everywhere else.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing in fallback script | Custom regex/split parser | `node:readline` with simple comma split, OR just hardcode a known column order | This is a single-operator tool with a fixed schema — keep it simple |
| GitHub file commit logic | Custom implementation | Copy the proven pattern from `mkUltraGravel/netlify/functions/submit-result.js` | GET-then-PUT with SHA is already debugged and handles race conditions |
| Strava athlete limit review form | Hunting for the form URL | Use `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8` directly | This is the official form per Strava's rate limits docs |

**Key insight:** This phase is process-heavy, not code-heavy. The main risk is waiting too long to submit the athlete limit review — it has a 7–10 business day processing time with possible longer real-world delays. Submit early.

---

## Common Pitfalls

### Pitfall 1: Treating "Community Application" as a Formal Application
**What goes wrong:** Spending time trying to formally apply for Community Application status before submitting athlete limit review, believing they're separate required steps.
**Why it happens:** The API agreement defines "Community Application" as an exception that grants public data display rights, suggesting it's something to apply for.
**How to avoid:** There is no documented formal process to obtain Community Application classification. Strava determines it in their sole discretion (API agreement §2.10). Contact `developers@strava.com` to ask about this classification after submitting the athlete limit review. **Do not block athlete limit review on this.**
**Warning signs:** If you find yourself looking for a "Community Application form," stop — it doesn't exist.

### Pitfall 2: The 7-Day Cache Rule Applied to Computed Scores
**What goes wrong:** Concluding that computed point scores stored in GitHub JSON files violate the 7-day cache limit for Strava Data.
**Why it happens:** The API agreement says "No Strava Data shall remain in your cache longer than seven days." The definition of "Strava Data" is broad but vague.
**How to avoid:** The planned data model minimizes this risk by design — public JSON stores computed scores and rider-chosen display names, not raw Strava fields. The legal boundary between "Strava Data" (raw activity fields) and "derived computation" is genuinely unclear in the agreement. Document this distinction explicitly in the data model document and flag it for the athlete limit review submission. This is a known industry-wide ambiguity (confirmed by community discussions and apps like Intervals.icu operating with historical data).
**Warning signs:** If the data model ever stores raw `elapsed_time` values from Strava in a public-facing file, that's a red flag.

### Pitfall 3: Athlete Limit Review Too Late
**What goes wrong:** Submitting the athlete limit review less than 2–3 weeks before the June 6 event, then waiting for approval with no fallback ready.
**Why it happens:** Assuming 7–10 business days is guaranteed — community reports suggest longer real-world turnaround.
**How to avoid:** Submit as soon as the app has at least one screen showing Strava data and the "Connect with Strava" button (screenshots required by the form). Don't wait for full app completion. Have the CSV fallback procedure ready before event day regardless.
**Warning signs:** Submitting after mid-May. If no response in 10 business days, follow up at `developers@strava.com` with client ID as the subject line.

### Pitfall 4: Segment ID Verification Done Only from Memory
**What goes wrong:** Writing segment IDs into the constants file without independently verifying each one against Strava's segment database.
**Why it happens:** IDs are "already known" but community-created segments can be retired without warning.
**How to avoid:** For each segment ID, verify it exists via `GET https://www.strava.com/api/v3/segments/{id}` using a personal access token. A retired or non-existent segment returns 404. Document verification date in the constants file comment.
**Warning signs:** Any segment returning 404 during verification needs a replacement plan (create a new segment covering the same stretch per the context decisions).

### Pitfall 5: Display Name Mutable After First Submission
**What goes wrong:** Implementing re-submission (allowed per decisions) in a way that also allows display name to change.
**Why it happens:** The "replace existing file" logic for re-submission doesn't distinguish between mutable and immutable fields.
**How to avoid:** Document the locking rule clearly in the data model document. The implementation (future phase) must read the existing file's display name and category on re-submission and ignore/override any new values for those fields. This phase only documents the rule.

---

## Code Examples

Verified patterns from the existing codebase:

### GitHub Contents API: Create or Update a File
```javascript
// Source: mkUltraGravel/netlify/functions/submit-result.js (proven in production)

// Step 1: GET existing file to retrieve SHA (needed for updates)
const getRes = await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
  { headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' } }
);
let existingSha;
if (getRes.ok) {
  const existing = await getRes.json();
  existingSha = existing.sha;
}
// 404 means new file — no SHA needed

// Step 2: PUT the file
const fileContent = Buffer.from(JSON.stringify(resultObj, null, 2) + '\n').toString('base64');
const putBody = { message: commitMessage, content: fileContent, committer: { name: 'Bot', email: 'bot@example.com' } };
if (existingSha) putBody.sha = existingSha;

await fetch(
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
  { method: 'PUT', headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify(putBody) }
);
```

### Segment Constants File (TypeScript, based on mkUltraGravel pattern)
```typescript
// Source: modeled on mkUltraGravel/src/lib/scoring.js, adapted to TypeScript
// Verified: segment IDs stored as strings, named array exports, inline comments

export const SECTOR_SEGMENT_IDS = [
  "XXXXXXXXX", // Sector name — verified YYYY-MM-DD
] as const;

export const KOM_SEGMENT_IDS = [
  "XXXXXXXXX", // KOM name — verified YYYY-MM-DD
] as const;
```

### Per-Athlete JSON Schema (existing pattern from mkUltraGravel, adapted)
```json
{
  "athleteId": "12345678",
  "displayName": "Rider Chosen Name",
  "category": "men",
  "submittedAt": "2026-06-06T15:00:00Z",
  "day1MovingTimeSeconds": 20260,
  "day2Sectors": {
    "SEGMENT_ID_1": { "elapsed_time": 714 },
    "SEGMENT_ID_2": { "elapsed_time": 853 }
  },
  "day2KomPoints": 28,
  "scores": {
    "day1": 35.0,
    "sector": 44.2,
    "kom": 18.7,
    "total": 97.9
  }
}
```
Note: The exact schema for Iron Pine Omnium is a Phase 1 output (the data model document), not an input. The above is illustrative.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Strava API allows displaying any athlete's public data in third-party apps | Apps can only display data to the user it belongs to (unless Community Application) | November 11, 2024 | Leaderboard apps must design around this — computed scores + rider-chosen names is the compliant path |
| All new apps start with default athlete limit allowing some connections | All new apps start at limit = 1 ("Single Player Mode") | Unknown, confirmed current | Must submit Developer Program form before any other athlete can connect |
| Segment leaderboard endpoint available to all apps | Segment leaderboard endpoint restricted; subscriber-only | June 18, 2020 | Not directly relevant — this app doesn't use Strava's segment leaderboard endpoint, it reads segment efforts from activities |

**Deprecated/outdated:**
- Netlify Functions v2 `export default` handler syntax: confirmed env var bug as of 2026-03-28 — use v1 `exports.handler` syntax (already documented in project context)
- Storing Strava `firstname`/`lastname` in public-facing data: prohibited since Nov 2024 API terms

---

## Open Questions

Things that couldn't be fully resolved:

1. **Whether Community Application status must be explicitly obtained, and how**
   - What we know: The API agreement defines it (§2.10) and says Strava classifies it in their sole discretion. No formal application process is documented anywhere.
   - What's unclear: Whether submitting the athlete limit review form automatically triggers Community Application review, or whether a separate contact to `developers@strava.com` is needed.
   - Recommendation: Ask explicitly about Community Application classification in the athlete limit review form's description field, AND follow up via email. Don't rely on it — the data model's approach (computed scores only, no raw Strava fields publicly) is compliant regardless.

2. **Whether to store Strava athlete ID as plain numeric string or hashed in public JSON**
   - What we know: mkUltraGravel stores it as a plain numeric string (e.g., `"87531056"`). The API agreement does not explicitly address hashing. The file path in mkUltraGravel uses the athlete ID directly (`public/data/results/athletes/{athleteId}.json`). The API agreement's broad "Strava Data" definition *might* include athlete IDs.
   - What's unclear: Whether exposing a numeric Strava athlete ID in a public JSON file violates the Nov 2024 restriction against displaying Strava Data to other users.
   - Recommendation: Use a **one-way hash** (SHA-256 of the athlete ID, first 16 hex chars) for the filename and `athleteId` field in public JSON. This provides a stable, collision-resistant identifier while not directly exposing the Strava numeric ID. Store the mapping from hash → Strava ID only in private/server context (or not at all — re-derive on submission). This is the conservative safe choice. Document the decision in the data model document.

3. **What Strava data (if any) is safe to store privately for debugging**
   - What we know: The 7-day cache rule applies to "Strava Data" in the cache. Private server-side logs (not public files) likely have more latitude but Strava doesn't specify.
   - What's unclear: Whether private operational logs (e.g., Netlify Function logs showing raw segment times for debugging) are covered by the cache rule.
   - Recommendation: Store raw Strava fields (segment elapsed times) only in Netlify Function logs (ephemeral, not committed to GitHub). Do not commit raw times to the repo. Only computed scores go into the GitHub-as-database JSON files.

4. **Exact HubSpot form fields for the athlete limit review**
   - What we know: The form is at `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8`. It requires screenshots of all places Strava data is shown and the "Connect with Strava" button.
   - What's unclear: Whether there are additional fields (app description, intended athlete count, use case text).
   - Recommendation: Fill out the form early. Based on community reports, useful information to have ready: client ID, app name/description, intended athlete count (<50), event description, confirmation of API policy compliance, use case framing (annual recurring community cycling event, computed scores only displayed publicly).

---

## Sources

### Primary (HIGH confidence)
- `https://www.strava.com/legal/api` — Full API Agreement including Community Application definition (§2.10), data display restrictions, 7-day cache rule, Strava Data definition
- `https://developers.strava.com/docs/rate-limits/` — Athlete limit starting at 1, Developer Program form URL, screenshots requirement, 7–10 business day review timeline
- `/Users/Sheppardjm/Repos/mkUltraGravel/src/lib/scoring.js` — Direct codebase evidence of segment constants pattern (string IDs, named exports, inline comments)
- `/Users/Sheppardjm/Repos/mkUltraGravel/netlify/functions/submit-result.js` — Direct codebase evidence of GitHub Contents API commit pattern (GET SHA, PUT with base64 content)
- `/Users/Sheppardjm/Repos/mkUltraGravel/netlify/functions/strava-callback.js` — Direct codebase evidence of athlete ID handling (stored as plain string)

### Secondary (MEDIUM confidence)
- `https://press.strava.com/articles/updates-to-stravas-api-agreement` — Nov 2024 change summary (official Strava press release)
- `https://communityhub.strava.com/developers-api-7/athlete-limits-8200` — Community confirmation of review process, 7–10 day timeline, follow-up at developers@strava.com

### Tertiary (LOW confidence)
- Community discussion at `communityhub.strava.com` about computed/derived data vs. raw Strava Data — no clear consensus, Strava has not published a definitive interpretation
- Community reports of real-world review turnaround exceeding 7–10 business days — single source, unverified

---

## Metadata

**Confidence breakdown:**
- Strava ToS compliance boundary: MEDIUM — the Nov 2024 terms are verified from official sources; the computed-scores-vs-raw-data distinction is unresolved by Strava officially
- Athlete limit review process: HIGH — form URL, screenshot requirement, and timeline verified from official rate limits docs and corroborated by community
- Segment constants pattern: HIGH — directly observed in existing sibling project codebase
- CSV fallback pattern: MEDIUM — GitHub Contents API pattern is HIGH (proven in mkUltraGravel); CSV ingestion specifics are LOW (no existing implementation to reference)
- Athlete ID hashing recommendation: LOW — based on conservative interpretation of ambiguous API terms; no official guidance found

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days — Strava ToS is relatively stable; developer program form URL should be re-verified before submission)
