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
