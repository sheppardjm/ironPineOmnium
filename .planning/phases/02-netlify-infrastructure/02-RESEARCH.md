# Phase 02: Netlify Infrastructure - Research

**Researched:** 2026-04-06
**Domain:** Netlify Functions v1, netlify-cli, netlify.toml, environment variables, static Astro + Functions co-deployment
**Confidence:** HIGH (primary findings from official Netlify docs and verified npm registry; v2 bug confirmed via Netlify support forums)

---

## Summary

Phase 02 establishes the Netlify infrastructure that all subsequent phases depend on. The core work is four tasks: create `netlify.toml` with redirect rules, configure env vars in the Netlify dashboard, write and verify a smoke-test function, and add `netlify-cli` as a dev dependency.

The project is already committed to **Netlify Functions v1** (`exports.handler`) — this is the right call. As of late March 2026, a confirmed bug in Functions v2 (`export default`) caused user-defined environment variables to vanish intermittently at runtime. Although Netlify reported a fix on March 30, the v2 runtime remains less proven. V1 uses the AWS Lambda-compatible interface, which is stable, well-documented, and supports `process.env` reliably.

The Astro project uses `output: "static"` and does not need the `@astrojs/netlify` adapter. Netlify Functions work alongside a static Astro site with zero adapter configuration — just drop functions in `netlify/functions/`, define the redirect rule in `netlify.toml`, and they're live.

