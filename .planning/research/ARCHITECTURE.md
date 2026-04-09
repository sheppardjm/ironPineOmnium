# Architecture Research

**Domain:** Strava-integrated gravel cycling event leaderboard (Astro static → hybrid SSR)
**Researched:** 2026-04-02 (OAuth/persistence) · 2026-04-09 (SEO & social sharing addendum)
**Confidence:** HIGH — based on direct inspection of existing ironPineOmnium codebase and the
complete, production-deployed mkUltraGravel integration (OAuth, callback, submit-result,
webhook, GitHub-as-data-store pattern). No speculation required; the sibling repo is the
reference implementation.

---

## SEO & Social Sharing Architecture (v1.1 addendum)

This section documents how meta tags, structured data, favicons, and a sitemap integrate
into the existing Astro 6 layout architecture. The core system architecture (OAuth, data
persistence, Netlify Functions) is unchanged — SEO is a pure static-page concern.

---

### Current State (Baseline)

Inspecting the existing codebase:

**`src/layouts/BaseLayout.astro` already has:**
- `Props` interface with `title?: string` and `description?: string` (both optional, both have defaults)
- `<title>{title}</title>` and `<meta name="description" content={description} />`
- `<link rel="icon" type="image/svg+xml" href="/logo.svg" />` (SVG favicon only)
- `<slot name="head" />` — a named slot for page-specific head injection

**All pages already pass title and description:**
- `index.astro`: `title="Iron & Pine Omnium | Two Days of Gravel in the Hiawatha National Forest"`, description present
- `submit.astro`: `title="Submit Activity | Iron & Pine Omnium"`, description present
- `submit-confirm.astro`: `title="Confirm Submission | Iron & Pine Omnium"`, description present
- `support.astro`: `title="Support | Iron & Pine Omnium"`, description present
- `leaderboard.astro`: `title="Leaderboard | Iron & Pine Omnium"`, **description NOT passed** (uses layout default)

**Missing entirely:**
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`)
- Twitter/X Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`)
- Canonical URL tag (`<link rel="canonical" href="..." />`)
- Web app manifest (`/site.webmanifest`)
- Multiple favicon sizes (only SVG exists; no PNG fallbacks, no apple-touch-icon)
- Structured data (JSON-LD)
- Sitemap (`sitemap.xml`)
- `<meta name="robots" />` for noindex on utility pages

---

### Integration Architecture

#### Where Meta Tags Live

**Decision: Extend BaseLayout, not a separate SEO component.**

The existing `BaseLayout.astro` Props interface already handles title and description. The
correct pattern is to extend this interface with OG/Twitter props, keeping all head content
generation in one place. A separate `<SEO>` component (like `astro-seo` library) adds an
indirection layer with no benefit at this site's scale.

```
src/layouts/BaseLayout.astro
  Props interface (extended):
    title?: string           — already exists
    description?: string     — already exists
    ogImage?: string         — new: URL to OG image (absolute), defaults to site-wide branded image
    canonical?: string       — new: absolute URL for this page, defaults to Astro.url.href
    noindex?: boolean        — new: true for submit-confirm (transient, no indexing value)
    type?: 'website'|'article' — new: OG type, defaults to 'website'
```

The `<slot name="head" />` already exists in BaseLayout for edge cases where a page needs
truly custom head content. For this milestone, structured data (JSON-LD) uses this slot from
`index.astro` only. All other meta tag additions belong in BaseLayout directly.

#### Prop Flow: BaseLayout to Pages

No pages need architectural changes — they already pass `title` and `description`. The new
props (`ogImage`, `canonical`, `noindex`) have safe defaults, so pages that don't pass them
get sensible behavior:

```
Page             → BaseLayout props                    → Head output
─────────────────────────────────────────────────────────────────────
index.astro        title, description                  og:image = /og-image.png
                                                       canonical = https://ironpineomnium.com/
                                                       JSON-LD via <slot name="head" />

leaderboard.astro  title (description missing — fix!)  og:image = /og-image.png
                                                       canonical = .../leaderboard/

submit.astro       title, description                  og:image = /og-image.png
                                                       noindex not needed (indexable)

submit-confirm     title, description                  noindex=true (no stable URL)
  .astro

support.astro      title, description                  og:image = /og-image.png
```

