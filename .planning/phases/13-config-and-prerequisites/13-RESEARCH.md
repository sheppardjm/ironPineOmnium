# Phase 13: Config and Prerequisites - Research

**Researched:** 2026-04-09
**Domain:** Astro 6 configuration — `site` URL, `@astrojs/sitemap`, `robots.txt`
**Confidence:** HIGH

---

## Summary

Phase 13 wires the production domain into the Astro build system, installs the sitemap integration, and creates `robots.txt`. These three changes are the prerequisite gate for every other v1.1 phase — canonical URLs, OG tags, and sitemap entries all depend on `Astro.site` being defined.

The scope is narrow and well-understood. All three tasks have official Astro documentation. No third-party libraries are needed beyond `@astrojs/sitemap`. The existing `astro.config.mjs` has no `site` property and no integrations array — both need adding. No `robots.txt` currently exists in `public/`.

**Primary recommendation:** Run `pnpm astro add sitemap` to install and auto-wire the integration, then manually add `site: 'https://ironpineomnium.com'` to `astro.config.mjs`, and place a static `public/robots.txt`. Do not use a dynamic endpoint for robots.txt — static is sufficient for this site.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@astrojs/sitemap` | 3.7.2 (latest) | Auto-generates `sitemap-index.xml` + `sitemap-0.xml` at build time | Official Astro integration; updated for Astro 6 in 3.7.1 |

### Supporting

No additional libraries required. Everything else uses built-in Astro APIs (`Astro.site`, `Astro.url`).

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@astrojs/sitemap` | Hand-rolled `sitemap.xml.ts` endpoint | Hand-rolling misses index file, filter logic, and future page additions; not worth it for 6 pages |
| Static `public/robots.txt` | Dynamic `src/pages/robots.txt.ts` endpoint | Dynamic is cleaner (uses `site` config as single source of truth) but adds complexity for no real gain on a fully static site. Static file is fine. |

**Installation:**
```bash
pnpm astro add sitemap
```

This command installs the package and patches `astro.config.mjs` automatically to add the import and `integrations: [sitemap()]`. You must still add `site:` manually.

---

## Architecture Patterns

### Pattern 1: Minimum Viable astro.config.mjs for This Phase

**What:** Add `site` and wire the sitemap integration. Everything else stays unchanged.
**When to use:** This exact configuration — do not change `output`, `vite`, or other settings.

```javascript
// Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ironpineomnium.com",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) => page !== "https://ironpineomnium.com/submit-confirm/",
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### Pattern 2: Canonical URL Construction in Components

**What:** `Astro.site` returns a `URL` object (or `undefined` if not configured). Use `new URL(pathname, Astro.site)` to build absolute canonical URLs.
**When to use:** Any component that renders `<link rel="canonical">` or absolute `og:url`.

```astro
---
// Source: https://docs.astro.build/en/reference/api-reference/#astrosite
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---
<link rel="canonical" href={canonicalURL} />
```

`Astro.site` is a `URL` object — pass it as the base to `new URL()`. When `site` is not configured, `Astro.site` is `undefined` and the `new URL()` call throws at build time — which is why setting `site` must happen before any canonical tag work.

### Pattern 3: Sitemap Filter for Excluded Pages

**What:** The `filter` option takes a function that receives the full absolute URL of each page and returns `true` to include, `false` to exclude.
**When to use:** Exclude pages that should not be indexed (confirmation pages, error pages).

```javascript
// Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
sitemap({
  filter: (page) =>
    page !== "https://ironpineomnium.com/submit-confirm/" &&
    page !== "https://ironpineomnium.com/error/",
})
```

Note: filter receives the full URL including the origin. The URL format depends on `trailingSlash` config — the default behavior for static Astro includes trailing slashes in sitemap entries.

### Pattern 4: Static robots.txt

**What:** A plain text file at `public/robots.txt` served verbatim at `https://ironpineomnium.com/robots.txt`.
**When to use:** This site — fully static, no query-string pagination, no disallowed paths except the Netlify function API routes (which are outside the static site).

```
User-agent: *
Allow: /

Sitemap: https://ironpineomnium.com/sitemap-index.xml
```