**Primary recommendation:** Use `exports.handler` in `.js` (CommonJS) files. Keep `"type": "module"` in `package.json` (it's already there) and name function files `.cjs` to use CommonJS `require()`, OR use `.js` — but since `package.json` has `"type": "module"`, `.js` files will be treated as ES modules and must use `export const handler`. The safest path for v1 syntax: use `.cjs` extension for function files, which forces CommonJS and lets you write `exports.handler` without ambiguity.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| netlify-cli | 24.10.0 (latest as of 2026-04-06) | Local dev server, deploy, function emulation | Official Netlify tooling |
| Netlify Functions runtime (built-in) | v1 (Lambda-compatible) | Serverless function execution | Stable, confirmed env var access via `process.env` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @netlify/functions | latest | TypeScript types for v1 handler | Only needed if using TypeScript for functions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Functions v1 (`exports.handler`) | Functions v2 (`export default`) | v2 had confirmed env var bug as of March 2026; v1 is safer and requirement is locked |
| `netlify-cli` local install | global `netlify` install | Local install (devDep) gives reproducible builds and pins the version |
| `.cjs` function files | `.js` function files | `.js` with `"type": "module"` in package.json becomes ESM — cannot use `exports.handler`; `.cjs` forces CommonJS |

**Installation:**
```bash
pnpm add -D netlify-cli
```

---

## Architecture Patterns

### Recommended Project Structure
```
/
├── netlify/
│   └── functions/
│       └── health.js (or health.cjs)   # Smoke-test function
├── netlify.toml                         # Build + redirect + dev config
├── public/                              # Static Astro output served by Netlify
├── src/                                 # Astro source
└── package.json                         # netlify-cli in devDependencies
```

### Pattern 1: netlify.toml — Full Configuration

**What:** Single config file at project root covering build settings, redirect rules, functions directory, and local dev behavior.

**When to use:** Always — this is the authoritative project config; UI settings are overridden by this file.

```toml
[build]
  command = "pnpm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
  force = true

[dev]
  command = "pnpm run dev"
  targetPort = 4321
  port = 8888
  publish = "dist"
  framework = "#custom"
```

Source: https://docs.netlify.com/configure-builds/file-based-configuration/ and https://docs.netlify.com/cli/local-development/

**Key notes:**
- `status = 200` makes this a rewrite (proxy) — the URL in the browser stays `/api/...` while Netlify routes to the function behind the scenes. This is intentional.
- `force = true` ensures the redirect fires even if a file exists at that path.
- `:splat` captures the wildcard portion of `/api/*` and appends it to the function path. A request to `/api/health` routes to `/.netlify/functions/health`.
- The `[dev]` section tells `netlify dev` how to find the Astro dev server. Astro's default dev port is 4321; adjust if it's different.
- `framework = "#custom"` disables auto-detection so Netlify doesn't misidentify the project.

### Pattern 2: Functions v1 — CommonJS Handler

**What:** The Lambda-compatible handler pattern. Works reliably with `process.env` for all environment variable access.

**When to use:** Always — project requirement is v1 syntax. Confirmed more stable than v2 as of April 2026.

```javascript
// netlify/functions/health.cjs
// Source: https://docs.netlify.com/functions/lambda-compatibility/
exports.handler = async function (event, context) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
```

**File extension decision:**

| Extension | Module format | Works with `exports.handler`? | Notes |
|-----------|--------------|------------------------------|-------|
| `.cjs` | Always CommonJS | YES | Safest — unambiguous CommonJS regardless of `package.json` |
| `.mjs` | Always ESM | NO — use `export const handler` | ESM-only |
| `.js` | Depends on `"type"` in `package.json` | Only if NO `"type": "module"` | This project has `"type": "module"` so `.js` = ESM |

**This project has `"type": "module"` in `package.json`.** Therefore function files must use `.cjs` extension if `exports.handler` syntax is required.

**Alternative:** Use `export const handler` (ESM export, not `export default`) which is also v1 Lambda-compatible and works in `.js`/`.mjs` files:

```javascript
// netlify/functions/health.js  (ESM, works with "type": "module")
export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
```

Source: https://docs.netlify.com/functions/get-started/ — `export const handler` is documented as the Lambda-compatible export in ESM files, distinct from `export default` (v2 modern API).

### Pattern 3: Environment Variable Access (v1)

**What:** In v1 functions, environment variables are accessed via `process.env`.

```javascript
exports.handler = async function (event, context) {
  const clientId = process.env.STRAVA_CLIENT_ID;
  // ...
};
```

Source: https://docs.netlify.com/environment-variables/overview/

**Scoping requirement:** Variables must have **Functions** scope (or All scopes) to be accessible at runtime. The default when setting a variable in the Netlify dashboard is all scopes, which works.

### Anti-Patterns to Avoid

- **Using `export default` syntax:** This is Functions v2 modern API. It had a confirmed env var bug in March 2026. The project decision forbids it. Never use it.
- **Putting env vars in `netlify.toml`:** Values in `netlify.toml` override UI/CLI values and are committed to the repo. Secrets (API keys, tokens) must go in the Netlify dashboard UI only.
- **Using `.js` files for `exports.handler` when `"type": "module"` is set:** This project has `"type": "module"` — `.js` files are ESM and `exports.handler` won't work. Use `.cjs` or `export const handler`.
- **Relying on `netlify link` being pre-configured:** `netlify dev` requires the site to be linked. The plan must include a `netlify link` step.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Local function emulation | Custom proxy/mock server | `netlify dev` | Netlify CLI accurately emulates redirect rules, env vars, and function runtime |
| `/api/*` routing | Custom Astro middleware or Vite proxy | `netlify.toml` redirect rule | Built into Netlify infra; works both locally (via `netlify dev`) and in production |
| Env var injection | Hardcoded fallbacks or `.env` files committed to git | Netlify dashboard env vars | Dashboard vars are secret-safe, scoped, and accessible in all environments |
| Function URL routing | Manually calling `/.netlify/functions/foo` in frontend | `/api/foo` via redirect proxy | Cleaner URLs, redirect rule handles routing transparently |

**Key insight:** `netlify dev` is the single tool that makes local development match production. Don't replicate what it does.

---

## Common Pitfalls

### Pitfall 1: `"type": "module"` and `exports.handler` incompatibility

**What goes wrong:** Developer writes `exports.handler` in a `.js` file, but `package.json` has `"type": "module"`, making `.js` files ESM. Node throws `ReferenceError: exports is not defined`.

**Why it happens:** Node respects the `"type"` field. ESM modules don't have a `exports` global.

**How to avoid:** Use `.cjs` extension for CommonJS function files, OR use `export const handler` (ESM-compatible v1 syntax) in `.js`/`.mjs` files.

**Warning signs:** Error in `netlify dev` logs referencing `exports is not defined` or syntax errors in function files.

### Pitfall 2: `netlify dev` not routing to functions

**What goes wrong:** `netlify dev` starts but `/api/*` requests return 404 or serve the Astro dev response instead of the function.

**Why it happens:** Missing or incorrect `[[redirects]]` block in `netlify.toml`; or `netlify dev` started without the site being linked (`netlify link`).

**How to avoid:** Ensure `netlify.toml` has the redirect rule before starting `netlify dev`. Run `netlify link` once to link the local project to the Netlify site. The smoke-test function (`/api/health`) should be the first thing verified.

**Warning signs:** `netlify dev` output shows no functions detected; requests to `/api/*` return Astro HTML.

### Pitfall 3: Environment variables not injected locally

**What goes wrong:** `process.env.STRAVA_CLIENT_ID` is `undefined` when running `netlify dev`.

**Why it happens:** `netlify dev` fetches env vars from the Netlify dashboard automatically — but only if the site is linked. Without `netlify link`, no vars are pulled.

**How to avoid:** Always link the site first (`netlify link`). Use `netlify env:list` to verify variables are visible in the local dev context. A local `.env` file is an acceptable fallback for development, but it must be in `.gitignore`.

**Warning signs:** Function returns 500; `console.log(process.env.STRAVA_CLIENT_ID)` prints `undefined`.

### Pitfall 4: Redirect rule not matching function name

**What goes wrong:** Request to `/api/health` returns 404 instead of calling the function.

**Why it happens:** The function file is named `health.cjs` (or `health.js`) but the redirect sends to `/.netlify/functions/health` — the name must match the filename without extension.

**How to avoid:** Name the file exactly as expected. Netlify derives the function's endpoint from its filename: `health.js` → `/.netlify/functions/health`.

**Warning signs:** Direct request to `/.netlify/functions/health` works, but `/api/health` does not — indicates redirect rule misconfiguration.

### Pitfall 5: `netlify dev` port conflict with Astro

**What goes wrong:** `netlify dev` crashes or proxies to the wrong port because Astro dev server runs on a different port than configured in `[dev] targetPort`.

**Why it happens:** Astro 6.x defaults to port 4321. If `[dev] targetPort` is not set correctly (or if Astro increments to 4322 due to a conflict), `netlify dev` can't find the upstream server.

**How to avoid:** Set `targetPort = 4321` in `[dev]` block. If port conflicts occur, use `astro dev --port 4321 --host` explicitly.

**Warning signs:** `netlify dev` starts but returns blank pages or errors on non-function routes.

---

## Code Examples

### Smoke-test function (ESM, compatible with "type": "module")

```javascript
// netlify/functions/health.js
// Source: https://docs.netlify.com/functions/lambda-compatibility/
export const handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
```

### Complete netlify.toml

```toml
# Source: https://docs.netlify.com/configure-builds/file-based-configuration/
[build]
  command = "pnpm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
  force = true

[dev]
  command = "pnpm run dev"
  targetPort = 4321
  port = 8888
  publish = "dist"
  framework = "#custom"
```

### Accessing env vars in a function

```javascript
// Source: https://docs.netlify.com/environment-variables/overview/
export const handler = async (event, context) => {
  const stravaClientId = process.env.STRAVA_CLIENT_ID;
  if (!stravaClientId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing STRAVA_CLIENT_ID" }),
    };
  }
  // ...
};
```

### Adding netlify-cli as a dev dependency

```bash
pnpm add -D netlify-cli
```

Then add a script to `package.json`:
```json
{
  "scripts": {
    "netlify:dev": "netlify dev"
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Functions v1 `exports.handler` (CJS) | Functions v2 `export default` (modern API) | ~2023 | Project MUST stay on v1 due to v2 env var bug (March 2026) and explicit project decision |
| `netlify-lambda` package for local dev | `netlify dev` (CLI) | Deprecated | `netlify-lambda` is officially deprecated; `netlify dev` is the only supported local approach |
| Global `netlify-cli` install | Local `devDependency` install | Best practice shift | Lock CLI version per project for reproducibility |
| Astro + Netlify adapter required | Adapter optional for static output | Astro 5.x+ | Static Astro sites don't need `@astrojs/netlify` unless using SSR |

**Deprecated/outdated:**
- `netlify-lambda`: Officially deprecated, do not use. All functionality is in `netlify-cli`.
- Functions v2 `export default` for this project: Forbidden by project decision and confirmed unstable as of March 2026.
- Astro Netlify adapter (`@astrojs/netlify`): Not needed for static output mode. Do not install it.

---

## Open Questions

1. **Which v1 syntax to standardize: `exports.handler` (CJS) or `export const handler` (ESM)?**
   - What we know: Both are v1 Lambda-compatible. `export const handler` works in `.js` files when `"type": "module"` is set. `exports.handler` requires `.cjs` extension.
   - What's unclear: The phase description says "v1 syntax (`exports.handler`)" — this literally implies CommonJS. But functionally, `export const handler` achieves the same interface.
   - Recommendation: Use `export const handler` in `.js` files (ESM-compatible, no extension confusion) unless the plan author specifically requires `exports.handler`. Either satisfies "no v2 `export default` syntax."

2. **Does `netlify dev` auto-inject env vars from the Netlify dashboard without `netlify link`?**
   - What we know: `netlify dev` fetches env vars from the linked site automatically.
   - What's unclear: Whether a local `.env` file is sufficient as a fallback if the site isn't linked yet during initial setup.
   - Recommendation: Plan should include `netlify link` as an explicit step before env var verification. Document `.env` as a local-only fallback that must be in `.gitignore`.

3. **Is the v2 env var bug fully resolved?**
   - What we know: Netlify reported a fix deployed March 30, 2026. The project decision to use v1 predates and independently justifies avoiding v2.
   - What's unclear: Whether the fix is complete and stable as of April 2026.
   - Recommendation: Irrelevant to this project — v1 is the locked decision. Note in plans that v2 is forbidden, regardless of fix status.

---

## Sources

### Primary (HIGH confidence)
- https://docs.netlify.com/functions/lambda-compatibility/ — v1 `exports.handler` and `export const handler` syntax, response format
- https://docs.netlify.com/configure-builds/file-based-configuration/ — `netlify.toml` syntax, `[[redirects]]`, `[functions]`, `[dev]` sections
- https://docs.netlify.com/functions/optional-configuration/ — functions directory, `node_bundler`, Node.js runtime version
- https://docs.netlify.com/environment-variables/overview/ — scopes, `process.env` access in v1, dashboard configuration
- https://docs.netlify.com/cli/local-development/ — `netlify dev` operation, port config, `[dev]` block
- https://docs.astro.build/en/guides/deploy/netlify/ — static Astro + Netlify; no adapter required for static output

### Secondary (MEDIUM confidence)
- https://answers.netlify.com/t/functions-v2-export-default-intermittently-missing-all-user-defined-env-vars-at-runtime/160958 — v2 env var bug report, timeline (March 28, 2026), fix report (March 30, 2026)
- https://docs.netlify.com/routing/redirects/rewrites-proxies/ — status 200 rewrite/proxy behavior, `:splat`, `force = true`
- https://docs.netlify.com/cli/get-started/ — `netlify-cli` install as devDependency, Node.js 20.12.2+ requirement

### Tertiary (LOW confidence)
- WebSearch result (unverified): `export const handler` reportedly unaffected by the v2 bug — plausible given it uses the Lambda runtime, but not officially confirmed as "v1" by Netlify docs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official docs confirm netlify-cli, functions directory, v1 syntax
- Architecture: HIGH — redirect rule syntax, netlify.toml structure, Astro static deployment all confirmed from official docs
- Pitfalls: HIGH for module format issue (confirmed via Node.js semantics); MEDIUM for `netlify link` requirement (logical but not explicitly documented as required); HIGH for v2 env var bug (confirmed from Netlify support forums)

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable APIs; but monitor Netlify Functions v2 fix status if v2 is reconsidered)
