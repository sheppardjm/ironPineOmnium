# Roadmap: Iron & Pine Omnium

## Milestones

- ✅ **v1.0 MVP** — Phases 1-12 (shipped 2026-04-08)
- 🚧 **v1.1 SEO & Social Sharing** — Phases 13-18 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-12) — SHIPPED 2026-04-08</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for full phase details.

**Summary:** 12 phases, 33 plans. Strava OAuth, activity submission pipeline, GitHub data persistence, real-data leaderboard, mobile-responsive design, editorial race-poster redesign, Strava compliance and athlete limit review.

</details>

---

### 🚧 v1.1 SEO & Social Sharing (In Progress)

**Milestone Goal:** Ensure all shared links and search results display the event logo, proper descriptions, and branded previews. Submit to gravel event directories for discovery.

---

#### Phase 13: Config and Prerequisites

**Goal**: The production domain is wired into the build system so all canonical URLs and sitemap entries resolve to absolute, correct URLs — unblocking every other phase.

**Depends on**: Phase 12 (v1.0 complete)

**Requirements**: SEO-03, SEO-04, SEO-05

**Success Criteria** (what must be TRUE):
1. `astro.config.mjs` has `site: 'https://ironpineomnium.com'` and `Astro.site` is not `undefined` in a local build
2. `@astrojs/sitemap` is installed and integrated; `/sitemap-index.xml` is present in the build output with `/submit-confirm` excluded
3. `public/robots.txt` exists with a `Sitemap:` directive pointing to the absolute sitemap URL and appropriate `Allow: /` crawl directives

**Plans**: TBD

Plans:
- [ ] 13-01: Set `site` URL in astro.config.mjs, install @astrojs/sitemap with submit-confirm filter, and create robots.txt

---

#### Phase 14: Asset Creation

**Goal**: All static identity and social preview assets exist in `public/` so that tag implementation and device testing can proceed without placeholder stubs.

**Depends on**: Phase 13

**Requirements**: SOCIAL-03, IDENT-01, IDENT-02, IDENT-03

**Success Criteria** (what must be TRUE):
1. `public/og-image.png` exists at exactly 1200x630px, under 500KB, combining the event logo and name with the editorial race-poster aesthetic
2. `public/favicon.ico` (32x32) and `public/apple-touch-icon.png` (180x180) exist in `public/`
3. `public/site.webmanifest` exists with correct event name, theme color, and icon references pointing to the generated favicon set

**Plans**: TBD

Plans:
- [ ] 14-01: Create OG image (1200x630px branded event image)
- [ ] 14-02: Generate favicon set (favicon.ico, apple-touch-icon.png) and author site.webmanifest

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

**Plans**: TBD

Plans:
- [ ] 15-01: Extend BaseLayout.astro Props (ogImage?, noindex?, type?); add OG tags, Twitter tags, canonical, favicon/manifest link tags
- [ ] 15-02: Update all page frontmatter — unique titles and descriptions for every page; add noindex to submit-confirm.astro

---

#### Phase 16: Structured Data

**Goal**: The homepage emits a valid SportsEvent JSON-LD block that makes the event eligible for Google's rich result event cards in search.

**Depends on**: Phase 15 (BaseLayout must be stable before adding page-level head slot content)

**Requirements**: SCHEMA-01

**Success Criteria** (what must be TRUE):
1. The homepage `<head>` contains a `<script type="application/ld+json">` block with a valid SportsEvent object (name, startDate, endDate, location, description)
2. The JSON is not HTML-escaped — no `&quot;` entities — because `set:html` is used instead of string interpolation

**Plans**: TBD

Plans:
- [ ] 16-01: Author SportsEvent JSON-LD and add to index.astro via `<slot name="head">` using `set:html` pattern

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

**Plans**: TBD

Plans:
- [ ] 17-01: QA pass — Facebook Sharing Debugger, X Card Validator, Google Rich Results Test, sitemap verification, view-source audit on all pages

---

#### Phase 18: Directory Submissions

**Goal**: The event is listed on the three primary gravel event discovery platforms so riders searching for gravel races in Upper Peninsula Michigan 2026 can find it.

**Depends on**: Phase 17 (QA must pass before any external links drive traffic; social caches must be clean)

**Requirements**: DIR-01, DIR-02, DIR-03

**Success Criteria** (what must be TRUE):
1. Iron & Pine Omnium is submitted to gravelevents.com with event name, dates (June 6-7, 2026), location, and site URL
2. Iron & Pine Omnium is submitted to gravelcalendar.com with correct event details
3. Iron & Pine Omnium is submitted to granfondoguide.com with correct event details

**Plans**: TBD

Plans:
- [ ] 18-01: Submit event to gravelevents.com, gravelcalendar.com, and granfondoguide.com (external non-code task)

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
| 13. Config and Prerequisites | v1.1 | 0/TBD | Not started | - |
| 14. Asset Creation | v1.1 | 0/TBD | Not started | - |
| 15. BaseLayout Extension and Page Metadata | v1.1 | 0/TBD | Not started | - |
| 16. Structured Data | v1.1 | 0/TBD | Not started | - |
| 17. QA and Validation | v1.1 | 0/TBD | Not started | - |
| 18. Directory Submissions | v1.1 | 0/TBD | Not started | - |