Canonical URL can be derived from `Astro.url` inside BaseLayout without any prop, since
`Astro.url.href` returns the full absolute URL during static generation. Pass it from the
layout itself unless a page needs to override.

**Note:** `Astro.url` is available in `.astro` files during build in static mode — it uses
the `site` config value in `astro.config.mjs`. This requires adding `site:
'https://ironpineomnium.com'` to the config. Without this, `Astro.url.href` will be relative.

#### OG Image Strategy

Single branded image used for all pages. This is correct for a small event site — per-page
OG images require either a build-time image generation step (complex) or a server-rendered
image endpoint (unnecessary overhead).

```
public/og-image.png      — 1200×630px, branded event image
                           referenced as absolute URL: https://ironpineomnium.com/og-image.png
```

The image must be an absolute URL in OG tags, not a relative path. BaseLayout derives the
absolute URL from the `site` config + the filename.

#### Structured Data (JSON-LD)

JSON-LD for the event lives only on `index.astro` via the `<slot name="head">` mechanism.
This is the correct placement: the homepage is the canonical landing page for the event,
and structured data only adds value where search engines will crawl and a rich result
(event card) can appear.

```astro
<!-- In index.astro, inside <BaseLayout> -->
<script type="application/ld+json" slot="head">
{
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "Iron & Pine Omnium",
  "startDate": "2026-06-06",
  "endDate": "2026-06-07",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Hiawatha National Forest",
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "MI",
      "addressCountry": "US"
    }
  },
  "url": "https://ironpineomnium.com",
  "description": "A two-day gravel omnium in Michigan's Upper Peninsula combining fondo moving time with grinduro timed sectors and KOM points.",
  "sport": "Cycling"
}
</script>
```

Do not add JSON-LD to leaderboard, submit, or support pages. Those pages are functional
tools, not event discovery pages, and structured data there provides no search benefit.

#### Favicons and Web App Manifest

Current state: only `<link rel="icon" type="image/svg+xml" href="/logo.svg" />` in BaseLayout.

The SVG favicon works in modern browsers but fails for iOS home screen icons and any
browser that doesn't support SVG favicons (older Safari, some Android webviews). The manifest
enables "Add to Home Screen" behavior.

File additions to `public/`:
```
public/
  favicon.ico          — 32×32 ICO (fallback for very old browsers / email clients)
  favicon-96x96.png    — PNG for Android Chrome
  apple-touch-icon.png — 180×180 PNG for iOS Safari "Add to Home Screen"
  site.webmanifest     — JSON manifest linking the above
```

