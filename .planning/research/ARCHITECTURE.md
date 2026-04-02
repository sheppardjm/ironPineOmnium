# Architecture Research

**Domain:** Strava-integrated gravel cycling event leaderboard (Astro static → hybrid SSR)
**Researched:** 2026-04-02
**Confidence:** HIGH — based on direct inspection of existing ironPineOmnium codebase and the
complete, production-deployed mkUltraGravel integration (OAuth, callback, submit-result,
webhook, GitHub-as-data-store pattern). No speculation required; the sibling repo is the
reference implementation.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser (Rider)                               │
│  Static pages (index, leaderboard, /submit form)                     │
│  Client-side JS: form validation, base64url decode on confirm page   │
└─────────────────┬────────────────────────────────────────────────────┘
                  │ GET /api/strava-auth?activityUrl=...
                  │ POST /api/submit-result (form body)
                  │ GET /api/strava-callback (Strava redirect)
                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│              Serverless Functions (Netlify Functions v1)              │
│                                                                      │
│  strava-auth         Validate URL, set CSRF cookie, redirect to      │
│                      Strava OAuth consent screen                     │
│                                                                      │
│  strava-callback     Verify CSRF nonce, exchange code for token,     │
│                      fetch Strava activity with segment efforts,     │
│                      filter to event segments, redirect to           │
│                      /submit-confirm?data=<base64url payload>        │
│                                                                      │
│  submit-result       Validate consent + category, decode payload,    │
│                      write athlete JSON to GitHub via Contents API,  │
│                      trigger Netlify rebuild                         │
│                                                                      │
│  strava-webhook      Validate Strava subscription handshake (GET),   │
│                      handle deauth events — delete athlete file      │
│                      from GitHub, trigger rebuild (POST)             │
└──────────┬───────────────────────────┬───────────────────────────────┘
           │ GitHub Contents API       │ Strava API v3
           ▼                           ▼
┌────────────────────┐     ┌─────────────────────────────┐
│  GitHub Repo       │     │  Strava Platform             │
│  (data store)      │     │                             │
│                    │     │  oauth/authorize             │
│  public/data/      │     │  oauth/token (exchange)     │
│  results/          │     │  api/v3/activities/:id      │
│  athletes/         │     │    ?include_all_efforts=true│
│  {athleteId}.json  │     │  push_subscriptions         │
│                    │     │  (deauth webhook)           │
└────────┬───────────┘     └─────────────────────────────┘
         │ Netlify build hook (POST)
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Astro Build (SSG)                                  │
│                                                                      │
│  results.astro     Reads athlete JSON files from public/data/,       │
│                    passes through scoring.ts, renders leaderboard    │
│                    as static HTML at build time                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `/src/pages/index.astro` | Landing page, event info, hero, photo reel, scoring explainer, leaderboard section | `Leaderboard.astro`, `scoring.ts` (for weight display) |
| `/src/pages/submit.astro` | Entry form — rider pastes Strava activity URL | Redirects browser to `/api/strava-auth` |
| `/src/pages/submit-confirm.astro` | Confirmation step — decode payload, rider selects category and consents | POSTs to `/api/submit-result` |
| `/src/components/Leaderboard.astro` | Renders tabbed category tables from scored data | `scoring.ts`, `sample-data.ts` (replaced by real data at build time) |
| `/src/lib/scoring.ts` | Pure scoring engine — `scoreOmnium()`, `scoreCategory()`, `formatDuration()` | No external deps; consumed by `results.astro` and `Leaderboard.astro` |
| `/src/lib/types.ts` | Shared TypeScript interfaces: `RiderResult`, `ScoredRider`, `CategoryLeaderboard`, `ScoringConfig` | Imported everywhere |
| `netlify/functions/strava-auth.js` | Initiate OAuth — validate URL, generate CSRF nonce, redirect to Strava | Strava OAuth, sets `strava_oauth_state` cookie |
| `netlify/functions/strava-callback.js` | OAuth callback — verify CSRF, exchange code, fetch activity, extract segment times | Strava token endpoint, Strava Activities API |
| `netlify/functions/submit-result.js` | Persist submission — write `{athleteId}.json` to GitHub repo, trigger rebuild | GitHub Contents API, Netlify build hook |
| `netlify/functions/strava-webhook.js` | Deauthorization compliance — delete athlete data when rider revokes Strava access | GitHub Contents API, Netlify build hook |
| `public/data/results/athletes/` | Per-athlete JSON files keyed by Strava athlete ID — the live data store | Written by `submit-result.js`, read by `results.astro` at build |
| GitHub repo | Data persistence layer — athlete JSON files committed and versioned | Written via Contents API; read by Netlify at build |
| Netlify build hook | Trigger rebuild after submission or deletion | Fired by `submit-result.js` and `strava-webhook.js` |

