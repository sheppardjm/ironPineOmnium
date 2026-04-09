# Feature Landscape: SEO & Social Sharing

**Domain:** Sports/cycling event website — static Astro site on Netlify
**Milestone:** Adding SEO & social sharing to an existing event site
**Researched:** 2026-04-09
**Confidence:** HIGH for Open Graph/Twitter Cards, canonical URLs, sitemap, structured data requirements (all verified against official Google, ogp.me, and Astro documentation). MEDIUM for social sharing buttons and favicon/manifest scope for this event's scale.

---

## What Already Exists

Before categorizing features, note what is already in place and what gaps this milestone fills:

| Element | Current State | Gap |
|---------|--------------|-----|
| `<title>` tag | Set in BaseLayout, per-page overrides working | No issues |
| `<meta name="description">` | Set in BaseLayout, per-page overrides working | No issues |
| Favicon | `<link rel="icon" type="image/svg+xml" href="/logo.svg">` — SVG only | Missing `.ico` fallback, apple-touch-icon, manifest |
| Open Graph tags | None | Entirely missing |
| Twitter/X Card tags | None | Entirely missing |
| Structured data (JSON-LD) | None | Entirely missing |
| Canonical URLs | None | Entirely missing |
| Sitemap | None | Missing; no `site` URL in `astro.config.mjs` |
| robots.txt | None | Missing |
| Social sharing buttons | None | Deliberate — see anti-features |
| OG image | No static image asset exists yet | Needs to be created (1200×630px) |

---

## Table Stakes

Features any sports/event site is expected to have. Missing these = search previews break, social links look unprofessional, or search engines can't index correctly.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`, `og:type` | Every link shared to Slack, iMessage, Twitter, LinkedIn, Discord needs these to render a preview card. Without them the link unfurls as a bare URL. Industry expectation since ~2013. | LOW | One static branded OG image (1200×630px) works across all pages for this site. `og:type` = `website` for most pages; `article` or `event` for the homepage is debated — `website` is simpler and correct. |
| `og:site_name` | Identifies the property in social previews (appears as site branding under the preview card on some platforms). | LOW | Set to "Iron & Pine Omnium" globally. |
| Twitter/X Card tags: `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` | X/Twitter does not fall back to OG tags for `twitter:card` type — without the `twitter:card` tag, X shows no card at all. All other tag values fall back to OG equivalents if X-prefixed tags are absent. | LOW | Use `twitter:card = "summary_large_image"` for the branded OG image. No `twitter:creator` needed (no individual author). |
| Canonical URL (`<link rel="canonical">`) | Without canonical tags, Netlify's default behavior (both `www` and apex serving the same content) can produce duplicate-URL signals to Google, splitting link equity. For a static site with no query-string pagination this is low-risk but still table stakes. | LOW | Self-referencing canonical on every page. Must use absolute URLs. Requires `site` URL set in `astro.config.mjs`. |
| Static OG image asset (1200×630px, <1MB, PNG or JPG) | Required for OG/Twitter tags to function. LinkedIn minimum is 1200×627px — narrower image fails to render. A single branded image (logo + event name + tagline) covers all pages. | LOW–MEDIUM | Image creation is a design task, not code. Once created, reference it from `og:image` on every page. |
| Favicon complete set (SVG + .ico + apple-touch-icon + manifest icons) | Current SVG-only favicon displays in modern browsers but fails on iOS home screen bookmarks (no apple-touch-icon) and legacy browsers (no .ico). A sports event bookmarked on a phone needs to look right. | LOW | Evil Martians 2026 guide recommends: `favicon.ico` (32×32), `icon.svg`, `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`. |
| `sitemap.xml` | Google recommends sitemaps for all sites. Gravel event calendars (gravelevents.com, gravelcalendar.com, granfondoguide.com) crawl event sites to list them — a sitemap makes this reliable. Official Astro `@astrojs/sitemap` integration handles this automatically at build time. | LOW | Requires `site` URL set in `astro.config.mjs` first. Add `@astrojs/sitemap` integration. |
| `robots.txt` | Standard crawl guidance file. Search engines look for it. Without it, no crawl errors — but its absence is a small signal of incomplete SEO hygiene. Should reference sitemap URL. | LOW | Can be a static file at `public/robots.txt` or generated as `src/pages/robots.txt.ts`. For a fully-static site, a static file is sufficient. |
| Per-page meta descriptions | Currently every page uses the same default description. Submit, leaderboard, and support pages each have distinct purposes that should be described distinctly for search snippets. | LOW | Already architected in BaseLayout (accepts `description` prop). Just needs per-page copy. |
| Per-page `<title>` refinements | Currently working but all pages except index use the bare "Iron & Pine Omnium" default. Each page should have a descriptive title for search. | LOW | Already architected. Needs per-page overrides on submit, leaderboard, support, submit-confirm. |

---

## Differentiators

