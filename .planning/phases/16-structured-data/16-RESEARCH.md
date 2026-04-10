# Phase 16: Structured Data - Research

**Researched:** 2026-04-09
**Domain:** JSON-LD / Schema.org / Astro head slot injection
**Confidence:** HIGH

---

## Summary

Phase 16 adds a `<script type="application/ld+json">` block to the homepage `<head>` so the Iron & Pine Omnium event is eligible for Google's rich result event cards. The schema type question is the only real decision: the phase spec says `SportsEvent`, but Google's official event rich-results documentation does not recognise `SportsEvent` as a supported type — it only recognises the generic `Event` type. Both are valid schema.org types and Google will read either, but only `Event` is explicitly documented as eligible for the event-card experience. The safest choice is `"@type": "Event"` with `sport` as an additional property, which keeps eligibility clear while still expressing the sporting nature of the event.

The Astro-side implementation is well-established: build a plain JS object in the component frontmatter, then render it with `set:html={JSON.stringify(schema)}` on a `<script type="application/ld+json">` tag. The BaseLayout already exposes a `<slot name="head" />` which is the correct injection point. No new libraries are needed.

Validation is straightforward: Google's Rich Results Test accepts a URL or HTML snippet and confirms event-card eligibility.

**Primary recommendation:** Use `"@type": "Event"` (not `SportsEvent`) for confirmed Google eligibility; add `"sport": "Cycling"` as a supplemental property. Inject via the existing `head` slot in BaseLayout using `set:html={JSON.stringify(schema)}`.

---

## Standard Stack

### Core

| Library / API | Version | Purpose | Why Standard |
|---|---|---|---|
| schema.org Event | — | Vocabulary for event structured data | Google's official supported type for event rich results |
| JSON-LD | — | Serialisation format | Google-recommended; easiest to implement and maintain in static sites |

### Supporting

| Tool | Version | Purpose | When to Use |
|---|---|---|---|
| Google Rich Results Test | — | Validate JSON-LD produces event card | Run after implementation, before deploy |
| schema.org validator | — | Check schema.org compliance | Optional secondary check |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| `"@type": "Event"` | `"@type": "SportsEvent"` | SportsEvent is a valid schema.org subtype and Google will read it, but it is NOT listed in Google's event rich-results eligibility documentation. Using `Event` is safer for confirmed card eligibility. |
| Inline in page | Dedicated component | Either works; a dedicated component is cleaner if other pages ever need JSON-LD |
| `set:html` | String interpolation | String interpolation produces HTML-escaped output (`&quot;` entities) that breaks JSON parsing; `set:html` is mandatory |

**Installation:** None required. No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure

The simplest correct approach for a single-page need:

```
src/pages/index.astro    ← JSON-LD object defined here, injected via head slot
```

An alternative if other pages may need structured data later:

```
src/components/
└── StructuredData.astro    ← reusable wrapper around set:html pattern
src/pages/
└── index.astro             ← passes schema object as prop
```

For this phase (homepage only, one-time requirement), defining the object directly in `index.astro` and injecting via the `head` slot is the correct scope.

### Pattern 1: Direct Injection via BaseLayout Head Slot

**What:** Define the schema object in the page frontmatter, render it into the existing `<slot name="head" />` in BaseLayout.

**When to use:** Single-page structured data needs. Simplest approach with no new files.

**Example:**
```astro
---
// index.astro frontmatter
const schema = {
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Iron & Pine Omnium",
  "startDate": "2026-06-06",
  "endDate": "2026-06-07",
  "description": "A two-day gravel weekend in Michigan's Upper Peninsula — Hiawatha's Revenge fondo on Saturday, MK Ultra Gravel grinduro on Sunday.",
  "sport": "Cycling",
  "eventStatus": "https://schema.org/EventScheduled",
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
};
---

<BaseLayout ...>
  <script type="application/ld+json" set:html={JSON.stringify(schema)} slot="head"></script>
  <!-- page body -->
</BaseLayout>
```

### Pattern 2: Dedicated Component (future-proofing only)

**What:** Move the schema object into a `StructuredData.astro` component with props.

**When to use:** Only if multiple pages will need structured data. Out of scope for Phase 16.

### Anti-Patterns to Avoid