---

## Recommended Project Structure

```
ironPineOmnium/
├── netlify/
│   └── functions/
│       ├── strava-auth.js        # OAuth initiation (adapted from mkUltraGravel)
│       ├── strava-callback.js    # OAuth callback + activity fetch
│       ├── submit-result.js      # Persist to GitHub, trigger rebuild
│       └── strava-webhook.js     # Deauth compliance handler
├── public/
│   ├── data/
│   │   └── results/
│   │       └── athletes/
│   │           └── {athleteId}.json   # One file per rider; keyed by Strava athlete ID
│   └── images/
├── src/
│   ├── components/
│   │   ├── Leaderboard.astro     # Tabbed per-category leaderboard
│   │   └── LogoMark.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── lib/
│   │   ├── types.ts              # RiderResult, ScoredRider, CategoryLeaderboard
│   │   ├── scoring.ts            # Pure scoring engine — no deps
│   │   └── sample-data.ts        # Removed or guarded once real data flows
│   ├── pages/
│   │   ├── index.astro           # Landing + embedded leaderboard
│   │   ├── submit.astro          # Activity URL form
│   │   └── submit-confirm.astro  # Confirmation + category + consent
│   └── styles/
│       └── global.css
├── netlify.toml                  # Build config + /api/* redirect to /.netlify/functions/*
├── astro.config.mjs              # Stays output: "static" — SSR not needed
└── package.json
```

### Structure Rationale

- **`netlify/functions/`**: All server-side logic lives here as Netlify Functions v1. This keeps Astro as a pure static builder — no SSR adapter needed, no `output: "server"` change.
- **`public/data/results/athletes/`**: GitHub-as-database pattern. One JSON file per Strava athlete ID. Idempotent — resubmission overwrites cleanly. Read at Astro build time by `results.astro` / `Leaderboard.astro`.
- **`src/lib/scoring.ts`**: Pure functions, zero side effects. Consumed at build time only. The same engine works whether fed sample data or real athlete files.
- **`src/pages/submit-confirm.astro`**: Stays static — the `?data=` payload is decoded client-side in a `<script>` tag, exactly as mkUltraGravel does it. No server-side query param access needed.

---

## Architectural Patterns

### Pattern 1: Netlify Functions v1 (not v2)

**What:** Export `exports.handler = async (event) => { ... }` instead of the v2 `export default` syntax.
**When to use:** Always, for this project.
**Trade-offs:** v2 syntax is the documented current approach, but a confirmed Netlify bug as of 2026-03-28 causes user-defined `process.env` vars to return `undefined` intermittently in v2 functions. v1 is stable and works reliably. The mkUltraGravel functions are all v1 for this exact reason.

```javascript
// Use v1 — not v2
exports.handler = async (event) => {
  const clientId = process.env.STRAVA_CLIENT_ID; // stable in v1
  // ...
};
```

### Pattern 2: CSRF Protection via Nonce Cookie + Base64url State

**What:** On OAuth initiation, generate a random nonce, encode it into the `state` parameter alongside the activity URL, and store only the nonce in an `HttpOnly; Secure; SameSite=Lax` cookie. On callback, verify cookie nonce matches state nonce.
**When to use:** Required. Strava's OAuth is a standard authorization code flow and is vulnerable to CSRF without this.
**Trade-offs:** Stateless — no server-side session storage needed. The nonce + activityUrl ride through OAuth in the state param, eliminating any need to persist pending requests.

```javascript
// strava-auth.js
const nonce = require('crypto').randomBytes(16).toString('hex');
const state = Buffer.from(JSON.stringify({ nonce, activityUrl })).toString('base64url');
// Cookie: strava_oauth_state={nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600
```

### Pattern 3: GitHub-as-Data-Store (GET-then-PUT)

**What:** Use the GitHub Contents API to create or update a JSON file per athlete. GET first to retrieve the existing file's SHA (required for updates), then PUT with the new content.
**When to use:** Submission persistence. Works because data volume is tiny (50-100 riders = 50-100 small JSON files) and GitHub's API is reliable and free.
**Trade-offs:** Simple and eliminates need for any database service. Update conflict (409 from GitHub) is surfaced to the user with a retry prompt. Not suitable at high volume — the GET-then-PUT race window is fine at event scale.

