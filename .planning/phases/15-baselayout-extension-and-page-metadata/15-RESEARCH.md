# Phase 15: BaseLayout Extension and Page Metadata - Research

**Researched:** 2026-04-09
**Domain:** Astro meta tag patterns, Open Graph, Twitter Cards, canonical URLs
**Confidence:** HIGH

## Summary

Phase 15 extends the existing `BaseLayout.astro` to emit a complete set of social and search meta tags: Open Graph, Twitter Card, canonical, favicon/manifest link tags, and a conditional noindex for `/submit-confirm`. The codebase already has all prerequisite assets from Phase 14 (`/og-image.png` 1200x630, `/favicon.ico`, `/apple-touch-icon.png`, `/site.webmanifest`), and `Astro.site` is set to `https://ironpineomnium.com` in `astro.config.mjs`.

The pattern is well-established and requires no third-party library. All meta tags are rendered inline in the `<head>` of `BaseLayout.astro`, driven by new optional props (`ogImage?`, `noindex?`, `type?`). Absolute URLs are constructed at render time using `new URL(Astro.url.pathname, Astro.site)` for canonical/og:url and `new URL('/og-image.png', Astro.site)` for og:image. Twitter Card tags explicitly set `twitter:card` (required — no OG fallback exists), while `twitter:title`, `twitter:description`, and `twitter:image` are set explicitly for reliability rather than relying on OG fallback.

The favicon and webmanifest link tags (`<link rel="icon">`, `<link rel="apple-touch-icon">`, `<link rel="manifest">`) belong in BaseLayout's `<head>` — not in the pages — so they appear once across all pages. The current `BaseLayout.astro` has only `<link rel="icon" type="image/svg+xml" href="/logo.svg">` which needs to be replaced with the proper favicon set.

**Primary recommendation:** Extend `BaseLayout.astro` Props interface, add all meta tags to `<head>` in one block, update each page's `BaseLayout` usage to pass unique title/description, and add `noindex` to `submit-confirm.astro`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro (built-in) | 6.1.3 (installed) | `Astro.site`, `Astro.url` API | No library needed — Astro provides URL primitives natively |
| No external SEO library | — | — | `astro-seo` v1.1.0 exists but adds indirection with no benefit here; the tag set is small and well-defined |

### No Additional Installation Required

All meta tag work is pure HTML in a `.astro` component. No `npm install` needed for this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline meta tags in BaseLayout | `astro-seo` v1.1.0 | astro-seo adds a dependency and abstraction; with 6 pages and a fixed tag set, direct implementation is simpler and easier to audit |
| Explicit twitter: tags | OG-only (relying on Twitter fallback) | Twitter's fallback for title/description/image works, but `twitter:card` has NO fallback and must be explicit; explicit tags are more reliable |

## Architecture Patterns

### Recommended Project Structure

No new files needed. All changes are to existing files:

```
src/
├── layouts/
│   └── BaseLayout.astro     # extend Props, add meta tag block
└── pages/
    ├── index.astro           # update title/description
    ├── leaderboard.astro     # update title/description
    ├── submit.astro          # update title/description
    ├── submit-confirm.astro  # update title/description + add noindex
    ├── support.astro         # update title/description
    └── error.astro           # update title/description
```

### Pattern 1: Props Interface Extension

**What:** Add `ogImage?`, `noindex?`, and `type?` to the existing `Props` interface. Keep existing `title` and `description` props. `ogImage` defaults to `/og-image.png` so all pages get the branded image unless overridden. `type` defaults to `"website"`.

**When to use:** Always — these are optional with sane defaults so no existing page call breaks.

```typescript
// Source: Astro official docs + direct codebase inspection
interface Props {
  title?: string;
  description?: string;
  ogImage?: string;   // path-only, e.g. "/og-image.png" — made absolute in template
  noindex?: boolean;
  type?: string;      // og:type, defaults to "website"
}

const {
  title = "Iron & Pine Omnium",
  description = "A two-day gravel series in Michigan's Upper Peninsula combining day 1 moving time with day 2 sector speed and KOM points.",
  ogImage = "/og-image.png",
  noindex = false,
  type = "website",
} = Astro.props;
```

### Pattern 2: Absolute URL Construction

**What:** Use `Astro.site` and `Astro.url` to build absolute URLs at render time.

