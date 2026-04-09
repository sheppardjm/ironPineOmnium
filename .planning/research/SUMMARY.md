# Research Summary: Iron & Pine Omnium — SEO & Social Sharing (v1.1)

**Project:** Iron & Pine Omnium
**Domain:** Static Astro 6 event site — gravel cycling omnium
**Researched:** 2026-04-09
**Confidence:** HIGH

---

## Key Consensus

All four research dimensions (stack, features, architecture, pitfalls) are tightly aligned and mutually reinforcing. There are no conflicts between researchers. Key points of consensus:

1. **Single OG image, not per-page or dynamic.** STACK, FEATURES, and ARCHITECTURE all independently concluded a 1200×630px PNG in `public/` is the correct approach. PITFALLS confirmed Satori+Sharp has documented Netlify compatibility friction and is not worth pursuing for a one-image site.
2. **Extend `BaseLayout.astro` directly — no SEO library.** All four files agree `astro-seo` adds no value for a 5-page site and has uncertain Astro 6 compatibility. The existing `<slot name="head">` and props interface is already the right architecture.
3. **`site` URL in `astro.config.mjs` is the first prerequisite.** FEATURES notes it as a dependency gate; ARCHITECTURE identifies it as step 1 of the build order; PITFALLS calls it the single most dangerous omission (silent failures cascade across all canonical and OG URL construction).
4. **Only one new npm package: `@astrojs/sitemap`.** Every other item is either a static file (`og-image.png`, `robots.txt`, favicon assets, `site.webmanifest`) or in-layout template markup (meta tags, JSON-LD).
5. **JSON-LD `SportsEvent` on homepage only.** All researchers agree structured data belongs only on the index page where Google's rich result event card adds value.

---

## Stack Additions

The existing stack (Astro 6.1.x, Tailwind CSS 4, pnpm, Netlify static) is **unchanged**. This milestone is purely additive.

**New package (one):**
- `@astrojs/sitemap` v3.7.2 — official Astro integration; auto-crawls all static routes at build time; requires `site` URL in config. Install via `pnpm astro add sitemap`.

**New static assets (no packages):**
- `public/og-image.png` — 1200x630px, under 500KB, branded event image (design deliverable)
- `public/favicon.ico` — 32x32 ICO fallback for legacy browsers/email clients
- `public/apple-touch-icon.png` — 180x180 PNG for iOS Safari "Add to Home Screen"
- `public/favicon-96x96.png` — 96x96 PNG for Android Chrome
- `public/site.webmanifest` — web app manifest linking icon set
- `public/robots.txt` — 5-line static file pointing to sitemap

**Explicitly ruled out:**
- `astro-seo` — Astro 6 compat unconfirmed; abstraction adds no value at this scale
- `satori` + `sharp` — Sharp has documented Netlify friction; single static image makes dynamic generation unnecessary
- `astro-favicons` — one-time offline generation via realfavicongenerator.net is simpler
- `astro-robots-txt` — overkill for a 5-line file

---

## Feature Categories

### Table Stakes (must ship — social sharing fails without these)

| Feature | Gap Today | Effort |
|---------|-----------|--------|
| Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name` | Entirely missing | 30-60 min |
| Twitter/X Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt` | Entirely missing | Bundled with OG |
| Canonical URL (`<link rel="canonical">`) | Entirely missing | 15 min |
| OG image asset — 1200x630px PNG | Does not exist | Design: 2-4 hrs |
| Favicon complete set — ICO, SVG (existing), apple-touch-icon | ICO and apple-touch-icon missing | 1-2 hrs |
| `@astrojs/sitemap` integration | Missing; no `site` URL set | 30 min |
| `robots.txt` | Missing | 10 min |
| Per-page description for leaderboard (only page missing it) | `leaderboard.astro` missing description | 15 min |
| `site` URL in `astro.config.mjs` | Not set | Trivial — 1 line |

### Differentiators (high value, low effort — should ship)

| Feature | Value | Effort |
|---------|-------|--------|
| `SportsEvent` JSON-LD on homepage | Google rich results event card; gravel event discovery SEO | 1-2 hrs incl. validation |
| `site.webmanifest` | "Add to Home Screen" for riders during event weekend | 30 min (once icons exist) |
| `og:locale` | Signals region to Facebook/LinkedIn crawlers | Trivial — 1 line |

### Anti-Features (do not build)