BaseLayout head additions:
```html
<link rel="icon" type="image/svg+xml" href="/logo.svg" />          <!-- existing -->
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

`site.webmanifest` content:
```json
{
  "name": "Iron & Pine Omnium",
  "short_name": "I&P Omnium",
  "icons": [
    { "src": "/favicon-96x96.png", "sizes": "96x96", "type": "image/png" }
  ],
  "start_url": "/",
  "display": "browser",
  "theme_color": "#131c1a",
  "background_color": "#f5f0e8"
}
```

Colors from the existing design token context: `--color-night-900` (dark) and
`--color-surface` (light background). These match the site's editorial palette.

#### Sitemap

Use `@astrojs/sitemap` — the official Astro integration. This is the only correct approach
for static Astro sites. Manual `sitemap.xml` authoring is error-prone and not maintained
automatically.

Required config change in `astro.config.mjs`:
```js
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ironpineomnium.com',   // required for sitemap + canonical URLs
  output: 'static',
  integrations: [sitemap({
    filter: (page) => !page.includes('/submit-confirm'),
  })],
  vite: { plugins: [tailwindcss()] },
});
```

Filter out `/submit-confirm` — it uses a query param payload (`?payload=...`), has no stable
URL, and noindex will already prevent indexing; excluding it from the sitemap reinforces this.

All other routes (`/`, `/leaderboard`, `/submit`, `/support`) should be in the sitemap.

Note: `leaderboard/` is a directory route in Astro — confirm the generated URL is
`/leaderboard/` not `/leaderboard` to match what the sitemap generates and what canonicals
will reference.

---

### Component Modification Summary

| Component | Change Type | What Changes |
|-----------|-------------|--------------|
| `src/layouts/BaseLayout.astro` | **Modify** | Add `ogImage`, `canonical`, `noindex`, `type` props; add OG/Twitter meta tags; add additional favicon links; derive canonical from `Astro.url` |
| `src/pages/leaderboard.astro` | **Modify** | Add missing `description` prop to BaseLayout call |
| `src/pages/index.astro` | **Modify** | Add JSON-LD script block in `<slot name="head">` |
| `src/pages/submit-confirm.astro` | **Modify** | Add `noindex={true}` to BaseLayout call |
| `astro.config.mjs` | **Modify** | Add `site` URL, add sitemap integration |
| `public/og-image.png` | **New** | 1200×630 branded OG image |
| `public/apple-touch-icon.png` | **New** | 180×180 PNG for iOS |
| `public/favicon-96x96.png` | **New** | 96×96 PNG for Android Chrome |
| `public/favicon.ico` | **New** | ICO fallback |
| `public/site.webmanifest` | **New** | Web app manifest |

No new Astro components are required. No new pages are required. No SSR changes needed.
The entire milestone is BaseLayout modifications plus static assets.

---

### Build Order for Implementation

Dependencies create a natural sequence:

1. **Add `site` URL to `astro.config.mjs`** — everything else depends on having an absolute
   base URL. `Astro.url.href` is relative without it. Do this first.

2. **Create the OG image (`public/og-image.png`)** — must exist before the meta tags that
   reference it are testable. Can be created with any image editor or design tool. No code
   dependency, but blocks social preview testing.

3. **Extend `BaseLayout.astro`** — add OG/Twitter meta tags, canonical link, additional
   favicon links, and manifest link. All pages benefit from this change immediately.

4. **Fix `leaderboard.astro` description** — small fix, do it alongside the BaseLayout
   change. One prop, one line.

5. **Create favicon assets** — `apple-touch-icon.png`, `favicon-96x96.png`, `favicon.ico`,
   `site.webmanifest`. These are static file additions to `public/`. Order doesn't matter
   among them; all can be done in one pass.

6. **Add sitemap integration** — install `@astrojs/sitemap`, update `astro.config.mjs`.
   Depends on step 1 (site URL). Verify `pnpm build` produces `sitemap-index.xml` and
   `sitemap-0.xml` in `dist/`.

7. **Add JSON-LD to `index.astro`** — add the `<script type="application/ld+json"
   slot="head">` block. Depends on confirming the structured data content (event name,
   dates, location) is final.

8. **Add `noindex` to `submit-confirm.astro`** — one prop change. Last because it's
   lowest priority; the page is not indexed today even without noindex.

---

### Testing Approach Per Phase

| Phase | How to Verify |
|-------|---------------|
| BaseLayout OG tags | Open Graph debugger (opengraph.xyz or meta.tag.io) against deployed preview URL |
| Twitter card | cards-dev.twitter.com/validator against deployed URL |
| Canonical tags | View source on each page — confirm absolute URL in `<link rel="canonical">` |
| Sitemap | `https://ironpineomnium.com/sitemap-index.xml` returns valid XML after deploy |
| Favicons | iOS simulator "Add to Home Screen" for apple-touch-icon; Android Chrome for manifest |
| JSON-LD | Google Rich Results Test against homepage URL |
| Noindex | View source on submit-confirm — confirm `<meta name="robots" content="noindex">` present |

---

## Standard Architecture (v1.0 — OAuth, Persistence, UI)

The sections below document the Strava OAuth, GitHub-as-data-store, and Netlify Functions
architecture from the v1.0 milestone. These are unchanged for v1.1.

