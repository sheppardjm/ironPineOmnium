# Phase 03: Strava OAuth - Research

**Researched:** 2026-04-06
**Domain:** Strava OAuth 2.0 Authorization Code Flow, Netlify Functions v1, CSRF/cookie patterns
**Confidence:** HIGH (primary Strava docs verified; cookie/CSRF patterns verified via multiple sources)

---

## Summary

This phase implements a serverless Strava OAuth flow using two Netlify Functions v1 handlers: `strava-auth.js` (initiates the flow) and `strava-callback.js` (exchanges the code and stores tokens). The standard pattern is well-established: generate a CSRF nonce with `crypto.randomBytes`, store it in an HttpOnly cookie before redirecting to Strava, then verify it in the callback before exchanging the authorization code for tokens.

No external OAuth library is needed. The Strava token endpoint is a plain HTTPS POST, and Node.js `fetch` (available in Node 22) handles both the initial token exchange and token refresh. Tokens are stored in HttpOnly cookies and passed to downstream functions via those cookies — Netlify Functions are stateless, so there is no shared memory between invocations.

The critical Strava-specific constraint is that the Authorization Callback Domain field accepts only one domain. Localhost is whitelisted by Strava and also explicitly noted in the official docs, so a single Strava app can serve both local dev and production by using `STRAVA_REDIRECT_URI` as an env var that changes per environment.

**Primary recommendation:** Use `crypto.randomBytes` for CSRF nonce generation, `cookie-es` for ESM-native cookie serialization/parsing, and plain `fetch` for Strava token API calls. No OAuth helper library needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `crypto` (Node built-in) | Node 22 built-in | CSRF nonce generation | `crypto.randomBytes(32).toString('hex')` is the canonical CSRF nonce pattern |
| `fetch` (Node built-in) | Node 22 built-in | Strava token API calls (exchange + refresh) | Available natively in Node 18+; no extra dep needed |
| `cookie-es` | 3.1.1 | Cookie serialize/parse in ESM functions | Pure ESM (`"type": "module"`); matches project's `"type": "module"` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `cookie` | 1.1.1 | Alternative cookie lib | Acceptable — esbuild bundles CJS. `cookie-es` preferred for clean ESM |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `cookie-es` | `cookie` (1.1.1) | `cookie` has no `"type": "module"` field; works fine with esbuild bundling but is CJS internally |
| Plain `fetch` | `simple-oauth2`, `axios` | No external dep needed; Strava token endpoint is simple POST |
| `crypto.randomBytes` | `uuid`, `nanoid` | Built-in is sufficient; no dependency needed for a nonce |

**Installation:**
```bash
pnpm add cookie-es
```

---

## Architecture Patterns

### Recommended Project Structure
```
netlify/functions/
├── health.js              # Existing smoke-test (Phase 02)
├── strava-auth.js         # NEW: generates nonce, sets cookie, redirects to Strava
└── strava-callback.js     # NEW: verifies nonce, exchanges code, stores tokens in cookie
```

### Pattern 1: CSRF Nonce via HttpOnly Cookie (Double-Submit Variant)

**What:** Generate a random nonce in `strava-auth.js`, store it in an HttpOnly cookie (`strava_csrf`), and embed the same value in the Strava `state` param. In `strava-callback.js`, read the cookie and compare it to the returned `state` param. If they match, the redirect is legitimate.

**When to use:** Always — this is the standard CSRF protection pattern for serverless OAuth flows where server-side sessions don't exist.

**Why it works:** An attacker-controlled page cannot read the HttpOnly cookie (XSS blocked), and cannot forge the matching nonce via CSRF because they don't know the value set in the cookie.

