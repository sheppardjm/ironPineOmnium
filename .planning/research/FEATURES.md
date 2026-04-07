# Feature Research

**Domain:** Gravel cycling event leaderboard with Strava OAuth integration
**Researched:** 2026-04-02
**Confidence:** MEDIUM — table stakes and differentiators are HIGH confidence from direct domain research; anti-features are MEDIUM based on pattern research and gravel event ecosystem analysis

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Tabbed leaderboard by category (men/women/non-binary) | All gravel events with multiple fields show separate standings; mixing categories is disqualifying UX | LOW | Already built — sample data only |
| Overall score + per-component breakdown visible in leaderboard | Athletes want to know *why* they ranked where they did, not just their final number | MEDIUM | Day 1 time, Day 2 sectors, KOM points as column groups |
| Athlete name search / jump-to | Race Roster data: "most visitors seek 1-2 specific people, not the full leaderboard" — search-first design beats browse-first | LOW | Client-side filter on name string is sufficient at 50-100 riders |
| Strava OAuth login before submission | Users expect "Sign in with Strava" as the auth pattern for anything cycling-related; manual token entry is a hard stop | MEDIUM | Three-legged OAuth2; scopes needed: `activity:read_all` |
| Activity URL → ID parsing + auto-fetch | Pasting a full Strava URL (`strava.com/activities/[id]`) and having the system extract the ID is the expected UX; making users find the numeric ID manually is friction | LOW | URL pattern: `https://www.strava.com/activities/{numeric_id}` — strip to ID, call `GET /activities/{id}` |
| Moving time displayed and used for Day 1 score | Fondo participants know their moving time is the metric; elapsed time would be seen as wrong/unfair | LOW | `moving_time` field from Strava `DetailedActivity` response |
| Submission confirmation / status feedback | Users need to know their data was received and scored; a silent POST is a UX failure | LOW | Success state with score preview, error state with clear message |
| Mobile-friendly leaderboard | Race Roster analytics: 97% of race-day traffic is mobile; leaderboard must be readable on a phone | LOW | Responsive table or card layout — current Astro site needs this validated |
| Clear "leaderboard uses real data now" signal | While sample data is live, there's a notice; once real data flows, that notice needs to disappear or update. Without this, riders won't trust the standings. | LOW | Toggle between sample/live state, visible to all |
| Non-binary category treated as full peer category | Gravel community expectation: NB is not an afterthought. Must have equal prominence to men/women tabs — same columns, same scoring, same treatment | LOW | Already architecturally in place; visual parity is the gap to verify |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-component score transparency with visual weight | Most small-event leaderboards show a single number. Showing "here's your Day 1 moving time / Day 2 sectors / KOM contribution" makes the weighted formula legible and builds trust in an unusual scoring system | MEDIUM | Column groups or expandable row — moving time, sector, and KOM scores alongside overall. Reduces "wait, how did I score lower if I rode faster?" confusion |
| Submission preview before commit | Show the athlete what score their activity would generate *before* they finalize submission. Catches wrong-activity errors and makes the scoring model feel trustworthy | MEDIUM | Fetch activity → compute score → show preview → confirm button |
| Inline scoring explanation anchored to submission | Contextually surfacing the scoring formula at the moment of submission ("your moving time of 4:12 gives you X in Day 2") rather than only on the landing page | LOW | Text/callout within submission flow, not a separate page |
| Sector-by-segment breakdown in expanded row | Grinduro participants care about individual segment times, not just total sector aggregate. Expanding a leaderboard row to show their Segment A / B / C / KOM breakdown differentiates from a flat time table | HIGH | Requires segment effort data from Strava API (`include_all_efforts=true`), segment ID matching to known course segments. Complex dependency on data pipeline. |
| "Did you also ride Day 2?" nudge for single-day submitters | If a rider submits Day 1 only, a friendly nudge surfaces when viewing the leaderboard. Increases data completeness without requiring organizer follow-up. | LOW | Simple state: submitted_day1 && !submitted_day2 → show inline prompt |
| Shareable result card / link | Riders share results. A clean `ironpineomnium.com/results/[rider-slug]` that renders nicely in Slack/iMessage previews gives the event organic reach | MEDIUM | OG meta tags + per-rider route. Depends on having persistent rider records. |
| Activity date validation with friendly error | The Strava activity must be from the correct event date. Detecting wrong-date submissions and explaining why (vs. a generic rejection) is a small UX win with high trust impact in a community event | LOW | Compare `start_date` to known event date windows before accepting |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems in this context.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Real-time / live leaderboard during the event | Feels dynamic and exciting; people imagine riders checking standings mid-ride | Event is self-supported gravel — riders are off-grid for 4-6 hours. "Live" leaderboard would update only when riders get home and submit, which makes real-time a performance cost with no real-time benefit. Adds WebSocket/polling complexity for zero gain. | Static leaderboard that refreshes on page load. Sufficient for a trust-based post-ride submission event. |
| Admin result editing UI | Organizers will want to correct errors | An editing UI takes significant build time. For 50-100 riders, direct database access or a simple CSV import is safer for v1. An editing UI creates audit and trust questions. | Organizer accesses data store directly for corrections in v1. Flag for v2 if needed. |
| Automatic Strava segment matching (no user submission) | "Just pull all riders who rode the segments automatically" | Strava segments are public, but pulling all athlete efforts from a segment requires knowing athlete IDs in advance, is rate-limited (200 req/15 min), and fails for athletes with privacy settings on segments. Does not work for a trust-based event with no pre-registration in the API. | OAuth + activity submission is the right model: rider authenticates, submits their own activity, system fetches with their token. |
| Points-based notification emails / push | Feels like engagement; riders want to be notified when standings change | At 50-100 riders, email infrastructure (SMTP setup, unsubscribe flow, deliverability) is disproportionate overhead. Riders check the site when they're curious. | Link to leaderboard in organizer's existing communication channels (group chat, event site). |
| Timing split overlays on a map | Looks impressive in screenshots | Strava API GPS traces are available but rendering route + split overlays requires mapping tile infrastructure, increases bundle size, and adds a complex dependency for a feature that doesn't help riders understand their *score*. Grinduro outsources to external timing platforms rather than building this. | Static route map image embedded in the event description page. |
| Open registration / self-sign-up to the omnium | Some riders will want to register via the leaderboard site | This is a separate event registration problem. Conflating submission with registration creates scope explosion and registration-vs-submission data integrity problems. | Keep registration in its existing channel (email, spreadsheet, whatever the organizer uses). The leaderboard site assumes riders are already registered. |
| Connecting to Strava Clubs or creating a Strava Event | Feels native to the platform | Strava's Club and Event APIs have separate access requirements and review processes. Strava's Activity Event Match (launched July 2025) handles matching activities to events, but this is Strava-side behavior the organizer does not control. Strava partner status adds unrelated overhead. | Use Strava solely for OAuth and activity data fetch. Do not build toward Strava Club/Event integration in v1. |