### Recommended Project Structure (after this phase)

```
astro.config.mjs          # site + sitemap integration added
public/
└── robots.txt            # new — crawl directives + sitemap reference
```

Build output after this phase:
```
dist/
├── sitemap-index.xml     # new — links to sitemap-0.xml
└── sitemap-0.xml         # new — all non-excluded pages
```

### Anti-Patterns to Avoid

- **Using `Astro.site` as a string:** It returns a `URL` object, not a string. Pass it to `new URL()`, not string concatenation.
- **Setting `site` with a trailing slash:** Use `https://ironpineomnium.com` (no trailing slash). Astro normalizes this internally, but it avoids potential double-slash issues.
- **Filtering by path instead of full URL:** The `filter` function receives `https://ironpineomnium.com/submit-confirm/`, not `/submit-confirm`. Must match full URL.
- **Adding robots.txt to `src/pages/` and `public/` simultaneously:** Choose one. Static file in `public/` is correct here.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sitemap generation | Custom `sitemap.xml.ts` endpoint | `@astrojs/sitemap` | Handles sitemap-index.xml, chunking, filter API, lastmod, i18n — far more than a hand-rolled endpoint |
| Canonical URL construction | String concatenation (`site + pathname`) | `new URL(Astro.url.pathname, Astro.site)` | URL constructor handles edge cases: double slashes, encoding, protocol normalization |

**Key insight:** `@astrojs/sitemap` generates two files — `sitemap-index.xml` (the entry point) and `sitemap-0.xml` (the actual URLs). Search engines and crawlers expect the index file pattern. A hand-rolled single `sitemap.xml` is not wrong but is less compatible with the Sitemaps protocol for large sites.

---

## Common Pitfalls

### Pitfall 1: Filter URL Does Not Match Actual Build Output

**What goes wrong:** Developer writes `filter: (page) => page !== 'https://ironpineomnium.com/submit-confirm'` (no trailing slash) but the sitemap integration generates `https://ironpineomnium.com/submit-confirm/` (with trailing slash). The page is not excluded.

**Why it happens:** Astro's default `build.format` is `directory`, which outputs `submit-confirm/index.html`, making the URL `submit-confirm/` with a trailing slash. The filter must match this exact URL.

**How to avoid:** Use a trailing slash in the filter: `page !== 'https://ironpineomnium.com/submit-confirm/'`. Or use `page.startsWith('https://ironpineomnium.com/submit-confirm')` to match both variants.

**Warning signs:** Run `astro build` and inspect `dist/sitemap-0.xml` to confirm excluded pages are absent.

### Pitfall 2: Astro.site Is Undefined in Local Dev

**What goes wrong:** Developer tests canonical URL rendering locally and gets a build error or blank canonical tag because `Astro.site` is `undefined`.

**Why it happens:** `Astro.site` returns `undefined` when `site` is not configured. In dev mode without `site`, the `new URL(Astro.url.pathname, Astro.site)` call throws `TypeError: Failed to construct 'URL': Invalid URL`.

**How to avoid:** Phase 13 sets `site` in `astro.config.mjs` — once set, this is resolved for all subsequent phases. Until this phase is complete, no other phase should use `Astro.site`.

**Warning signs:** Any component using `Astro.site` before this phase is complete will throw. This is intentional — it enforces the gate.

### Pitfall 3: submit-confirm Is Not the Only Page to Consider

**What goes wrong:** Developer only excludes `/submit-confirm` but forgets that `/error` is also a dead-end OAuth failure page that has no SEO value.

**Why it happens:** Phase requirements only mention `/submit-confirm` explicitly.

**How to avoid:** Consider excluding `/error` as well — it's a transient error page with no standalone SEO value. The phase success criteria only requires `/submit-confirm` excluded, but `/error` is a candidate too.

**Warning signs:** Check `dist/sitemap-0.xml` after build for all included URLs and review each for indexability.

### Pitfall 4: robots.txt References Wrong Sitemap URL

**What goes wrong:** robots.txt references `sitemap.xml` but the sitemap integration generates `sitemap-index.xml`.

**Why it happens:** Assumption that the output file is named `sitemap.xml`. It is not — `@astrojs/sitemap` outputs `sitemap-index.xml` as the primary entry point.

