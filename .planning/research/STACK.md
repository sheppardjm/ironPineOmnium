# Technology Stack — SEO & Social Sharing Milestone

**Project:** Iron & Pine Omnium
**Milestone:** SEO & Social Sharing metadata
**Researched:** 2026-04-09
**Overall confidence:** HIGH

---

## Scope

This document covers only the stack additions and changes needed to add SEO and social sharing
metadata to the existing Astro 6 static site. The existing stack (Astro 6.1.x, Tailwind CSS 4,
pnpm, Netlify static hosting) is preserved unchanged. No rendering mode changes are required;
this milestone is purely additive to a static site.

---

## Recommended Stack Additions

### 1. @astrojs/sitemap — Sitemap Generation

| Attribute | Value |
|-----------|-------|
| Package | `@astrojs/sitemap` |
| Current version | v3.7.2 |
| Type | Astro integration |
| Install | `pnpm astro add sitemap` |

**Why:** Official Astro integration, maintained by the Astro core team. Automatically crawls all
statically generated routes at build time and emits `sitemap-index.xml` and `sitemap-0.xml` to
the output directory. No manual route management needed for this site's 5 pages.

**Requirement:** The `site` option must be set in `astro.config.mjs` with the full production URL
(e.g., `https://ironpineomnium.com`). This is also needed for canonical URL generation across the
site, so it is required regardless.

**Fits the project:** This site uses `output: 'static'` (no SSR). All five pages are fully static,
so the integration works perfectly — no `customPages` workarounds needed.

**What it does NOT do:** Does not generate `robots.txt`. That is handled separately (see below).

```javascript
// astro.config.mjs — additions
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ironpineomnium.com', // REQUIRED
  output: 'static',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

**Confidence:** HIGH — verified from official Astro docs (v3.7.2 confirmed current).

---

### 2. Head Meta Tags — Built-In Astro, No External Library

**Recommendation: Do not add astro-seo or any third-party SEO component library.**

**Why not astro-seo:** The `astro-seo` package (jonasmerlin/astro-seo) shipped v1.0.0 requiring
Astro 5.16+ and v1.1.0 on January 13, 2026. It does not explicitly declare Astro 6 support as of
the researched date. More importantly, for a 5-page site with a single shared OG image, the
abstraction adds a dependency for no meaningful gain. The existing `BaseLayout.astro` already has
a `<slot name="head" />` escape hatch and `title`/`description` props — the foundation is already
correct.

**What to build instead:** Extend `BaseLayout.astro` directly with:

- `<link rel="canonical" href={canonicalURL} />` — built from `Astro.site` + `Astro.url.pathname`
- `<meta property="og:title" content={...} />`
- `<meta property="og:description" content={...} />`
- `<meta property="og:type" content="website" />` (or "event" for the home page)
- `<meta property="og:url" content={canonicalURL} />`
- `<meta property="og:image" content={absoluteOgImageUrl} />`
- `<meta property="og:image:width" content="1200" />`
- `<meta property="og:image:height" content="630" />`
- `<meta property="og:site_name" content="Iron & Pine Omnium" />`
- `<meta name="twitter:card" content="summary_large_image" />`
- `<meta name="twitter:image" content={absoluteOgImageUrl} />`
- `<meta name="twitter:title" content={...} />`
- `<meta name="twitter:description" content={...} />`

This is ~20 lines of straightforward Astro template markup. No library needed.

**Canonical URL pattern (verified from Astro docs):**
```typescript
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
```
`Astro.site` is populated from the `site` key in `astro.config.mjs`. Works at build time for
static pages.

**Confidence:** HIGH — pattern verified from official Astro docs and community sources.

---

### 3. OG Image — Single Static File, No Generation Pipeline

**Recommendation: Design one 1200×630px PNG, place in `public/`, reference by absolute URL.**

**Why not Satori + Sharp:** The project context specifies "single branded OG image to be shared
across all pages." Dynamic OG image generation (Satori → SVG → Sharp → PNG per-route) exists
to produce per-post images with variable titles. That complexity is not needed here. Adding Satori
and Sharp introduces:
- Sharp's known Netlify/Astro compatibility friction (multiple GitHub issues, November 2025 reports
  of `Could not find Sharp` errors on Astro 5.13.7+; risk carries into Astro 6)
- Satori's requirement to load font files at build time (the project uses Google Fonts via CDN link,
  not local font files — a mismatch)
- An API endpoint (`pages/og-image.png.ts`) that, while compatible with static mode via
  `getStaticPaths()`, adds unnecessary build complexity for a single image

**The correct approach:**
1. Create `public/og-image.png` (1200×630px — universal OG + Twitter/X compatible size)
2. Reference it as an absolute URL: `https://ironpineomnium.com/og-image.png`
3. OG meta tags require absolute URLs; relative paths silently fail on social platforms