**When to use:** For every tag that requires an absolute URL (og:url, og:image, canonical, twitter:image).

```typescript
// Source: https://docs.astro.build/en/reference/api-reference/#site
// Verified: Astro.site returns URL from astro.config.mjs `site` field
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImageURL = new URL(ogImage, Astro.site);
```

**Note:** `Astro.site` is `https://ironpineomnium.com` (set in astro.config.mjs). `new URL(Astro.url.pathname, Astro.site)` produces the fully-qualified canonical URL with no manual string concatenation.

### Pattern 3: Meta Tag Block in `<head>`

**What:** A single, ordered block of all SEO-related tags placed in `<head>`, after charset/viewport and before font links.

```astro
<!-- Source: ogp.me + share-preview.com/blog/twitter-meta-tags (verified) -->

<!-- Canonical -->
<link rel="canonical" href={canonicalURL} />

<!-- Open Graph -->
<meta property="og:type" content={type} />
<meta property="og:url" content={canonicalURL} />
<meta property="og:site_name" content="Iron & Pine Omnium" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={ogImageURL} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Iron & Pine Omnium — two-day gravel weekend in Michigan's Upper Peninsula" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={ogImageURL} />

<!-- Favicon set (replaces existing logo.svg-only icon) -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />

<!-- Noindex (conditional) -->
{noindex && <meta name="robots" content="noindex" />}
```

### Pattern 4: Per-Page Noindex

**What:** Pass `noindex={true}` from `submit-confirm.astro` only. All other pages get the default `noindex={false}`.

**When to use:** Only for `/submit-confirm` per requirement SEO-06.

```astro
<!-- In submit-confirm.astro -->
<BaseLayout
  title="Confirm Submission | Iron & Pine Omnium"
  description="Review your activity score preview and confirm your submission to the Iron & Pine Omnium leaderboard."
  noindex={true}
>
```

### Anti-Patterns to Avoid

- **Relative URLs in og:image or og:url:** Facebook, LinkedIn, and Twitter scrapers do not follow redirects from relative paths. Always use absolute URLs via `new URL()`.
- **Hardcoding the site domain:** Use `Astro.site` — the domain is already in `astro.config.mjs`. Hardcoding creates a maintenance problem.
- **Relying on Twitter-only fallback from OG for twitter:card:** `twitter:card` has no OG fallback. It must be explicit or the card type defaults to `summary` (small image).
- **Putting `<link rel="manifest">` in pages instead of BaseLayout:** The webmanifest link must be in every page's `<head>`. BaseLayout is the right place.
- **Duplicate `<title>` or `<meta name="description">`:** Astro renders the `<head>` directly — there are no deduplication mechanisms. Keep exactly one of each tag in the layout. The existing `<slot name="head" />` in BaseLayout could cause duplication if any page uses it for head tags.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Absolute URL from pathname | String concatenation (`Astro.site + Astro.url.pathname`) | `new URL(Astro.url.pathname, Astro.site)` | `new URL()` handles edge cases: double slashes, protocol, trailing slash normalization |
| OG image absolute URL | Hardcode `https://ironpineomnium.com/og-image.png` | `new URL(ogImage, Astro.site)` | Uses the configured site value; works in preview/staging if site is changed |

**Key insight:** This phase is entirely HTML meta tags. The only "logic" is URL construction via the native `URL` constructor. No hand-rolling needed.

## Common Pitfalls

### Pitfall 1: Trailing Slash Mismatch Between Canonical and og:url

**What goes wrong:** `og:url` and `<link rel="canonical">` resolve to different values — e.g., canonical is `/submit/` but og:url is `/submit`. Google and Facebook treat these as separate pages.

**Why it happens:** `Astro.url.pathname` returns `/submit/` in static `build.format: 'directory'` mode (the default) because pages are built as `/submit/index.html`. Both tags must use the same URL expression.

**How to avoid:** Build both `canonicalURL` and `og:url` from the same computed value:
```typescript
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
// Then use {canonicalURL} for both canonical href and og:url content
```

**Warning signs:** If og:url ends in `/` but canonical does not (or vice versa), a URL validation tool like `https://www.opengraph.xyz` will show inconsistency.

### Pitfall 2: OG Image Using Relative URL

