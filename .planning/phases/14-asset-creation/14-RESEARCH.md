# Phase 14: Asset Creation - Research

**Researched:** 2026-04-09
**Domain:** Static asset creation — OG image design, favicon generation, web app manifest
**Confidence:** HIGH (favicon/manifest), MEDIUM (OG image creation workflow)

---

## Summary

Phase 14 has three deliverables: a branded OG image (1200x630 PNG), a favicon set (favicon.ico 32x32 + apple-touch-icon.png 180x180), and a site.webmanifest. The favicon/manifest work is straightforward and well-understood. The OG image is the highest-effort item because it requires design work, not just tooling configuration.

The decision log rules out Satori/Sharp for OG image generation due to documented Netlify friction. The correct path is to design the image manually and commit it as a static asset. For favicon generation, ImageMagick 7.1.1 is already installed on this machine and can convert the existing SVG logo to the required PNG sizes and ICO format via a short script. The web app manifest is a static JSON file with no dependencies.

**Primary recommendation:** Design the OG image in-browser using a canvas-based tool (no build step), export as 1200x630 PNG, commit to `public/`. Generate favicon assets via a Node.js script using `sharp` (installable as a dev dependency), which produces reproducible output from the SVG logo. Author `site.webmanifest` by hand as a static JSON file.

---

## Standard Stack

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Manual design + browser export | — | OG image creation | No build complexity; single static file; no Netlify dep issues |
| `sharp` (Node.js) | 0.34.x | SVG → PNG rasterization for favicon assets | High-quality SVG rendering; precise control over density and output size; reproducible script |
| ImageMagick (system) | 7.1.1 (installed) | SVG → ICO conversion | Already available; battle-tested multi-layer ICO generation |
| Static JSON | — | site.webmanifest | No tooling needed; hand-authored once |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `sharp-cli` | — | CLI wrapper for sharp | Not needed — a short JS script is clearer and reproducible |
| `favicons` npm | 7.2.0 | Generates all favicon variants at once | Would work, but overkill; generates ~30 files when 3 are needed |
| Browser-based canvas tools (og-image.org, RedStudio) | — | OG image design | Use one of these for the OG image design step |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual OG design | Satori + Sharp at build time | Satori has documented Netlify friction (decided out of scope in v1.1) |
| Sharp for favicon rasterization | ImageMagick CLI only | Sharp gives cleaner Node script with no shell escaping; either works |
| Hand-authored manifest | `favicons` npm package | `favicons` generates 30+ files; this site needs 3 |

### Installation

```bash
# Only needed for favicon generation script — install as devDependency
pnpm add -D sharp
```

Sharp requires Node >= 18.17.0 or >= 20.3.0. This project uses Node 22.22.2 — compatible.

---

## Architecture Patterns

### Recommended Project Structure

```
public/
├── logo.svg                  # Existing — source for favicon rasterization
├── og-image.png              # NEW — 1200x630, under 500KB, branded event image
├── favicon.ico               # NEW — 32x32 multi-layer ICO
├── apple-touch-icon.png      # NEW — 180x180 PNG
└── site.webmanifest          # NEW — JSON manifest

scripts/
└── generate-favicons.mjs     # NEW — one-time generation script (not in build pipeline)
```

The generation script lives in `scripts/` and is run once manually, not as part of `pnpm build`. The output files are committed to the repo as static assets.

### Pattern 1: OG Image — Manual Design Workflow

**What:** Design the 1200x630 image in a browser-based canvas tool, export as PNG, commit to `public/og-image.png`.

**When to use:** Single static OG image (not per-page). No build-time generation needed.

**Recommended tool:** Use a browser-based canvas tool such as:
- https://redstudio.ie/og-image-creator — runs locally via Canvas API, no server upload, exports PNG
- https://og-image.org — browser-based with Satori WASM, also local

