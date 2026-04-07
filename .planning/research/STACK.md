# Stack Research

**Domain:** Gravel cycling event leaderboard with Strava OAuth integration
**Researched:** 2026-04-02
**Confidence:** HIGH (most choices verified via official docs, working sibling repo, and 2026 search results)

---

## Context

This is a subsequent-milestone addition to an existing Astro 6.1.1 static site. The scoring engine
already exists. We are adding three capabilities:

1. **Strava OAuth** — riders authenticate to authorize activity access
2. **Activity data fetching** — pull segment efforts from the authorized activity
3. **Data persistence** — store per-rider results so they survive deploys

A working implementation of all three already exists in the sibling repo `mkUltraGravel`
(`/netlify/functions/strava-auth.js`, `strava-callback.js`, `submit-result.js`, `strava-webhook.js`).
That implementation is the primary reference. This research validates and extends it for ironPineOmnium.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Astro | 6.1.1 (pin; latest stable 6.1.3) | Framework | Already in use; hybrid output mode gives static pages + server API routes with no architecture change |
| @astrojs/netlify | latest (^6.x) | SSR adapter | Official adapter, Astro 6 support confirmed March 10 2026 by Netlify; supports hybrid output, server islands, actions, sessions |
| Netlify Functions v1 (`exports.handler`) | Node 20 runtime | Serverless API | **v1 syntax only** — a confirmed active bug (March 27-28 2026) causes user-defined env vars to be `undefined` at runtime in v2 (`export default`) functions; v1 is stable. Sibling repo comments document this explicitly. |
| Strava API v3 | Current | Activity data source | The only way to get segment effort data from athlete activities; OAuth 2.0 flow is stable |

**Confidence:** HIGH — Astro and Netlify adapter confirmed by official changelogs. Functions v1 bug confirmed by three separate Netlify Support Forum threads dated 2026-03-27 through 2026-03-28.

### Rendering Mode

Use **hybrid output** (`output: 'hybrid'` in `astro.config.mjs`):

- All existing pages remain statically prerendered (zero runtime cost)
- API route files opt in to server rendering with `export const prerender = false`
- This is the minimal change needed — no converting the whole site to SSR

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'hybrid',
  adapter: netlify(),
});
```

**Confidence:** HIGH — official Astro docs confirm hybrid mode and `prerender = false` pattern.

### Data Persistence: Two-Tier Approach

The sibling repo uses **GitHub Contents API as a file store** (committing one JSON file per athlete).
This is the proven, working pattern for this project family. For ironPineOmnium, use the same
approach as the primary pattern, with Netlify Blobs as a simpler alternative.

#### Option A (Recommended): GitHub Contents API file commit

**How it works:** On submission, a serverless function commits one JSON file per rider to
`public/data/results/athletes/{athleteId}.json` via the GitHub Contents API, then fires the
Netlify build hook to trigger a rebuild. The static site reads those files at build time.

| Aspect | Detail |
|--------|--------|
| Packages | Native `fetch` (Node 18+) — no extra deps |
| Credentials | Fine-grained PAT with `Contents: Read + Write` on this repo. Fine-grained PATs are GA since March 2025. |
| Race condition | GET-then-PUT pattern; 409 conflict detected and surfaced to user |
| GDPR/TOS | Deauthorization webhook deletes the file via GitHub Contents DELETE |
| Rebuild latency | ~1-3 min build time after hook fires |
| Cost | Free (Netlify free tier, GitHub free tier) |

**Why this is recommended:** It is already proven in mkUltraGravel with zero issues. For 50-100
riders over a two-day event window, the write volume (100 PUTs max) is trivially within GitHub
API limits. The leaderboard is naturally consistent after each rebuild.

**When it breaks down:** If riders need to see each other's submissions in real-time without a
rebuild. At 1-3 min rebuild latency, this is acceptable for an event leaderboard.

**Confidence:** HIGH — directly ported from working sibling repo code.

#### Option B (Alternative): Netlify Blobs

**How it works:** Store each rider's JSON blob in a Netlify Blobs store keyed by `athleteId`.
A server-rendered leaderboard page (or API route) reads all blobs at request time.

| Aspect | Detail |
|--------|--------|
| Packages | `@netlify/blobs` (no version pinned; use latest) |
| Credentials | Zero-configuration inside Netlify Functions — access token injected automatically |
| Consistency | Eventual by default (60s edge propagation); `{ consistency: 'strong' }` option available |
| Cost | Free on all Netlify plans |
| Real-time | Yes — leaderboard page becomes server-rendered and always shows current data |

**When to choose Blobs over GitHub API:** If real-time leaderboard updates are a requirement and
you are willing to convert the leaderboard page from static to server-rendered. For a two-day
event where "refresh to see updates" is acceptable, Option A is simpler.

**Confidence:** HIGH — Netlify Blobs docs verified directly. `@netlify/blobs` package confirmed
generally available (no longer beta per current docs).

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@netlify/blobs` | latest | Blob storage (Option B only) | If choosing Netlify Blobs over GitHub API |
| `drizzle-orm` + `@libsql/client` | latest | SQLite ORM + Turso client | Only if you move to a real database (see Alternatives) |
| `zod` | ^3.x | Runtime schema validation for submission payloads | Optional but recommended for hardening the submit-result function |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `pnpm` | Package manager | Already in use (`pnpm@10.14.0`) |
| `@astrojs/check` | TypeScript checking | Already in use |
| Netlify CLI | Local function dev + Blobs emulation | `netlify dev` emulates Functions and Blobs locally |
| Strava API Explorer | Test OAuth + activity API calls | `https://developers.strava.com/playground/` |