**Image design note (not a stack concern):** The image should match the editorial race-poster
aesthetic (Spectral headlines, deep forest palette). This is a design deliverable, not a build
tooling concern.

**Confidence:** HIGH — static OG image in public/ is the standard pattern; absolute URL
requirement confirmed from multiple social platform documentation sources.

---

### 4. Favicon Set — Manual File Placement, No Generation Integration

**Recommendation: Generate offline with realfavicongenerator.net; place files in `public/`.**

The existing `BaseLayout.astro` has `<link rel="icon" type="image/svg+xml" href="/logo.svg" />`.
This covers modern browsers (Chrome, Firefox, Edge) that support SVG favicons. The gap is:

- Safari on iOS/macOS does not fully honor SVG favicons in all contexts
- No `apple-touch-icon` for iOS home screen
- No `favicon.ico` fallback for legacy tools (email clients, feed readers, etc.)

**Minimal modern favicon set (3 files, covers ~100% of cases):**

| File | Size | Purpose |
|------|------|---------|
| `public/favicon.ico` | 32×32 | Legacy browsers, email clients, feed readers |
| `public/icon.svg` | scalable | Modern browsers (rename/reuse logo.svg if identical) |
| `public/apple-touch-icon.png` | 180×180 | iOS Safari home screen bookmark |

**HTML link tags to add to BaseLayout.astro:**
```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

Replace the existing `<link rel="icon" type="image/svg+xml" href="/logo.svg" />` with the three
tags above (and rename `logo.svg` → `icon.svg` in public/ or keep the `/logo.svg` path if it is
referenced elsewhere).

**Why not astro-favicons integration:** The `astro-favicons` package automates generation but
adds a build-time integration dependency for what is a one-time design task. For a branded
event site with one favicon source, offline generation then committed static files is simpler
and more predictable.

**Recommended offline tool:** https://realfavicongenerator.net — generates ICO, PNG, and the exact
HTML tags with correct sizes. Upload the logo SVG; download the zip; copy to `public/`.

**Confidence:** HIGH — three-file approach verified from Evil Martians' authoritative favicon guide
and confirmed still current by 2025/2026 browser support data.

---

### 5. JSON-LD Structured Data — Inline Component, No Library

**Recommendation: Inline `<script type="application/ld+json">` in BaseLayout.astro.**

No package needed. The pattern for Astro is:

```astro
---
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  "name": "Iron & Pine Omnium",
  "description": "...",
  "startDate": "2026-06-06",
  "endDate": "2026-06-07",
  "location": {
    "@type": "Place",
    "name": "Michigan's Upper Peninsula",
    "address": { "@type": "PostalAddress", "addressRegion": "MI", "addressCountry": "US" }
  },
  "organizer": { "@type": "Organization", "name": "Neucadia", "url": "https://neucadia.com" },
  "image": "https://ironpineomnium.com/og-image.png",
  "url": "https://ironpineomnium.com",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode"
};
---
<script type="application/ld+json" set:html={JSON.stringify(structuredData)} />
```

**Schema type choice:** `SportsEvent` (subtype of `Event`) is the correct type. Google's Event
rich results accept `SportsEvent`. Required properties for rich result eligibility are `name`,
`startDate`, and `location` (with `location.name` and `location.address`). The event is physical
(UP Michigan), which qualifies — Google explicitly excludes virtual-only events.

**`set:html` note:** Astro's `set:html` directive bypasses HTML escaping for the script content,
which is the correct approach for JSON-LD. This is the established Astro community pattern.

**Where to place it:** Only on pages where it adds value. The home page (`/`) is the primary
candidate. The `/leaderboard`, `/submit`, `/submit-confirm`, and `/support` pages benefit from
`og:` meta tags but not necessarily the `SportsEvent` JSON-LD block (which is home-page-level).
Use the existing `<slot name="head" />` in `BaseLayout.astro` for page-specific structured data,
and place global structured data directly in the layout.

**Confidence:** HIGH — verified from Google's official structured data documentation and Astro
community implementation patterns.

---

### 6. robots.txt — Static File in public/

**Recommendation: Add `public/robots.txt` as a hand-authored static file.**

No package needed. A static file in `public/` is copied verbatim to the output root by Astro's
build process, which is exactly what is needed.

**Recommended content:**
```
User-agent: *
Allow: /

