# Phase 10: Design Polish and Companion Links - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Full site design refresh — bold, graphic, poster-like visual language with light backgrounds — applied to all pages (landing, submit, confirm, error, leaderboard). Companion site links to Iron & Pine Omnium for submission/results. New logo (pine cone grenade + crossed iron axes) incorporated throughout.

**Expanded scope:** Phase 10 now includes a full site redesign, not just submission page polish. The landing page, leaderboard, and all new pages are refreshed to match the new direction.

</domain>

<decisions>
## Implementation Decisions

### Design direction
- **Bold and graphic** — high contrast, strong typography, poster-like layouts (race event brand, not nature site)
- **Light base** — white/light backgrounds with bold type and strong accent colors
- **Photography-forward** — big hero images with bold type overlays and strong graphic treatment
- **Reduce motion to essentials** — subtle page transitions only, no floating animated elements
- **Drop noise texture** — clean backgrounds, let typography and photography carry visual weight
- Reference brands: Filson (heritage authority), Fox Racing (bold accent punch), Danner (atmospheric photography)

### Typography
- Keep current fonts: Spectral (display) + Karla (sans body) + JetBrains Mono (labels)
- Use them more boldly — bigger sizes, tighter tracking, more weight contrast
- Dramatic scale hierarchy (reference brands use 56-140px display sizes)

### Color palette
- Keep the full existing palette (forest greens, ember orange, gold, rain blue)
- Adapt/invert to work on light backgrounds
- New logo is grayscale — sits naturally on both light and dark surfaces

### New logo
- File: `public/logo.svg` — pine cone grenade with two iron axes making an X
- Grayscale design (dark grays to light grays + white)
- Incorporate into site header/nav and as brand mark throughout

### Form styling (submit + confirm pages)
- **Split layout** — bold graphic/branding on one side, form on the other
- On mobile (375px), stacks: graphic panel (condensed) on top, form below
- Form input styling: Claude's discretion (pick what fits bold/graphic direction)

### Score preview placement
- Claude's discretion on whether score preview lives on graphic side or form side of split layout

### Leaderboard
- **Both landing page and dedicated page** — preview on landing page, full leaderboard at /leaderboard
- Landing page preview: **top 3 per category** in podium-style, links to full leaderboard
- Full leaderboard page carries forward all Phase 9 enhancements (search, mobile layout, per-component columns)

### Navigation
- **Add a proper nav bar** — fixed/sticky with logo, page links (Rides, Leaderboard, Submit Results)
- "Submit Results" CTA in the nav bar — always accessible

### Error state presentation
- **Contextual errors** — auth errors get their own page; validation errors (wrong date, wrong athlete, wrong URL) show inline on the submit page
- Inline validation errors: **bold and clear** — strong color block or banner at top of form, impossible to miss
- Auth error page: primary CTA = "Connect with Strava again" (retry), secondary = go home
- Auth error page layout: Claude's discretion

### Landing page CTA
- "Submit Results" label
- Placed **after event info sections** (riders learn about the event first, then submit)
- Also accessible via nav bar link at all times

### Claude's Discretion
- Form input styling (borderless vs bordered, specific UI patterns)
- Score preview placement within split layout
- Auth error page layout (split vs centered)
- Exact spacing, padding, responsive breakpoints
- How existing color palette maps to light backgrounds
- Leaderboard preview component design on landing page

</decisions>

<specifics>
## Specific Ideas

- "Pine cone grenade + crossed iron axes" — new logo in `public/logo.svg`, use as primary brand mark
- Reference brands: Filson's heritage authority, Fox Racing's bold accent color approach, Danner's atmospheric photography treatment
- Neutral base + strong accent colors = maximum impact (pattern from all three references)
- Condensed or expanded font weights for graphic punch, not just size variation
- Full-width horizontal divisions with generous spacing between sections (24-72px padding range from references)
- Heritage + forward momentum personality — respected authority pushing evolution

</specifics>

<deferred>
## Deferred Ideas

- **Companion site updates (mkUltraGravel + hiawathasRevenge)** — remove their Strava integrations and add links to Iron & Pine Omnium. Deferred because they are separate repos; handle when those projects are touched. Decision locked: remove + link (not redirect, not coexist).

</deferred>

---

*Phase: 10-design-polish-and-companion-links*
*Context gathered: 2026-04-08*
