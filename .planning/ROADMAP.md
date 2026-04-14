# Roadmap: Iron & Pine Omnium

## Milestones

- ✅ **v1.0 MVP** — Phases 1-12 (shipped 2026-04-08)
- ✅ **v1.1 SEO & Social Sharing** — Phases 13-17 (shipped 2026-04-10)
- 🚧 **v1.2 Scoring Integrity** — Phases 18-19 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-12) — SHIPPED 2026-04-08</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

**Summary:** 12 phases, 33 plans. Strava OAuth, activity submission pipeline, GitHub data persistence, real-data leaderboard, mobile-responsive design, editorial race-poster redesign, Strava compliance and athlete limit review.

</details>

---

<details>
<summary>✅ v1.1 SEO & Social Sharing (Phases 13-17) — SHIPPED 2026-04-10</summary>

#### Phase 13: Config and Prerequisites

**Goal**: The production domain is wired into the build system so all canonical URLs and sitemap entries resolve to absolute, correct URLs — unblocking every other phase.

**Depends on**: Phase 12 (v1.0 complete)

**Requirements**: SEO-03, SEO-04, SEO-05

**Success Criteria** (what must be TRUE):
1. `astro.config.mjs` has `site: 'https://ironpineomnium.com'` and `Astro.site` is not `undefined` in a local build
2. `@astrojs/sitemap` is installed and integrated; `/sitemap-index.xml` is present in the build output with `/submit-confirm` excluded
3. `public/robots.txt` exists with a `Sitemap:` directive pointing to the absolute sitemap URL and appropriate `Allow: /` crawl directives

**Plans**: 1 plan

Plans:
- [x] 13-01: Set `site` URL in astro.config.mjs, install @astrojs/sitemap with submit-confirm filter, and create robots.txt

---

#### Phase 14: Asset Creation

**Goal**: All static identity and social preview assets exist in `public/` so that tag implementation and device testing can proceed without placeholder stubs.

**Depends on**: Phase 13

**Requirements**: SOCIAL-03, IDENT-01, IDENT-02, IDENT-03

**Success Criteria** (what must be TRUE):
1. `public/og-image.png` exists at exactly 1200x630px, under 500KB, combining the event logo and name with the editorial race-poster aesthetic
2. `public/favicon.ico` (32x32) and `public/apple-touch-icon.png` (180x180) exist in `public/`
3. `public/site.webmanifest` exists with correct event name, theme color, and icon references pointing to the generated favicon set

**Plans**: 2 plans

Plans:
- [x] 14-01: Design and create branded OG image (1200x630px) with visual approval checkpoint
- [x] 14-02: Generate favicon set from logo SVG and author site.webmanifest

---

#### Phase 15: BaseLayout Extension and Page Metadata

**Goal**: Every page on the site emits correct, complete social and search meta tags derived from per-page props — with no duplicate tags, no relative image URLs, and no missing descriptions.

**Depends on**: Phase 14 (OG image and favicon assets must exist before tags reference them)

**Requirements**: SOCIAL-01, SOCIAL-02, SEO-01, SEO-02, SEO-06

**Success Criteria** (what must be TRUE):
1. All pages render Open Graph tags (og:title, og:description, og:image, og:url, og:type, og:site_name) with absolute URLs derived from `Astro.site`
2. All pages render Twitter Card tags (twitter:card=summary_large_image, twitter:title, twitter:description, twitter:image) enabling full-width card previews
3. Each page has a unique `<title>` tag and unique `<meta name="description">` that accurately describe that page's content
4. `<link rel="canonical">` on every page uses the same absolute URL expression as `og:url` — no trailing-slash mismatches
5. `/submit-confirm` renders `<meta name="robots" content="noindex">` and does not appear in crawl indexes

**Plans**: 2 plans

Plans:
- [x] 15-01: Extend BaseLayout.astro Props (ogImage?, noindex?, type?); add OG tags, Twitter tags, canonical, favicon/manifest link tags
- [x] 15-02: Update all page frontmatter — unique titles and descriptions for every page; add noindex to submit-confirm.astro

---

#### Phase 16: Structured Data

**Goal**: The homepage emits a valid SportsEvent JSON-LD block that makes the event eligible for Google's rich result event cards in search.

**Depends on**: Phase 15 (BaseLayout must be stable before adding page-level head slot content)

**Requirements**: SCHEMA-01

**Success Criteria** (what must be TRUE):
1. The homepage `<head>` contains a `<script type="application/ld+json">` block with a valid SportsEvent object (name, startDate, endDate, location, description)
2. The JSON is not HTML-escaped — no `&quot;` entities — because `set:html` is used instead of string interpolation

**Plans**: 1 plan

Plans:
- [x] 16-01: Add Event JSON-LD schema to index.astro via head slot using set:html pattern

---

#### Phase 17: QA and Validation

**Goal**: Every social preview and search signal is verified with authoritative external tools against the live Netlify deployment — before any social shares lock in a cached preview.

**Depends on**: Phase 16 (all tags and structured data must be in place before QA begins)

**Requirements**: QA-01, QA-02, QA-03, QA-04