**Example (strava-auth.js):**
```javascript
// Source: Strava docs + Auth0 CSRF guidance + Node.js crypto docs
import crypto from 'crypto';
import { serialize } from 'cookie-es';

export const handler = async (event, context) => {
  // Validate origin/referer (optional additional defense)
  const nonce = crypto.randomBytes(32).toString('hex');

  const isLocal = process.env.NETLIFY_DEV === 'true';

  const csrfCookie = serialize('strava_csrf', nonce, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes — nonce expires if flow is not completed
  });

  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state: nonce,
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params}`;

  return {
    statusCode: 302,
    headers: {
      Location: stravaAuthUrl,
      'Set-Cookie': csrfCookie,
      'Cache-Control': 'no-cache',
    },
    body: '',
  };
};
```

### Pattern 2: Token Exchange and Storage in HttpOnly Cookie

**What:** In `strava-callback.js`, verify the CSRF nonce, then POST to Strava's token endpoint. Store the resulting `access_token`, `refresh_token`, `expires_at`, and `athlete_id` in a short-lived HttpOnly session cookie.

**When to use:** After CSRF verification succeeds.

**Strava token exchange endpoint:**
- `POST https://www.strava.com/oauth/token`
- Body: `client_id`, `client_secret`, `code`, `grant_type: "authorization_code"`
- Returns: `access_token`, `refresh_token`, `expires_at`, `expires_in`, `token_type`, and `athlete` object (with `athlete.id`)

**Important:** The `athlete` object is ONLY present in the initial authorization_code exchange response. Token refresh responses do NOT include the athlete object — only `access_token`, `refresh_token`, `expires_at`, `expires_in`.

**Example (strava-callback.js — CSRF verify + token exchange):**
```javascript
// Source: Strava authentication docs + Auth0 state param guidance
import { parse, serialize } from 'cookie-es';

export const handler = async (event, context) => {
  const { code, state, error } = event.queryStringParameters || {};

  // Handle user denial
  if (error === 'access_denied') {
    return {
      statusCode: 302,
      headers: { Location: '/error?reason=strava_denied' },
      body: '',
    };
  }

  // CSRF nonce verification
  const cookies = parse(event.headers.cookie || '');
  const storedNonce = cookies.strava_csrf;

  if (!storedNonce || storedNonce !== state) {
    return {
      statusCode: 302,
      headers: { Location: '/error?reason=csrf_mismatch' },
      body: '',
    };
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return {
      statusCode: 302,
      headers: { Location: '/error?reason=token_exchange_failed' },
      body: '',
    };
  }

  const tokenData = await tokenRes.json();
  const athleteId = String(tokenData.athlete.id);

  // Store session data in HttpOnly cookie
  const isLocal = process.env.NETLIFY_DEV === 'true';
  const sessionPayload = JSON.stringify({
    athleteId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_at,
  });

  const sessionCookie = serialize('strava_session', sessionPayload, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    path: '/',
    maxAge: 3600, // 1 hour — user should complete submission in this window
  });

  // Clear the CSRF nonce cookie
  const clearCsrf = serialize('strava_csrf', '', {
    httpOnly: true,
    secure: !isLocal,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return {
    statusCode: 302,
    headers: {
      Location: '/submit', // Or wherever the submission flow continues
      'Cache-Control': 'no-cache',
    },
    // multiValueHeaders required for multiple Set-Cookie
    multiValueHeaders: {
      'Set-Cookie': [sessionCookie, clearCsrf],
    },
    body: '',
  };
};
```

### Pattern 3: Silent Token Refresh

**What:** Before making any Strava API call in subsequent functions, check `expires_at`. If the token is within 5 minutes of expiring (or already expired), refresh it using `grant_type: "refresh_token"`.

**Critical:** Strava refresh tokens are invalidated immediately when a new one is issued. Always update the stored `refresh_token` after a refresh.

**Example (token refresh helper):**
```javascript
// Source: Strava authentication docs; 5-min buffer pattern from zachliibbe.com case study
export async function getValidAccessToken(session) {
  const { accessToken, refreshToken, expiresAt } = session;
  const nowUnix = Math.floor(Date.now() / 1000);
  const bufferSeconds = 300; // 5-minute buffer

  if (expiresAt - nowUnix > bufferSeconds) {
    // Token still valid
    return { accessToken, refreshToken, expiresAt };
  }

  // Token expired or expiring soon — refresh it
  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) throw new Error('Token refresh failed');

  const data = await res.json();
  // Note: athlete object NOT included in refresh response
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token, // May be new — always update
    expiresAt: data.expires_at,
  };
}
```

### Anti-Patterns to Avoid