```javascript
// submit-result.js
const getRes = await fetch(apiBase, { headers: githubHeaders });
const existingSha = getRes.ok ? (await getRes.json()).sha : undefined;
// PUT with sha (update) or without (create)
```

### Pattern 4: Rebuild Trigger after Submission

**What:** After writing a new athlete file to GitHub, `submit-result.js` fires a POST to a Netlify build hook URL stored as an env var.
**When to use:** Every successful submission and every deauthorization deletion.
**Trade-offs:** Fire-and-forget — if the rebuild trigger fails, the data is already in GitHub and will appear on the next natural rebuild. Non-fatal. Rebuild takes 60-90 seconds, so the leaderboard is not instant — appropriate for an event of this scale.

### Pattern 5: Client-Side Decode on Confirm Page

**What:** `submit-confirm.astro` is a static Astro page. The `?data=` query param (a base64url payload from `strava-callback.js`) is decoded client-side in a `<script>` block. The decoded payload populates the UI and is passed through as a hidden form field.
**When to use:** Any page that needs to display OAuth callback data while remaining statically built.
**Trade-offs:** No server rendering needed. The payload is safe to expose client-side since it contains only the athlete's own data. The form's POST to `submit-result` re-validates everything server-side.

---

## Data Flow

### Submission Flow (Day 1 or Day 2)

```
Rider visits /submit
    ↓
Pastes Strava activity URL, clicks "Connect with Strava"
    ↓
Browser GET /api/strava-auth?activityUrl=...
    ↓
strava-auth.js: validate URL, generate nonce, set cookie, build Strava OAuth URL
    ↓
302 → https://www.strava.com/oauth/authorize?...&state=<base64url{nonce,activityUrl}>
    ↓
Rider approves on Strava consent screen
    ↓
Strava 302 → /api/strava-callback?code=...&state=...&scope=activity:read_all
    ↓
strava-callback.js:
  1. Verify state nonce matches cookie
  2. Verify granted scope includes activity:read_all
  3. POST to Strava token endpoint → exchange code for access token + athlete profile
  4. Extract activityId from activityUrl
  5. GET Strava activity/:id?include_all_efforts=true
  6. Filter segment_efforts to event segment IDs (day 1: moving_time; day 2: sector + KOM IDs)
  7. Reject if zero event segments matched
  8. Build payload: { athleteId, name, activityUrl, segments }
  9. Base64url encode payload
 10. Clear CSRF cookie, 302 → /submit-confirm?data=<encoded>
    ↓
Browser receives /submit-confirm?data=...
    ↓
Static page: client JS decodes payload, shows athlete name + matched segments
Rider selects category (men/women/non-binary), checks consent, submits form
    ↓
Browser POST /api/submit-result (form body: data=..., gender=..., consent=yes)
    ↓
submit-result.js:
  1. Validate consent and gender
  2. Decode and validate payload
  3. Build result object conforming to RiderResult schema
  4. GET GitHub file for athleteId (get SHA or confirm new)
  5. PUT athlete JSON to public/data/results/athletes/{athleteId}.json
  6. Fire-and-forget POST to Netlify build hook
  7. Return success HTML page
    ↓
Netlify rebuilds (60-90s):
  Astro reads all athlete JSON files at build time
  results.astro / Leaderboard.astro feeds data through scoring.ts
  Leaderboard renders as static HTML
    ↓
Rider sees their name on the leaderboard
```

### Day 1 + Day 2 Association

```
Day 1 Submission:
  strava-callback extracts moving_time from activity
  submit-result writes {athleteId}.json:
    { athleteId, name, gender, activityUrl, day1MovingTimeSeconds, day2SectorTimesSeconds: [], day2KomPoints: 0 }

Day 2 Submission (same rider, different activity):
  strava-callback extracts sector segment times + KOM segment times
  submit-result GETs existing {athleteId}.json
  Merges day 2 data into existing record (updates day2SectorTimesSeconds + day2KomPoints)
  PUTs updated file back to GitHub
  Triggers rebuild → scoring engine sees complete RiderResult, renders full combined score
```

The Strava `athlete.id` is the stable identity key. A rider who submits day 2 only appears in the leaderboard with partial data (day1 score = 0); their full score populates once both days are submitted.

### Deauthorization Flow

