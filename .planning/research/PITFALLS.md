# Pitfalls Research

**Domain:** Strava-integrated event leaderboard (gravel cycling omnium)
**Researched:** 2026-04-02
**Confidence:** HIGH on API mechanics and ToS; MEDIUM on ToS enforcement interpretation for small events

---

## Critical Pitfalls

### Pitfall 1: Strava's November 2024 API Terms May Prohibit Public Leaderboards

**What goes wrong:**
The Strava API Agreement (effective November 11, 2024) explicitly states: "Third-party apps may now only display a user's Strava activity data to that specific user." A public leaderboard showing rider names, times, and segment efforts to all website visitors violates this restriction as written. This is not a gray area — Strava says "you may not display or disclose Strava Data related to other users, even if such data is publicly viewable on Strava's Platform."

**Why it happens:**
Most developers copy patterns from pre-2024 tutorials and third-party event sites that predate the rule change. The restriction feels counterintuitive because Strava's own platform shows public segment leaderboards — but the API agreement restricts what *third-party apps* can show. Developers assume "the data is public on Strava, so I can display it" — this assumption is now legally wrong under the ToS.

**How to avoid:**
- Read the current API Agreement before writing a single line of OAuth code: https://www.strava.com/legal/api
- For this event, there are two viable paths: (1) treat the Strava connection as *verification-only* — use it to confirm athlete identity and pull data server-side, but display only rider-submitted names and a computed score on the public leaderboard (not raw Strava fields like activity titles or segment names), or (2) email developers@strava.com before June to ask whether a small, consent-based event app qualifies for a community exception.
- The safest model: riders authenticate via Strava OAuth to prove identity and authorize data pull; the leaderboard displays *their chosen display name + computed score* — not raw Strava activity data fields.
- Do not build the leaderboard as "pull from Strava and display" without legal clarification. Build it as "athlete consents, we compute a score, we display that score."

**Warning signs:**
- Your leaderboard table shows fields that come directly from Strava (activity name, segment name, start date from API) rather than fields derived from them (a calculated score).
- You are displaying data from rider A's Strava activity to rider B without rider A actively using the app at that moment.

**Phase to address:**
OAuth / data fetch planning phase — before any UI work begins. This shapes the entire data model.

---

### Pitfall 2: Athlete Limit Blocks All Riders on Event Weekend

