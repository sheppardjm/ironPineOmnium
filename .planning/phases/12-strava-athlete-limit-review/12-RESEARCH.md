# Phase 12: Strava Athlete Limit Review - Research

**Researched:** 2026-04-08
**Domain:** Strava Developer Program review process (manual submission, no code)
**Confidence:** MEDIUM — Strava's form fields are dynamically loaded (cannot be scraped directly); field names inferred from community reports and official rate-limits doc guidance. All findings cross-referenced with multiple sources.

---

## Summary

This phase is a manual submission task, not a code change. The app is in Single Player Mode (athlete limit = 1). Submitting the HubSpot form at `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8` initiates the review process. Strava's official documentation says approval typically takes 7-10 business days; community reports range from 1 week to 6+ weeks. With the event on June 6 and submission today (April 8), there is approximately 40 business days of buffer — ample if submitted now.

The form asks for: app description, use case, expected athlete count, and screenshots of all places Strava data appears in the app (including the "Connect with Strava" button). Approval is not guaranteed — Strava evaluates privacy compliance, webhook usage, brand guideline adherence, and rate limit management. The app passes all of these (webhook registered, deauth deletes athlete data, no raw Strava fields displayed publicly).

**Primary recommendation:** Submit today with privacy-first framing, explicit webhook mention, and screenshots of the full live flow (auth → submit → confirm → leaderboard). The draft in `01-02-PLAN.md` has the right structure but needs the day-mapping correction and updated framing per the CONTEXT.md decisions.

---

## Standard Stack

This phase has no code stack. The "stack" is the submission process itself.

### Submission Requirements (MEDIUM confidence)

| Requirement | Source | Notes |
|-------------|--------|-------|
| HubSpot form | Official rate-limits doc | `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8` |
| App description | Official rate-limits doc | What the app does, who it's for, how Strava data is used |
| Use case | Community reports | Annual/recurring vs. one-off; how riders use the app |
| Expected athlete count | Community reports | Under 50 for this event |
| Screenshots of all Strava data touchpoints | Official rate-limits doc (explicit) | "Include screenshots of all places Strava data is shown" |
| Screenshot of "Connect with Strava" button | Official rate-limits doc (explicit) | Must be shown in the submission |
| Privacy policy link | Community reports (some developers included it) | Not formally required but strongly recommended |

### What Strava Evaluates (MEDIUM confidence, from official developer program doc)

- Privacy compliance — athlete data handling
- API Agreement adherence
- Brand guideline compliance (logo usage, "Connect with Strava" button, no "Strava" in app name)
- Rate limit management (especially webhook usage)
- Truthful representation of the app

---

## Architecture Patterns

Not applicable — no code architecture involved.

### Process Flow

```
1. Seed test submission → leaderboard shows live scored data
2. Walk through live flow on ironpineomnium.com (auth → submit → confirm → leaderboard)
3. Capture screenshots at each step
4. Fill HubSpot form with app description, use case, athlete count, screenshots
5. Submit → note date in STATE.md
6. Wait 7-10 business days (follow up at developers@strava.com if no response by ~April 22)
```

### Screenshot Checklist (what Strava explicitly asks for)

Screenshots must cover every place Strava data is visible in the app:

1. **Home page** — Submit Results CTA (shows app intent to connect with Strava)
2. **`/submit` page** — "Connect with Strava" OAuth entry point (`/api/strava-auth` link renders as a button; the error page has "Connect with Strava Again" explicitly)
3. **`/submit-confirm` page** — Score preview showing Strava-derived data: moving time (Day 1), sector times (Day 2), KOM count (Day 2), athlete name from Strava
4. **`/leaderboard` page** — Final leaderboard showing computed scores (not raw Strava fields — this is the privacy-compliance proof)
5. **Leaderboard with live seeded data** — Must show actual scored results, not "Awaiting submissions" empty state; seed a test submission first

### App Description Framing (Claude's Discretion per CONTEXT.md)

Key framing choices based on what Strava evaluates:

- **Lead with privacy**: No raw Strava data displayed publicly — only computed point scores and rider-chosen display names appear on the leaderboard. Activity data is used for scoring only and discarded after processing.
- **Mention webhook**: Deauth webhook registered at `/api/strava-webhook` deletes athlete JSON file on deauthorization. This is a positive signal for Strava — they reward webhook usage.
- **Be specific about data use**: `activity:read_all` scope used to access moving time and segment efforts for scoring. No profile data shown publicly.
- **Correct day mapping**: Day 1 (Saturday June 6) = Hiawatha's Revenge fondo (moving time scoring). Day 2 (Sunday June 7) = MK Ultra Gravel grinduro (sector times + KOM scoring). The old `01-02-PLAN.md` draft has these backwards — fix this.
- **Annual recurring event**: Positions the app as ongoing rather than one-off, which aligns better with Strava's developer program intent.
- **Do not mention companion sites**: MK Ultra Gravel and Hiawatha's Revenge are removing their Strava integrations — do not reference them.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tracking submission date | Custom reminder system | Record in STATE.md only | Simple, already-established pattern for this project |
| Follow-up timing | Calendar alert | Add explicit note in PLAN.md | 7-10 business days = follow-up by ~April 22 |

---

## Common Pitfalls

### Pitfall 1: Day Mapping Backwards in Draft
**What goes wrong:** The existing `01-02-PLAN.md` draft describes Day 1 as MK Ultra Gravel and Day 2 as Hiawatha's Revenge — the reverse of reality.
**Why it happens:** Early planning had the days mixed up before the correction was locked in.
**How to avoid:** The PLAN.md for this phase must use the corrected mapping: Day 1 (June 6) = Hiawatha's Revenge fondo, Day 2 (June 7) = MK Ultra Gravel grinduro.
**Warning signs:** Any mention of "MK Ultra" and "Day 1" together in the same sentence is wrong.

### Pitfall 2: Leaderboard Screenshot Shows Empty State
**What goes wrong:** Submitting screenshots with the "Awaiting submissions" empty leaderboard undermines the case that the app is functional.
**Why it happens:** No test data seeded before taking screenshots.
**How to avoid:** Seed at least one test submission before the screenshot walkthrough so the leaderboard shows scored, tabbed results.
**Warning signs:** Leaderboard shows amber "Awaiting submissions" badge — seed first.

### Pitfall 3: Missing "Connect with Strava" Screenshot
**What goes wrong:** Strava's official docs explicitly say to include a screenshot of the "Connect with Strava" button. Omitting it is a known rejection/delay trigger.
**Why it happens:** The button on the submit page is not labeled exactly "Connect with Strava" — it's the OAuth entry point at `/api/strava-auth`. The error page at `/error.astro` has the explicit text "Connect with Strava Again". The submit page shows the button as an implicit entry (no button labeled "Connect with Strava" on the page itself — OAuth is initiated from the landing page or submit page).
**How to avoid:** Screenshot the OAuth entry point (wherever `/api/strava-auth` is the href). The `/submit` page or wherever the rider first clicks to authenticate covers this requirement.
**Warning signs:** If the submission doesn't include a screenshot showing an OAuth entry point, add one.

### Pitfall 4: Approval Takes Longer Than 10 Business Days
**What goes wrong:** Community reports show reviews sometimes taking 30+ days, not the stated 7-10.
**Why it happens:** Strava review queue volume; may require follow-up.
**How to avoid:** Note the submission date in STATE.md. If no response by April 22 (10 business days from April 8), follow up at developers@strava.com with: submission date, Client ID, and brief app summary.
**Warning signs:** April 22 arrives with no Strava response.

### Pitfall 5: Privacy Policy Not Linked
**What goes wrong:** Some developers report that including a privacy policy URL accelerates review. The site doesn't currently have a `/privacy` page.
**Why it happens:** The form may ask for a privacy policy link; if one doesn't exist, the app must explain data handling in the use case text instead.
**How to avoid:** Address this in the use case description — explain data handling explicitly (what is stored, when it is deleted) since there is no standalone privacy policy page. This is acceptable per community reports.
**Warning signs:** If the form has a required privacy policy field (not confirmed — form is dynamically loaded), the user may need to create a minimal privacy page.

---

## Code Examples

Not applicable — this phase has no code.

### Submission Template (corrected from 01-02-PLAN.md)

**App Name:** Iron & Pine Omnium

**App Description:**
Iron & Pine Omnium is a two-day gravel cycling omnium leaderboard for an annual event in Michigan's Upper Peninsula. Riders authenticate with Strava to submit their activity from each day — Day 1 (Saturday June 6) is the Hiawatha's Revenge fondo scored on moving time, and Day 2 (Sunday June 7) is the MK Ultra Gravel grinduro scored on timed sectors and KOM segment efforts. The app fetches moving time and segment effort data from submitted activities to compute weighted scores, then displays a combined leaderboard across men's, women's, and non-binary categories.