- **Storing state in function memory between invocations:** Netlify Functions are stateless — no shared in-memory state between calls.
- **Using `multiValueHeaders` for a single cookie:** Only needed when setting 2+ `Set-Cookie` headers. Use `headers['Set-Cookie']` for single cookies.
- **Setting `secure: true` on localhost:** Cookies won't be sent back by the browser over HTTP. Check `process.env.NETLIFY_DEV === 'true'` and set `secure: false` locally.
- **Not updating refresh token after refresh:** Strava invalidates the old refresh token immediately when a new one is issued. Stale refresh tokens cause auth failures.
- **Reusing authorization codes:** Strava authorization codes are single-use. Exchange immediately; don't store or retry.
- **Using `approval_prompt: 'force'`:** Forces re-consent on every visit. Use `'auto'` so returning users skip the consent screen if already authorized.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cryptographically secure nonce | Custom random string | `crypto.randomBytes(32).toString('hex')` | Built-in; cryptographically secure; no dep |
| Cookie serialization with all security flags | Manual string formatting | `cookie-es` serialize() | Handles quoting, encoding, all attributes correctly |
| Cookie parsing from request header | Manual string split | `cookie-es` parse() | Handles edge cases in cookie header format |
| Token refresh scheduling | Cron/timer | Inline check in each function before API call | Serverless has no persistent timers; check on each invocation |

**Key insight:** The Strava OAuth flow is simple enough that no OAuth helper library (passport.js, simple-oauth2, etc.) is needed. Each step is a single HTTP call with a flat request body.

---

## Common Pitfalls

### Pitfall 1: Strava Authorization Callback Domain — One Field, One Domain

**What goes wrong:** Trying to set localhost AND a production domain in the "Authorization Callback Domain" field in Strava API settings.

**Why it happens:** The field only accepts a single domain (no protocol, no path, no port). There is no multi-value support.

**How to avoid:** Set the `Authorization Callback Domain` to the production domain. Localhost (`localhost` and `127.0.0.1`) is whitelisted by Strava independently — you can pass `http://localhost:8888/api/strava-callback` as `redirect_uri` in local dev via the `STRAVA_REDIRECT_URI` env var without changing the API settings. The key is that `STRAVA_REDIRECT_URI` must be set as an env var (not hardcoded) so it can differ between local and deployed.

**Warning signs:** `invalid redirect_uri` error from Strava.

### Pitfall 2: Refresh Token Must Be Updated on Every Refresh

**What goes wrong:** Storing the original `refresh_token` and reusing it after the first refresh.

**Why it happens:** Strava docs state: "The refresh token may or may not be the same refresh token used to make the request. Once a new refresh token is returned, the older refresh token is invalidated immediately."

**How to avoid:** After every refresh call, update the stored `refresh_token` in the session cookie with the value from the refresh response.

**Warning signs:** `invalid_grant` error from Strava after the first token refresh.

### Pitfall 3: Athlete Object Only in Initial Exchange

**What goes wrong:** Expecting `tokenData.athlete.id` in the refresh response.

**Why it happens:** The refresh response does NOT include an athlete object — only the initial `authorization_code` exchange does.

**How to avoid:** Extract and persist `athleteId` during the initial exchange in `strava-callback.js`. Include it in the session cookie payload alongside tokens. Never try to re-read athlete ID from a refresh response.

**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'id')` in token refresh code.

### Pitfall 4: Multiple Set-Cookie Headers Require `multiValueHeaders`

**What goes wrong:** Setting two cookies (session + clear CSRF) via `headers['Set-Cookie']` as a string. Only the last one is set.

**Why it happens:** HTTP allows multiple `Set-Cookie` headers but the Netlify Functions v1 response object uses `headers` as a plain object (one value per key). Setting it twice overwrites the first.

**How to avoid:** Use `multiValueHeaders: { 'Set-Cookie': [cookie1, cookie2] }` when setting 2+ cookies. This works in both local (`netlify dev`) and deployed production.

**Warning signs:** Session cookie set but CSRF cookie not cleared (or vice versa).

### Pitfall 5: `secure` Cookie Flag Breaks Local Dev

**What goes wrong:** Cookie with `secure: true` is not sent over `http://localhost:8888`.

**Why it happens:** The `Secure` attribute requires HTTPS. Local `netlify dev` serves over HTTP.

**How to avoid:** `secure: process.env.NETLIFY_DEV !== 'true'` — the `NETLIFY_DEV` env var is set to `'true'` automatically when running `netlify dev`.