---

## Installation

```bash
# Add Netlify adapter (run via astro add to auto-configure astro.config.mjs)
pnpm astro add netlify

# If using Netlify Blobs (Option B)
pnpm add @netlify/blobs

# Optional: Zod for payload validation
pnpm add zod

# Dev tools
pnpm add -D netlify-cli
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Netlify Functions v1 (`exports.handler`) | Functions v2 (`export default`) | Only after the March 2026 env var bug is officially resolved by Netlify |
| GitHub Contents API file store | Turso / libSQL | If you need relational queries, full-text search, or real-time sub-second updates across more than ~1000 riders |
| GitHub Contents API file store | Netlify Blobs | If real-time leaderboard (no rebuild) is required by event organizers |
| GitHub Contents API file store | Supabase Postgres | Only if you need RLS, realtime subscriptions, or a proper dashboard to manage entries |
| Hybrid output (`output: 'hybrid'`) | Full SSR (`output: 'server'`) | If the majority of pages need dynamic data — not the case here |
| Astro API endpoints (`src/pages/api/`) | Astro Actions | Actions are optimized for type-safe client-server form calls with Zod; but they cannot issue 302 redirect responses needed for the OAuth callback, making raw API routes the correct choice |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Netlify Functions v2 (`export default`) | Active confirmed bug (March 2026): user-defined `process.env` vars are `undefined` at runtime intermittently. Affects ALL v2 functions including scheduled and background types. | Netlify Functions v1 (`exports.handler`) — confirmed stable |
| Astro Actions for OAuth callback | Actions cannot return a raw `302 Location` redirect response — they are designed for JSON/form call-response cycles, not HTTP redirect flows | Astro server endpoint (`src/pages/api/strava-callback.ts`) returning `new Response(null, { status: 302, headers: { Location: '...' } })` |
| `netlify.toml` `[context.env]` for secrets | Env vars set in `netlify.toml` contexts do not reliably reach Function runtimes (separate long-standing Netlify limitation) | Set secrets in Netlify Dashboard → Site Settings → Environment Variables |
| Cookie mixing: `Astro.cookies.set()` + manual `Set-Cookie` header | Known Astro bug (#15076): cookies set via `AstroCookies.set()` are dropped when combined with manually appended `Set-Cookie` headers | Use only raw `Response` with manual `Set-Cookie` header (the pattern used in mkUltraGravel) |
| Storing access tokens beyond the request | Strava tokens grant activity access; persisting them is a security risk and unnecessary — the token is used once to fetch the activity then discarded | Exchange code → fetch activity → discard token in a single function execution |
| `activity:read` scope | Only reads public/followers activities; private activities and private segment efforts will be missing | `activity:read_all` scope — required to access segment efforts on private activities |

---

## Stack Patterns by Variant

**If event organizers want real-time leaderboard (no rebuild latency):**
- Use Netlify Blobs (Option B) for persistence
- Convert the leaderboard page to server-rendered: `export const prerender = false`
- Because Blobs reads are synchronous per-request with 60s eventual-consistency SLA

**If the scoring involves data from both events (Day 1 Hiawatha's Revenge + Day 2 mkUltraGravel):**
- Each event site manages its own rider data store independently
- ironPineOmnium pulls from both at build time (or fetches from their APIs)
- Because the scoring engine already handles the two-day combination

**If you need to backfill entries manually (race director workflow):**
- The GitHub Contents API approach allows direct JSON file commits via the GitHub UI or `gh` CLI
- Because the data format is plain JSON — no database admin interface needed

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `astro@6.1.x` | `@astrojs/netlify@^6.x` | Official adapter; `npx @astrojs/upgrade` updates both together |
| `astro@6.1.x` | `@tailwindcss/vite@^4.2.x` | Already confirmed working in this project |
| `@netlify/blobs` | Netlify Functions (Node 18+) | Node 18+ required for native Fetch API support |
| Netlify Functions v1 | Node 20 runtime | Default Netlify runtime; no config needed |
| `drizzle-orm` + `@libsql/client` | Node 18+, Edge runtimes | If Turso path chosen later; use `@libsql/client/web` for edge, `/node` for Functions |

---

## Strava OAuth Flow Summary

The OAuth flow implemented in mkUltraGravel is the correct pattern to adapt:

```
1. /api/strava-auth (GET)
   - Validate activityUrl format
   - Generate CSRF nonce (crypto.randomBytes)
   - Encode { nonce, activityUrl } as base64url → state param
   - Set HttpOnly SameSite=Lax cookie with nonce only
   - 302 → https://www.strava.com/oauth/authorize?scope=activity:read_all&state=...