Privacy: No raw Strava data is displayed publicly. Only computed point scores and rider-chosen display names appear on the leaderboard. Activity data is used for scoring only. A deauthorization webhook is registered — when a rider deauthorizes the app, their athlete JSON file is deleted immediately. The app uses `activity:read_all` scope to access moving time and segment efforts; no profile data is shown publicly.

**Use Case:**
Annual recurring event (June 2026 and beyond). Riders submit their own activities after completing each day's ride. Each rider authenticates once and submits up to two activities — one per day. The app does not display Strava profile information, raw activity data, or segment leaderboards publicly. Expected athlete count: under 50 (small community gravel event).

**Expected Athletes:** Under 50

**Screenshots (ordered):**
1. Home page showing "Submit Results" CTA (shows app intent)
2. Submit page with activity URL input and Strava OAuth entry point
3. Submit-confirm page showing score preview with Strava-derived data (moving time, sector times, KOM count, athlete name)
4. Leaderboard page showing live scored results with computed points (proves no raw Strava data displayed)

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| 01-02-PLAN.md draft (day mapping wrong) | Phase 12 PLAN.md (corrected mapping) | Day 1 = Hiawatha's Revenge, Day 2 = MK Ultra |
| Submit after UI built (deferred) | Submit today April 8 (maximum buffer) | ~40 business days before June 6 |

---

## Open Questions

1. **HubSpot form fields (exact)**
   - What we know: App description, use case, expected athlete count, and screenshots are required. Privacy policy link is mentioned in community reports but not confirmed required.
   - What's unclear: The form is dynamically loaded JavaScript — exact field list, required vs. optional status, and file upload specs could not be scraped. The user will see the actual fields when they open the form.
   - Recommendation: Plan should instruct the user to complete all form fields visible, including any privacy policy field (use the site URL + describe data handling in use case text if no dedicated privacy page).

2. **Privacy policy requirement**
   - What we know: Some community members included a privacy policy link; official docs don't explicitly require one.
   - What's unclear: Whether it's a required form field or optional.
   - Recommendation: If the form asks for a privacy policy URL, use the main site URL (ironpineomnium.com) and note that data handling is described in the use case text. No code change needed for this phase — if Strava requires a privacy page, that would be a separate follow-up task.

3. **Client ID to reference**
   - What we know: Community reports show users referencing their Client ID in follow-up emails.
   - What's unclear: Whether it's a field on the initial form.
   - Recommendation: Have the Strava dashboard open when filling out the form so the Client ID is available if needed.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/docs/rate-limits/` — Official rate limits page with the HubSpot form link; explicitly states screenshots of all Strava data touchpoints and "Connect with Strava" button are required
- `https://developers.strava.com/guidelines/` — Official brand guidelines confirming required "Connect with Strava" OAuth button and brand compliance requirements

### Secondary (MEDIUM confidence)
- `https://communityhub.strava.com/developers-knowledge-base-14/our-developer-program-3203` — Official developer program page; confirms 7-10 business day timeline and review criteria (privacy, API agreement, brand guidelines, webhooks)
- `https://communityhub.strava.com/developers-api-7/athlete-limits-8200` — Community thread; confirms webhook usage as approval factor; "not guaranteed if not leveraging webhooks"
- `https://communityhub.strava.com/developers-api-7/after-completing-a-form-of-increasing-number-of-athletes-7876` — Community thread; confirms webhook implementation positively influences approval

### Tertiary (LOW confidence)
- `https://communityhub.strava.com/developers-api-7/request-to-increase-athlete-limit-8331` — Community frustration threads; range of actual timelines (1 week to 6+ months)
- `https://www.dcrainmaker.com/2023/04/expands-developer-program.html` — DC Rainmaker analysis; notes some developers saw rate limits reduced after submission (not expected risk at under-50 scale)

---

## Metadata

**Confidence breakdown:**
- Submission process (form URL, required screenshot types): HIGH — explicitly documented on rate-limits page
- Form fields (exact names, required/optional): LOW — form is dynamically loaded JavaScript, cannot be scraped; inferred from official doc guidance + community reports
- Review timeline (7-10 business days): MEDIUM — official claim; community shows this is optimistic, 2-4 weeks more realistic
- Approval factors (webhooks, privacy, brand): MEDIUM — official developer program doc + community corroboration
- Day mapping correction: HIGH — locked decision in CONTEXT.md, confirmed in PROJECT.md

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (form structure is stable; Strava rarely changes submission process)