- **String interpolation inside script body:** `<script type="application/ld+json">{"name": "{title}"}</script>` — produces `&quot;` HTML entities that break JSON. Use `set:html` always.
- **Curly-brace interpolation without set:html:** `<script type="application/ld+json">{JSON.stringify(schema)}</script>` — Astro renders curly-brace expressions as text nodes which get HTML-escaped. Requires `set:html` directive.
- **Using `SportsEvent` @type for Google eligibility:** Valid schema.org but not in Google's documented eligible types for event rich results cards.
- **Omitting timezone from startDate:** Google recommends including timezone offset in ISO-8601 dates for better user scheduling. For a June 2026 US event, Michigan is EDT = `-04:00`.
- **Putting location.address.streetAddress when there isn't one:** For a forest/route-based event, omit `streetAddress` rather than fabricating one. Locality + region + country is sufficient.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| HTML-safe JSON injection | Manual string escaping | `set:html={JSON.stringify(schema)}` | Astro's `set:html` directive handles this correctly; manual escaping is error-prone |
| Schema validation | Custom JSON checker | Google Rich Results Test | Official tool, checks actual eligibility not just syntax |

**Key insight:** The `set:html` directive is the one non-obvious Astro requirement. Without it, JSON content gets HTML-escaped and the block is silently invalid.

---

## Common Pitfalls

### Pitfall 1: Missing `set:html` — HTML Escaping Breaks JSON

**What goes wrong:** JSON inside a `<script>` tag without `set:html` gets HTML-escaped. Double quotes become `&quot;`, producing invalid JSON that parsers and validators reject. Google's crawler will silently ignore the block.

**Why it happens:** Astro escapes content inside elements by default for XSS safety. The `set:html` directive opts out of this escaping for the specific element.

**How to avoid:** Always use `set:html={JSON.stringify(schema)}` — never `{JSON.stringify(schema)}` as children.

**Warning signs:** Viewing page source shows `&quot;` inside the script tag. The Rich Results Test reports "no items detected."

### Pitfall 2: Using `SportsEvent` @type and Expecting Google Rich Results

**What goes wrong:** The schema is technically valid schema.org but Google's event rich-results eligibility documentation only lists `Event` as the supported type. Cards may not appear.

**Why it happens:** `SportsEvent` is a subtype of `Event` in schema.org taxonomy, which seems like it should work, but Google's rich-results implementation is not a full schema.org interpreter.

**How to avoid:** Use `"@type": "Event"` and add `"sport": "Cycling"` as a supplemental property. This satisfies both schema.org accuracy and Google eligibility.

**Warning signs:** Rich Results Test shows "Event" as detected type but may not show enhanced preview.

### Pitfall 3: Fabricated or Inaccurate Location Data

**What goes wrong:** Google's guidelines require that structured data represent information visible on the page. If a street address is invented or doesn't match the event's actual location, it violates Google's spam policies.

**Why it happens:** Developers fill in `streetAddress` to make the schema "look complete."

**How to avoid:** For a forest/route event without a fixed venue address, use only `addressLocality`, `addressRegion`, `addressCountry`. A `Place` with `name: "Hiawatha National Forest"` and partial address is valid and honest.

### Pitfall 4: startDate Without Timezone Offset

**What goes wrong:** Google recommends ISO-8601 dates with timezone offset for better calendar/scheduling rich results. A bare date like `"2026-06-06"` is accepted but gives Google less to work with.

**Why it happens:** Developers use date-only format since the event has no fixed start time.

**How to avoid:** For a multi-day gravel event with no specific start time, `"2026-06-06"` (date only) is acceptable and honest. Do not fabricate a time. Alternatively, `"2026-06-06T07:00:00-04:00"` if a real start time is known.

---

## Code Examples

Verified patterns from official sources and confirmed Astro community practice:

### Complete Homepage JSON-LD Block

```astro
---
// In index.astro frontmatter
const eventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Iron & Pine Omnium",
  "description": "A two-day gravel weekend in Michigan's Upper Peninsula — Hiawatha's Revenge fondo on Saturday, MK Ultra Gravel grinduro on Sunday. Submit your Strava activities for an overall result.",
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
};
---

<BaseLayout title="..." description="...">
  <script type="application/ld+json" set:html={JSON.stringify(eventSchema)} slot="head"></script>
  <!-- rest of page -->
</BaseLayout>
```

