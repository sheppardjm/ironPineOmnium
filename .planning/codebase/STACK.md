# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Used in library files and type definitions throughout the project
- HTML (Astro markup) - Used in all `.astro` components and layouts

**Secondary:**
- CSS 3 - Styling with Tailwind CSS integration
- JavaScript - Embedded in Astro components for client-side interactivity (vanilla JS in Leaderboard component)

## Runtime

**Environment:**
- Node.js 22.22.2 (via Volta)

**Package Manager:**
- pnpm 10.14.0
- Lockfile: `package-lock.json` present (legacy; pnpm uses lock file)

## Frameworks

**Core:**
- Astro 6.1.1 - Static site generator and component framework
  - Output: Static HTML (`output: "static"` in `astro.config.mjs`)
  - Components: `.astro` files for layouts, pages, and components

**Styling:**
- Tailwind CSS 4.2.2 - Utility-first CSS framework
- @tailwindcss/vite 4.2.2 - Vite plugin for Tailwind CSS integration

**Build/Dev:**
- Vite 7 (overridden in package.json) - Build tool and dev server bundler
- @astrojs/check 0.9.8 - Type checking tool for Astro projects

## Key Dependencies

**Critical:**
- astro 6.1.1 - Framework dependency; orchestrates build, dev server, and SSG
- tailwindcss 4.2.2 - CSS generation; required for all styling
- typescript 5.9.3 - Type checking; configured for strict mode with ESNext target

**Infrastructure:**
- @tailwindcss/vite 4.2.2 - Bridges Tailwind CSS with Vite during development
- vite 7 - Bundler and dev server (production asset optimization)

## Configuration

**Build Configuration:**
- `astro.config.mjs` - Astro settings:
  - Static output mode (`output: "static"`)
  - Vite plugin configuration for Tailwind CSS
  - Google Fonts integration for two font families:
    - Cormorant Garamond (weights: 500, 600, 700; styles: normal, italic)
    - Sora (weights: 400, 500, 600, 700; style: normal)

**TypeScript Configuration:**
- `tsconfig.json`:
  - Target: ESNext
  - Module resolution: Bundler
  - Strict mode enabled (`strict: true`)
  - Isolated modules enabled
  - No emit (`noEmit: true` for type checking only)
  - JSX preserved (not transformed)
  - Includes `.astro/types.d.ts` for Astro type definitions

**Environment:**
- Volta pinning (`.volta` in package.json):
  - Node: 22.22.2
  - pnpm: 10.14.0

## Platform Requirements

**Development:**
- Node.js 22.22.2
- pnpm 10.14.0
- TypeScript-aware editor (VSCode recommended with Astro extension)

**Production:**
- Static hosting (no runtime required)
- HTTP server to serve built HTML/CSS/JS from `dist/` directory
- Deployment target: Netlify, Vercel, GitHub Pages, or any static host

## Scripts

**Development:**
```bash
pnpm dev        # Start dev server (Astro dev server with hot reload)
```

**Build:**
```bash
pnpm build      # Build to dist/ (static HTML generation)
```

**Preview:**
```bash
pnpm preview    # Preview built output locally
```

**Quality:**
```bash
pnpm check      # Run Astro type checking with @astrojs/check
```

---

*Stack analysis: 2026-04-02*