Not expected by users, but meaningfully improve discovery, credibility, or social reach for an event site.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Event structured data (JSON-LD `SportsEvent`) | Google uses Event structured data to show interactive rich results in search — event name, date, location appear as a panel rather than a plain blue link. Highly relevant for a time-bounded sports event people search for. Google requires: `name`, `startDate`, `location`, `location.address`. Recommended: `description`, `endDate`, `eventStatus`, `image`, `organizer`. | LOW–MEDIUM | JSON-LD block in the homepage `<head>`. Gravel events that have this rank better in event-specific search queries. Verify with Google's Rich Results Test. Post-June 7 the event is past — `eventStatus: "EventScheduled"` before, update if needed. |
| `web.app` manifest (`site.webmanifest`) | Enables "Add to Home Screen" on mobile, which is how gravel riders keep race sites accessible during the weekend. Defines app name, theme color, icons. Not widely expected for a one-weekend event, but zero cost to add once icons exist. | LOW | `{"name":"Iron & Pine Omnium","short_name":"I&P Omnium","icons":[...],"theme_color":"#...","background_color":"#...","display":"standalone"}`. |
| `og:locale` | Signals language/region to Facebook and LinkedIn crawlers. Improves categorization. No user-facing effect but a one-liner. | LOW | `en_US` for this event. |
| Submission to gravel event calendars | gravelevents.com, gravelcalendar.com, and granfondoguide.com all index gravel events. These are the primary discovery channels for riders searching "gravel race Upper Peninsula Michigan 2026." Being listed there drives organic traffic. This is not a code feature — it's a submission task — but structured data and a clean sitemap make the site more authoritative when these aggregators link to it. | LOW (task, not code) | Submit URL + event details to each calendar. Structured data improves how the event appears once listed. |
| `twitter:image:alt` | Accessibility attribute for the OG image on X/Twitter. Shows alt text to screen reader users. Rarely included by small event sites but a one-liner. | LOW | Write alt text that describes the branded image: "Iron & Pine Omnium logo — two-day gravel event in Michigan's Upper Peninsula, June 6–7, 2026." |

---

## Anti-Features

Features that seem appropriate but are wrong for this site's scale and context.

| Anti-Feature | Why Requested | Why to Avoid | Alternative |
|--------------|---------------|--------------|-------------|
| Social sharing buttons (embedded "Share to X", "Share to Facebook" widgets) | Looks like an engagement feature; event organizers sometimes want riders to share results | Meta permanently shut down external Facebook Like/Comment buttons on February 10, 2026. X share buttons load external JS that harms Core Web Vitals (LCP). Research shows 99.8% of mobile users never tap share buttons. For an event community that lives in group chats, participants share links natively — they do not need a button to do it. Including share buttons adds JS overhead and social proof backfire risk (zero shares shows = "nobody cares"). | OG tags + Twitter Card tags make any shared link look polished without buttons. |
| Dynamic per-rider OG share cards | Feels personalized — "your result card" with name and score | Requires a serverless image generation function (Vercel/Netlify OG image API, or a headless browser). This is a significant infrastructure addition for a 50-100 rider event where riders are not expecting Instagram-style share cards. The Strava community shares activity links, not custom cards. Adds complexity with no clear demand signal. | One branded static OG image for the site. If rider sharing emerges as a real request post-event, revisit for Year 2. |
| Per-page unique OG images | More tailored social previews for leaderboard vs. submit vs. home | For a site with 5 pages that share a single brand, creating 5 different OG images provides marginal benefit at meaningful design/production cost. The one branded image works everywhere. | Single branded OG image, strong per-page titles and descriptions provide the differentiation needed. |
| Breadcrumb structured data | Commonly recommended for SEO | This is a 5-page flat site. Breadcrumb schema is for deep content hierarchies. It adds no value here and could confuse search display. | Correct page titles and canonical URLs are sufficient for a flat site. |
| FAQ structured data | Increases rich result eligibility | This site has no FAQ section. Adding FAQ schema for content that doesn't exist on the page violates Google's structured data policies (markup must reflect visible page content). | If a FAQ section is added to the support page, revisit. |
| hreflang tags | Signals language variants to Google | This is an English-only event for a regional US audience. hreflang is for multilingual/multi-region sites. Zero benefit here. | None needed. |
| AMP pages | Formerly accelerated mobile performance | AMP was deprecated as a Google ranking signal in 2021. Astro's static output is already fast. Adding AMP would be building toward an obsolete standard. | Astro's static output with good Core Web Vitals is the correct path. |

---

## Feature Dependencies

