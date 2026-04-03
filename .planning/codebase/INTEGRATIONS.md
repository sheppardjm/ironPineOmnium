# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**Google Fonts:**
- Service: Google Fonts API
  - SDK/Client: Web Font Loader (loaded via HTML `<link>` tags in `src/layouts/BaseLayout.astro`)
  - Integration: HTTP requests for font files from `https://fonts.googleapis.com` and `https://fonts.gstatic.com`
  - Fonts loaded:
    - Cormorant Garamond (display font)
    - Sora (sans-serif font)
  - Configuration: Declared in `astro.config.mjs` with font provider and weights

**Google Font Preconnect:**
- Pre-DNS lookup and TLS connection to `https://fonts.googleapis.com` and `https://fonts.gstatic.com` in BaseLayout

## Data Storage

**Databases:**
- Not applicable - No database integration detected

**File Storage:**
- Local filesystem only
  - Static images: `/public/images/` directory
  - Built assets: `dist/` directory (generated on build)

**Caching:**
- None detected - Static site generation handles caching via HTTP headers

## Authentication & Identity

**Auth Provider:**
- None - Public static site, no user authentication required

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console logging via vanilla JavaScript in client-side scripts (e.g., in Leaderboard.astro `<script>` tag)

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase; static hosting (Netlify, Vercel, GitHub Pages, or equivalent)

**CI Pipeline:**
- Not detected - No CI configuration files found

**Build Output:**
- `dist/` directory contains static HTML, CSS, and JavaScript

## Environment Configuration

**Required env vars:**
- None - No environment variables required for this static site

**Secrets location:**
- Not applicable

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Cross-Site References

**Internal Links:**
- Local file:// protocol links to companion event sites:
  - `file:///Users/Sheppardjm/Repos/mkUltraGravel/dist/index.html` (MK Ultra Gravel event)
  - `file:///Users/Sheppardjm/Repos/hiawathasRevenge/dist/index.html` (Hiawatha's Revenge event)
  - These are hardcoded local file paths; would need modification for production deployment

---

*Integration audit: 2026-04-02*