2. /api/strava-callback (GET, Strava redirects here)
   - Verify state param decodes and nonce matches cookie
   - Verify granted scope includes 'activity:read_all'
   - Exchange code for access token (POST to Strava token endpoint)
   - Fetch activity: GET /api/v3/activities/{id}?include_all_efforts=true
   - Filter segment efforts to event segment IDs
   - Encode payload as base64url → 302 → /submit-confirm?data=...
   - Clear CSRF cookie (Max-Age=0)

3. /submit-confirm (static page, client-side JS decodes ?data=)
   - Rider reviews matched segments, selects category, consents
   - POST form to /api/submit-result

4. /api/submit-result (POST)
   - Validate consent + category
   - Decode and validate payload
   - Commit athlete JSON to GitHub (or write to Netlify Blobs)
   - Trigger Netlify build hook (if using GitHub API pattern)
   - Return success page

5. /api/strava-webhook (GET + POST)
   - GET: Echo hub.challenge for subscription validation
   - POST: On deauth event (object_type=athlete, aspect_type=delete),
     delete athlete data from GitHub (or Blobs)
   - Always respond 200 immediately; process async
```

**Required Strava env vars:**
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `STRAVA_REDIRECT_URI` — must match exactly what is registered in the Strava app settings
- `STRAVA_VERIFY_TOKEN` — secret for webhook subscription handshake

**Required GitHub env vars (Option A only):**
- `GITHUB_TOKEN` — fine-grained PAT, Contents: Read + Write
- `GITHUB_OWNER`
- `GITHUB_REPO`
- `NETLIFY_BUILD_HOOK` — build hook URL from Netlify dashboard

---

## Sources

- Astro official docs (on-demand rendering): `https://docs.astro.build/en/guides/on-demand-rendering/` — HIGH confidence
- Astro official docs (endpoints/API routes): `https://docs.astro.build/en/guides/endpoints/` — HIGH confidence
- Astro official docs (actions vs endpoints): `https://docs.astro.build/en/guides/actions/` — HIGH confidence
- Netlify changelog "Astro 6 just works on Netlify" (March 10 2026): `https://www.netlify.com/changelog/2026-03-10-astro-6/` — HIGH confidence
- Netlify Support Forum — Functions v2 env var bug (2026-03-27/28): three threads at `answers.netlify.com` — HIGH confidence (multiple independent reports, same symptom)
- Netlify Blobs docs: `https://docs.netlify.com/build/data-and-storage/netlify-blobs/` — HIGH confidence
- Strava authentication docs: `https://developers.strava.com/docs/authentication/` — HIGH confidence
- Drizzle ORM + Turso connection docs: `https://orm.drizzle.team/docs/connect-turso` — HIGH confidence
- Turso free tier pricing: `https://turso.tech/pricing` — HIGH confidence
- Astro changelog (confirms 6.1.3 latest as of 2026-04-01): `https://astro-changelog.netlify.app/` — HIGH confidence
- GitHub blog (fine-grained PATs GA, March 2025): `https://github.blog/changelog/2025-03-18-fine-grained-pats-are-now-generally-available/` — HIGH confidence
- mkUltraGravel sibling repo (`/netlify/functions/`): Working implementation, reviewed directly — HIGH confidence (source of truth for proven patterns)
- Astro issue #15076 (AstroCookies.set + manual Set-Cookie header conflict): `https://github.com/withastro/astro/issues/15076` — MEDIUM confidence (issue confirmed, fix status not verified)

---

*Stack research for: ironPineOmnium — Strava OAuth + activity data + data persistence*
*Researched: 2026-04-02*