```
Rider revokes Strava access via Strava settings
    ↓
Strava POSTs webhook event to /api/strava-webhook
    ↓
strava-webhook.js:
  1. Parse athlete ID from event payload
  2. GET GitHub file for athleteId to retrieve SHA
  3. DELETE file via GitHub Contents API
  4. Fire-and-forget rebuild trigger
    ↓
Netlify rebuild removes rider from leaderboard (TOS 5.4 compliance)
```

---

## Key Data Schemas

### Athlete JSON on GitHub (`public/data/results/athletes/{athleteId}.json`)

```typescript
{
  athleteId: string,         // Strava athlete ID (string-cast from number)
  name: string,              // Strava firstname + lastname
  gender: "M" | "F" | "NB", // Rider-selected at submission, not from Strava profile
  activityUrl: string,       // Day 1 or most recent submitted activity URL
  submittedAt: string,       // ISO 8601 timestamp
  day1MovingTimeSeconds: number,       // From Strava activity.moving_time (day 1)
  day2SectorTimesSeconds: number[],    // Elapsed times for each gravel sector segment
  day2KomPoints: number,               // Derived from KOM segment rankings at score time
  segments: Record<string, { elapsed_time: number }> // Raw segment effort times by ID
}
```

### RiderResult (existing TypeScript type in `src/lib/types.ts`)

```typescript
interface RiderResult {
  id: string;
  name: string;
  hometown: string;
  category: CategoryId;  // "men" | "women" | "non-binary"
  day1MovingTimeSeconds: number;
  day2SectorTimesSeconds: number[];
  day2KomPoints: number;
}
```

The athlete JSON on GitHub maps to `RiderResult` at build time in `results.astro`. The `hometown` field (in the existing type) needs a decision: either capture it during submission or drop it from the type. Category mapping: GitHub uses `"M"/"F"/"NB"` while `types.ts` uses `"men"/"women"/"non-binary"` — a small normalization step is needed in the data-loading layer.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 50-100 riders | Current pattern — GitHub-as-database + Netlify rebuild — is ideal. No infrastructure overhead. |
| 500-1000 riders | GitHub API rate limits (60 requests/hour unauthenticated, 5000 authenticated) remain well within range. Build times may reach 3-5 minutes. Acceptable for an event. |
| 5000+ riders | GitHub-as-database breaks down (file count, commit noise). Would need a real database and API-driven leaderboard. Out of scope and unnecessary for this event. |

---

## Anti-Patterns

### Anti-Pattern 1: Switching to Astro SSR (`output: "server"`)

**What people do:** Add `@astrojs/netlify` adapter and change `output` to `"server"` to handle OAuth callbacks inside Astro pages.
**Why it's wrong:** Introduces SSR complexity — every page becomes a server request, cold starts on Netlify, more moving parts, and a different mental model than what mkUltraGravel proves works.
**Do this instead:** Keep `output: "static"`. Route `/api/*` to Netlify Functions via `netlify.toml`. OAuth callbacks and data persistence are pure function concerns, not UI concerns.

### Anti-Pattern 2: Netlify Functions v2 Syntax

**What people do:** Write `export default async (req, context) => { ... }` following Netlify's current docs.
**Why it's wrong:** Confirmed env var bug in v2 as of 2026-03-28 — `process.env` user-defined vars return `undefined` intermittently. `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `GITHUB_TOKEN` would silently fail.
**Do this instead:** Use v1 syntax (`exports.handler`). Same functionality, stable env var access.

### Anti-Pattern 3: Storing OAuth Tokens Beyond the Request

**What people do:** Persist Strava access tokens in a database or session for later reuse.
**Why it's wrong:** Unnecessary complexity and a security surface. Each rider submits once (or twice). The access token is used immediately in `strava-callback.js` to fetch the activity, then discarded. Strava tokens expire anyway.
**Do this instead:** Use the token ephemerally in the callback function. Fetch the activity, extract what you need, and let the token go.

### Anti-Pattern 4: Encoding Gender from Strava Profile

**What people do:** Use Strava's `athlete.sex` field to determine the rider's category automatically.
**Why it's wrong:** Strava only returns `M` or `F`, with no non-binary option. Auto-assignment removes rider agency and misses a third category.
**Do this instead:** Rider self-selects category (men/women/non-binary) on the confirm page, as a required form field. The Strava profile is used only for name and athlete ID.

### Anti-Pattern 5: Storing Pending OAuth State Server-Side

