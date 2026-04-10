# Phase 17: QA and Validation - Research

**Researched:** 2026-04-09
**Domain:** Social preview validation, structured data testing, sitemap verification
**Confidence:** HIGH

## Summary

Phase 17 is a manual QA pass using external validation tools against the live ironpineomnium.com deployment. The implementation from Phases 13–16 is already complete and confirmed correct in the local `dist/` build. QA requires verifying that what was built is correctly served by Netlify and correctly interpreted by four authoritative external tools.

The scope is: Facebook Sharing Debugger (OG tags), an X/Twitter card validator (twitter:card), Google Rich Results Test (JSON-LD Event schema), and a browser/curl check of the sitemap. This is not a code-writing phase — it is a systematic walkthrough of each tool against the live URL. The plan for this phase should be a checklist of manual verification steps, not tasks that write or modify code.

The most critical finding: the official Twitter/X Card Validator (cards-dev.twitter.com/validator) was deprecated in 2022 and the `cards-dev.x.com/validator` URL returns HTTP 402. The plan must use an alternative third-party tool or a direct curl inspection to verify twitter card tags.

**Primary recommendation:** Use the Google Rich Results Test at https://search.google.com/test/rich-results as the authoritative JSON-LD validator; use https://developers.facebook.com/tools/debug/ for OG tag validation (requires Facebook login); use opengraph.to or a third-party tool for Twitter card preview (no official tool exists); use browser view-source or curl to verify the sitemap directly.

## Standard Stack

This phase has no installable library stack. It is a tool-based QA phase. The tools are external web services.

### Core Tools

| Tool | URL | Purpose | Auth Required |
|------|-----|---------|--------------|
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ | Verify og:image, og:title, og:description; force Facebook rescrape | Facebook login required |
| Google Rich Results Test | https://search.google.com/test/rich-results | Validate Event JSON-LD against Google's structured data requirements | None |
| OpenGraph.to | https://www.opengraph.to/ | Preview OG tags and Twitter card across multiple platforms without login | None |
| Browser view-source / curl | — | Inspect live HTML, verify sitemap and robots.txt | None |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Facebook Sharing Debugger | opengraph.to or opengraph.xyz | Third-party tools simulate Facebook preview without requiring login; acceptable for confirmation but the official debugger is authoritative and forces a real rescrape of Facebook's cache |
| Official X Card Validator | opengraph.to, opentweet.io, postel.app | Official tool does not exist; any of these third-party tools is the correct substitute |
| Google Rich Results Test | Schema.org Validator | Google's own tool is the authoritative gate — use it, not a substitute |

## Architecture Patterns

### Recommended QA Execution Order

The QA pass should follow dependency order: verify the build/deploy preconditions first, then validate each external tool, then confirm all success criteria.

```
QA Pass Order:
1. Precondition check  — confirm live site is serving the Netlify build
2. View-source audit   — verify <head> tags are correct on the live URL
3. Sitemap check       — verify /sitemap-index.xml and /sitemap-0.xml contents
4. Google Rich Results — validate Event JSON-LD at https://search.google.com/test/rich-results
5. Facebook Debugger   — paste live URL, click Debug, then Scrape Again
6. X Card validation   — paste live URL in opengraph.to or similar third-party tool
7. Sign-off            — all four success criteria confirmed
```

### Facebook Sharing Debugger: Exact Steps

1. Log in to Facebook at facebook.com
2. Navigate to https://developers.facebook.com/tools/debug/
3. Paste `https://ironpineomnium.com` into the URL field
4. Click **Debug**
5. Verify the "Link Preview" section shows: correct og:image (1200×630 PNG), correct title, correct description
6. Click **Scrape Again** to force Facebook to re-read the live page and clear its cache
7. Re-verify the preview refreshes correctly
8. Note: scrape HTTPS (the live URL); HTTP is not served