```
[site URL set in astro.config.mjs]
    └──required by──> [Canonical URLs]
    └──required by──> [@astrojs/sitemap generation]
    └──required by──> [robots.txt Sitemap: directive]

[OG image asset created (1200x630px)]
    └──required by──> [og:image tag]
    └──required by──> [twitter:image tag]

[Favicon icon set (SVG, ICO, apple-touch-icon, 192, 512)]
    └──required by──> [web app manifest icons array]
    └──required by──> [complete favicon HTML link tags]

[Open Graph tags in BaseLayout]
    └──enhanced by──> [per-page og:title, og:description overrides]
    └──enhanced by──> [og:locale, twitter:image:alt]

[Event structured data (SportsEvent JSON-LD)]
    └──independent of other tags, homepage <head> only
    └──validated by──> [Google Rich Results Test post-deployment]
```

**Dependency notes:**

- `site` URL in `astro.config.mjs` is the gate for canonical URLs and sitemap generation. This must be set first.
- The OG image is the gate for social card quality. Tags without a real image will fail silently (platforms show no image in the card).
- All meta tag additions go into `BaseLayout.astro` as slot or prop expansions — the existing architecture supports this cleanly.
- Per-page overrides (title, description, og:title, og:description) follow the existing BaseLayout prop pattern.

---

## MVP Recommendation

For this milestone, the following delivers complete, correct SEO and social sharing:

**Must ship (no social sharing without these):**
1. Set `site` URL in `astro.config.mjs`
2. Create OG image asset — 1200×630px, branded (logo + "Iron & Pine Omnium" + "June 6–7, 2026 · Hiawatha National Forest")
3. Add Open Graph tags to BaseLayout (`og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:site_name`, `og:locale`)
4. Add Twitter/X Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`)
5. Add canonical `<link rel="canonical">` to BaseLayout
6. Complete favicon set: `favicon.ico` (32×32), keep existing `icon.svg`, add `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`
7. Add `@astrojs/sitemap` integration, configure `sitemap()` in `astro.config.mjs`
8. Add `public/robots.txt` with Sitemap directive
9. Per-page title and description copy for submit, leaderboard, support, submit-confirm pages

**Should ship (high value, low effort):**
10. Event structured data (SportsEvent JSON-LD) on homepage — enables Google rich results for event discovery
11. Web app manifest (`site.webmanifest`) referencing the icon set

**Defer:**
- Dynamic per-rider share cards — not warranted at this scale, revisit Year 2
- Per-page OG images — one image covers all pages adequately
- Social sharing buttons — anti-feature, do not build

---

## Complexity Summary

| Feature | Effort | Confidence |
|---------|--------|------------|
| `site` URL in astro.config.mjs | Trivial — one line | HIGH |
| OG image creation | Design task — 2-4 hours | HIGH (requirement) |
| Open Graph + Twitter tags in BaseLayout | 30–60 min | HIGH |
| Canonical URL tag in BaseLayout | 15 min | HIGH |
| Complete favicon set | 1–2 hours (icon export + HTML) | HIGH |
| `@astrojs/sitemap` integration | 30 min | HIGH |
| `robots.txt` | 10 min | HIGH |
| Per-page title/description copy | 30 min | MEDIUM (copywriting judgment) |
| SportsEvent JSON-LD on homepage | 1–2 hours incl. Rich Results Test validation | HIGH |
| Web app manifest | 30 min | HIGH |

Total estimated effort: 6–10 hours, dominated by OG image creation and structured data validation.

---

## Sources

- Open Graph Protocol specification: https://ogp.me/ (HIGH confidence — authoritative spec)
- Google Event Structured Data requirements: https://developers.google.com/search/docs/appearance/structured-data/event (HIGH confidence — official Google documentation)
- Schema.org SportsEvent: https://schema.org/SportsEvent (HIGH confidence — authoritative spec)
- Astro @astrojs/sitemap integration: https://docs.astro.build/en/guides/integrations-guide/sitemap/ (HIGH confidence — official Astro docs)
- Favicon modern approach (Evil Martians): https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs (HIGH confidence — widely referenced, confirmed approach still current 2026)
- Google canonical URL guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls (HIGH confidence — official Google documentation)
- Twitter/X Card tags: https://share-preview.com/blog/twitter-meta-tags (MEDIUM confidence — developer guide, cross-referenced with X developer documentation)
- Social sharing buttons analysis: https://www.seocomponent.com/blog/you-dont-need-social-share-buttons-on-your-website/ (MEDIUM confidence — community analysis with data cited)
- Meta Facebook button shutdown: https://www.mightybytes.com/insights/social-buttons-pros-and-cons/ (MEDIUM — news corroborated across multiple sources)
- Gravel event discovery platforms: https://gravelevents.com/, https://www.gravelcalendar.com/, https://www.granfondoguide.com/ (HIGH confidence — direct observation)
- OG image dimensions: https://share-preview.com/blog/og-tags-complete-guide.html (HIGH confidence — matches ogp.me and platform-specific guidance)

---

*SEO & social sharing feature research for: Iron & Pine Omnium — Astro 6 static site*
*Researched: 2026-04-09*