---

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
│   ├── images/
│   ├── og-image.png              # v1.1 — 1200×630 branded OG image
│   ├── apple-touch-icon.png      # v1.1 — 180×180 for iOS
│   ├── favicon-96x96.png         # v1.1 — 96×96 PNG
│   ├── favicon.ico               # v1.1 — ICO fallback
│   ├── site.webmanifest          # v1.1 — web app manifest
│   └── logo.svg
├── src/
│   ├── components/
│   │   ├── Leaderboard.astro     # Tabbed per-category leaderboard
│   │   └── LogoMark.astro
│   ├── layouts/
│   │   └── BaseLayout.astro      # Extended in v1.1 with OG/Twitter/canonical/favicon
│   ├── lib/
│   │   ├── types.ts              # RiderResult, ScoredRider, CategoryLeaderboard
│   │   ├── scoring.ts            # Pure scoring engine — no deps
│   │   └── sample-data.ts        # Removed or guarded once real data flows
│   ├── pages/
│   │   ├── index.astro           # Landing + embedded leaderboard + JSON-LD (v1.1)
│   │   ├── leaderboard.astro     # + description prop added (v1.1)
│   │   ├── submit.astro          # Activity URL form
│   │   ├── submit-confirm.astro  # Confirmation + category + consent + noindex (v1.1)
│   │   └── support.astro
│   └── styles/
│       └── global.css
├── astro.config.mjs              # v1.1: add site URL + sitemap integration
├── netlify.toml                  # Build config + /api/* redirect to /.netlify/functions/*
└── package.json
```

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
    { athleteId, name, gender, activityUrl, day1MovingTimeSeconds: N, day2SectorTimesSeconds: [], day2KomPoints: 0 }

Day 2 Submission (same rider, different activity):
  strava-callback extracts sector segment times + KOM segment times from activity
  submit-result GETs existing {athleteId}.json
  Merges day 2 data into existing record (updates day2SectorTimesSeconds, day2KomPoints)
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
  day2SectorTimesSeconds: number[],    // Elapsed times for each gravel sector segment (day 2)
  day2KomPoints: number,               // Derived from KOM segment rankings at score time (day 2)
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

### Anti-Pattern 6: Separate SEO Component (v1.1 specific)

**What people do:** Install `astro-seo` or create a separate `<SEO>` component that wraps all meta tags.
**Why it's wrong at this scale:** The existing `BaseLayout.astro` already handles meta tags with a typed Props interface and `<slot name="head">` for overrides. A separate component adds an indirection layer (extra import, extra file, extra prop-passing chain) with no benefit for a 5-page site.
**Do this instead:** Extend BaseLayout's Props interface and add OG/Twitter tags directly to its `<head>`. Use the existing `<slot name="head">` for the one case (JSON-LD on index.astro) that needs page-specific head injection.

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

## Build Order (v1.0 — OAuth + Persistence)

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

- Direct inspection of `/Users/Sheppardjm/Repos/ironPineOmnium/` (existing static site, all pages and layouts)
- Direct inspection of `/Users/Sheppardjm/Repos/mkUltraGravel/netlify/functions/` (production OAuth + data persistence implementation)
- Direct inspection of `/Users/Sheppardjm/Repos/mkUltraGravel/src/pages/submit.astro`, `submit-confirm.astro`, `results.astro` (UI patterns)
- `netlify.toml` from mkUltraGravel (redirect rules, build config)
- Netlify Functions v1/v2 env var bug documented in mkUltraGravel function headers (confirmed 2026-03-28)
- Strava API authentication docs referenced in function source code comments
- Astro official docs — Layouts (BaseLayout props pattern): https://docs.astro.build/en/basics/layouts/ — HIGH confidence
- Astro official docs — Sitemap integration: https://docs.astro.build/en/guides/integrations-guide/sitemap/ — HIGH confidence
- Schema.org SportsEvent type: https://schema.org/SportsEvent — HIGH confidence
- `@astrojs/sitemap` npm package: https://www.npmjs.com/package/@astrojs/sitemap — HIGH confidence

---

*Architecture research for: Strava-integrated event leaderboard (ironPineOmnium)*
*Researched: 2026-04-02 (v1.0) · 2026-04-09 (v1.1 SEO addendum)*