Sitemap: https://ironpineomnium.com/sitemap-index.xml
```

**Pages to consider blocking:** `/submit`, `/submit-confirm` are functional pages (form UI, OAuth
redirect target) — not content Google should index or surface. Add `Disallow:` rules if desired,
though `<meta name="robots" content="noindex">` in the page's `<head>` is more reliable than
`robots.txt` for preventing indexing of specific pages.

**Confidence:** HIGH — Astro docs confirm `public/` files are served at root path.

---

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `astro-seo` package | Astro 6 compatibility not confirmed; no meaningful gain for a 5-page single-OG-image site | Hand-authored meta tags in BaseLayout.astro |
| `satori` + `sharp` | Sharp has documented Netlify/Astro compatibility friction (late 2025); fonts are CDN-linked, not local files; single static OG image is sufficient | Pre-designed PNG in `public/` |
| `astro-favicons` integration | Automated generation is overkill for one favicon source; adds build-time integration dependency | One-time offline generation via realfavicongenerator.net |
| `astro-robots-txt` package | A static `public/robots.txt` is 5 lines; adding a package to generate 5 lines is unnecessary complexity | Static file |
| Per-page OG images | No editorial differentiation between pages justifies per-page images; same brand image everywhere is appropriate for an event site | Single `public/og-image.png` |

---

## Integration with Existing Stack

| Existing Element | Change Required |
|------------------|-----------------|
| `astro.config.mjs` | Add `site: 'https://ironpineomnium.com'` option; add `sitemap()` to `integrations[]` |
| `BaseLayout.astro` | Extend `<head>` with canonical, OG, Twitter Card tags, JSON-LD script, favicon link tags |
| `public/logo.svg` | Keep as-is (already used as icon). Add `favicon.ico` and `apple-touch-icon.png` alongside it |
| `output: 'static'` | No change — this milestone is fully compatible with static output |
| Netlify adapter | Not needed; this milestone does not require SSR |
| Font loading (Google Fonts CDN) | No change — fonts remain CDN-linked, which is why Satori is not viable |

---

## Installation

```bash
# Only new package for this milestone:
pnpm astro add sitemap
# This command auto-adds the integration to astro.config.mjs

# No other packages needed
```

Manual steps (not npm packages):
1. Set `site: 'https://ironpineomnium.com'` in `astro.config.mjs`
2. Design and commit `public/og-image.png` (1200×630)
3. Generate and commit `public/favicon.ico` and `public/apple-touch-icon.png`
4. Add `public/robots.txt`
5. Extend `BaseLayout.astro` with meta tags and JSON-LD

---

## Version Compatibility

| Package | Version | Astro 6 Compatible | Notes |
|---------|---------|--------------------|-------|
| `@astrojs/sitemap` | v3.7.2 | Yes — official Astro integration | Requires `site` in config |

No other new packages are introduced by this milestone.

---

## Sources

- @astrojs/sitemap official docs (version v3.7.2 confirmed): `https://docs.astro.build/en/guides/integrations-guide/sitemap/` — HIGH confidence
- Astro canonical URL pattern: `https://docs.astro.build/en/reference/configuration-reference/` — HIGH confidence
- Google Event structured data requirements: `https://developers.google.com/search/docs/appearance/structured-data/event` — HIGH confidence
- Evil Martians favicon guide (three-file minimal setup): `https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs` — HIGH confidence (approach confirmed current by 2025/2026 browser support data)
- Static OG image in Astro: `https://arne.me/blog/static-og-images-in-astro` — MEDIUM confidence (community source, approach verified by reasoning)
- OG + Twitter card image dimensions (1200×630): multiple sources including X developer docs — HIGH confidence
- astro-seo v1.1.0 release date and Astro 6 support status: `https://github.com/jonasmerlin/astro-seo/releases` — MEDIUM confidence (release date confirmed; Astro 6 compat not explicitly documented)
- Sharp/Astro Netlify compatibility issues: `https://github.com/withastro/astro/issues/14531` — MEDIUM confidence (issue thread, late 2025)

---

*Stack research for: ironPineOmnium — SEO & Social Sharing metadata milestone*
*Researched: 2026-04-09*