**What goes wrong:** `<meta property="og:image" content="/og-image.png" />` works in browsers but social crawlers (Twitterbot, Facebot) may not resolve relative paths.

**Why it happens:** Social crawlers fetch pages without necessarily following the base URL context.

**How to avoid:** Always use `new URL('/og-image.png', Astro.site)` — produces `https://ironpineomnium.com/og-image.png`.

**Warning signs:** Social preview tools show broken/missing image even though the image loads fine in a browser.

### Pitfall 3: Duplicate Tags via `<slot name="head">`

**What goes wrong:** If a page passes content to `<slot name="head" />` that includes another `<title>` or `<meta name="description">`, there will be two of each. Search engines use the first occurrence; browsers may behave unpredictably.

**Why it happens:** BaseLayout already has `<slot name="head" />`. If any page currently uses it to pass head content, extending BaseLayout may create duplicates.

**How to avoid:** Audit all pages for `<Fragment slot="head">` usage. None of the current pages use this slot (confirmed by code inspection — all head content is in BaseLayout).

**Warning signs:** Running `astro build` and inspecting the HTML output with `grep -c "<title>"` — should always return `1`.

### Pitfall 4: `noindex` Without `nofollow`

**What goes wrong:** `<meta name="robots" content="noindex">` prevents indexing but Google still follows outbound links from that page, potentially crawling internal API routes or confirm URLs.

**Why it happens:** `noindex` and `nofollow` are independent directives.

**How to avoid:** Per requirement SEO-06, `noindex` alone satisfies the brief. If link crawling from `/submit-confirm` is also unwanted, add `noindex, nofollow`. The requirement says "does not appear in crawl indexes" which `noindex` alone achieves. Use `noindex` per the spec.

**Warning signs:** `/submit-confirm` appearing in Google Search Console coverage reports.

### Pitfall 5: `og:description` Not Set Per-Page

**What goes wrong:** All pages share the same default description ("A two-day gravel series...") — every page looks identical in social share previews.

**Why it happens:** The existing `BaseLayout.astro` defaults are used when pages don't pass `description`.

**How to avoid:** Task 15-02 must explicitly pass unique `description` props for every page. The defaults in BaseLayout only serve as a safety net — they should not be the sole description for any indexed page.

**Warning signs:** Sharing `/leaderboard` on Slack or Twitter shows the homepage description.

## Code Examples

### Complete BaseLayout Head Block

```astro
---
// Source: Astro docs (Astro.site, Astro.url) + OGP spec + Twitter Card spec

interface Props {
  title?: string;
  description?: string;
  ogImage?: string;
  noindex?: boolean;
  type?: string;
}

const {
  title = "Iron & Pine Omnium",
  description = "A two-day gravel series in Michigan's Upper Peninsula combining day 1 moving time with day 2 sector speed and KOM points.",
  ogImage = "/og-image.png",
  noindex = false,
  type = "website",
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const ogImageURL = new URL(ogImage, Astro.site);
---

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content={description} />

  <!-- Canonical -->
  <link rel="canonical" href={canonicalURL} />

  <!-- Open Graph -->
  <meta property="og:type" content={type} />
  <meta property="og:url" content={canonicalURL} />
  <meta property="og:site_name" content="Iron & Pine Omnium" />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={ogImageURL} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Iron & Pine Omnium — two-day gravel weekend in Michigan's Upper Peninsula" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImageURL} />

  <!-- Favicon set -->
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />

  <!-- Conditional noindex -->
  {noindex && <meta name="robots" content="noindex" />}

  <!-- Font preconnect + stylesheet (existing) -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Karla:wght@400;500;600;700&family=Spectral:wght@400;500;600;700&display=swap" rel="stylesheet" />

  <slot name="head" />
</head>
```

### Page-Level Title/Description Examples

Based on what each page does:

```astro
<!-- index.astro -->
<BaseLayout
  title="Iron & Pine Omnium | Two Days of Gravel in the Hiawatha National Forest"
  description="A two-day gravel weekend in Michigan's Upper Peninsula — Hiawatha's Revenge fondo on Saturday, MK Ultra Gravel grinduro on Sunday. Submit your Strava activities for an overall result."
>

<!-- leaderboard.astro -->
<BaseLayout
  title="Leaderboard | Iron & Pine Omnium"
  description="Overall standings across women, men, and non-binary categories — ranked by combined moving time, sector performance, and KOM points."
>

<!-- submit.astro -->
<BaseLayout
  title="Submit Your Activity | Iron & Pine Omnium"
  description="Connect your Strava account and paste your activity URL to submit your Day 1 or Day 2 ride to the Iron & Pine Omnium leaderboard."
>

<!-- submit-confirm.astro -->
<BaseLayout
  title="Confirm Submission | Iron & Pine Omnium"
  description="Review your activity score preview and confirm your submission to the Iron & Pine Omnium leaderboard."
  noindex={true}
>

<!-- support.astro -->
<BaseLayout
  title="Support | Iron & Pine Omnium"
  description="Get help with your Iron & Pine Omnium submission or report an issue with your ride data."
>

<!-- error.astro -->
<BaseLayout
  title="Connection Error | Iron & Pine Omnium"
  description="Something went wrong during the Strava connection. You can try again or return to the Iron & Pine Omnium home page."
>
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `<link rel="icon" type="image/svg+xml" href="/logo.svg">` (current) | Full favicon set: favicon.ico + apple-touch-icon + manifest | Proper browser tab icon, iOS home screen icon, manifest-based PWA metadata |
| No canonical link | `<link rel="canonical" href={canonicalURL}>` | Prevents duplicate content penalty from URL variants |
| No OG/Twitter tags | Full OG + Twitter Card block | Rich previews when shared on social platforms |

**Deprecated/outdated in this project:**
- `<link rel="icon" type="image/svg+xml" href="/logo.svg">`: Replace with ICO + PNG + manifest set. Safari and some older browsers don't handle SVG favicons reliably.

## Open Questions

1. **`error.astro` noindex consideration**
   - What we know: `error.astro` is the OAuth failure page. It's already excluded from the sitemap in `astro.config.mjs`.
   - What's unclear: The requirements only specify noindex for `/submit-confirm`. The `/error` page is sitemap-excluded but has no noindex requirement.
   - Recommendation: Do not add noindex to `/error` unless the requirement explicitly calls for it. Sitemap exclusion ≠ noindex; they are independent. Leave `/error` without noindex unless Phase 17 QA surfaces a reason.

2. **`twitter:site` handle**
   - What we know: `twitter:site` is optional and used for attribution (e.g., `@ironpineomnium`). The event does not appear to have a Twitter/X account.
   - What's unclear: Whether the event has or plans to have a Twitter account.
   - Recommendation: Omit `twitter:site`. It is not required for `summary_large_image` cards to render correctly.

## Sources

### Primary (HIGH confidence)
- `https://docs.astro.build/en/reference/api-reference/#site` — `Astro.site` API, URL construction pattern
- `https://docs.astro.build/en/reference/configuration-reference/#buildformat` — `build.format: 'directory'` default, trailing slash behavior in `Astro.url.pathname`
- `https://docs.astro.build/en/reference/configuration-reference/#trailingslash` — trailingSlash default is `'ignore'`
- `https://ogp.me/` — Open Graph required/optional properties, og:image structured properties
- Direct codebase inspection: `astro.config.mjs` (site = https://ironpineomnium.com), `BaseLayout.astro`, all 6 pages, Phase 14 summaries confirming asset paths

### Secondary (MEDIUM confidence)
- `https://share-preview.com/blog/twitter-meta-tags` — Twitter Card minimum required tags, OG fallback behavior, `twitter:card` has no OG fallback (verified against multiple sources)
- `https://eastondev.com/blog/en/posts/dev/20251202-astro-seo-complete-guide/` — Astro SEO BaseHead pattern using `new URL(Astro.url.pathname, Astro.site)`

### Tertiary (LOW confidence)
- WebSearch ecosystem results for trailing slash and Netlify behavior — consistent with official docs but not independently verified against Netlify docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no external library needed; Astro native APIs verified in official docs
- Architecture: HIGH — pattern is direct Astro prop extension with native URL construction
- Pitfalls: HIGH — trailing slash behavior verified against official Astro configuration docs; OG/Twitter requirements verified against specs
- Per-page titles/descriptions: HIGH — content derived directly from existing page code and event description

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (30 days — stable domain; OG/Twitter specs rarely change)