**What goes wrong:**
New Strava API applications are capped at **1 connected athlete** (the developer's own account). Connecting additional athletes requires Strava's manual review and approval. The stated target is 1 week, but actual turnaround ranges from days to months. If approval is not in hand before June 6, riders attempting to authenticate will receive a `403 Limit of connected athletes exceeded` error — the site silently fails for everyone but the developer.

**Why it happens:**
Developers start building and testing with their own account, where the limit isn't visible. They submit for review "soon" but underestimate Strava's review timeline. With a hard event date, there is no recovery window if approval arrives late.

**How to avoid:**
- Submit the app for athlete limit review **immediately after registering the Strava API application** — do not wait until the feature is "done."
- Target submission no later than April 30, 2026 (5+ weeks before the event) to leave buffer for delays.
- Contact developers@strava.com directly with your client ID after submitting, noting the hard event deadline of June 6.
- Build a fallback: a manual CSV import path so results can be entered without Strava if approval never comes.

**Warning signs:**
- You are within 4 weeks of the event and have not received approval confirmation.
- Testing with a second Strava account returns a 403 error.

**Phase to address:**
OAuth setup phase — first task after API app registration.

---

### Pitfall 3: Refresh Token Rotation Not Persisted — Silent Auth Failures on Event Day

**What goes wrong:**
Strava's OAuth uses rotating refresh tokens: every time you call the token endpoint, you get a *new* refresh token. The old one is immediately invalidated. If your application does not atomically write the new refresh token to the database before using the new access token — or if a crash occurs mid-write — the stored refresh token becomes invalid. On the next request, the token refresh fails with a 400/401 error, and the athlete must re-authenticate. During a live event, riders will not re-authenticate on demand.

**Why it happens:**
Developers implement a simple "refresh if expired, use if not" pattern without handling the write-back as a critical operation. Token rotation is treated as a background detail rather than the core failure mode it is.

**How to avoid:**
- Persist the new access token and refresh token atomically *before* making the API call that uses them.
- Log every token refresh with timestamp and athlete ID so you can detect rotation failures.
- Test token expiry explicitly: set a test token's expiry to the past, trigger a refresh, verify the new token is stored and the old one no longer works.
- Access tokens expire after 6 hours. On event day (multi-hour rides), every rider's token will expire mid-event. Automatic refresh must work reliably without user interaction.

**Warning signs:**
- Your token storage only saves `access_token`, not `refresh_token`.
- Token refresh is handled in the same async step as the API call with no error handling between them.
- You have not written a test that forces a token expiry and validates the refresh path.

**Phase to address:**
OAuth implementation phase — before any data fetching is built.

---

### Pitfall 4: Wrong Scope Requested — Segment Efforts Silently Missing

**What goes wrong:**
If riders have activities set to "Followers Only" or "Only Me" privacy, the `activity:read` scope will not return their segment efforts. The API call succeeds (200 OK), the activity object is returned, but `segment_efforts` is an empty array — no error, no warning. Day 2 scoring requires specific segment effort times; if those efforts are missing, those riders silently score zero on segments they actually completed.

**Why it happens:**
Developers request `activity:read` (the minimal scope) and test with their own public activities. Everything works in testing. In production, riders with private activities or private activity defaults fail silently.

**How to avoid:**
- Request `activity:read_all` scope during OAuth authorization. This is the only scope that returns segment efforts from "Only Me" activities.
- During submission flow, show riders the privacy implication: "Your activity must be set to at least 'Followers' for us to read your segment efforts. If your activity is private, authorize 'activity:read_all' during login to allow access."
- After fetching an activity, explicitly check: if `segment_efforts` is empty AND the activity distance is non-zero, flag the submission for manual review rather than silently accepting a zero score.

**Warning signs:**
- Your OAuth authorization URL requests `activity:read` without `activity:read_all`.
- You have not tested with a Strava account that has activities set to "Only Me" privacy.
- Your submission handler accepts an empty `segment_efforts` array as valid.

**Phase to address:**
OAuth scope design — during auth flow implementation.

---

### Pitfall 5: KOM Data Not Available for Non-Subscriber Riders

**What goes wrong:**
The `kom_rank` field on segment effort objects is only populated for Strava subscribers (Premium/Summit members). Free-tier riders will return `null` for `kom_rank`. If Day 2 KOM scoring relies on this field from the API, free-tier riders will score zero KOM points regardless of their actual performance.

**Why it happens:**
Strava removed leaderboard data from the free tier in 2020. Developers testing with a subscriber account see `kom_rank` populated and build scoring logic around it, not realizing it returns null for free accounts — which many casual riders use.

**How to avoid:**
- Do not use `kom_rank` from the API as the source of truth for KOM scoring. Instead, define event-specific segments explicitly by Strava segment ID and determine KOM status by comparing all submitted segment effort times against each other in your own database — whoever submitted the fastest elapsed time for a given segment in their category wins the KOM points.
- This approach is both more reliable (no subscriber dependency) and more correct (you're running your own event, not deferring to Strava's historical KOM).

**Warning signs:**
- Your KOM scoring code reads `effort.kom_rank` from the Strava API response.
- You have not tested your KOM logic with a free-tier Strava account.

**Phase to address:**
Scoring engine design phase — before segment data fetching is implemented.

---

### Pitfall 6: Segment Effort Misidentification — Wrong Segment, Wrong Time

**What goes wrong:**
Day 2 requires specific segment efforts from designated course segments. The API returns *all* segment efforts for an activity (with `include_all_efforts=true`). Without filtering by exact Strava segment ID, you may grab the wrong segment effort — a nearby segment, a reversed segment, or an overlapping segment. The rider may have ridden your course but the segment ID you're looking for never appears in their activity (e.g., they missed GPS lock at the start, or the segment was ridden in the wrong direction).

**Why it happens:**
Developers search for segment efforts by name or geographic proximity rather than matching on the exact segment ID. Strava segments can overlap, cover the same road in opposite directions, and have duplicate names.

**How to avoid:**
- Pin every scoring segment to its exact Strava segment ID during course design — before writing any data fetching code.
- Filter `segment_efforts` from the activity response by comparing `effort.segment.id` to your hardcoded list of scoring segment IDs.
- A segment effort with `hidden: true` (added to the API in 2024) means Strava has excluded it from leaderboards; decide in advance whether hidden efforts count in your event or require manual review.
- If an expected segment is absent from a rider's activity, flag the submission — do not auto-score it as zero without human review.

**Warning signs:**
- You do not yet have a hardcoded list of Strava segment IDs for all Day 2 scoring segments.
- Your segment matching logic uses name substring matching instead of ID comparison.
- You have not checked which segments exist on the actual course in Strava's segment database.

**Phase to address:**
Course/segment mapping — before any fetch logic is written. This is a prerequisite, not a detail.

---

### Pitfall 7: Moving Time Inconsistency Across Riders' GPS Devices

**What goes wrong:**
Day 1 scoring uses `moving_time`. Strava's `moving_time` calculation varies based on the GPS device and whether auto-pause was enabled. Riders with auto-pause off will have their moving time calculated by Strava from GPS speed data; riders with auto-pause on will have device-recorded pauses respected. Two riders who actually rode at the same pace may have materially different `moving_time` values if one stopped at a road crossing (auto-pause removed the stop; the other counted it). This creates scoring inequity that feels wrong to riders who compare notes.

**Why it happens:**
Developers assume `moving_time` is a consistent, objective measure. It is not — it reflects a combination of device behavior and Strava's own GPS-based speed inference.

**How to avoid:**
- Document in your event rules which Strava field you use for scoring: `moving_time` as returned by the API.
- Set rider expectations: "Moving time is calculated by Strava from your device data. We use this figure as-is." This is the standard for Strava-based events and most riders understand it.
- Do not attempt to "correct" moving time. Use it as returned.
- If fairness is a concern, consider requiring riders to disable auto-pause and use elapsed time instead — but this penalizes riders who stop legitimately (mechanicals, road crossings). There is no perfect answer; document the policy clearly before the event.

**Warning signs:**
- Your event rules do not specify whether moving time or elapsed time is used.
- You have not decided how to handle riders who manually pause their GPS.

**Phase to address:**
Event rules / submission design phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip CSRF `state` parameter validation in OAuth callback | Simpler callback handler | Open to CSRF attacks; a malicious link could bind an attacker's Strava account to a victim's session | Never — implement state validation from day one |
| Store access token only, not refresh token | Simpler schema | App breaks for all riders 6 hours after auth; requires re-auth on event day | Never for event-day use |
| Hard-code the redirect URI in both the app config and the Strava app registration | One fewer config var | Any domain change (preview URL, prod swap) breaks OAuth completely | Acceptable only in local dev |
| Fetch all segments and filter client-side | Simpler fetch code | May exceed rate limits with many riders; returns irrelevant segments | Never — filter by segment ID server-side |
| Trust the submitted activity URL without verifying it belongs to the authenticated athlete | Simpler submission flow | Riders can submit any public activity, including other people's | Never — always verify `activity.athlete.id === session.athlete_id` |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Strava OAuth callback | Not registering the exact production callback URL in the Strava app settings before launch | Register all environments (local, staging, production) as separate Strava apps, or use a single app with the production URL set from day one |
| Token exchange | Reusing an authorization code (they are single-use) | Exchange the code exactly once; never retry the same code on error — generate a new auth flow instead |
| Rate limit headers | Ignoring `X-RateLimit-Usage` response headers | Read headers on every response; back off proactively when approaching 80% of the 200/15-min or 100-read/15-min limits |
| Segment efforts fetch | Calling `/activities/{id}` without `include_all_efforts=true` | Always pass `include_all_efforts=true`; without it, Strava returns only a subset of segment efforts |
| Activity ownership | Fetching an activity by URL-extracted ID without checking the authenticated athlete owns it | After fetching, verify `activity.athlete.id` matches the OAuth session's athlete ID before accepting the submission |
| Athlete limit | Launching before Strava approves the athlete limit increase | Submit for review weeks before the event; test with secondary accounts to verify the limit is raised |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching activity + segments on every leaderboard page load | Page is slow; 429 errors under light traffic | Fetch once at submission time, store results in DB; leaderboard reads from DB only | Immediately at any traffic above a few concurrent users |
| No request queuing for simultaneous submissions | Multiple riders submit at once; rate limit exhausted in seconds | Queue Strava API calls; process submissions sequentially with delay between calls | When more than ~5 riders submit within the same 15-minute window |
| Re-fetching all athletes' data to rebuild leaderboard | Burning daily rate limit on admin refresh | Store scored results; only re-fetch on admin-triggered re-score of individual submissions | Any rebuild cycle with 20+ riders |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client secret stored in environment-exposed config or client-side JS | An attacker can generate their own OAuth tokens impersonating your app | Store `STRAVA_CLIENT_SECRET` server-side only; never in public JS bundles or public repo |
| No state parameter validation in OAuth callback | CSRF attack substitutes attacker's code for legitimate rider's code | Generate a cryptographically random state per auth request; validate it matches on callback |
| Activity URL accepted without athlete ID verification | Rider submits another rider's activity URL, stealing their time | After fetching, verify `activity.athlete.id === authenticated_athlete_id`; reject mismatches |
| Refresh tokens stored in plaintext in a public-facing table | Tokens compromised; attacker can impersonate all connected riders | Store tokens in a server-only table; consider encrypting at rest |
| No expiry check before using stored access token | App makes API calls with expired tokens; gets 401; rider sees error | Check `expires_at` before every API call; refresh proactively if within 5 minutes of expiry |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| OAuth error page shows raw Strava error codes | Rider confused; no path to recover | Catch all OAuth errors; show human-readable message with a "Try again" link |
| Submission succeeds but segment efforts missing — shown as zero | Rider sees wrong score, panics at the event | After processing, show rider a summary: "We found your Day 2 efforts: [segment A: 4:23, segment B: 6:11]. If anything looks wrong, contact the organizer." |
| No confirmation after submission | Rider submits twice; duplicate entries | Show a confirmation with the received data; store a unique constraint on (athlete_id, day) |
| Leaderboard only updates on manual admin action | Riders check during event weekend; see stale data | Auto-update scores when a new submission arrives; show "Last updated: X minutes ago" |
| No fallback if Strava is down | If Strava has an outage on June 6, the entire submission flow fails | Build an admin CSV override path that bypasses Strava for manual entry of times |

---

## "Looks Done But Isn't" Checklist

- [ ] **OAuth flow:** Verify the callback works with a second Strava account — not just the developer's own account. Confirm the athlete limit has been raised above 1 before event day.
- [ ] **Segment efforts:** Verify `include_all_efforts=true` is set and test with an activity that contains the actual event segments by ID — not just any activity with segment efforts.
- [ ] **Token refresh:** Force-expire a stored access token and verify the system refreshes it transparently without rider interaction. Verify the *new* refresh token is persisted.
- [ ] **Athlete ID verification:** Submit a URL from a different rider's activity while authenticated as rider A — confirm the system rejects it.
- [ ] **Privacy scope:** Test with a Strava account that has activities set to "Only Me" privacy; verify segment efforts are returned (requires `activity:read_all` scope).
- [ ] **Rate limits:** Run a simulated burst of 20 submissions and verify no 429 errors and no data corruption from concurrent requests.
- [ ] **KOM scoring:** Verify KOM points are calculated from your internal comparison of submitted times — not from `kom_rank` in the API response.
- [ ] **Error states:** Disconnect your Strava app from a test account and attempt a submission; verify a clear error message appears with instructions.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Athlete limit not raised before event | HIGH | Contact developers@strava.com immediately with event date; as fallback, have riders manually submit their activity URL plus screenshot of times for manual scoring |
| Refresh token lost / all riders need re-auth | MEDIUM | Send riders a link to re-authorize; if on event weekend, provide a manual submission form |
| Strava API outage on event day | MEDIUM | Use the manual CSV override path; collect activity URLs and scores post-event |
| Wrong segment ID used in scoring | HIGH | Requires re-fetching and re-scoring all submissions; build an admin re-score function before launch |
| ToS violation discovered post-launch | HIGH | Remove per-athlete Strava fields from public display immediately; show only computed scores and rider-provided names |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| API ToS / leaderboard display restriction | Architecture + legal review — Phase 1 | Legal text reviewed; data model confirms no raw Strava fields are displayed to third parties |
| Athlete limit not raised in time | OAuth setup — first task in Phase 2 | Second test account can authenticate successfully |
| Refresh token rotation not persisted | OAuth implementation — Phase 2 | Forced expiry test passes; new refresh token stored atomically |
| Wrong scope — segment efforts missing | OAuth scope design — Phase 2 | Test with "Only Me" activity returns non-empty segment_efforts |
| KOM from API kom_rank (subscriber-only) | Scoring engine — Phase 3 | KOM scoring uses internal time comparison, not API field |
| Segment misidentification | Course mapping — before Phase 3 | All scoring segment IDs hardcoded and validated against actual Strava segment database |
| Moving time inconsistency | Event rules — Phase 1 | Rules doc specifies exactly which field is used and why |
| No activity ownership verification | Submission handler — Phase 3 | Attempted cross-submission with different athlete ID is rejected with a clear error |

---

## Sources

- Strava API Agreement (effective October 9, 2025 version): https://www.strava.com/legal/api
- Strava API Agreement Update announcement (November 2024): https://press.strava.com/articles/updates-to-stravas-api-agreement
- Strava OAuth 2.0 authentication documentation: https://developers.strava.com/docs/authentication/
- Strava OAuth scope update documentation: https://developers.strava.com/docs/oauth-updates/
- Strava API rate limits documentation: https://developers.strava.com/docs/rate-limits/
- Strava Segments API changes (2020, leaderboard removal): https://developers.strava.com/docs/segment-changes/
- Strava community — athlete limit increase threads: https://communityhub.strava.com/developers-api-7/number-of-athletes-allowed-to-connect-1-11078
- Strava community — storing activity data beyond 7 days: https://communityhub.strava.com/developers-api-7/storing-activity-data-for-more-than-7-days-11716
- DC Rainmaker — Strava November 2024 API changes analysis: https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html
- CityStrides community — practical impact of display restriction: https://community.citystrides.com/t/new-strava-api-terms-dont-allow-sharing-activity-data-to-other-people/28433
- Strava support — excluded segment efforts: https://support.strava.com/hc/en-us/articles/360061896712-Excluded-Segment-Efforts
- Strava support — activity flags and segment leaderboards: https://support.strava.com/hc/en-us/articles/216919387
- Strava moving time vs. elapsed time: https://support.strava.com/hc/en-us/articles/115001188684-Moving-Time-Speed-and-Pace-Calculations

---
*Pitfalls research for: Strava-integrated gravel cycling event leaderboard (Iron & Pine Omnium)*
*Researched: 2026-04-02*

---
---

# SEO & Social Sharing Pitfalls

**Domain:** Adding SEO meta tags, Open Graph, structured data, and favicons to an existing Astro 6 site
**Researched:** 2026-04-09
**Confidence:** HIGH on Astro-specific behavior (verified against GitHub issues and official docs); HIGH on platform caching behavior (multiple corroborating sources); MEDIUM on Netlify trailing slash/canonical interaction (documented pattern, project-specific configuration may vary)

---

## Critical Pitfalls

### SEO Pitfall 1: Missing `site` in `astro.config.mjs` — All Canonical URLs and OG URLs Are Wrong

**What goes wrong:**
`Astro.site` is `undefined` when the `site` option is not set in `astro.config.mjs`. Any canonical URL built with `new URL(Astro.url.pathname, Astro.site)` silently produces a broken or empty string. The `<link rel="canonical">` tag renders as a relative URL or throws an error, and `og:url` becomes invalid. Both canonical tags and `og:url` are required to be absolute HTTPS URLs — crawlers and social platform scrapers treat relative or malformed URLs as invalid and ignore them.

**This project's current state:** `astro.config.mjs` does not set a `site` property. All canonical URL construction will silently fail until this is added.

**Warning signs:**
- `astro.config.mjs` does not include a `site: "https://your-domain.com"` property.
- Rendered HTML shows `<link rel="canonical" href="undefined/leaderboard">` or a bare relative path.
- Facebook Sharing Debugger reports og:url as invalid.

**Prevention:**
Add `site: "https://ironpineomnium.com"` (or whatever the production domain is) to `astro.config.mjs` as the very first task of the SEO milestone. All canonical and OG URL construction depends on it. Do not build any SEO components until this is confirmed.

**Phase:** First task of the SEO implementation phase, before writing a single meta tag.

---

### SEO Pitfall 2: Relative Path for `og:image` — Image Invisible to Social Crawlers

**What goes wrong:**
Social platform crawlers (Facebook, X/Twitter, LinkedIn, iMessage, Slack, Discord) fetch pages without browser context. They cannot resolve relative image paths. A tag like `<meta property="og:image" content="/images/og.jpg">` is silently ignored or treated as invalid — the crawlers do not know your domain. The spec explicitly requires an absolute HTTPS URL. This is the single most common reason a social card shows no image at all.

**Warning signs:**
- `og:image` content begins with `/` rather than `https://`.
- Facebook Sharing Debugger shows "Could not retrieve image" or displays no image.
- Previews work in browser tab (browser resolves relative paths) but fail in Slack/iMessage (crawlers do not).

**Prevention:**
Always construct the OG image URL as an absolute URL using `Astro.site`:
```astro
const ogImage = new URL("/images/og.jpg", Astro.site).toString();
```
This requires `site` to be set (see Pitfall 1). Verify the absolute URL appears in rendered HTML before testing any social preview tool.

**Phase:** SEO component implementation. Verify with Facebook Sharing Debugger immediately after first deploy.

---

### SEO Pitfall 3: OG Image Dimensions Below Platform Minimums — Cropped or Rejected Images

**What goes wrong:**
Different platforms enforce different minimum dimensions, and undersized images are either cropped (showing only the center), displayed as a small thumbnail instead of a large card, or rejected entirely. For this project's single shared OG image approach, one wrong size decision affects all social previews simultaneously.

Platform requirements (verified April 2026):
- **Facebook:** Minimum 200x200px; optimal 1200x630px; maximum file size 8MB
- **X/Twitter (summary_large_image):** Minimum 300x157px; optimal 1200x630px; maximum 5MB
- **LinkedIn:** Minimum 200x200px; optimal 1200x627px
- **Discord/Slack:** 1200x630px renders well across both

The universal safe target is **1200x630px JPEG or PNG under 5MB**. This satisfies all major platforms.

**Warning signs:**
- OG image dimensions are not explicitly set via `og:image:width` and `og:image:height` tags alongside `og:image`. Without explicit dimensions, some crawlers must download the image to determine size, which can result in timeouts and fallback to no-image display.
- Image file is above 5MB (JPEG compression often not applied to PNG exports).

**Prevention:**
- Set OG image to exactly 1200x630px.
- Include explicit dimension tags: `<meta property="og:image:width" content="1200">` and `<meta property="og:image:height" content="630">`.
- Keep file under 2MB (aim for under 500KB for fast crawler fetches).
- Use JPEG for photographic content (smaller file at same quality vs PNG).

**Phase:** Asset creation phase (before implementation). Do not create the OG image and then discover it is the wrong size.

---

### SEO Pitfall 4: Duplicate Meta Tags from Layout + Page Head Slot — Undefined Behavior

**What goes wrong:**
Astro does not automatically deduplicate `<head>` content. The existing `BaseLayout.astro` renders a `<title>` and `<meta name="description">` unconditionally, and also exposes a `<slot name="head" />`. If a page uses the head slot to add its own `<title>` or `<meta name="description">`, the result is two of each tag in the rendered HTML.

Browsers handle duplicate tags inconsistently: most use the first occurrence, some use the last. Search engine crawlers may use either or may penalize the page. Social platforms may read the first `og:title` and ignore the second, or vice versa. There is no defined behavior — it depends entirely on the platform.

**This project's specific risk:** `BaseLayout.astro` currently renders both `<title>` and `<meta name="description">` from props. If OG tags are added in the layout AND a page tries to customize them via the head slot, duplicates will appear unless the architecture explicitly prevents it.

**Warning signs:**
- Viewing page source shows two `<title>` tags.
- Viewing page source shows two `<meta name="description">` tags.
- Facebook Sharing Debugger reports "multiple og:title tags found."

**Prevention:**
Centralize all head content in `BaseLayout.astro`. Do not split SEO tags between the layout and the per-page head slot. Accept all SEO-relevant values as props to the layout (title, description, ogTitle, ogDescription, ogImage, canonicalPath) and render them once. If a page needs different values, pass different props — do not inject additional tags via the head slot.

Only use the head slot for genuinely additive content (e.g., per-page structured data, page-specific preload links) that does not duplicate what the layout already renders.

**Phase:** Architecture decision before any implementation begins. The wrong pattern here is hard to detect until production testing.

---

### SEO Pitfall 5: `twitter:card` Tag Missing — X/Twitter Images Never Appear

**What goes wrong:**
X (formerly Twitter) requires the `twitter:card` meta tag to be present for any card rendering. Without it, X does not render a preview card even if `og:image`, `og:title`, and `og:description` are all correctly set. X does fall back to OG tags for content, but `twitter:card` itself is the gate — its absence means no card, period.

The correct value for a full-width image preview is `summary_large_image`. Using `summary` renders a small thumbnail instead of a large image card.

**Warning signs:**
- X/Twitter Card Validator shows "ERROR: No card found" for a page that has OG tags.
- X shares show only plain text with no image.
- `<meta name="twitter:card">` is absent from rendered HTML.

**Prevention:**
Add `<meta name="twitter:card" content="summary_large_image">` to `BaseLayout.astro` alongside the OG tags. This one tag unlocks full card rendering. You do not need separate `twitter:title`, `twitter:description`, or `twitter:image` tags — X falls back to OG equivalents for those — but `twitter:card` must be present and explicit.

**Phase:** SEO component implementation. Test with X Card Validator immediately after first deploy.

---

## Moderate Pitfalls

### SEO Pitfall 6: Netlify Trailing Slash / Canonical Mismatch Creates Duplicate Content

**What goes wrong:**
Astro's SSG output for a page at `src/pages/leaderboard.astro` produces `dist/leaderboard/index.html`. Netlify serves this at both `/leaderboard` (with a 301 redirect to `/leaderboard/`) and `/leaderboard/`. If canonical tags point to `/leaderboard` (no slash) but the actual served URL is `/leaderboard/` (with slash), search engines see a canonical URL that differs from the actual URL. In strict SEO terms, the canonical tag is then advisory rather than authoritative, and the search engine chooses which version to index.

**Warning signs:**
- `astro.config.mjs` has `trailingSlash: 'never'` but deployed URLs include trailing slashes.
- Canonical tags use path without trailing slash; browser address bar shows trailing slash.
- Google Search Console reports "Alternate page with proper canonical tag" for pages you expect to be indexed.

**Prevention:**
Match Astro's `trailingSlash` config to Netlify's actual redirect behavior:
- Astro's default output produces `directory/index.html` files, which Netlify serves with trailing slashes.
- Set `trailingSlash: 'always'` in `astro.config.mjs` for consistency.
- Build canonical URLs using `Astro.url.pathname` (which reflects the actual served path including trailing slash) rather than hardcoding paths.
- Verify in production: navigate to `/leaderboard` and confirm it 301s to `/leaderboard/`, then confirm the canonical tag on `/leaderboard/` points to `https://domain.com/leaderboard/`.

**Phase:** SEO implementation. Test canonical consistency on Netlify preview deploy before production launch.

---

### SEO Pitfall 7: Social Platform Caching Locks In Old Previews After OG Updates

**What goes wrong:**
Once a URL has been shared on Facebook, X, or LinkedIn, the platform caches the OG metadata it scraped. Subsequent updates to your OG tags (new image, different title) are not automatically reflected. Facebook caches for approximately 30 days; LinkedIn's cache can persist up to 7 days even after using Post Inspector. This means if OG tags are deployed broken (wrong URL, wrong dimensions, wrong title) and then shared, the broken preview persists long after the fix is deployed.

This is particularly relevant for the Iron & Pine Omnium event site: any pre-event social sharing while OG tags are still being iterated can lock in a broken or placeholder preview for weeks.

**Warning signs:**
- You updated OG image or title, redeployed, but shares still show old content.
- Facebook Sharing Debugger shows correct current tags but says "cached" with old image.
- Event announcement posts show wrong preview card.

**Prevention:**
- Get OG tags correct before any social shares happen. Treat the first share as publishing the preview permanently for 30 days.
- Use the platform debugger tools proactively before the event launch to force cache refresh:
  - **Facebook:** https://developers.facebook.com/tools/debug/ — click "Scrape Again" after each OG update
  - **LinkedIn:** https://www.linkedin.com/post-inspector/ — paste URL and click "Inspect"
  - **X/Twitter:** https://cards-dev.twitter.com/validator — entering the URL forces a re-scrape
- Do not share the production URL on social media until OG tags are verified correct.

**Phase:** QA/verification phase after implementation, before any event promotion begins.

---

### SEO Pitfall 8: Favicon SVG Caching — Stale Icon Persists After Updates

**What goes wrong:**
The project currently serves `logo.svg` as the only favicon (`<link rel="icon" type="image/svg+xml" href="/logo.svg">`). Browsers cache favicons aggressively in a separate favicon database that is not cleared by standard cache-clearing behavior. Hard refresh does not clear favicon cache in Chrome. If the favicon is updated, most visitors will see the old icon until they clear browser data or the cache naturally expires — which can take days or weeks.

Additionally, SVG favicons are not supported in all browsers: older Chrome on Windows, some Android browsers, and some bot crawlers do not render SVG favicons. Without an ICO fallback, those environments show a generic browser icon.

**Warning signs:**
- You updated `logo.svg` and redeployed but still see the old icon in the browser tab.
- Testing in incognito window shows the new icon but regular window shows old icon.
- Browser support coverage requirement includes IE or older Android Webview.

**Prevention:**
- Add a version query parameter if the favicon changes: `href="/logo.svg?v=2"`. This forces browsers to re-fetch the favicon by treating it as a new URL.
- Consider providing an ICO fallback for maximum compatibility. The `public/` directory is the correct location for static assets. Adding `public/favicon.ico` (at minimum a 32x32px ICO) alongside the existing SVG covers legacy environments.
- For this project, the event logo is unlikely to change during the milestone, so favicon versioning is a low-priority concern. Focus on the SVG/ICO fallback issue first.

**Phase:** Asset preparation phase. Favicon format decisions should be made before implementation, not discovered in QA.

---

### SEO Pitfall 9: JSON-LD Structured Data Requires `set:html` Directive — Raw Injection Breaks

**What goes wrong:**
Astro escapes HTML by default. A `<script>` tag with JSON-LD content inserted as a template expression will have characters like `"`, `<`, `>`, and `&` HTML-escaped, producing invalid JSON in the rendered output. Google's Rich Results Test will then report a JSON parse error, and the structured data is ignored entirely.

This is a known Astro behavior, documented in GitHub issue #3544 (closed as "not a bug" — it is working as designed, and the correct pattern is well-established).

**Warning signs:**
- Rendered HTML shows `&quot;` instead of `"` inside the JSON-LD script block.
- Google's Rich Results Test reports "Invalid JSON."
- Schema.org validator shows parse errors.

**Prevention:**
Use the `set:html` directive with `JSON.stringify()`:
```astro
<script type="application/ld+json" set:html={JSON.stringify(schemaObject)}></script>
```
Never use `{schemaObject}` or string interpolation directly in the script tag body. The `set:html` directive bypasses Astro's HTML escaping and is the officially supported pattern.

Additionally, validate structured data in Google's Rich Results Test (https://search.google.com/test/rich-results) after every change — build-time errors do not surface structured data issues.

**Phase:** Implementation phase. Test structured data output in Rich Results Test before marking the task complete.

---

### SEO Pitfall 10: `og:url` Mismatch with Canonical — Contradictory Signals to Crawlers

**What goes wrong:**
`og:url` should be the canonical URL of the page — the same URL in the `<link rel="canonical">` tag. If they differ (e.g., canonical uses no trailing slash, `og:url` uses a trailing slash, or they use different domains), crawlers receive contradictory canonicalization signals. Facebook in particular uses `og:url` as the deduplification key for shared links — if two pages share the same `og:url`, Facebook may merge their engagement metrics, or may display a cached preview from a different page with the same URL.

**Warning signs:**
- `<link rel="canonical">` href and `<meta property="og:url">` content are different strings.
- Facebook Sharing Debugger shows "This URL leads to a different canonical URL."

**Prevention:**
Compute both canonical and `og:url` from the same source:
```astro
const canonicalURL = new URL(Astro.url.pathname, Astro.site).toString();
// Use canonicalURL for both <link rel="canonical"> and og:url
```
This guarantees they are identical by construction. Do not hardcode either one separately.

**Phase:** Implementation phase. Verify both tags in rendered source on every page type.

---

## Minor Pitfalls

### SEO Pitfall 11: `og:image` Blocked by `robots.txt` — Crawler Cannot Fetch Image

**What goes wrong:**
If `/images/` or specific image paths are disallowed in `robots.txt`, social crawlers cannot fetch the OG image. The card renders with no image even though the `og:image` URL is correctly formed and the image is accessible in a browser (which ignores `robots.txt`).

**Warning signs:**
- `robots.txt` includes `Disallow: /images/` or similar broad rules.
- Facebook Sharing Debugger returns an image error despite the image URL being reachable in browser.

**Prevention:**
Review `robots.txt` (if it exists) and confirm the OG image path is explicitly allowed. If no `robots.txt` exists, Netlify static deploys allow all crawlers by default. The current project has `public/images/` as a standard Astro static asset directory — this is accessible by default with no `robots.txt` configuration needed unless one is explicitly added.

**Phase:** Pre-launch QA. Low risk for this project unless a `robots.txt` is added during the milestone.

---

### SEO Pitfall 12: Missing `og:type` — Search and Social Platforms Default to Unknown Type

**What goes wrong:**
Without `<meta property="og:type">`, platforms default to `og:type="website"` implicitly. For this project that is the correct type, so the practical impact is minimal. However, its explicit absence means the OG implementation is technically incomplete, and some strict validators will report it as a warning that obscures other real errors.

**Prevention:**
Add `<meta property="og:type" content="website">` explicitly. Takes one line. Eliminates noise from validator output so real errors stand out.

**Phase:** Implementation. Zero effort, eliminates validator noise.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Config setup | Missing `site` in `astro.config.mjs` silently breaks all canonical/OG URLs | Set `site` as first action; verify `Astro.site` is not `undefined` before proceeding |
| OG image creation | Wrong dimensions, wrong file size | Target 1200x630px JPEG under 500KB; set explicit width/height meta tags |
| Layout/component design | Duplicate meta tags from layout + head slot | Centralize all SEO tags in `BaseLayout.astro` props; use head slot only for additive content |
| Structured data | Astro escaping breaks JSON-LD | Always use `set:html={JSON.stringify(...)}` pattern; validate with Rich Results Test |
| Canonical URLs | Trailing slash mismatch between Astro config and Netlify behavior | Match `trailingSlash` config to output format; derive canonical from `Astro.url.pathname` |
| First social share | Platform cache locks in broken preview | Verify all OG tags with debugger tools before any social sharing; force-refresh cache after fixing |
| X/Twitter | No card renders despite correct OG tags | Ensure `twitter:card: "summary_large_image"` is explicitly present |
| `og:url` | Canonical and og:url computed differently | Derive both from the same expression; never set them independently |

---

## Quick Validation Checklist

Before marking SEO implementation complete:

- [ ] `Astro.site` renders a non-undefined absolute URL in page source
- [ ] `<link rel="canonical">` is absolute HTTPS URL matching `og:url`
- [ ] `og:image` is absolute HTTPS URL (not relative path)
- [ ] OG image is 1200x630px with explicit `og:image:width` and `og:image:height` tags
- [ ] `twitter:card` is present with value `summary_large_image`
- [ ] No duplicate `<title>` or `<meta name="description">` tags in page source (check source, not DevTools Elements)
- [ ] JSON-LD renders as valid JSON in page source (no `&quot;` characters inside script block)
- [ ] Rich Results Test returns no errors for structured data
- [ ] Facebook Sharing Debugger returns image and title correctly
- [ ] X Card Validator shows large image card
- [ ] LinkedIn Post Inspector shows correct preview
- [ ] Cache forced-refresh run on all platforms before any event promotion

---

## SEO Sources

- Astro Configuration Reference — `site` option: https://docs.astro.build/en/reference/configuration-reference/
- Astro GitHub Issue #3544 — JSON-LD script tag escaping behavior and `set:html` workaround: https://github.com/withastro/astro/issues/3544
- OG image absolute URL requirement — OG protocol specification: https://ogp.me/
- OG image size guide 2026 (Facebook, X, LinkedIn dimensions): https://myogimage.com/blog/og-image-size-meta-tags-complete-guide
- Twitter/X Card tag requirements — `twitter:card` required for all card types: https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/markup
- Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
- X/Twitter Card Validator: https://cards-dev.twitter.com/validator
- Google Rich Results Test: https://search.google.com/test/rich-results
- Netlify trailing slash behavior and canonical implications — Netlify Support Forum: https://answers.netlify.com/t/support-guide-how-can-i-alter-trailing-slash-behaviour-in-my-urls-will-enabling-pretty-urls-help/31191
- Social media preview cache timing (Facebook 30 days, LinkedIn 7 days): https://mikebifulco.com/posts/reset-your-open-graph-embeds-on-linkedin-twitter-facebook
- Favicon caching behavior and version parameter workaround: https://www.codestudy.net/blog/how-do-i-force-a-favicon-refresh/
- SVG favicon browser support limitations: https://faviconbuilder.com/guides/svg-favicon-browser-support/
- astro-seo library (open source reference implementation): https://github.com/jonasmerlin/astro-seo

---
*SEO & Social Sharing pitfalls added: 2026-04-09*
*Applies to: SEO & Social Sharing milestone on Iron & Pine Omnium (Astro 6, Netlify)*


---
---

# Scoring Integrity Pitfalls

**Domain:** Gun time scoring + distance validation for Strava-integrated gravel event
**Researched:** 2026-04-14
**Confidence:** HIGH on Strava API field behavior (verified against official docs and community); HIGH on UTC/Eastern Time mechanics; MEDIUM on GPS distance accuracy thresholds (empirical data varies by device/terrain)

---

## Critical Pitfalls

### Scoring Pitfall 1: Misinterpreting `start_date_local` with Its Misleading `Z` Suffix

**What goes wrong:**
The Strava API returns `start_date_local` in the format `"2026-06-06T08:03:22Z"`. The `Z` suffix conventionally means UTC in ISO 8601, but Strava uses it incorrectly here — the datetime value is already in the athlete's local timezone; the `Z` is a lie. If code passes this string to `new Date()` or `Date.parse()`, JavaScript interprets the `Z` as UTC and adjusts the result to local machine time, producing a time that is off by the UTC offset (4 hours for EDT, or 5 hours for EST). Specifically, an 8:03 AM EDT start would appear as 4:03 AM UTC if misinterpreted.

This is confirmed by the Strava developer community and the API's own documentation, which describes `start_date_local` as "the UTC version of the local start time," meaning: the wall-clock digits represent local time, but the `Z` suffix should be ignored as a timezone indicator.

**The correct approach (already used in this project):**
`activity.start_date_local.slice(0, 10)` extracts the local date string `"2026-06-06"` purely as digits, never constructing a Date object. This is correct and avoids the Z-suffix trap entirely.

**Where the trap reappears when adding gun time scoring:**
Gun time calculation requires computing `race_time = activity_start - gun_time`. If `activity_start` is derived from `start_date_local` by constructing a Date object (e.g., `new Date(activity.start_date_local)`), the JavaScript runtime will interpret the `Z` as UTC, apply a 4-hour eastward shift, and compute a `race_time` that is 4 hours wrong. A rider who started at 8:03 AM EDT would appear to have started at 4:03 AM UTC, yielding a negative race time when compared against gun time expressed as `2026-06-06T08:00:00-04:00`.

**Prevention:**
Never pass `start_date_local` to `new Date()`. Extract only the digits you need:
```javascript
// Correct: treat as wall-clock local time by stripping the Z
const [datePart, timePart] = activity.start_date_local.replace("Z", "").split("T");
// timePart is "08:03:22" — wall clock time in rider's local timezone
const [hours, minutes, seconds] = timePart.split(":").map(Number);
const startSecondsSinceMidnight = hours * 3600 + minutes * 60 + seconds;

// Gun time expressed the same way: 8:00:00 AM = 28800 seconds since midnight
const GUN_TIME_SECONDS_SINCE_MIDNIGHT = 8 * 3600; // 28800

const raceTimeSeconds = startSecondsSinceMidnight - GUN_TIME_SECONDS_SINCE_MIDNIGHT;
// If positive: rider started that many seconds after the gun
// raceTimeSeconds feeds into total race time = raceTimeSeconds + movingTimeSeconds
```

**Warning signs:**
- Any code path that calls `new Date(activity.start_date_local)`
- Any code that computes a timestamp difference using a JS Date object constructed from `start_date_local`
- Gun time is defined as a UTC timestamp and compared against a Date constructed from `start_date_local`

**Severity:** CRITICAL — silent wrong result, no error thrown

**Phase to address:** Gun time scoring implementation, before any start-time arithmetic is written

---

### Scoring Pitfall 2: Defining Gun Time as UTC Instead of Local Wall Clock

**What goes wrong:**
8:00 AM Eastern Time on June 6, 2026 is `2026-06-06T12:00:00Z` (UTC), because June is EDT which is UTC-4. If a developer defines the gun time as `"2026-06-06T08:00:00Z"` (treating 8:00 AM as UTC), the gun time is off by 4 hours — it represents what would be 8:00 AM in London, not Michigan.

The resulting race times would be exactly 4 hours (14,400 seconds) wrong for every rider. Riders who started at or near gun time would show race times of negative 14,400 seconds — flagged as impossible and rejected, or silently stored as an enormous positive number if absolute value is taken.

**Michigan UP specifics (June 2026, verified):**
- The UP (except four westernmost counties) observes EDT in June
- EDT = UTC-4
- DST began March 8, 2026 and ends November 1, 2026
- June 6 is firmly in EDT: 8:00 AM EDT = 12:00 PM UTC
- No DST transitions occur within the event weekend

**Prevention:**
Store gun time as seconds-since-midnight in local time, matching how `start_date_local` digits are treated. Never store it as a UTC timestamp and compare against `start_date_local`-derived values:

```javascript
// In scoring config — store as local wall clock, not UTC
const DAY1_GUN_TIME = {
  date: "2026-06-06",
  secondsSinceMidnightLocal: 8 * 3600, // 08:00:00 local = 28800
};

// If UTC timestamp comparison is truly needed (e.g., for cross-checking with start_date):
// 8:00 AM EDT = 2026-06-06T12:00:00Z — document this explicitly
const DAY1_GUN_TIME_UTC = "2026-06-06T12:00:00Z";
```

**Warning signs:**
- Gun time is defined as `"2026-06-06T08:00:00Z"` anywhere in the codebase
- Race times for most riders are negative or suspiciously large
- Scores are computed against `activity.start_date` (true UTC field) using a gun time that does not apply the EDT offset

**Severity:** CRITICAL — systematic 4-hour error on every single race time

**Phase to address:** Before gun time constant is written; document the UTC offset explicitly in a code comment

---

### Scoring Pitfall 3: `Math.min(...[])` Returns `Infinity` — First Rider Gets 100% by Division

**What goes wrong:**
The existing `scoring.ts` uses `Math.min(...riders.map(...))` to find the fastest time. If only one rider is in a category (or the first rider submits), `Math.min` works correctly for one element. However, the movingTimeScore formula divides `fastestMovingTimeSeconds / rider.movingTimeSeconds`. When only one rider exists, `fastestMovingTimeSeconds === rider.movingTimeSeconds`, so the ratio is `1.0`, and that rider receives the maximum score. This is expected behavior.

The silent failure mode is if `riders` is empty for a category: `Math.min(...[])` returns `Infinity`, and `Infinity / rider.movingTimeSeconds` is `Infinity`. The score becomes `Infinity`, which renders as `Infinity` or `NaN` in the UI rather than throwing an error.

Adding gun time adds a new time field (`raceTimeSeconds`), which means a new `Math.min` call across `raceTimeSeconds` values. If `raceTimeSeconds` is missing (field not populated yet), the spread produces `Infinity` silently.

**Current code location:** `scoring.ts` line 24 — `Math.min(...riders.map((rider) => rider.movingTimeSeconds))`

**Prevention:**
Guard all `Math.min` calls against empty arrays:
```typescript
const fastestRaceTimeSeconds = riders.length > 0
  ? Math.min(...riders.map((r) => r.raceTimeSeconds))
  : 0;
```
Also validate after: if `fastestRaceTimeSeconds === Infinity || isNaN(fastestRaceTimeSeconds)`, log a warning and return a zeroed score.

**Warning signs:**
- Leaderboard shows "Infinity" or "NaN" in any score column
- A category with one rider shows them with exactly 100 points on every metric
- No guard clause before `Math.min` spread on a potentially-empty array

**Severity:** CRITICAL in production (wrong scores render silently); catches in dev if you notice the output

**Phase to address:** Scoring engine implementation, before any display component reads scores

---

### Scoring Pitfall 4: `start_date_local` Privacy Redaction — Midnight Returned for Hidden Activity Start Times

**What goes wrong:**
Strava's September 2024 changelog documents that activities with "hidden start time" privacy setting return an obscured `start_date_local` of midnight + 1 second: `"2026-06-06T00:00:01Z"`. This is not an error — the API returns 200 OK with a valid activity. For date validation (slicing the first 10 characters), this still returns the correct date `"2026-06-06"`, so the submission passes date validation.

However, for gun time scoring, `start_date_local` of `T00:00:01` means the computed start time is 12:00:01 AM local — nearly 8 hours before the gun. The race time calculation yields a large negative number (or, if floor-clamped, still produces a wildly wrong race time that effectively scores as if the rider pre-rode the course overnight).

This only affects riders who have enabled "Hide start time" on their activity privacy settings.

**Prevention:**
After extracting `start_date_local` digits, validate the derived start time is plausible before computing race time:
```javascript
const startSecondsSinceMidnight = hours * 3600 + minutes * 60 + seconds;

// Sanity check: Day 1 gun is 8:00 AM. Reject starts before 7:00 AM or after 10:00 AM
// (generous 2-hour window; adjust per event expectations)
const MIN_VALID_START = 7 * 3600;  // 07:00 local
const MAX_VALID_START = 10 * 3600; // 10:00 local

if (startSecondsSinceMidnight < MIN_VALID_START || startSecondsSinceMidnight > MAX_VALID_START) {
  return { error: "implausible_start_time" };
}
```
Return a user-facing error that instructs the rider to disable "Hide start time" privacy on this specific activity before resubmitting.

**Warning signs:**
- `start_date_local` contains `T00:00:01Z` for any submission
- Computed race time is negative by more than 60 seconds
- No plausibility window check is applied before computing race time

**Severity:** CRITICAL — silent wrong score if not caught; the activity passes all other validation

**Phase to address:** Gun time computation, alongside the `start_date_local` Z-suffix handling

---

## Moderate Pitfalls

### Scoring Pitfall 5: Elapsed Time vs. Moving Time for Gun Time Scoring

**What goes wrong:**
The current Day 1 scoring uses `movingTimeSeconds` (`activity.moving_time`). For gun time scoring, what matters is the total time from gun to finish. These are different concepts:

- `moving_time`: Strava's calculated time spent moving (excludes pauses, stops, auto-pause gaps). Varies by device.
- `elapsed_time`: Total time from recording start to recording stop. Always includes everything.

For gun time scoring, the finish clock time is what matters — a rider who stops for a flat tire and takes 10 minutes to fix it should have those 10 minutes count against them. `elapsed_time` is closer to "finish time" for an event context, but it is anchored to when the rider started recording — not when the gun fired.

**The correct formula for gun time scoring:**
```
race_time = (activity_start_time - gun_time) + elapsed_time
```
Where `activity_start_time` is the local wall clock time from `start_date_local`, and `elapsed_time` is `activity.elapsed_time` in seconds.

If `moving_time` is used instead of `elapsed_time`, riders who auto-paused at road crossings or stopped for mechanicals get a faster "race time" than riders who rode through without stopping — the opposite of what gun time scoring intends.

**Key API fact (confirmed via Strava support docs):**
`elapsed_time` always includes paused time. `moving_time` excludes paused intervals. `elapsed_time` is anchored to device recording start/stop, not to the gun.

**Prevention:**
Use `activity.elapsed_time` (not `activity.moving_time`) as the ride duration component in gun time race time calculation. Store `elapsed_time` in the athlete JSON alongside `raceTimeSeconds`. Keep `movingTimeSeconds` only if the current weighted score formula continues to use it for a sub-component.

**Warning signs:**
- Race time formula uses `activity.moving_time` as the duration component
- The data model stores only `movingTimeSeconds` and nothing computes `elapsed_time`
- Two riders with identical performance but different auto-pause settings get different race times

**Severity:** MODERATE — scoring inequity that is detectable by comparing rider notes, not a silent crash

**Phase to address:** Scoring formula design, before the data model is locked

---

### Scoring Pitfall 6: Rider Starts Recording Before Gun — Pre-Gun Warm-Up Inflates Race Time

**What goes wrong:**
Riders who hit "record" for a warm-up lap and never stopped (or who started recording 15 minutes early and forgot) will have `start_date_local` earlier than the gun time. The computed pre-gun offset `(activity_start - gun_time)` is negative, meaning their `raceTimeSeconds` = negative offset + `elapsed_time` is smaller than their actual ride duration. They effectively get a head start on the clock — recording 10 minutes early gives them a 10-minute race time advantage.

Conversely, riders who crop the warm-up portion off their activity using Strava's crop tool will have `start_date_local` updated to reflect the cropped start. The crop tool adjusts start time, `elapsed_time`, and `distance` in the API response. So a cropped activity is handled correctly — but only if the rider thinks to crop before submitting.

**Prevention:**
Clamp the pre-gun offset at zero: if `activity_start - gun_time < 0`, treat it as `0` (the rider started at or before the gun, giving no race-time penalty for early starts but also no advantage):
```javascript
const preGunOffsetSeconds = Math.max(0, startSecondsSinceMidnight - GUN_TIME_SECONDS_SINCE_MIDNIGHT);
const raceTimeSeconds = preGunOffsetSeconds + elapsedTimeSeconds;
```
This means riders who start early get the same gun-time start as riders who start exactly on the gun — the early-start offset is floored to zero. Document this policy in the event rules.

**An alternative policy** (stricter): reject submissions where `activity_start` is more than 30 minutes before the gun, requiring the rider to crop their activity first. This is more correct but adds a support burden.

**Warning signs:**
- No clamping on the pre-gun offset computation
- Race times are shorter than `elapsed_time` for some riders
- No mention of early-start policy in event rules

**Severity:** MODERATE — some riders get an unearned advantage; detectable by comparing race time to elapsed time

**Phase to address:** Gun time formula implementation; document early-start policy before coding

---

### Scoring Pitfall 7: Multiple Activity Submissions for the Same Day

**What goes wrong:**
A rider might record two separate Strava activities for Day 1 — one for the first 50 miles before a GPS device died, and one for the final 50 miles after restarting. The current system enforces one submission per (athlete, day) with a unique constraint, but a rider might not realize they need to submit only one activity and might try submitting both, or submit the second (shorter) activity expecting it to represent their full day.

The system correctly rejects a second submission attempt if the `(athleteId, day)` slot is already filled. However, if a rider submits only the second segment (the shorter, post-restart recording), their distance and elapsed time will appear to cover only half the route — likely failing distance validation and leaving them unscored despite completing the course.

**Prevention:**
- Instruct riders clearly in event rules: "If you record multiple activities, merge them in Strava before submitting. Strava allows combining separate activities into one using third-party tools. Submit only the merged activity."
- In the submission error response for `wrong_distance` or `short_elapsed_time`, include messaging: "If you recorded multiple activities, please merge them into one before resubmitting."
- Consider whether the organizer needs a manual override path to accept a composite time.

**Warning signs:**
- A rider's submitted activity covers roughly half the expected route distance
- A rider contacts organizer because "my submission shows the wrong distance"
- No mention of multi-activity recording in event instructions

**Severity:** MODERATE — rider left unscored despite completing the course; requires manual intervention

**Phase to address:** Submission flow design; event communications; error message copy

---

### Scoring Pitfall 8: Segment Efforts Decluttered or Hidden — Silent Zero on Scoring Segments

**What goes wrong:**
Strava's September 2024 segment decluttering removed hundreds of thousands of duplicate or low-quality segments. As of the API changelog, decluttered segments return an empty array from the segment efforts endpoint. Additionally, the `hidden` attribute was added to segment effort objects; a `hidden: true` effort means Strava has excluded the effort from leaderboards.

For this project, if one of the designated scoring segments (SECTOR_SEGMENT_IDS or KOM_SEGMENT_IDS from `segments.ts`) is decluttered by Strava between now and the event, the API will return no effort for that segment — and the rider will silently score zero for it. No error is returned; the absence of a segment effort looks identical to a rider who missed the segment.

**Prevention:**
- Before the event, verify all scoring segments still exist by fetching them directly from the Strava segments API and confirming they are not flagged as archived or hidden.
- After any submission, if an expected segment ID is absent from a rider's segment efforts AND their distance indicates they rode the full course, flag the submission for manual review rather than auto-scoring zero.
- Keep a manual override in the admin path that allows an organizer to enter a segment time directly if the API returns nothing.
- Note: `hidden: true` on a segment effort (added 2024) means Strava excluded it from leaderboards, but the effort still appears in the API response. Decide in advance whether hidden efforts count in your event.

**Warning signs:**
- A submitted activity covers the full course distance but returns zero sector efforts
- Segment exists in `segments.ts` but returns no effort for any submitted activity
- No segment validation step before the event weekend

**Severity:** MODERATE — missed scoring for affected riders; not detectable until riders complain

**Phase to address:** Pre-event segment validation check; submission handler review logic

---

### Scoring Pitfall 9: Scores Must Recompute When New Riders Submit — Stale Leaderboard

**What goes wrong:**
This project uses relative scoring: `score = (fastest_time / rider_time) * weight * scale`. The fastest time denominator changes each time a faster rider submits. This means every existing rider's score changes when a new, faster rider submits. The current architecture computes scores at build time from static JSON files.

If scores are computed once per submission (at submission time) and stored, they become stale the moment a faster rider submits. A rider who submitted first with `movingTimeSeconds = 6000` receives a score based on `6000/6000 = 1.0` (max) until someone faster arrives. After a faster rider submits, the stored score is wrong but the JSON file still says the old value.

**Current architecture behavior:** `loadAthleteResults()` loads raw times; `scoreOmnium()` recomputes scores at each Astro build. Scores are not stored — they are computed from raw times. This is correct. However, if scoring is extended to store `raceTimeSeconds` in the JSON and scores are ever pre-computed and cached anywhere, this becomes a stale-score problem.

**Prevention:**
- Never store computed scores in the athlete JSON files. Store only raw measured values (`movingTimeSeconds`, `raceTimeSeconds`, `elapsed_time`, `sectorEfforts`, etc.). Recompute all scores at render time from raw values. This is the existing pattern — maintain it.
- If a client-side score cache is added (e.g., localStorage), ensure it is invalidated on each page load or on a short TTL.
- Document this constraint: "scores are always derived, never stored."

**Warning signs:**
- A pull request adds a `score` field to the athlete JSON schema
- Score computation moves from build-time to submission-time in the Netlify function
- A first rider's score is 100 and it stays 100 after faster riders arrive

**Severity:** MODERATE — incorrect leaderboard positions; detectable by comparing scores to expected ranking

**Phase to address:** Data schema design before scoring changes are implemented

---

## Minor Pitfalls

### Scoring Pitfall 10: GPS Distance Over-Read on Forest/Gravel Terrain — False Validation Rejections

**What goes wrong:**
GPS receivers over-read distance on rough terrain due to "track inflation" — the recorded GPS path snakes more than the actual path when GNSS signals bounce off tree canopy and obstacles. Studies and community reports indicate forest canopy can increase positional error by 30-40%, and real-world over-reads of 5-15% are common in forested gravel conditions similar to the Michigan UP. Strava applies some GPS smoothing, but the smoothing is device-dependent.

For a 102-mile Day 1 course:
- 5% over-read: rider records 107.1 miles
- 10% over-read: rider records 112.2 miles
- 15% over-read: rider records 117.3 miles

For a distance validation that rejects submissions below a minimum, the relevant risk is under-reads (short GPS from poor signal). Under-reads are less common on gravel than over-reads, but can occur if a GPS device briefly loses lock and gaps out. A 5% under-read on 102 miles is 96.9 miles.

**Recommended threshold (based on GPS accuracy literature and gravel event precedent):**
- Minimum accepted distance: 88% of nominal route distance
- Maximum accepted distance: 120% of nominal route distance

For 102 miles:
- Minimum: ~89.8 miles (accept anything above ~90 miles)
- Maximum: ~122.4 miles (reject anything above ~122 miles — likely a wrong activity)

These thresholds are deliberately wide. Falsely rejecting a legitimate ride is worse than accepting a sandbagged distance, because sandbagging would require riding a shorter route that still hits all the scoring segments — which is separately validated.

**Prevention:**
```javascript
const ROUTE_DISTANCE_METERS_DAY1 = 164166; // 102 miles in meters
const MIN_DISTANCE_RATIO = 0.88;
const MAX_DISTANCE_RATIO = 1.20;

const minAccepted = ROUTE_DISTANCE_METERS_DAY1 * MIN_DISTANCE_RATIO;
const maxAccepted = ROUTE_DISTANCE_METERS_DAY1 * MAX_DISTANCE_RATIO;

if (activity.distance < minAccepted || activity.distance > maxAccepted) {
  return { error: "distance_out_of_range", actual: activity.distance, expected: ROUTE_DISTANCE_METERS_DAY1 };
}
```

**Warning signs:**
- Distance validation uses a tight threshold like 95% or 98% — this will produce false rejections
- The route distance constant assumes GPS accuracy comparable to road cycling
- No provision for devices that lose lock mid-ride

**Severity:** LOW — riders who are falsely rejected can appeal to organizer; embarrassing but recoverable

**Phase to address:** Submission validation logic; document threshold rationale in a comment

---

### Scoring Pitfall 11: Negative Race Time or Race Time Exceeding Plausible Finish Window

**What goes wrong:**
Defensive coding requires handling impossible values:

- **Negative race time** (start_date_local is before gun time by more than the clamping threshold): use the floor-zero clamp from Pitfall 6.
- **Race time > 24 hours** (someone forgets to stop their GPS; elapsed_time is 86,400+ seconds): A 24+ hour elapsed time on a ~102-mile gravel ride is implausible. The submission should be rejected or flagged.
- **`raceTimeSeconds` is `NaN`**: possible if `start_date_local` is malformed or parsing fails.

**Prevention:**
```javascript
// After computing raceTimeSeconds:
if (!Number.isFinite(raceTimeSeconds) || raceTimeSeconds < 0) {
  return { error: "invalid_race_time" };
}

// Plausibility window: 0 to 16 hours (57,600 seconds) for a 102-mile gravel event
const MAX_PLAUSIBLE_RACE_TIME = 16 * 3600;
if (raceTimeSeconds > MAX_PLAUSIBLE_RACE_TIME) {
  return { error: "implausible_race_time", actual: raceTimeSeconds };
}
```

**Warning signs:**
- No `Number.isFinite` or `isNaN` check before storing race time
- No upper bound check on elapsed_time
- Tests do not include a case with `elapsed_time = 0` or `elapsed_time = 999999`

**Severity:** LOW — detectable in testing; does not affect real riders if validation is in place

**Phase to address:** Submission validation; include edge case tests

---

### Scoring Pitfall 12: Data Migration — `movingTimeSeconds` Rename or Schema Change

**What goes wrong:**
The question was asked about data migration from old format to new. Confirmed: there is no pre-existing athlete data (the event is June 2026; no real rides have happened). No data migration is needed.

However, a schema evolution risk exists going forward: if `raceTimeSeconds` is added as a required field but old athlete JSON files (created during development/testing with placeholder data) do not have it, the build-time loader will encounter `undefined` for `raceTimeSeconds`, and `Math.min(...[undefined, ...])` yields `NaN`.

**Prevention:**
Treat all new scoring fields as optional in `AthleteJson` with a sensible default during the transition period. When the scoring engine reads `raceTimeSeconds`, fall back to zero or exclude the rider from gun-time scoring if the field is absent:
```typescript
raceTimeSeconds: athlete.day1?.raceTimeSeconds ?? 0,
```
Document in `types.ts` which fields are "required for scoring" vs "optional fallback."

**Warning signs:**
- A new required field is added to `AthleteJson` without a default fallback in `athlete-loader.ts`
- Test JSON fixtures are not updated when the schema changes
- TypeScript type is updated but the Netlify function that writes JSON does not write the new field

**Severity:** LOW for production (no real data exists); MODERATE during development (breaks local build if test fixtures not updated)

**Phase to address:** Schema design, before athlete JSON writer in the Netlify function is modified

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Gun time constant definition | UTC vs. local confusion (Pitfall 2) | Define as `secondsSinceMidnightLocal = 8 * 3600`; add comment with UTC equivalent |
| `start_date_local` arithmetic | Z-suffix Date object trap (Pitfall 1) | Never pass to `new Date()`; slice and split digits only |
| `start_date_local` privacy | Midnight redaction for hidden start times (Pitfall 4) | Plausibility window check before computing race time |
| Scoring formula | `elapsed_time` vs `moving_time` for race duration (Pitfall 5) | Use `elapsed_time` as ride duration; `moving_time` only for weighted sub-score if kept |
| Early-start riders | Pre-gun offset yields race time advantage (Pitfall 6) | Clamp pre-gun offset at zero; document policy |
| Single-rider category | `Math.min` on empty/singleton produces `Infinity` or 100% (Pitfall 3) | Guard all `Math.min` calls; validate against `Infinity` and `NaN` |
| Distance validation threshold | Too-tight threshold causes false rejections (Pitfall 10) | Use 88%-120% window; GPS over-reads 5-15% on gravel/forest |
| Segment scoring | Decluttered or hidden segment efforts missing (Pitfall 8) | Pre-event segment health check; flag submissions with missing efforts |
| Schema changes | New field undefined in old test fixtures (Pitfall 12) | Always provide fallback in loader; update fixtures before marking task done |

---

## Quick Validation Checklist — Scoring Integrity

Before marking gun time scoring implementation complete:

- [ ] `start_date_local` is never passed to `new Date()` in any scoring code path
- [ ] Gun time is defined as seconds-since-midnight-local with a code comment stating the UTC equivalent (`"2026-06-06T12:00:00Z"`)
- [ ] Pre-gun start offset is clamped to zero (no negative race time advantage)
- [ ] Plausibility window rejects `start_date_local = T00:00:01Z` (hidden start time) before race time computation
- [ ] Race time uses `elapsed_time` as ride duration, not `moving_time`
- [ ] All `Math.min` calls on scoring arrays are guarded against empty arrays and checked for `Infinity`/`NaN`
- [ ] Distance validation threshold is documented with rationale; threshold is no tighter than 88%
- [ ] Scores are computed at render/build time from raw values; no computed scores are stored in athlete JSON
- [ ] Test fixtures cover: one rider (singleton), no riders (empty category), pre-gun start, midnight-redacted start time, elapsed_time > 16 hours

---

## Scoring Integrity Sources

- Strava API field behavior — `start_date_local` Z suffix (confirmed community discussion): https://groups.google.com/g/strava-api/c/vmJUsW-srdM/m/ac7MhfruCQAJ
- Strava API changelog — September 2024 (hidden start time redaction to midnight + 1s, hidden attribute on segment efforts): https://developers.strava.com/docs/changelog/
- Strava API — `elapsed_time` vs `moving_time` definitions: https://support.strava.com/hc/en-us/articles/115001188684-Moving-Time-Speed-and-Pace-Calculations
- Strava crop tool behavior (adjusts `start_date_local`, `elapsed_time`, `distance`): https://support.strava.com/hc/en-us/articles/216919437-Crop-Tool-for-Activities
- Strava 2024 segment declutter effects on API (empty array for decluttered segments): https://blog.veloviewer.com/effects-of-the-2024-strava-segment-declutter-in-veloviewer
- Michigan UP time zone (EDT = UTC-4 in June): https://www.timeanddate.com/time/zone/@12217946
- DST 2026 transition dates for Eastern Time: March 8, 2026 (spring forward) to November 1, 2026 (fall back)
- GPS distance accuracy on forest/gravel terrain (canopy error +30-42%, real-world over-reads 5-15%): https://support.strava.com/hc/en-us/articles/216919487-How-Distance-is-Calculated

---
*Scoring integrity pitfalls added: 2026-04-14*