**Warning signs:** Cookie is set in response (visible in DevTools Network tab) but absent from subsequent requests.

### Pitfall 6: Scope Verification — User May Only Grant Partial Scope

**What goes wrong:** Assuming user granted `activity:read_all` because they completed the OAuth flow. Strava allows users to uncheck scopes on the consent screen.

**Why it happens:** Strava's consent screen lets users opt out of individual scopes.

**How to avoid:** Check the `scope` query parameter returned in the callback. It contains only the scopes the user actually granted. If `activity:read_all` is not in the returned scope, redirect to an error page explaining they must grant the required permissions.

**Warning signs:** Subsequent activity API calls fail with `Authorization Error`.

---

## Code Examples

Verified patterns from official sources:

### Redirect to Strava OAuth (strava-auth.js skeleton)
```javascript
// Source: Strava developers.strava.com/docs/authentication/
// Authorization URL: GET https://www.strava.com/oauth/authorize

const params = new URLSearchParams({
  client_id: process.env.STRAVA_CLIENT_ID,
  redirect_uri: process.env.STRAVA_REDIRECT_URI,
  response_type: 'code',
  approval_prompt: 'auto',
  scope: 'activity:read_all',
  state: nonce, // CSRF nonce
});

return {
  statusCode: 302,
  headers: {
    Location: `https://www.strava.com/oauth/authorize?${params}`,
    'Set-Cookie': csrfCookie,
    'Cache-Control': 'no-cache',
  },
  body: '',
};
```

### Token Exchange POST
```javascript
// Source: Strava developers.strava.com/docs/authentication/
// POST https://www.strava.com/oauth/token

const res = await fetch('https://www.strava.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    code: event.queryStringParameters.code,
    grant_type: 'authorization_code',
  }),
});

const data = await res.json();
// data.athlete.id  ← athlete ID (ONLY in this response, not in refresh)
// data.access_token
// data.refresh_token
// data.expires_at   ← Unix timestamp
```

### Token Refresh POST
```javascript
// Source: Strava developers.strava.com/docs/authentication/
// POST https://www.strava.com/oauth/token

const res = await fetch('https://www.strava.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  }),
});

const data = await res.json();
// data.access_token   ← new token
// data.refresh_token  ← may be NEW — always update stored value
// data.expires_at     ← new expiry
// NO data.athlete     ← NOT present in refresh response
```

### Parsing Incoming Cookies in a v1 Handler
```javascript
// Source: Netlify Functions workshop + cookie-es docs
import { parse } from 'cookie-es';

const cookies = parse(event.headers.cookie || '');
const storedNonce = cookies.strava_csrf;
const session = cookies.strava_session ? JSON.parse(cookies.strava_session) : null;
```

### Setting Multiple Cookies (multiValueHeaders)
```javascript
// Source: Netlify support forum — multiValueHeaders is required for 2+ Set-Cookie headers
return {
  statusCode: 302,
  headers: {
    Location: '/submit',
    'Cache-Control': 'no-cache',
  },
  multiValueHeaders: {
    'Set-Cookie': [sessionCookie, clearCsrfCookie],
  },
  body: '',
};
```

### Checking Token Expiry (5-minute buffer)
```javascript
// Source: zachliibbe.com Strava token management case study
const nowUnix = Math.floor(Date.now() / 1000);
const BUFFER_SECONDS = 300; // 5 minutes