**Design brief for this image:**
- Canvas: 1200x630px
- Background: `#f5f0e8` (--color-surface token) or a dark variant (`#131c1a` --color-ink) for poster contrast
- Logo: Place `public/logo.svg` centered or upper-left quadrant
- Event name typography: "Iron & Pine Omnium" in Spectral (display font)
- Supporting text: "June 6–7, 2026 · Hiawatha National Forest"
- Keep text and logo within the center 80% safe zone (avoid outer ~60px edges)
- High contrast text for small-screen legibility
- File size target: under 300KB (PNG at 1200x630 is typically 150-400KB; use PNG compression)

**Key constraint:** The editorial race-poster aesthetic uses `--color-surface: #f5f0e8` as light background, `--color-night-900: #131c1a` as ink, `--color-ember-400: #dd8258` as accent. The OG image should feel consistent with the site's visual identity.

### Pattern 2: Favicon Generation Script

**What:** A one-time Node.js script that reads `public/logo.svg`, uses `sharp` to produce PNG sizes, and ImageMagick to produce `favicon.ico`.

**Example:**
```javascript
// Source: sharp docs (https://sharp.pixelplumbing.com/api-constructor)
// scripts/generate-favicons.mjs
import sharp from 'sharp';
import { execSync } from 'child_process';

const SVG_PATH = './public/logo.svg';

// Generate apple-touch-icon.png (180x180)
await sharp(SVG_PATH, { density: 300 })
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png');

// Generate intermediate PNG for ICO (32x32)
await sharp(SVG_PATH, { density: 300 })
  .resize(32, 32)
  .png()
  .toFile('./public/favicon-32x32.png');

// Generate favicon.ico from the SVG using ImageMagick
// -density 300 ensures clean rasterization; -define icon:auto-resize packs multiple sizes
execSync(
  'convert -density 300 -background none ./public/logo.svg ' +
  '-define icon:auto-resize=32,16 ./public/favicon.ico'
);

console.log('Favicons generated.');
```

**SVG density note:** The logo SVG is from Adobe Illustrator at a 1294x966 viewBox. Setting `density: 300` in sharp ensures high-quality rasterization before downscaling to small sizes. At 72 DPI (default), a 1294px SVG rasterizes to ~1294px; at 300 DPI it rasterizes larger before downscaling, preserving detail.

**Caveat:** The existing `public/logo.svg` uses CSS class-based fills (`class="st0"`, etc.) rather than direct fill attributes. Test sharp's SVG rendering output visually before committing — libvips SVG rendering supports basic CSS but verify the logo renders correctly.

### Pattern 3: site.webmanifest — Hand-Authored Static JSON

**What:** A minimal JSON file in `public/` linked from BaseLayout.

**Content:**
```json
{
  "name": "Iron & Pine Omnium",
  "short_name": "Iron & Pine",
  "start_url": "/",
  "display": "browser",
  "theme_color": "#131c1a",
  "background_color": "#f5f0e8",
  "icons": [
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

**Notes on field values:**
- `theme_color: "#131c1a"` — matches `--color-night-900` (the site's primary ink color), used by mobile browsers to tint the address bar/status bar
- `background_color: "#f5f0e8"` — matches `--color-surface`, used as the splash screen background on Android before the page loads
- `display: "browser"` — this is NOT a PWA; use `browser` not `standalone` to avoid app-like chrome
- `short_name` must be under 12 characters to avoid truncation on Android home screen shortcuts

**File naming:** Use `site.webmanifest` (not `manifest.json`) — this is the conventional name and what the requirements specify.

### Anti-Patterns to Avoid

- **Using the favicon as the OG image:** OG image is 1200x630; favicon is 32x32. These are separate design problems.
- **Referencing OG image with a relative URL:** Phase 15 handles tags, but the image itself must be at a predictable root path (`/og-image.png`) so tags can reference `https://ironpineomnium.com/og-image.png` absolutely.
- **Setting `display: "standalone"` in the manifest:** Makes the site behave like an installed app — not appropriate for an event site.
- **Using 72 DPI density for sharp SVG rasterization:** Results in blurry/aliased output at small icon sizes. Use 300+ DPI.
- **Trusting the SVG favicon link already in BaseLayout:** The existing `<link rel="icon" type="image/svg+xml" href="/logo.svg" />` in BaseLayout is not a substitute for `favicon.ico`. Safari desktop and many legacy contexts require `.ico`. Phase 15 will update the BaseLayout link tags; Phase 14 just needs the files to exist.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-size ICO file | Manual byte-packing of ICO format | ImageMagick `convert` with `-define icon:auto-resize` | ICO is a container format with embedded headers; ImageMagick handles this correctly |
| SVG rasterization at arbitrary sizes | Custom canvas rendering | `sharp` with `density` option | libvips handles SVG CSS, transforms, and viewBox math correctly |
| Manifest validation | Manual field-by-field checking | Use Google's Lighthouse or a manifest validator post-Phase-15 | Easier to validate once tags are live |

