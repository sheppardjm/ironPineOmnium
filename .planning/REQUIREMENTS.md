# Requirements: v1.1 SEO & Social Sharing

## Milestone Goal

Ensure all shared links and search results display the event logo, proper descriptions, and branded previews. Submit to gravel event directories for discovery.

## Requirements

### Social Sharing

- [x] **SOCIAL-01**: All pages render Open Graph meta tags (og:title, og:description, og:image, og:url, og:type) with a single branded 1200x630 OG image
- [x] **SOCIAL-02**: All pages render Twitter Card meta tags (twitter:card=summary_large_image, twitter:title, twitter:description, twitter:image) for full-width social previews
- [ ] **SOCIAL-03**: A branded OG image (1200x630px) combining event logo and name exists in public/ and is referenced by all OG/Twitter tags

### Search Optimization

- [x] **SEO-01**: Each page has a unique, descriptive `<title>` tag reflecting its content
- [x] **SEO-02**: Each page has a unique `<meta name="description">` summarizing its purpose
- [ ] **SEO-03**: `site` URL is configured in astro.config.mjs and all pages render `<link rel="canonical">` with absolute URLs
- [ ] **SEO-04**: sitemap.xml is auto-generated via @astrojs/sitemap and linked in robots.txt
- [ ] **SEO-05**: robots.txt exists with sitemap reference and appropriate crawl directives
- [x] **SEO-06**: /submit-confirm carries a `noindex` meta tag to prevent indexing of transient URLs

### Site Identity

- [ ] **IDENT-01**: favicon.ico (32x32) exists in public/ and is linked in all pages
- [ ] **IDENT-02**: apple-touch-icon.png (180x180) exists in public/ and is linked in all pages
- [ ] **IDENT-03**: Web app manifest (site.webmanifest) with event name, theme color, and icon references

### Structured Data

- [x] **SCHEMA-01**: Homepage renders SportsEvent JSON-LD with name, startDate, endDate, location, and description for Google event rich results

### QA & Validation

- [x] **QA-01**: OG tags verified with Facebook Sharing Debugger showing correct image, title, and description
- [x] **QA-02**: Twitter Card verified with X Card Validator showing summary_large_image preview
- [x] **QA-03**: SportsEvent JSON-LD passes Google Rich Results Test
- [x] **QA-04**: sitemap.xml is accessible and contains all indexable pages

### Directory Submissions

- [ ] **DIR-01**: Event submitted to gravelevents.com
- [ ] **DIR-02**: Event submitted to gravelcalendar.com
- [ ] **DIR-03**: Event submitted to granfondoguide.com

## Out of Scope

- **Social sharing buttons** — Meta shut down external Facebook buttons (Feb 2026), X buttons harm Core Web Vitals, <0.2% engagement rate
- **Per-page OG images** — marginal value for a 5-page site; one branded image is sufficient
- **Dynamic rider share cards** — disproportionate complexity (Satori/Sharp + Netlify compatibility issues) for v1.1
- **SEO for companion sites** — mkUltraGravel and hiawathasRevenge are separate repos

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEO-03 | Phase 13 — Config and Prerequisites | Complete |
| SEO-04 | Phase 13 — Config and Prerequisites | Complete |
| SEO-05 | Phase 13 — Config and Prerequisites | Complete |
| SOCIAL-03 | Phase 14 — Asset Creation | Complete |
| IDENT-01 | Phase 14 — Asset Creation | Complete |
| IDENT-02 | Phase 14 — Asset Creation | Complete |
| IDENT-03 | Phase 14 — Asset Creation | Complete |
| SOCIAL-01 | Phase 15 — BaseLayout Extension and Page Metadata | Complete |
| SOCIAL-02 | Phase 15 — BaseLayout Extension and Page Metadata | Complete |
| SEO-01 | Phase 15 — BaseLayout Extension and Page Metadata | Complete |
| SEO-02 | Phase 15 — BaseLayout Extension and Page Metadata | Complete |
| SEO-06 | Phase 15 — BaseLayout Extension and Page Metadata | Complete |
| SCHEMA-01 | Phase 16 — Structured Data | Complete |
| QA-01 | Phase 17 — QA and Validation | Complete |
| QA-02 | Phase 17 — QA and Validation | Complete |
| QA-03 | Phase 17 — QA and Validation | Complete |
| QA-04 | Phase 17 — QA and Validation | Complete |
| DIR-01 | Phase 18 — Directory Submissions | Pending |
| DIR-02 | Phase 18 — Directory Submissions | Pending |
| DIR-03 | Phase 18 — Directory Submissions | Pending |