**How to avoid:** Use `Sitemap: https://ironpineomnium.com/sitemap-index.xml` in `robots.txt`. This is the file search engine crawlers will fetch.

---

## Code Examples

### Full astro.config.mjs After This Phase

```javascript
// Source: https://docs.astro.build/en/guides/integrations-guide/sitemap/
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ironpineomnium.com",
  output: "static",
  integrations: [
    sitemap({
      filter: (page) => page !== "https://ironpineomnium.com/submit-confirm/",
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### Canonical URL in a Component (for Phase 15 reference)

```astro
---
// Source: https://docs.astro.build/en/reference/api-reference/#astrosite
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---
<link rel="canonical" href={canonicalURL} />
```

### public/robots.txt

```
User-agent: *
Allow: /

Sitemap: https://ironpineomnium.com/sitemap-index.xml
```

### Verifying Astro.site Is Set (build-time check)

```astro
---
// This will throw at build time if site is not configured — intentional gate
if (!Astro.site) {
  throw new Error("astro.config.mjs must have `site` set for canonical URLs");
}
---
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hand-rolled `sitemap.xml.ts` endpoint | `@astrojs/sitemap` integration | Astro 1.x+ | Integration handles index file, multi-chunk output, filter API |
| Hardcoding absolute URLs as strings | `new URL(Astro.url.pathname, Astro.site)` | Astro 2.x+ | Type-safe, protocol-correct, no string concatenation bugs |
| `robots.txt` as dynamic endpoint | Static `public/robots.txt` | N/A (both valid) | Static is simpler; dynamic endpoint adds value only when site URL is programmatic |

**Not deprecated, but note:**
- `@astrojs/sitemap` 3.7.1 updated from using `astro/zod` to standalone `zod` — if there are any import-related issues at install time, this is why. Current 3.7.2 is stable.

---

## Open Questions

1. **Should `/error` be excluded from the sitemap?**
   - What we know: Phase requirements only mandate excluding `/submit-confirm`
   - What's unclear: Whether `/error` should also be excluded (it's a transient OAuth error page)
   - Recommendation: Exclude both `/submit-confirm/` and `/error/` from the sitemap. Neither page has standalone SEO value. Plan should include both in the filter.

2. **Trailing slash consistency with Netlify**
   - What we know: Netlify serves Astro static sites with trailing slash behavior based on file naming
   - What's unclear: Whether Netlify's trailing slash behavior matches what `@astrojs/sitemap` generates
   - Recommendation: Accept default behavior for this phase. Trailing slash consistency is a concern for canonical URLs in Phase 15, not for Phase 13.

---

## Sources

### Primary (HIGH confidence)
- `https://docs.astro.build/en/reference/configuration-reference/#site` — `site` config type, format, usage
- `https://docs.astro.build/en/guides/integrations-guide/sitemap/` — install, filter syntax, output file names, `site` requirement
- `https://docs.astro.build/en/reference/api-reference/#astrosite` — `Astro.site` type (`URL | undefined`), canonical URL construction pattern
- `https://docs.astro.build/en/guides/endpoints/` — `APIContext` properties including `site`, endpoint file naming convention
- `https://github.com/withastro/astro/blob/main/packages/integrations/sitemap/CHANGELOG.md` — confirmed 3.7.2 latest, 3.7.1 added Astro 6 support

### Secondary (MEDIUM confidence)
- WebSearch confirmed `pnpm astro add sitemap` works (official Astro docs list pnpm variant explicitly)
- WebSearch + Astro issue #11575 confirms trailing slash in sitemap URLs matches `build.format` setting

### Tertiary (LOW confidence)
- None — all critical findings verified via official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — `@astrojs/sitemap` 3.7.2 confirmed, Astro 6 compatible, installed via `pnpm astro add sitemap`
- Architecture: HIGH — `site` config, filter syntax, `Astro.site` URL object pattern all verified against official docs
- Pitfalls: HIGH — trailing slash filter mismatch verified against GitHub issue; `undefined` behavior verified against official API docs

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — `@astrojs/sitemap` stable, Astro 6.x API stable)