**Success Criteria** (what must be TRUE):
1. Facebook Sharing Debugger shows correct image (1200x630), title, and description for the homepage after a forced scrape
2. X Card Validator confirms `summary_large_image` card renders with the OG image for the homepage
3. Google Rich Results Test confirms the SportsEvent JSON-LD is valid and the event is eligible for rich result display
4. `/sitemap-index.xml` is accessible on the live domain and contains all indexable page URLs; `/submit-confirm` is absent from the sitemap

**Plans**: 1 plan

Plans:
- [x] 17-01: QA pass — Facebook Sharing Debugger, X Card Validator, Google Rich Results Test, sitemap verification, view-source audit on all pages

</details>

---

### 🚧 v1.2 Scoring Integrity (In Progress)

**Milestone Goal:** Prevent sandbagging by adding validation gates that reject activities too short to represent a complete route attempt and activities that started after the gun-time window — while leaving the moving-time scoring formula, leaderboard display, and athlete JSON schema entirely untouched.

---

#### Phase 18: Configuration Foundation

**Goal**: All event constants needed for validation are in a single shared module, and the Strava fetch function extracts the two new fields (`distance`, `start_date`) that validation gates will inspect.

**Depends on**: Phase 17 (v1.1 complete)

**Requirements**: CONFIG-01, CONFIG-02

**Success Criteria** (what must be TRUE):
1. `src/lib/event-config.ts` exists and exports the gun start epoch, start-time window, and per-day distance thresholds as named constants — no magic numbers appear anywhere else in the codebase
2. `netlify/functions/strava-fetch-activity.js` reads `distance` and `start_date` from the Strava API response and makes both available for downstream validation
3. A local build (`astro build`) succeeds with no TypeScript errors after the new module is introduced

**Plans**: 1 plan

Plans:
- [x] 18-01: Create event-config.ts module, extend strava-fetch-activity.js with distance/startDate extraction, and wire submit-confirm.astro transport layer

---

#### Phase 19: Fetch Pipeline Validation Gates

**Goal**: Activities that are too short or started outside the allowed window are rejected at fetch time with errors that tell the rider exactly what was wrong and what the threshold is — no invalid data ever reaches the data store.

**Depends on**: Phase 18 (event-config.ts constants must exist before validation logic can reference thresholds)

**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05

**Success Criteria** (what must be TRUE):
1. Submitting a Day 1 activity shorter than 156 km is rejected at fetch time with an error message that states the rider's recorded distance and the 156 km minimum
2. Submitting a Day 2 activity shorter than 153 km is rejected at fetch time with an error message that states the rider's recorded distance and the 153 km minimum
3. Submitting a Day 1 activity where `start_date` ends in `T00:00:01Z` (Strava "Hide Start Time") is rejected with a clear message before any further processing
4. Submitting a Day 1 activity where `start_date` is more than 30 minutes after the 8:00 AM ET gun time is rejected with a message that states the rider's actual start time and the allowed window
5. The submit page (`submit.astro`) surfaces each new error code (`distance_too_short`, `start_too_late`, `hidden_start_time`) as a human-readable message matching the above criteria

**Plans**: 1 plan

Plans:
- [ ] 19-01: Add validation gates to strava-fetch-activity.js and error message handlers to submit.astro

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Compliance and Prerequisites | v1.0 | 4/4 | Complete | 2026-04-06 |
| 2. Netlify Infrastructure | v1.0 | 2/2 | Complete | 2026-04-06 |
| 3. Strava OAuth | v1.0 | 3/3 | Complete | 2026-04-06 |
| 4. Activity Fetching and Validation | v1.0 | 2/2 | Complete | 2026-04-06 |
| 5. Submission Form UX | v1.0 | 4/4 | Complete | 2026-04-07 |
| 6. Scoring Extraction | v1.0 | 2/2 | Complete | 2026-04-07 |
| 7. Data Persistence | v1.0 | 3/3 | Complete | 2026-04-07 |
| 8. Real Data Leaderboard | v1.0 | 3/3 | Complete | 2026-04-07 |
| 9. Leaderboard Enhancements | v1.0 | 3/3 | Complete | 2026-04-08 |
| 10. Design Polish and Companion Links | v1.0 | 6/6 | Complete | 2026-04-08 |
| 11. Bug Fix and Dead Code Cleanup | v1.0 | 1/1 | Complete | 2026-04-08 |
| 12. Strava Athlete Limit Review | v1.0 | 1/1 | Complete | 2026-04-08 |
| 13. Config and Prerequisites | v1.1 | 1/1 | Complete | 2026-04-09 |
| 14. Asset Creation | v1.1 | 2/2 | Complete | 2026-04-09 |
| 15. BaseLayout Extension and Page Metadata | v1.1 | 2/2 | Complete | 2026-04-09 |
| 16. Structured Data | v1.1 | 1/1 | Complete | 2026-04-09 |
| 17. QA and Validation | v1.1 | 1/1 | Complete | 2026-04-10 |
| 18. Configuration Foundation | v1.2 | 1/1 | Complete | 2026-04-14 |
| 19. Fetch Pipeline Validation Gates | v1.2 | 0/1 | Pending | — |