| Anti-Feature | Why Not |
|--------------|---------|
| Social sharing buttons (X, Facebook) | Meta shut down external Facebook buttons Feb 10, 2026; X share widgets harm Core Web Vitals; 99.8% of mobile users never tap them; OG tags make any shared link polished without buttons |
| Dynamic per-rider OG share cards | Requires serverless image generation; no demand signal at 50-100 rider scale; revisit Year 2 |
| Per-page OG images (5 unique images) | Marginal benefit at meaningful production cost; one branded image covers all pages |
| Breadcrumb structured data | This is a 5-page flat site; breadcrumb schema is for deep hierarchies |
| FAQ structured data | No FAQ content exists; injecting schema without visible content violates Google policies |
| hreflang tags | English-only event for regional US audience; zero benefit |
| AMP pages | Deprecated as ranking signal in 2021; Astro static output is already fast |

---

## Architecture Approach

This milestone requires **no architectural changes** to the core system (Strava OAuth, Netlify Functions, GitHub data store, scoring engine). SEO is a pure static-page concern.

**What changes:**

| Component | Change |
|-----------|--------|
| `astro.config.mjs` | Add `site: 'https://ironpineomnium.com'`; add `sitemap()` integration with filter excluding `/submit-confirm` |
| `src/layouts/BaseLayout.astro` | Extend Props with `ogImage?`, `noindex?`, `type?`; add OG/Twitter meta tags; add canonical link; add favicon/manifest link tags |
| `src/pages/index.astro` | Add SportsEvent JSON-LD via `<slot name="head">` |
| `src/pages/leaderboard.astro` | Add missing `description` prop (one line) |
| `src/pages/submit-confirm.astro` | Add `noindex={true}` prop |

**Key architecture decision:** Centralize all SEO tags in `BaseLayout.astro` props. Do not split between layout and head slot. Use head slot only for additive content (JSON-LD on homepage). All meta tags go through props to prevent duplicates.

**Canonical URL pattern:**
```typescript
const canonicalURL = new URL(Astro.url.pathname, Astro.site).toString();
// Use this same value for both <link rel="canonical"> AND og:url
```

**Build order imposed by dependencies:**
1. Set `site` URL — everything depends on this
2. Create OG image — blocks social preview testing
3. Extend BaseLayout — all pages benefit immediately
4. Fix leaderboard description — one line alongside step 3
5. Create favicon assets + manifest
6. Add sitemap integration
7. Add JSON-LD to index.astro
8. Add noindex to submit-confirm.astro

---

## Top Pitfalls

**Critical (silent failures, hard to detect without prior knowledge):**

1. **Missing `site` in `astro.config.mjs`** — `Astro.site` is `undefined`; canonical and `og:url` silently produce broken strings. Do this first, before writing any meta tag code. This project currently has no `site` property set.

2. **Relative path in `og:image`** — Social crawlers cannot resolve relative URLs. A tag with `content="/og-image.png"` silently fails for all social cards. Always use `new URL("/og-image.png", Astro.site).toString()`.

3. **OG image wrong dimensions or size** — LinkedIn minimum is 1200x627px; narrower images fail to render. File above 5MB may timeout during crawler fetch. Target: exactly 1200x630px, under 500KB. Include explicit `og:image:width` and `og:image:height` tags.

4. **Duplicate meta tags from layout + head slot** — Astro does not deduplicate `<head>` content. If OG tags are in BaseLayout AND a page adds them via head slot, both render. Platform behavior on duplicates is undefined. Prevention: all SEO tags through BaseLayout props only.

5. **`twitter:card` missing** — X does not render a preview card without this tag, even when OG tags are correct. Add `<meta name="twitter:card" content="summary_large_image">` — this single tag unlocks card rendering.

**Moderate (catch in QA):**

6. **JSON-LD Astro escaping** — Never use `{schemaObject}` in a script body. Astro escapes quotes to `&quot;`, producing invalid JSON. Always use `set:html={JSON.stringify(schemaObject)}`.

7. **Social platform cache locks in broken previews** — Facebook caches OG metadata for ~30 days. First share with broken tags = broken preview for a month. Verify all OG tags with Facebook Sharing Debugger and X Card Validator before any social sharing.

8. **Trailing slash canonical mismatch** — Astro SSG produces `directory/index.html`; Netlify serves with trailing slash. Canonicals must match the actual served URL. Derive from `Astro.url.pathname` (not hardcoded paths) and set `trailingSlash: 'always'` in config.

9. **`og:url` differs from canonical** — Both must be computed from the same expression. Never set them independently. Facebook uses `og:url` as deduplication key for shared links.

---

## Open Questions

1. **Production domain confirmed?** `https://ironpineomnium.com` is hardcoded in astro.config.mjs and BaseLayout. If the domain changes before launch, it must be updated in both places.

2. **OG image design ownership.** The OG image is 2-4 hours of design work (not code). It should follow the editorial race-poster aesthetic. Who is creating it, and is it in scope for this milestone?

3. **Event dates final for JSON-LD?** `startDate: "2026-06-06"`, `endDate: "2026-06-07"` will be embedded in structured data. Confirm these are correct before committing.