---

## Feature Dependencies

```
[Strava OAuth login]
    └──required by──> [Activity submission form]
                          └──required by──> [Activity URL parsing + ID extraction]
                                                └──required by──> [Strava API activity fetch]
                                                                      └──required by──> [Moving time extraction (Day 1)]
                                                                      └──required by──> [Segment effort extraction (Day 2)]
                                                                      └──required by──> [Activity date validation]
                                                                      └──required by──> [Submission preview]

[Scoring engine] ←──already built
    └──required by──> [Submission preview]
    └──required by──> [Leaderboard display]

[Persistent rider records]
    └──required by──> [Shareable result card / per-rider URL]
    └──required by──> [Did you ride Day 2? nudge]
    └──required by──> [Per-component score breakdown]

[Leaderboard display] ←──already built (sample data)
    └──enhanced by──> [Real data pipeline]
    └──enhanced by──> [Athlete name search]
    └──enhanced by──> [Per-component score columns]
    └──enhanced by──> [Sector-by-segment expanded row]  ← HIGH complexity, later
```

### Dependency Notes

- **Strava OAuth is the gate:** Every submission feature depends on OAuth working correctly. This must be built and tested before any other submission work starts.
- **Activity fetch depends on OAuth token:** The system fetches the activity using the athlete's own token, not an app-level token. This is both the correct trust model and avoids segment privacy issues.
- **Scoring engine is already independent:** The engine exists and is tested with sample data. It can be connected to real activity data without rebuilding.
- **Segment-level breakdown has a hard dependency on knowing Strava segment IDs for the course.** The grinduro timed sectors must be mapped to specific Strava segment IDs in advance. This is a data/research dependency, not just a code dependency.
- **Shareable result cards require persistent rider records.** If submissions are stored only in memory or a flat file with no stable rider key, per-rider URLs are fragile. Build persistent storage before attempting shareable links.

---

## MVP Definition

### Launch With (v1 — Strava submission milestone)

Minimum needed to replace sample data with real results and accept athlete submissions.

- [ ] Strava OAuth flow (sign in, receive token, store session) — *gate for everything*
- [ ] Activity submission form: paste URL, parse ID, fetch via API with athlete token
- [ ] Activity date validation (reject wrong-event-date submissions with clear message)
- [ ] Moving time extraction and hand-off to existing Day 1 scoring engine
- [ ] Sector/KOM data extraction and hand-off to existing Day 2 scoring engine
- [ ] Submission confirmation state (score preview + success message)
- [ ] Leaderboard flips from sample data to real data
- [ ] Athlete name search (client-side filter)
- [ ] Per-component score columns visible in leaderboard (Day 1 moving time / Day 2 sectors / KOM)
- [ ] Mobile-readable leaderboard validated

### Add After Validation (v1.x)

Add once core submission flow is working and real data is in.

- [ ] "Did you ride Day 2?" nudge for single-day submitters — *trigger: first real submissions arrive*
- [ ] Inline scoring explanation within submission flow — *trigger: rider confusion feedback*
- [ ] Shareable result card / per-rider URL — *trigger: riders ask "how do I share this?"*
- [ ] Activity date validation error messaging refinement — *trigger: first wrong-submission edge cases*