if (session.expiresAt - nowUnix <= BUFFER_SECONDS) {
  // Refresh needed
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `require('cookie')` CJS | `import { parse, serialize } from 'cookie-es'` | ~2022 | Pure ESM; no CJS interop needed |
| `request` / `node-fetch` for HTTP | Native `fetch` (Node 18+) | Node 18 (2022) | No dep needed for token exchange |
| `exports.handler = async` (CJS) | `export const handler = async` (ESM) | Netlify Functions v1 ESM support | Already established in this project |
| OAuth helper library (passport, simple-oauth2) | Plain fetch + URLSearchParams | N/A — Strava's flow is simple enough | Fewer deps, less abstraction |

**Deprecated/outdated:**
- `node-fetch`: Replaced by native `fetch` in Node 18+. This project uses Node 22.
- `exports.handler`: CJS syntax — project uses ESM (`"type": "module"`). Already decided: `export const handler`.
- Netlify Functions v2 `export default`: Has confirmed env var bug as of 2026-03-28. Stay on v1.

---

## Open Questions

1. **Session cookie encoding — plain JSON vs signed JWT**
   - What we know: Storing token data in a plain JSON cookie is readable by the user if they inspect it (though HttpOnly prevents JS access). A signed cookie prevents tampering.
   - What's unclear: For this submission flow, the session cookie lives only for the duration of the submission (~1 hour). Tampering with `athleteId` in the cookie would allow a user to submit as another athlete's ID — this IS a security concern.
   - Recommendation: Consider encoding the session cookie as a signed HMAC value (using `crypto.createHmac` with `STRAVA_VERIFY_TOKEN` or a dedicated `SESSION_SECRET` env var). This prevents ID spoofing. Planner should decide whether to add signing in this phase or defer to a hardening phase.

2. **Where the submission flow continues after callback**
   - What we know: After successful OAuth, the callback should redirect somewhere (e.g., `/submit` or `/api/submit`).
   - What's unclear: The submission page/function is planned for a later phase. The callback redirect target for Phase 03 is a placeholder.
   - Recommendation: Redirect to a "connecting" success page or back to `/` with a session-established flag. Leave the final redirect target flexible.

3. **Scope validation on callback — strict or lenient?**
   - What we know: Strava returns granted scopes in the `scope` query param of the callback.
   - What's unclear: Should we hard-fail if `activity:read_all` is absent, or show a re-auth prompt?
   - Recommendation: Hard-fail with a clear error page (`/error?reason=insufficient_scope`) and a link to re-initiate auth. Re-auth should use `approval_prompt: 'force'` in that specific retry case.

4. **`STRAVA_REDIRECT_URI` env var in Netlify dashboard**
   - What we know: From Phase 02 research, deployed functions read env vars from the Netlify dashboard, not `.env`.
   - What's unclear: The deployed `STRAVA_REDIRECT_URI` must use the production HTTPS URL (e.g., `https://your-site.netlify.app/api/strava-callback`). Local dev uses `http://localhost:8888/api/strava-callback`.
   - Recommendation: Plan for two separate env var values — one in `.env` for local, one configured in Netlify dashboard for deployed. Document this clearly in the plan.

---

## Sources

### Primary (HIGH confidence)
- `https://developers.strava.com/docs/authentication/` — Authorization URL params, token exchange fields, refresh token behavior, athlete object presence, scope list, access_denied error
- `https://developers.strava.com/docs/getting-started/` — App registration, redirect URI requirements, rate limits
- `https://auth0.com/docs/secure/attack-protection/state-parameters` — CSRF state parameter: generation, storage, verification, signed cookie recommendation
- Node.js `crypto` built-in (Node 22) — `crypto.randomBytes(32).toString('hex')` for nonce generation

### Secondary (MEDIUM confidence)
- `https://github.com/DavidWells/netlify-functions-workshop` (set-cookie examples) — `Set-Cookie` header pattern in v1 handlers; `process.env.NETLIFY_DEV` check for `secure` flag
- `https://www.zachliibbe.com/blog/oauth-token-management-with-automatic-refresh-a-strava-api-case-study` — 5-minute buffer token refresh pattern; single-use refresh token behavior confirmed
- Netlify support forums (multiValueHeaders) — Confirmed `multiValueHeaders['Set-Cookie']` array syntax required for multiple cookies
- `https://communityhub.strava.com` (multiple threads) — Callback domain single-field limitation; localhost whitelisting; `access_denied` error parameter

### Tertiary (LOW confidence)
- WebSearch results on cookie-es ESM compatibility — Verified via npm registry (`"type": "module"` in package.json)
- Strava Google Group threads on redirect_uri exact matching — Community-sourced, consistent with official docs but not from official Strava engineering

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — cookie-es version verified via npm registry; crypto/fetch are Node 22 built-ins; Strava endpoint URLs from official docs
- Architecture patterns: HIGH — Two-function pattern matches official Strava docs + well-documented Netlify OAuth examples; CSRF cookie pattern from Auth0 official docs
- Pitfalls: HIGH (scope, athlete object, refresh token) / MEDIUM (multiValueHeaders, secure flag) — multiple sources corroborate

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (Strava API is stable; cookie-es and Node 22 are stable; 90-day window)