**What people do:** Save `{ nonce, activityUrl }` in a database/KV store keyed by nonce to survive the OAuth round-trip.
**Why it's wrong:** Requires a database for what is already a stateless, short-lived operation. The 10-minute cookie window is sufficient.
**Do this instead:** Encode all state into the OAuth `state` parameter as base64url JSON. The cookie stores only the nonce for CSRF verification. Nothing server-side needed.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Strava OAuth | Redirect-based authorization code flow | `scope: activity:read_all` required (not `activity:read`) to access private activity segment efforts |
| Strava Activities API | Bearer token fetch in callback function | `?include_all_efforts=true` required to get all segment efforts, not just PRs |
| Strava Webhooks | POST to `/api/strava-webhook` for deauth events | One-time subscription registration via curl after first deploy |
| GitHub Contents API | GET-then-PUT per athlete file | Fine-grained PAT with `Contents: Read and Write` on this repo only |
| Netlify Build Hook | Fire-and-forget POST after write or delete | Non-fatal if missing — data is persisted, will appear on next rebuild |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `submit.astro` → `strava-auth.js` | Browser GET redirect | Activity URL passed as `?activityUrl=` query param |
| `strava-callback.js` → `submit-confirm.astro` | Browser 302 redirect | Full payload in `?data=` as base64url JSON |
| `submit-confirm.astro` → `submit-result.js` | HTML form POST | `data`, `gender`, `consent` fields |
| Netlify Functions → Strava API | HTTPS fetch | Access token in `Authorization: Bearer` header |
| Netlify Functions → GitHub API | HTTPS fetch | PAT in `Authorization: Bearer` header |
| GitHub repo → Astro build | File system read at build time | `results.astro` reads from `public/data/results/athletes/` via `fs.readdirSync` |
| Scoring engine → Leaderboard UI | Pure function call | `scoreOmnium(riders)` → `CategoryLeaderboard[]` |

---

## Build Order

The component dependencies create a natural build sequence:

1. **Netlify account + env vars** — Must exist before any function can run. Set `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK`, `STRAVA_VERIFY_TOKEN`.

2. **`netlify.toml` + redirect rules** — Wire `/api/*` → `/.netlify/functions/*`. Without this, browser requests to `/api/strava-auth` return 404. This unblocks all function work.

3. **`strava-auth.js`** — No dependencies on other functions. Can be built and tested first. Validates URL, sets cookie, redirects to Strava.

4. **`strava-callback.js`** — Depends on `strava-auth.js` (needs valid state cookie from it). Also depends on Strava API access (need registered OAuth app). Extract day 1 `moving_time` and day 2 sector/KOM segment times here.

5. **`submit-confirm.astro`** — Depends on the payload shape produced by `strava-callback.js`. Build after the callback payload schema is finalized. Client-side decode only; no server coupling.

6. **Athlete JSON schema** — Decide the exact shape of `{athleteId}.json` before writing `submit-result.js`. This schema bridges the function layer and the build-time data layer. The `RiderResult` type in `src/lib/types.ts` is the target; align the GitHub schema to it now.

7. **`submit-result.js`** — Depends on confirmed payload schema and athlete JSON schema. Also requires `GITHUB_TOKEN` and `NETLIFY_BUILD_HOOK` env vars.

8. **Data-loading layer in `results.astro` / `Leaderboard.astro`** — Depends on finalized athlete JSON schema. Replace `sample-data.ts` with `fs.readdirSync` + JSON.parse loop. Map GitHub schema (`M/F/NB`, `segments`) to `RiderResult` type.

9. **`strava-webhook.js`** — Depends on the GitHub file path convention established by `submit-result.js`. Register the webhook subscription via curl after first deploy. Independent of submission flow.

10. **Companion site links** — After ironPineOmnium submission is working end-to-end, update `mkUltraGravel` and `hiawathasRevenge` to point to ironPineOmnium's `/submit` page and remove their own Strava integration.

---

## Sources

- Direct inspection of `/Users/Sheppardjm/Repos/ironPineOmnium/` (existing static site)
- Direct inspection of `/Users/Sheppardjm/Repos/mkUltraGravel/netlify/functions/` (production OAuth + data persistence implementation)
- Direct inspection of `/Users/Sheppardjm/Repos/mkUltraGravel/src/pages/submit.astro`, `submit-confirm.astro`, `results.astro` (UI patterns)
- `netlify.toml` from mkUltraGravel (redirect rules, build config)
- Netlify Functions v1/v2 env var bug documented in mkUltraGravel function headers (confirmed 2026-03-28)
- Strava API authentication docs referenced in function source code comments

---

*Architecture research for: Strava-integrated event leaderboard (ironPineOmnium)*
*Researched: 2026-04-02*