### Future Consideration (v2+)

Defer until post-event or second edition of the omnium.

- [ ] Sector-by-segment breakdown in expanded row — *high complexity, requires Strava segment ID mapping; only valuable if riders actually want this granularity*
- [ ] Admin result editing UI — *defer; handle corrections manually in v1*
- [ ] Multi-year results archive — *only relevant after the event runs a second time*

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Strava OAuth | HIGH | MEDIUM | P1 |
| Activity URL → fetch → score pipeline | HIGH | MEDIUM | P1 |
| Activity date validation | HIGH | LOW | P1 |
| Submission confirmation / preview | HIGH | LOW | P1 |
| Real data in leaderboard | HIGH | LOW (once pipeline exists) | P1 |
| Athlete name search | HIGH | LOW | P1 |
| Per-component score columns | MEDIUM | LOW | P1 |
| Mobile-readable leaderboard | HIGH | LOW | P1 |
| "Did you ride Day 2?" nudge | MEDIUM | LOW | P2 |
| Inline scoring explanation in submission | MEDIUM | LOW | P2 |
| Shareable result card / per-rider URL | MEDIUM | MEDIUM | P2 |
| Sector-by-segment expanded row | MEDIUM | HIGH | P3 |
| Admin result editing UI | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for submission milestone launch
- P2: Should have, add when submission flow is stable
- P3: Nice to have, future consideration

---

## Competitor / Reference Analysis

| Feature | Grinduro official site | Race Roster Results V3 | GravelRank | Our approach |
|---------|----------------------|------------------------|-----------|--------------|
| Results hosted natively | No — links to external timing platforms | Yes | Yes | Yes — own the data |
| Category tabs | Via external timing platform | Yes | Yes | Already built |
| Athlete search | Via external timing platform | Yes (search-first design) | Unknown | Build in v1 |
| Sector breakdown | Via external timing platform | N/A | N/A | Deferred to v2 |
| Strava integration | No | No | Partial | Core differentiator |
| Non-binary category | Yes (via external platform) | Configurable | No | Already in model |
| Per-component score | N/A (timing only) | N/A | No | Differentiator for v1 |
| Mobile-first | Via external platform | Yes (97% mobile traffic) | Unknown | Must validate |

---

## Strava API Constraints That Shape Feature Decisions

These are not features but hard constraints that affect what is buildable.

| Constraint | Impact |
|------------|--------|
| Rate limit: 200 req / 15 min, 2,000 / day (app-wide) | At 100 riders submitting 2 activities each = 200 API calls. Well within daily limit but must not batch-fetch on page load. Fetch on submission only. |
| Access tokens expire after 6 hours | Submission flow must use the token immediately after OAuth. Do not cache tokens for later re-use without refresh logic. |
| `activity:read_all` scope required | Without this scope, activities set to "Only Me" privacy return nothing. Riders must grant full activity read. This must be explained in the auth UI. |
| Segment efforts require `include_all_efforts=true` on `GET /activities/{id}` | Day 2 sector data lives in `segment_efforts[]`. This parameter must be set, or sector data is incomplete. |
| Activity ID is in the URL path | `https://www.strava.com/activities/15598376603` — extracting the trailing numeric ID is trivial and reliable. URL parsing is stable. |
| Strava segment privacy | If a rider has set segment visibility to "Only Me," segment effort data will not appear even with `activity:read_all`. This is an edge case to handle gracefully. |

---

## Sources

- Strava API OAuth documentation: https://developers.strava.com/docs/authentication/ (HIGH confidence — official docs)
- Strava API rate limits: https://developers.strava.com/docs/rate-limits/ (HIGH confidence — official docs)
- Strava API activity reference: https://developers.strava.com/docs/reference/ (HIGH confidence — official docs)
- Strava webhook events: https://developers.strava.com/docs/webhooks/ (HIGH confidence — official docs)
- Grinduro race results page: https://grinduro.com/get-stoked/race-results/ (MEDIUM confidence — direct observation)
- Grinduro Pennsylvania 2024 results: https://grinduro.com/pennsylvania-2024-results/ (MEDIUM confidence — direct observation)
- Race Roster Results V3 feature announcement: https://raceroster.com/major-releases/introducing-race-roster-results-v3 (MEDIUM confidence — official product announcement)
- GravelRank leaderboard: https://gravelrank.org/leaderboard/men (LOW confidence — observed features only)
- gravel-results.com ecosystem overview: https://www.gravel-results.com/ (LOW confidence — ecosystem signal)
- Gravel community non-binary category adoption: multiple event sites (MEDIUM confidence — corroborated across 3+ sources)
- Strava Activity Event Match: https://support.strava.com/hc/en-us/articles/38820095583629 (MEDIUM confidence — known to exist, page 403'd during fetch)

---

*Feature research for: Iron & Pine Omnium — gravel cycling event leaderboard with Strava integration*
*Researched: 2026-04-02*