**What success looks like:** Link Preview section shows the OG image rendering at correct proportions, og:title shows "Iron & Pine Omnium | Two Days of Gravel in the Hiawatha National Forest", og:description shows the event description. No "Missing Required Property" or "Should Be Fixed" warnings for og:image, og:title, or og:description.

### X Twitter Card Validation: Exact Steps

The official X Card Validator (cards-dev.twitter.com/validator) is **permanently deprecated as of 2022**. The cards-dev.x.com/validator URL returns HTTP 402. Do not direct the planner to use these URLs.

Use a third-party tool instead. Recommended: https://www.opengraph.to/ or https://postel.app/twitter-x-card-validator

1. Navigate to https://www.opengraph.to/
2. Paste `https://ironpineomnium.com`
3. Verify the Twitter/X preview shows `summary_large_image` card (wide image, not square thumbnail)
4. Verify the OG image renders in the card preview

**What success looks like:** X/Twitter tab shows a large-image card (not a summary card). Image visible. Title and description visible.

**Alternative approach:** Use `curl -A twitterbot https://ironpineomnium.com` to inspect what the Twitter crawler receives. Verify `<meta name="twitter:card" content="summary_large_image">` is in the response HTML. This is verifiable without any tool.

### Google Rich Results Test: Exact Steps

1. Navigate to https://search.google.com/test/rich-results
2. Enter `https://ironpineomnium.com` in the URL field
3. Click **Test URL**
4. Wait for rendering to complete (tool runs JavaScript like Googlebot)
5. Verify the result shows: "Event" detected (not "No items detected")
6. Verify zero critical errors (red X marks)
7. Any warnings (yellow) are acceptable as long as the Event type is detected as eligible

**What success looks like:** The tool reports "Event" with a green checkmark or "1 item detected" under Events. No red errors. The event name, startDate, and location are shown in the preview panel.

**Known risk:** The implementation uses `@type: Event` (not SportsEvent). Google's docs confirm Event is the eligible type for event rich result cards. SportsEvent is not documented as eligible. The Rich Results Test will look for Event, not SportsEvent.

### Sitemap Verification: Exact Steps

**Local dist/ check (already done in research):**
- sitemap-index.xml: present, references `https://ironpineomnium.com/sitemap-0.xml`
- sitemap-0.xml: contains 4 URLs — `/`, `/leaderboard/`, `/submit/`, `/support/`
- `/submit-confirm/` is absent (correct — noindex page)
- `/error/` is absent (correct — not included in sitemap)
- robots.txt references `sitemap-index.xml` (not `sitemap.xml`)

**Live site verification steps:**
1. Navigate to `https://ironpineomnium.com/sitemap-index.xml` in browser — confirm it loads and shows reference to sitemap-0.xml
2. Navigate to `https://ironpineomnium.com/sitemap-0.xml` — confirm 4 URLs present, `/submit-confirm/` absent
3. Navigate to `https://ironpineomnium.com/robots.txt` — confirm `Sitemap: https://ironpineomnium.com/sitemap-index.xml`

**Alternative (curl):**
```bash
curl -s https://ironpineomnium.com/sitemap-index.xml
curl -s https://ironpineomnium.com/sitemap-0.xml
curl -s https://ironpineomnium.com/robots.txt
```

### View-Source Audit: Pages and Tags to Verify

Live pages to check:
- `https://ironpineomnium.com` (homepage) — primary audit target
- `https://ironpineomnium.com/leaderboard/`
- `https://ironpineomnium.com/submit/`
- `https://ironpineomnium.com/support/`
- `https://ironpineomnium.com/submit-confirm/` — must have `<meta name="robots" content="noindex">`

Tags to verify on homepage:
- `<meta property="og:image" content="https://ironpineomnium.com/og-image.png">`
- `<meta property="og:image:width" content="1200">`
- `<meta property="og:image:height" content="630">`
- `<meta name="twitter:card" content="summary_large_image">`
- `<script type="application/ld+json">` with `"@type":"Event"` and `"@context":"https://schema.org"`
- `<link rel="canonical" href="https://ironpineomnium.com/">`

