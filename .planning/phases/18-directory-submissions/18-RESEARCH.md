# Phase 18: Directory Submissions - Research

**Researched:** 2026-04-10
**Domain:** Gravel event discovery directories — manual external submissions
**Confidence:** MEDIUM (submission forms verified via WebFetch; approval timelines estimated)

---

## Summary

This is a non-code phase. The user manually submits Iron & Pine Omnium to three gravel event discovery platforms. All three platforms accept free event listings from organizers; none require payment for a basic listing.

The platforms differ significantly in submission mechanism. **gravelevents.com** has the most structured self-serve form with account creation. **granfondoguide.com** operates a Marketing Dashboard portal at a separate subdomain (db.granfondoguide.com) where submissions are reviewed by a coordinator before publication. **gravelcalendar.com** is a Bubble.io no-code app — its submission interface could not be rendered via WebFetch; the submission path likely requires logging in through the live rendered site.

The event is not yet listed on any of these platforms. Submitting before the event date (June 6–7, 2026) is necessary for discovery; submitting 4–8 weeks out is recommended to allow for review and indexing.

**Primary recommendation:** Submit to gravelevents.com and granfondoguide.com first (both have confirmed self-serve portals), then tackle gravelcalendar.com through its live rendered interface.

---

## Event Details Reference

The submission-ready fact sheet for all three platforms:

| Field | Value |
|-------|-------|
| Event name | Iron & Pine Omnium |
| Start date | June 6, 2026 |
| End date | June 7, 2026 |
| Location (city) | Munising, MI |
| Location (venue/region) | Hiawatha National Forest, Upper Peninsula, Michigan |
| Website URL | https://ironpineomnium.com |
| Event type | Gravel event (two-day omnium) |
| Day 1 | Hiawatha's Revenge — 102-mile fondo, moving time scored |
| Day 2 | MK Ultra Gravel — 100-mile grinduro, timed sectors + KOM |
| Description (short) | A two-day gravel weekend in Michigan's Upper Peninsula — Hiawatha's Revenge fondo on Saturday, MK Ultra Gravel grinduro on Sunday. Submit your Strava activities for an overall result. |
| Terrain | Hardpack, loose rock, forest roads in Hiawatha National Forest |
| Cost | Not specified on site (check registration link if required by form) |
| Contact email | (organizer's email — needed for form submissions) |
| Organizer name | (organizer's name — needed for form submissions) |

---

## Platform 1: gravelevents.com

**URL:** https://gravelevents.com
**Submission URL:** https://gravelevents.com/add-event/
**Confidence:** HIGH (form fields verified via WebFetch)

### Submission Mechanism
Self-serve web form. Account creation required (social login available: Facebook, Google, Twitter, LinkedIn). Listing is free.

### Required Fields (verified)
- Organizer name and email address
- Event title
- Event category → select **Gravel Event**
- Start date and time
- End date and time
- Description (must be in English)
- Location (city or specific address)
- Link to event (URL)

### Optional Fields
- Registration deadline
- Featured image (event logo recommended)
- Image gallery (up to 5 images)

### Post-Submission
No explicit review timeline stated on the form page. Support contact is info@gravelevents.com if issues arise.

### Notes
- Based in Denmark; worldwide platform
- Free for all organizers ("made by riders, for riders")
- Prominent "List your event" in main navigation — clearly designed for organizer self-service

---

## Platform 2: granfondoguide.com

**URL:** https://www.granfondoguide.com
**Submission URL:** https://www.db.granfondoguide.com/eventadd.aspx
**Dashboard entry:** https://db.granfondoguide.com/audience/about.aspx
**Confidence:** HIGH (form fields verified via WebFetch on the actual form page)

### Submission Mechanism
Marketing Dashboard portal at db.granfondoguide.com. Account creation required. Basic listing is **free**. Optional premium upgrade available for $100 USD (adds homepage placement + weekly social media promotion — skip this for now).

### Fields on Form (verified)
The form is comprehensive. Key fields:

**Organizer contact:**
- Name, email, telephone, alternative email, newsletter subscription

**Event basics:**
- Title, start location, start address, start date, end date
- Website address, registration page URL, registration opens date
- Entry limit, status

**Routes:**
- Route distances in miles, comma-separated (e.g., "100, 102")

**Social media:**
- Facebook, Instagram, Twitter, YouTube, Strava Group URLs

**Content:**
- Photo with caption, branding icon/logo
- Event summary, itinerary, registration fees, what's included
- Packet pickup details
- Feature checkboxes (timing, aid stations, safety measures, etc.)

### Post-Submission (verified)
After submitting, the form displays: "We have received your NEW event details. NEW events are first reviewed by our events coordinator before being published. You will receive an email when your NEW event has been published by our events coordinator."

This means there is a review step — allow extra lead time.

### Contact
- Email: granfondoguide@yahoo.com
- Marketing: marketing@granfondoguide.com

### Notes
- Site covers gran fondos, gravel fondos, and mass-participation rides globally
- Michigan Gravel Race Series is already listed, confirming Midwest gravel coverage
- "Dirty 30 Gravel Grinder" in Saranac, MI is an example of a comparable listing
- Routes field: enter "100, 102" for the two-day distances

---

## Platform 3: gravelcalendar.com

**URL:** https://www.gravelcalendar.com
**Confidence:** LOW (site is a Bubble.io app; WebFetch cannot render the interactive UI)

### Submission Mechanism
Built on Bubble.io (a no-code platform). The site's JavaScript was successfully fetched but the rendered UI — including any submission form or login portal — was not visible through WebFetch. The site is confirmed to accept submissions (tagline: "Add your event today!") but the exact submission path must be discovered by visiting the live site in a browser.

### What is Known
- gravelcalendar.com is the "premiere source for gravel rides, races, and events throughout the world"
- An About Us page exists at /aboutus (confirms active site)
- Events have dedicated pages (e.g., /event/rough-road-100-...)
- A shop page exists at /shop — this is a real, actively maintained site
- The site uses Google Analytics and has a Gravel Calendar Twitter/X presence (@GravelCalendar)
- A Facebook page exists at facebook.com/gravelcalendar

### Action Required
The user must visit https://www.gravelcalendar.com in a browser and look for:
1. A "Login" or "Sign Up" button (likely in header/nav)
2. After logging in: an "Add event" or "Submit event" option in their dashboard
3. If no self-serve option is evident: contact via their Facebook page or Twitter @GravelCalendar

### Likely Fields (inferred from existing listings)
Based on event listing pages found:
- Event name
- Date
- Location (city, state)
- Event website URL
- Logo or image

---

## Common Pitfalls

### Pitfall 1: Incomplete description
**What goes wrong:** Submitting a generic one-liner for the description when directories show it prominently.
**How to avoid:** Use the full description from the site: "A two-day gravel weekend in Michigan's Upper Peninsula — Hiawatha's Revenge fondo on Saturday, MK Ultra Gravel grinduro on Sunday. Submit your Strava activities for an overall result."

### Pitfall 2: Wrong location data
**What goes wrong:** Entering just "Upper Peninsula" without a city — some forms require a specific city/address.
**How to avoid:** Use "Munising, MI" as the city and "Hiawatha National Forest" as the venue name. State: Michigan (MI).

### Pitfall 3: gravelcalendar.com invisible submission UI
**What goes wrong:** Trying to submit by reading page source — Bubble.io apps don't expose their UI to WebFetch scrapers.
**How to avoid:** Open the site in a real browser; the login and submit controls are rendered by JavaScript and only visible interactively.

### Pitfall 4: Missing event image
**What goes wrong:** Submitting without a logo or cover image, resulting in a plain-text listing that gets less visibility.
**How to avoid:** Use the og-image.png (confirmed live at https://ironpineomnium.com/og-image.png) as the event image/logo for all three submissions.

### Pitfall 5: granfondoguide.com review delay
**What goes wrong:** Submitting too close to the event date and not appearing in time for discovery.
**How to avoid:** granfondoguide.com has an explicit coordinator review step before publication. Submit as early as possible. Confirm receipt email; follow up at granfondoguide@yahoo.com if no confirmation within a week.

---

## Submission Checklist

Have this information ready before starting any submission:

- [ ] Organizer name (full name)
- [ ] Organizer email address (will receive confirmation)
- [ ] Event name: Iron & Pine Omnium
- [ ] Start date: June 6, 2026
- [ ] End date: June 7, 2026
- [ ] City: Munising
- [ ] State: Michigan (MI)
- [ ] Venue: Hiawatha National Forest
- [ ] Website URL: https://ironpineomnium.com
- [ ] Event image URL: https://ironpineomnium.com/og-image.png (or download and upload)
- [ ] Short description (ready to paste)
- [ ] Route distances: 100, 102 miles
- [ ] Event category: Gravel Event / Gravel Fondo / Gravel Grinder (platform-dependent)

---

## Sources

### Primary (HIGH confidence)
- https://gravelevents.com/add-event/ — Form fields verified via WebFetch
- https://www.db.granfondoguide.com/eventadd.aspx — Form fields verified via WebFetch, post-submission confirmation message captured
- https://www.granfondoguide.com/Contents/Index/3426/feature-your-event-on-gran-fondo-guide — Free vs. paid listing confirmed

### Secondary (MEDIUM confidence)
- https://gravelevents.com/about-us/ — Platform overview, Denmark-based, free for organizers
- https://www.granfondoguide.com/ — granfondoguide@yahoo.com and marketing@granfondoguide.com contacts verified

### Tertiary (LOW confidence)
- WebSearch: gravelcalendar.com confirmed to accept event submissions; UI not inspectable via WebFetch
- https://www.gravelcalendar.com/aboutus — "Add your event today!" confirmed; no form fields visible
- https://x.com/gravelcalendar — Social contact channel as fallback

---

## Metadata

**Confidence breakdown:**
- gravelevents.com submission process: HIGH — form fields and mechanism confirmed
- granfondoguide.com submission process: HIGH — full form field list and review flow confirmed
- gravelcalendar.com submission process: LOW — site confirmed active, submission UI not renderable

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (sites may update submission forms; verify before acting)