**Key insight:** This phase is almost entirely a design/content problem (OG image) and a tooling-execution problem (favicon). There is no complex logic to write.

---

## Common Pitfalls

### Pitfall 1: SVG CSS Class Fills Break in Sharp/ImageMagick

**What goes wrong:** The `public/logo.svg` uses Illustrator-exported CSS class-based fills (`.st0`, `.st1`, etc.). Some SVG rasterizers don't process `<style>` blocks inside SVGs correctly — the logo renders as invisible or all-black shapes.

**Why it happens:** libvips (Sharp's backend) supports SVG, but complex Illustrator exports with `<defs><style>` blocks may not render identically to browsers. ImageMagick uses librsvg for SVG rendering and has better CSS support.

**How to avoid:** Run the script, inspect the output PNGs visually before committing. If sharp renders incorrectly, fall back to ImageMagick for all sizes: `convert -density 300 -background none logo.svg -resize 180x180 apple-touch-icon.png`.

**Warning signs:** Output PNG is transparent, all-black, or missing elements compared to the browser render of the SVG.

### Pitfall 2: OG Image File Size Exceeds 500KB Budget

**What goes wrong:** A 1200x630 PNG without compression optimization can exceed 500KB, which is the phase's stated limit.

**Why it happens:** Gradients, complex backgrounds, and high bit-depth inflate PNG file size.

**How to avoid:** Keep background simple (solid fill or minimal texture). Use a browser tool that exports optimized PNG. If the exported file exceeds 500KB, either simplify the design or use a tool like Squoosh (https://squoosh.app) to compress without visible quality loss. PNG at 1200x630 with a simple design typically runs 80-200KB.

**Warning signs:** File size > 500KB reported by `ls -lh public/og-image.png`.

### Pitfall 3: Manifest Points to Missing Icons

**What goes wrong:** `site.webmanifest` references icon paths that don't exist yet, causing browser warnings and manifest validation failures.

**Why it happens:** Manifest authored before favicon generation is complete.

**How to avoid:** Write the manifest only after the icon files exist. In this phase, reuse the `apple-touch-icon.png` (180x180) as the sole manifest icon — this is sufficient for a non-PWA site. Do not reference 192x192 or 512x512 if those files don't exist.

### Pitfall 4: `theme_color` Doesn't Match the Design

**What goes wrong:** Using a placeholder or incorrect `theme_color` value causes the mobile browser address bar to clash with the site's actual palette.

**Why it happens:** Manifest is copy-pasted from a template.

**How to avoid:** Use `#131c1a` (the `--color-night-900` token, the site's primary ink color). This is visually consistent with the dark nav bar and footer.

---

## Code Examples

Verified patterns from official sources:

### Sharp: SVG to PNG with High-Quality Rasterization

```javascript
// Source: https://sharp.pixelplumbing.com/api-constructor
import sharp from 'sharp';

// density option controls the DPI used when rasterizing the SVG
// Higher density → sharper results when downscaling to small sizes
await sharp('./public/logo.svg', { density: 300 })
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png');
```

### ImageMagick: SVG to Multi-Layer ICO

```bash
# Source: ImageMagick documentation + community gists (verified pattern)
# -density 300: high-quality SVG rasterization
# -background none: preserve transparency
# -define icon:auto-resize=32,16: pack 32px and 16px layers into one ICO file
convert -density 300 -background none \
  ./public/logo.svg \
  -define icon:auto-resize=32,16 \
  ./public/favicon.ico
```

### Minimal site.webmanifest

```json
{
  "name": "Iron & Pine Omnium",
  "short_name": "Iron & Pine",
  "start_url": "/",
  "display": "browser",
  "theme_color": "#131c1a",
  "background_color": "#f5f0e8",
  "icons": [
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

### HTML Link Tags (for Phase 15 reference — not Phase 14's job)

```html
<!-- These go in BaseLayout.astro in Phase 15, documented here for completeness -->
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dozens of favicon sizes (16, 32, 48, 57, 72, 96, 114, 120, 144...) | 3 files: favicon.ico + apple-touch-icon.png + SVG | ~2021 (Evil Martians article) | Dramatically reduced maintenance burden |
| `manifest.json` filename | `site.webmanifest` | ~2019-2020 | Conventional name; some validators expect it |
| Dynamic OG image generation at request time | Static PNG committed to repo | — | Simpler; no Netlify function needed; no cold-start |

**Deprecated/outdated:**
- Multiple `<link rel="apple-touch-icon" sizes="...">` tags: Modern iOS only needs 180x180 — browser downscales if needed
- `msapplication-TileImage` and `browserconfig.xml`: Internet Explorer / Edge Legacy tiles — no longer needed

---

## Open Questions

1. **Sharp SVG rendering of Illustrator CSS classes**
   - What we know: The logo uses `.stN { fill: #xxx }` CSS class-based fills inside a `<defs><style>` block — this is the Illustrator export format
   - What's unclear: Whether libvips (Sharp's SVG backend) renders this correctly at 32x32 and 180x180 sizes
   - Recommendation: Test in the plan's verification step. If rendering fails, document ImageMagick as the fallback and use it for all sizes.

2. **OG image design tool selection**
   - What we know: Multiple browser-based canvas tools exist that process locally without server upload
   - What's unclear: Which tool produces the best result for a typographically-driven editorial design
   - Recommendation: Use RedStudio OG Image Creator or og-image.org as starting point; both support custom text, background color, and PNG export at 1200x630. Final creative judgment is Claude's discretion (design latitude granted by project memory).

3. **Logo aspect ratio for OG image**
   - What we know: The logo SVG has a viewBox of `0 0 1294 966` — nearly 4:3 aspect ratio
   - What's unclear: How the logo should be composed within the 1200x630 (roughly 16:9) canvas — centered large, positioned small with text, or cropped
   - Recommendation: Position logo at upper-left or center at ~30-40% of canvas width. The event name "Iron & Pine Omnium" in Spectral carries the primary visual weight. The logo should support rather than dominate.

---

## Sources

### Primary (HIGH confidence)
- https://sharp.pixelplumbing.com/api-constructor — Sharp SVG input options, density parameter
- https://sharp.pixelplumbing.com/install/ — Version requirements (Node >= 18.17 or >= 20.3)
- https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs — Minimal favicon file set recommendation
- https://web.dev/articles/add-manifest — Web app manifest required fields and structure
- https://ogimage.io/resources/og-image-size — 1200x630 as universal OG standard, platform file limits

### Secondary (MEDIUM confidence)
- https://favicon.io/tutorials/favicon-sizes/ — Minimal favicon set confirmation (favicon.ico + apple-touch-icon.png)
- ImageMagick 7 CLI documentation — `-density`, `-background none`, `-define icon:auto-resize` flags
- Multiple ImageMagick community gists confirming multi-layer ICO generation pattern

### Tertiary (LOW confidence)
- https://redstudio.ie/og-image-creator — Browser-based canvas OG tool; confirmed to exist and export PNG, but not audited for design quality output
- https://og-image.org — Browser-based Satori WASM tool; confirmed for local processing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — sharp and ImageMagick are well-documented; the file set requirements are W3C/platform-documented
- Architecture: HIGH for favicon/manifest; MEDIUM for OG image (design workflow depends on tool and creative execution)
- Pitfalls: MEDIUM — SVG CSS class rendering is a known edge case, not confirmed for this specific logo file

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (favicon specs and manifest requirements are stable; OG image guidance is stable)