Source: Astro GitHub issue #3544 (confirmed pattern), multiple community blog posts, official Astro directives docs.

### Validation — Rich Results Test

URL: `https://search.google.com/test/rich-results`

Paste the production URL after deploy OR the raw HTML. Confirms:
- Event structured data is detected
- All required properties present
- Event is eligible for rich result card

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Microdata / RDFa in HTML | JSON-LD in `<head>` | 2014+ | JSON-LD is now Google's recommended format; decoupled from markup |
| `data-vocabulary.org` | schema.org | Deprecated 2020 | data-vocabulary.org markup no longer eligible for rich results |
| Online events in Event schema | Physical events only | June 2025 Google update | Google removed support for online-event properties; physical location now required |

**Deprecated/outdated:**
- `data-vocabulary.org` vocabulary: replaced by schema.org entirely
- Online event properties in Event schema: Google removed these in June 2025

---

## Open Questions

1. **Does `SportsEvent` actually produce Google event cards?**
   - What we know: `SportsEvent` is a valid schema.org subtype of `Event`. Google's documentation does not list it as a supported type. A Google Search Central Community thread raised this exact question but the page content was inaccessible for verification.
   - What's unclear: Whether Google's crawler treats `SportsEvent` as equivalent to `Event` for rich results purposes.
   - Recommendation: Use `"@type": "Event"` to eliminate the ambiguity. Add `"sport": "Cycling"` for semantic accuracy. This is low-risk and fully correct.

2. **Does Iron & Pine Omnium have a specific venue address?**
   - What we know: The event is held in Hiawatha National Forest, Upper Peninsula Michigan. The companion sites (hiawathasrevenge.com, mkultragravel.com) may have a specific start/finish location.
   - What's unclear: Whether there is a street address for the start line.
   - Recommendation: Use `Place name: "Hiawatha National Forest"` with `addressLocality: "Munising"` as a reasonable approximation. Do not fabricate a street address. If the planner knows the start-line location, add it.

3. **`startDate` time vs date-only**
   - What we know: Google recommends including time with timezone for better scheduling. The event page says "June 6–7, 2026" with no specific start time.
   - What's unclear: Whether a real start time is known or should be included.
   - Recommendation: Use date-only format (`"2026-06-06"`) which is valid ISO-8601 and honest. If a real start time is known, include it with `-04:00` offset (Michigan EDT).

---

## Sources

### Primary (HIGH confidence)

- Google Search Central — Event Structured Data: https://developers.google.com/search/docs/appearance/structured-data/event
- Google Search Central — Intro to Structured Data: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- schema.org/SportsEvent: https://schema.org/SportsEvent
- Astro GitHub Issue #3544 — script tag with application/ld+json: https://github.com/withastro/astro/issues/3544

### Secondary (MEDIUM confidence)

- Tim Eaton — Structured Data in Astro (confirmed set:html pattern, XSS note): https://timeaton.dev/posts/adding-structured-data-astro/
- Stephen Lunt — Astro structured data (confirmed head slot pattern): https://stephen-lunt.dev/blog/astro-structured-data/
- Emmanuel Gautier — Astro set:html injection: https://www.emmanuelgautier.com/blog/astro-script-tag-html-content

### Tertiary (LOW confidence)

- OMR Digital — June 2025 Google event structured data update: https://omrdigital.com/event-structured-data-update-june-2025-google-changes-what-you-need-to-know/ (page did not render body content, cited as supporting context only)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — JSON-LD + schema.org is definitively documented by Google; no library required
- Architecture pattern: HIGH — `set:html={JSON.stringify(schema)}` confirmed in Astro issue tracker and multiple community sources; head slot pattern confirmed in BaseLayout code
- SportsEvent vs Event: MEDIUM — Google docs do not mention SportsEvent; recommendation to use Event is well-supported but cannot confirm 100% that SportsEvent would fail
- Pitfalls: HIGH — HTML escaping issue confirmed in Astro issue tracker; location honesty from Google's spam policies

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (stable domain — JSON-LD spec and Astro directive API are not fast-moving)