## Don't Hand-Roll

This phase involves no code. There is nothing to build. All QA is performed using existing external tools.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OG tag verification | Custom scraper | Facebook Sharing Debugger | Official tool reflects what Facebook caches |
| JSON-LD validation | Custom schema validator | Google Rich Results Test | Only authoritative signal for rich result eligibility |
| Sitemap validation | Custom XML parser | Browser / curl | Direct HTTP verification is sufficient |

**Key insight:** This is a verification phase, not a build phase. The plan should produce a checklist of manual steps, not code tasks.

## Common Pitfalls

### Pitfall 1: Assuming Official X Card Validator Still Works
**What goes wrong:** Plan references cards-dev.twitter.com/validator or cards-dev.x.com/validator — both dead.
**Why it happens:** The official URL was well-known and widely referenced; documentation still mentions it.
**How to avoid:** Use opengraph.to or equivalent third-party tool, or use curl to inspect meta tags directly.
**Warning signs:** The URL returns 402 or redirects.

### Pitfall 2: Forgetting to Click "Scrape Again" in Facebook Debugger
**What goes wrong:** Facebook shows cached (stale) OG data from a previous crawl.
**Why it happens:** Clicking "Debug" only shows what Facebook already cached; it doesn't re-fetch.
**How to avoid:** Always click **Scrape Again** after the initial Debug result loads.
**Warning signs:** The "last scraped" timestamp is old; preview still shows incorrect/missing image.

### Pitfall 3: Testing Against Local Build Instead of Live Site
**What goes wrong:** All tools verify the live URL; testing against localhost or dist/ doesn't validate Netlify delivery.
**Why it happens:** Local builds look correct but Netlify headers, caching, or CDN behavior can differ.
**How to avoid:** All external tool tests must use `https://ironpineomnium.com`.

### Pitfall 4: Expecting SportsEvent in Google Rich Results Test
**What goes wrong:** QA criterion says "SportsEvent" but implementation uses `@type: Event`.
**Why it happens:** The phase success criteria wording in the brief uses "SportsEvent" — but decision 16-01 locked in `@type: Event` as the only eligible type.
**How to avoid:** In the Google Rich Results Test, look for "Event" detected — not "SportsEvent". The test will correctly identify the Event type.
**Warning signs:** Searching for "SportsEvent" in test output and not finding it, incorrectly concluding validation failed.

### Pitfall 5: Missing Location Warning in Google Rich Results Test
**What goes wrong:** Google's Rich Results Test flags a warning about location.
**Why it happens:** The implementation uses `addressLocality` + `addressRegion` + `addressCountry` but no `streetAddress`. Google may flag this as a recommendation (non-critical warning).
**How to avoid:** Non-critical warnings (yellow) do not block rich result eligibility. Only red errors block eligibility. A warning about `streetAddress` is acceptable given the event is on national forest roads with no fixed street address.
**Warning signs:** A yellow warning about location — this is acceptable, not a blocker.

### Pitfall 6: submit-confirm Appearing in Sitemap
**What goes wrong:** The noindex page appears in the sitemap.
**Why it happens:** Astro sitemap plugin may not respect noindex unless correctly configured.
**How to avoid:** Already verified in the local dist/ build — submit-confirm is absent from sitemap-0.xml. Confirm this is also true on the live deployment.

## Code Examples

This phase requires no code. The relevant existing implementation is:

### Current JSON-LD in dist/index.html (verified)
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Iron & Pine Omnium",
  "description": "A two-day gravel weekend...",
  "startDate": "2026-06-06",
  "endDate": "2026-06-07",
  "eventStatus": "https://schema.org/EventScheduled",
  "sport": "Cycling",
  "location": {
    "@type": "Place",
    "name": "Hiawatha National Forest",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Munising",
      "addressRegion": "MI",
      "addressCountry": "US"
    }
  },
  "url": "https://ironpineomnium.com",
  "organizer": {
    "@type": "Organization",
    "name": "Iron & Pine Omnium",
    "url": "https://ironpineomnium.com"
  }
}
```
Source: dist/index.html (built output confirmed 2026-04-09)

### Current sitemap-0.xml URLs (verified)
```
https://ironpineomnium.com/
https://ironpineomnium.com/leaderboard/
https://ironpineomnium.com/submit/
https://ironpineomnium.com/support/
```
submit-confirm, error — both absent. Source: dist/sitemap-0.xml (confirmed 2026-04-09)

### Curl command for Twitter card verification (no-login alternative)
```bash
curl -s -A "Twitterbot/1.0" https://ironpineomnium.com | grep -i "twitter:card\|twitter:image\|twitter:title"
```
Expected output:
```
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Iron &#38; Pine Omnium | ...">
<meta name="twitter:image" content="https://ironpineomnium.com/og-image.png">
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| cards-dev.twitter.com/validator | Third-party tools (opengraph.to, postel.app) | 2022 (Twitter deprecated official tool) | No official X card validator; use alternatives |
| SportsEvent @type for sports events | @type Event only | Google policy; ongoing | SportsEvent is not eligible for Google event rich result cards |

**Deprecated/outdated:**
- cards-dev.twitter.com/validator: Permanently shut down. Redirect to cards-dev.x.com/validator also returns 402.
- SportsEvent for Google rich results: Not documented as eligible by Google. Only @type Event qualifies.

## Open Questions

1. **Error page sitemap/noindex status**
   - What we know: `/error/` is absent from the sitemap and does not have `<meta name="robots" content="noindex">`. It has the `<!-- Conditional noindex -->` HTML comment (which is just a template marker, not a meta tag).
   - What's unclear: Whether the error page should have noindex applied. It is not in the sitemap, which is correct for an error/utility page, but it is technically indexable.
   - Recommendation: This is out of scope for Phase 17 QA — the success criteria do not mention the error page. Note it as a potential follow-up but do not block QA on it.

2. **Facebook Debugger login availability**
   - What we know: Facebook Sharing Debugger requires a Facebook account login.
   - What's unclear: Whether the person running QA has or will use a Facebook account.
   - Recommendation: The plan should note the login requirement and offer opengraph.to as a no-login alternative that produces equivalent verification (though not an official rescrape).

## Sources

### Primary (HIGH confidence)
- Official Google Event structured data docs: https://developers.google.com/search/docs/appearance/structured-data/event — confirmed @type Event as eligible, location.address required, streetAddress flexible
- dist/index.html — direct inspection of built output, confirmed all OG/Twitter/JSON-LD tags 2026-04-09
- dist/sitemap-0.xml — direct inspection confirming 4 URLs, submit-confirm absent 2026-04-09
- dist/robots.txt — confirms `Sitemap: https://ironpineomnium.com/sitemap-index.xml`

### Secondary (MEDIUM confidence)
- Facebook Sharing Debugger usage: https://developers.facebook.com/tools/debug/ — confirmed login required, "Scrape Again" workflow, verified with multiple third-party guides
- Google Rich Results Test: https://search.google.com/test/rich-results — confirmed URL, verified supports Event type

### Tertiary (LOW confidence)
- X Card Validator deprecation: confirmed via WebSearch (multiple sources agree, 2022 deprecation) and direct HTTP 402 response from cards-dev.x.com/validator
- opengraph.to as alternative: https://www.opengraph.to/ — confirmed no-login, shows Twitter/X + Facebook previews

## Metadata

**Confidence breakdown:**
- Tool identification: HIGH — official URLs verified, deprecation confirmed via live 402 response
- Implementation state: HIGH — directly inspected dist/ build output
- QA step sequences: MEDIUM — derived from official tool documentation and third-party guides
- X Card validation alternative: MEDIUM — confirmed via multiple sources that official tool is dead; alternative tools unverified directly

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (tools change infrequently; X deprecation status stable)