4. **Gravel calendar submissions in scope?** gravelevents.com, gravelcalendar.com, granfondoguide.com are the primary discovery channels for riders searching "gravel race Upper Peninsula Michigan 2026." Submitting to these is a non-code task. Is it part of this milestone or deferred?

---

## Roadmap Implications

This milestone is small, well-defined, and has no blocking unknowns. Suggested phase structure:

**Phase 1: Config & Prerequisites** (gates everything else)
- Add `site: 'https://ironpineomnium.com'` to `astro.config.mjs`
- Install `@astrojs/sitemap`, add to integrations with submit-confirm filter
- Verify `Astro.site` is not `undefined` in a local build
- Rationale: `site` URL gates all canonical/OG URL construction; without it, no other phase can be tested

**Phase 2: Asset Creation** (design-gated)
- Create `public/og-image.png` — 1200x630px, under 500KB (design task, ~2-4 hrs)
- Generate favicon set: `favicon.ico`, `apple-touch-icon.png`, `favicon-96x96.png` (via realfavicongenerator.net)
- Author `public/robots.txt` with Sitemap directive
- Author `public/site.webmanifest`
- Rationale: OG image is the critical path item; other assets are low-effort and can be done while design work proceeds

**Phase 3: BaseLayout Extension** (coding)
- Extend `BaseLayout.astro` Props: add `ogImage?`, `noindex?`, `type?`
- Add OG tags, Twitter Card tags, canonical link, favicon/manifest link tags
- Fix `leaderboard.astro` missing description
- Add `noindex={true}` to `submit-confirm.astro`
- Rationale: BaseLayout changes benefit all 5 pages simultaneously; should be done in one pass to avoid partial states

**Phase 4: Structured Data** (coding + validation)
- Add SportsEvent JSON-LD to `index.astro` via `<slot name="head">`
- Use `set:html={JSON.stringify(...)}` — not string interpolation
- Validate with Google Rich Results Test against Netlify preview deploy
- Rationale: validation requires a deployed URL; this phase is last in the coding sequence

**Phase 5: QA & Pre-Launch Verification** (mandatory before social shares)
- View source on every page — verify canonical, OG tags, no duplicates
- Facebook Sharing Debugger — force scrape, confirm image renders
- X Card Validator — confirm `summary_large_image` card appears
- Verify `/sitemap-index.xml` returns valid XML
- Test apple-touch-icon on iOS (Add to Home Screen)
- Google Rich Results Test — confirm event rich result eligibility
- Rationale: platform caching means the first share locks in the preview for up to 30 days; QA is mandatory before any promotion

**Total estimated effort:** 6-12 hours (dominated by OG image design and QA round-trips)

### Research Flags

No phase needs `/gsd:research-phase` — this milestone is entirely documented territory with HIGH confidence sources (official Astro docs, Google structured data docs, ogp.me spec). All patterns are established and stable.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | One new package with official Astro docs; all other additions are static files or inline markup |
| Features | HIGH | OG spec, Google structured data docs, and Twitter/X Card docs are authoritative and stable |
| Architecture | HIGH | Based on direct inspection of the existing codebase plus official Astro docs |
| Pitfalls | HIGH | Derived from official Astro behavior, official platform specs, and documented Netlify/Astro behavior |

**Overall confidence: HIGH**

### Gaps to Address

- **Production domain** — confirm `ironpineomnium.com` is final before coding begins
- **OG image design** — highest-effort item; needs explicit ownership and time budget
- **Trailing slash behavior** — verify Netlify's actual redirect behavior for this deployment against Astro's `trailingSlash` setting before finalizing canonical URL construction

---

## Sources

### Primary (HIGH confidence)
- Astro `@astrojs/sitemap` docs (v3.7.2): `https://docs.astro.build/en/guides/integrations-guide/sitemap/`
- Astro canonical URL pattern: `https://docs.astro.build/en/reference/configuration-reference/`
- Open Graph Protocol specification: `https://ogp.me/`
- Google Event Structured Data: `https://developers.google.com/search/docs/appearance/structured-data/event`
- Schema.org SportsEvent: `https://schema.org/SportsEvent`
- Google canonical URL guidance: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Evil Martians favicon guide (confirmed current 2026): `https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs`

### Secondary (MEDIUM confidence)
- X/Twitter Card tags: `https://share-preview.com/blog/twitter-meta-tags` (cross-referenced with X developer docs)
- Social sharing buttons analysis: `https://www.seocomponent.com/blog/you-dont-need-social-share-buttons-on-your-website/`
- Sharp/Astro Netlify compatibility issues: `https://github.com/withastro/astro/issues/14531`
- Gravel event discovery platforms: gravelevents.com, gravelcalendar.com, granfondoguide.com (direct observation)

---

*Research completed: 2026-04-09*
*Ready for roadmap: yes*
