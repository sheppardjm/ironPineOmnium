# Phase 7: Data Persistence - Research

**Researched:** 2026-04-07
**Domain:** GitHub Contents API, Netlify Build Hooks, Strava Webhooks, Netlify Functions v1
**Confidence:** HIGH (core APIs verified against official docs); MEDIUM (Strava deauth authorized field type); LOW (retry pattern specifics)

---

## Summary

Phase 7 has four distinct technical subsystems: (1) writing athlete JSON to GitHub via the Contents API, (2) triggering Netlify builds via a build hook URL, (3) handling Strava deauth webhook events to delete athlete data, and (4) registering the webhook subscription with Strava. All four are well-understood APIs that have been used in similar event-result projects.

The GitHub Contents API uses a GET-then-PUT pattern with SHA-based optimistic concurrency. Creating a new file needs no SHA; updating an existing file requires the current blob SHA retrieved via GET. The API returns 201 on create, 200 on update, and 409 on SHA conflict. For this project's low-concurrency single-athlete-per-file model, a single retry on 409 (re-GET the SHA, re-PUT) is sufficient — no complex locking is needed.

The Netlify build hook trigger is a plain HTTP POST to a URL stored as an env var. No headers, no auth, empty body accepted. The Strava webhook uses a GET handshake (echo hub.challenge back as JSON) on subscription creation, then receives POST events for deauth. The webhook function must respond 200 within 2 seconds, so the GitHub delete + build hook trigger should be fully async-capable within that window using Netlify's Lambda execution model (up to 10 seconds by default).

**Primary recommendation:** Implement submit-result.js using JSON fetch POST (not HTML form POST) so the confirm page can read a JSON response and redirect to a success page. Parse the form's hidden fields via fetch + JSON.stringify on the client side, avoiding URLSearchParams parsing complexity in the function.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| GitHub REST API | v2022-11-28 | Write/delete athlete JSON files | Already proven in this domain; no npm dependency needed — fetch() suffices |
| Netlify Build Hook | N/A | Trigger static rebuild after submission | Built into Netlify; single POST to a hook URL |
| Strava Webhooks API | v3 | Receive deauth events | Required by Strava ToS for data deletion compliance |
| cookie-es | 3.1.1 | Session cookie parsing in submit-result | Already installed and used in strava-callback.js, strava-fetch-activity.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `Buffer` | built-in | Base64-encode file content for GitHub API | Content must be base64-encoded before PUT |
| Node.js `URLSearchParams` | built-in | Fallback form body parsing | Only if form POSTs as urlencoded rather than JSON fetch |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw fetch() to GitHub API | octokit/rest npm package | Octokit adds a dependency; fetch() is simpler and already used throughout codebase |
| JSON fetch POST from confirm page | HTML form POST (urlencoded) | HTML form POST requires URLSearchParams parsing in the function and can't easily read a JSON response for client-side redirect; JSON fetch is cleaner |

**Installation:**
```bash
# No new npm packages needed — all APIs use fetch() and built-in Node modules
```

---

## Architecture Patterns

### Recommended Project Structure
```
netlify/functions/
├── submit-result.js      # POST handler: validate, write/update athlete JSON, trigger build
├── strava-webhook.js     # GET handler (hub.challenge) + POST handler (deauth events)
└── lib/
    └── strava-tokens.js  # Already exists — shared token utility
```

### Pattern 1: GitHub GET-then-PUT (Create or Update)
**What:** To write a file, first GET to check if it exists and retrieve the SHA. If 404, PUT without SHA (creates). If 200, PUT with the returned SHA (updates). If PUT returns 409, retry: GET again for new SHA, then PUT.
**When to use:** All athlete JSON writes in submit-result.js

```javascript
// Source: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
const GITHUB_API = "https://api.github.com";
const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

async function writeAthleteFile(owner, repo, path, content, message) {
  // Step 1: GET current file (to retrieve SHA if it exists)
  const getRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
  
  let sha = undefined;
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha; // required for update; omit for create
  } else if (getRes.status !== 404) {
    throw new Error(`GitHub GET failed: ${getRes.status}`);
  }

  // Step 2: PUT (create or update)
  const body = {
    message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
    ...(sha ? { sha } : {}),
  };

  const putRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  // Handle 409 conflict (SHA stale) — retry once
  if (putRes.status === 409) {
    const retryGet = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
    const retryData = await retryGet.json();
    const retryBody = { ...body, sha: retryData.sha };
    const retryPut = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(retryBody),
    });
    if (!retryPut.ok) throw new Error(`GitHub PUT retry failed: ${retryPut.status}`);
    return retryPut;
  }

  if (!putRes.ok) throw new Error(`GitHub PUT failed: ${putRes.status}`);
  return putRes;
}
```

### Pattern 2: GitHub DELETE (for Strava deauth)
**What:** DELETE requires the file's SHA, so GET first, then DELETE with SHA in the request body.
**When to use:** Strava deauth handler in strava-webhook.js

```javascript
// Source: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#delete-a-file
async function deleteAthleteFile(owner, repo, path, message) {
  const getRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, { headers });
  if (getRes.status === 404) return; // Already gone — idempotent
  if (!getRes.ok) throw new Error(`GitHub GET before DELETE failed: ${getRes.status}`);
  
  const existing = await getRes.json();
  const deleteRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ message, sha: existing.sha }),
  });
  if (!deleteRes.ok && deleteRes.status !== 404) {
    throw new Error(`GitHub DELETE failed: ${deleteRes.status}`);
  }
}
```

### Pattern 3: Netlify Build Hook Trigger
**What:** Simple POST to the NETLIFY_BUILD_HOOK URL env var. No auth, no required headers, empty body accepted.
**When to use:** After every successful GitHub write in submit-result.js and strava-webhook.js

```javascript
// Source: https://docs.netlify.com/configure-builds/build-hooks/
async function triggerBuild() {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK;
  if (!hookUrl) return; // Gracefully skip in dev/test
  await fetch(hookUrl, { method: "POST", body: "{}" });
  // No need to await or check response — fire and forget
}
```

### Pattern 4: Strava Webhook Handler (GET handshake + POST events)
**What:** The same function URL handles two different HTTP methods. GET is the validation challenge during subscription setup. POST receives ongoing events.
**When to use:** strava-webhook.js

```javascript
// Source: https://developers.strava.com/docs/webhooks/
export const handler = async (event, _context) => {
  // Subscription handshake (one-time, during setup)
  if (event.httpMethod === "GET") {
    const params = event.queryStringParameters || {};
    if (params["hub.mode"] === "subscribe" &&
        params["hub.verify_token"] === process.env.STRAVA_VERIFY_TOKEN) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "hub.challenge": params["hub.challenge"] }),
      };
    }
    return { statusCode: 403, body: "Forbidden" };
  }

  // Ongoing webhook events (POST)
  if (event.httpMethod === "POST") {
    let payload;
    try { payload = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Bad Request" }; }

    // Must return 200 quickly; processing happens before return
    const isDeauth = payload.object_type === "athlete" &&
      payload.aspect_type === "update" &&
      (payload.updates?.authorized === "false" || payload.updates?.authorized === false);

    if (isDeauth) {
      const athleteId = String(payload.owner_id);
      const path = `public/data/results/athletes/${athleteId}.json`;
      await deleteAthleteFile(process.env.GITHUB_OWNER, process.env.GITHUB_REPO, path, `deauth: remove athlete ${athleteId}`);
      await triggerBuild();
    }

    return { statusCode: 200, body: "EVENT_RECEIVED" };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
```

### Pattern 5: submit-result.js Receives JSON from Client fetch()
**What:** The confirm page replaces the placeholder submit handler with a fetch() POST sending a JSON body. The function reads session cookie for athleteId, validates it matches the payload's athleteId, then writes/updates the athlete JSON.
**When to use:** submit-result.js

The confirm page sends:
```javascript
// Client-side in submit-confirm.astro — replaces placeholder handler
const payload = {
  name: formData.get("name"),
  category: formData.get("category"),
  activityId: formData.get("activityId"),
  athleteId: formData.get("athleteId"),
  movingTimeSeconds: Number(formData.get("movingTimeSeconds")),
  startDateLocal: formData.get("startDateLocal"),
  sectorEfforts: JSON.parse(formData.get("sectorEfforts") || "{}"),
  komSegmentIds: JSON.parse(formData.get("komSegmentIds") || "[]"),
  komEfforts: JSON.parse(formData.get("komEfforts") || "{}"),
};

const res = await fetch("/api/submit-result", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
  credentials: "include", // send session cookie
});
const result = await res.json();
if (result.ok) { window.location.href = "/submit-success"; }
else { /* show error */ }
```

The function reads:
```javascript
// In submit-result.js
const body = JSON.parse(event.body || "{}");
const cookies = parse(event.headers.cookie || "");
const session = JSON.parse(cookies.strava_session || "{}");

// Security: session athleteId must match payload athleteId
if (body.athleteId !== session.athleteId) {
  return { statusCode: 403, body: JSON.stringify({ error: "athlete_mismatch" }) };
}
```

### Anti-Patterns to Avoid
- **Using HTML form POST (action="/api/submit-result"):** The confirm page currently has no action attribute and handles submit via JS. Switching to a native form POST would require URLSearchParams parsing in the function and prevents reading a JSON response for client-side redirect. Stick with fetch().
- **Storing Strava firstname/lastname in athlete JSON:** The data model (DATA-MODEL.md) explicitly forbids this. Write only displayName (rider-chosen), not profile fields.
- **Triggering builds synchronously before returning from function:** The build hook POST is fire-and-forget. Don't await it or check its response — it just needs to be sent.
- **Verifying webhook with HMAC on every request instead of just verify_token:** Strava uses verify_token for the subscription handshake only. Ongoing POST events are not HMAC-signed — just check object_type + aspect_type.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Base64 encoding file content | Manual character encoding | `Buffer.from(str).toString("base64")` | Node built-in; already works in Lambda environment |
| SHA collision handling | Custom locking mechanism | Single retry on 409 | Only one function instance can submit per athlete; retries sufficient for this load |
| Webhook signature verification | Custom crypto implementation | Direct string comparison on verify_token | Strava doesn't send HMAC on ongoing events; verify_token only used during handshake |
| Cookie parsing in submit-result | Custom cookie parser | cookie-es (already installed) | Already used in strava-callback.js and strava-fetch-activity.js; consistent pattern |

**Key insight:** All four external API integrations (GitHub, Netlify build hooks, Strava webhook) require only fetch() and built-in Node modules. No new npm packages needed.

---

## Common Pitfalls

### Pitfall 1: Missing SHA on Update Causes 422 or Incorrect Create
**What goes wrong:** If the athlete file already exists and you PUT without a SHA, GitHub creates a 422 Validation Failed. If you accidentally provide the wrong SHA, you get 409 Conflict.
**Why it happens:** GET returns `sha` on the file blob; forgetting to include it on update silently creates a conflict.
**How to avoid:** Always GET first. If GET returns 200, extract `.sha` and include it in PUT body. If GET returns 404, omit SHA (creates new file).
**Warning signs:** 422 error on what should be an update; file gets duplicated in git history.

### Pitfall 2: Strava authorized Field Is String "false", Not Boolean
**What goes wrong:** Testing `payload.updates?.authorized === false` (boolean) may miss the event if Strava sends `"false"` (string).
**Why it happens:** Strava's API docs state `'authorized': 'false'` with string notation; community confirms it's a string.
**How to avoid:** Check for both: `authorized === "false" || authorized === false`. This is shown in Pattern 4 above.
**Warning signs:** Deauth event arrives but athlete file is not deleted; function receives event but no action taken.

### Pitfall 3: Returning 200 to Strava Webhook Within 2 Seconds
**What goes wrong:** If GitHub write + build hook trigger takes longer than 2 seconds, Strava retries the webhook up to 3 times, causing duplicate deletes.
**Why it happens:** GitHub API calls can take 500-1500ms; if multiple sequential calls exceed 2 seconds, Strava times out.
**How to avoid:** For deauth events, the delete + build trigger should complete in ~1-2 seconds normally. Keep operations sequential but non-blocking. Build hook is fire-and-forget (no await on response). If needed, return 200 immediately and process asynchronously (but Netlify Functions don't support background processing after return).
**Warning signs:** Multiple Strava retries visible in function logs; athlete file gets deleted then re-processed.

### Pitfall 4: Athlete ID Mismatch Security Check Skipped
**What goes wrong:** A malicious actor submits a payload with `athleteId: "someone_else_id"` to overwrite another rider's data.
**Why it happens:** The athleteId in the form payload comes from the client — it must be verified against the session cookie.
**How to avoid:** In submit-result.js, read `session.athleteId` from the `strava_session` cookie (same pattern as strava-fetch-activity.js) and compare to `body.athleteId`. Return 403 if they differ.
**Warning signs:** An athlete can overwrite another's file; leaderboard shows unexpected data.

### Pitfall 5: displayName and category Locked After First Submission
**What goes wrong:** If the athlete file already exists (e.g., rider submitting Day 2 after Day 1), the new submission's `name` and `category` inputs must be ignored — the stored values must be used instead.
**Why it happens:** Data model decision (DATA-MODEL.md §5): identity locked at first submission.
**How to avoid:** In the GET-then-PUT logic, if the file exists, read `displayName` and `category` from the existing JSON and use those in the write — discard what came from the form POST.
**Warning signs:** A rider can change their display name on second submission; category changes between days.

### Pitfall 6: activityId Deduplication Check Missing
**What goes wrong:** A rider submits the same activity twice (e.g., double-clicks confirm button). Without dedup, the same activity is written twice.
**Why it happens:** Network retry or user impatience.
**How to avoid:** Before writing, check if the existing file's `day1.activityId` or `day2.activityId` matches the submitted `activityId`. If it does, return 200 with `{ ok: true, duplicate: true }` — no write needed.
**Exception:** `activityId === "manual"` is the sentinel for CSV fallback — dedup must not reject this.

### Pitfall 7: Build Hook URL Must Be Env Var, Not Hardcoded
**What goes wrong:** Build hook URL contains a secret token (the hook ID). Hardcoding it exposes the token in git history.
**Why it happens:** Easy to paste URL inline during development.
**How to avoid:** Always read from `process.env.NETLIFY_BUILD_HOOK`. The health.js function already checks for this env var's presence.

---

## Code Examples

Verified patterns from official sources:

### GitHub Contents API: File Write (Create or Update)
```javascript
// Source: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28
// PUT /repos/{owner}/{repo}/contents/{path}
// - 201 = created, 200 = updated, 409 = SHA conflict (retry)
// - content must be base64-encoded
// - sha only required for updates

const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64");

const putRes = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, content, ...(sha ? { sha } : {}) }),
  }
);
// putRes.status: 201 (create) or 200 (update)
```

### GitHub Contents API: File Delete
```javascript
// Source: https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28#delete-a-file
// DELETE /repos/{owner}/{repo}/contents/{path}
// - sha required (from prior GET)
// - body must be JSON-stringified (not query params)
// - 200 = deleted, 404 = already gone (idempotent)

const deleteRes = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
  {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message: "deauth: remove athlete data", sha }),
  }
);
```

### Netlify Build Hook Trigger
```javascript
// Source: https://docs.netlify.com/configure-builds/build-hooks/
// POST to hook URL — no auth, no headers, empty body OK
// Fire-and-forget: don't await or check response

fetch(process.env.NETLIFY_BUILD_HOOK, { method: "POST", body: "{}" });
// No await — fire and forget
```

### Strava Webhook Validation Response
```javascript
// Source: https://developers.strava.com/docs/webhooks/
// Respond to GET with hub.challenge echoed as JSON within 2 seconds

return {
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ "hub.challenge": event.queryStringParameters["hub.challenge"] }),
};
```

### Strava Webhook Subscription Registration (one-time, via curl or script)
```bash
# Source: https://developers.strava.com/docs/webhooks/
# Run once to register the endpoint with Strava

curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://YOUR_SITE.netlify.app/api/strava-webhook \
  -F verify_token=YOUR_VERIFY_TOKEN

# Response: { "id": 12345 }
# Store this id — needed to delete the subscription if callback URL changes
```

### Athlete JSON File Path
```javascript
// Source: DATA-MODEL.md §1
const path = `public/data/results/athletes/${athleteId}.json`;
// athleteId is plain string (e.g., "12345678" for Strava, "manual-001" for fallback)
```

### Athlete JSON Schema (from DATA-MODEL.md)
```jsonc
{
  "athleteId": "12345678",        // string — Strava numeric ID or "manual-NNN"
  "displayName": "Alex M.",        // rider-chosen, locked after first submission
  "category": "women",             // "men" | "women" | "non-binary", locked after first
  "day1": {                        // null if not yet submitted
    "movingTimeSeconds": 16953,
    "activityId": "98765432101",   // "manual" for CSV fallback
    "submittedAt": "2026-06-06T20:14:33Z"
  },
  "day2": {                        // null if not yet submitted
    "sectorEfforts": { "12345678901": 714 },
    "komSegmentIds": ["55544433322"],
    "komEfforts": { "55544433322": 847 },  // added in Phase 6-01
    "activityId": "11122233344",
    "submittedAt": "2026-06-07T19:47:12Z"
  },
  "createdAt": "2026-06-06T20:14:33Z",
  "updatedAt": "2026-06-07T19:47:12Z"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Classic PAT (`repo` scope) | Fine-grained PAT (Contents: read+write only) | 2022 | Reduced blast radius if token leaked |
| `exports.handler` (CommonJS v1) | `export const handler` (ESM v1) | When project set `"type": "module"` | Wrong syntax causes function to not export |
| Netlify Functions v2 `export default` | v1 `export const handler` — **project-enforced** | Project decision (known v2 env var bug 2026-03-28) | Must NOT use v2 syntax in this project |

**Deprecated/outdated:**
- `exports.handler` in .js files: Fails because `package.json` has `"type": "module"`. Use `export const handler`.
- Netlify Functions v2 (`export default`): Has confirmed env var bug as of project decision date. All new functions must use v1 syntax.

---

## Open Questions

1. **Does komEfforts need to be persisted in day2?**
   - What we know: DATA-MODEL.md §1 shows `sectorEfforts` and `komSegmentIds` in day2, but `komEfforts` (Record<segId, elapsed_time>) was added in Phase 6-01 and is carried in the confirm page payload.
   - What's unclear: Whether `komEfforts` should be written to the athlete JSON (for future scoring recalculation) or discarded (as it's derivable from raw Strava activity, but not re-fetchable once the activity is gone).
   - Recommendation: Write `komEfforts` to day2 for forward compatibility. It's already in the form payload and the scoring engine can use it for KOM time comparisons. Confirm with DATA-MODEL.md whether the schema needs updating.

2. **Submit-success page exists?**
   - What we know: The confirm page currently shows "Submission ready" as a placeholder. Phase 7 needs to redirect somewhere after successful write.
   - What's unclear: Whether Phase 7 creates `/submit-success` or redirects back to `/` with a query param.
   - Recommendation: Redirect to `/?submitted=true` (adds anchor scroll to leaderboard) to keep scope minimal. Or create `/submit-success` as a simple static page — either approach works.

3. **GITHUB_TOKEN permission scope**
   - What we know: Contents write permission required for PUT/DELETE. Fine-grained PAT scoped to single repo is most secure.
   - What's unclear: Whether the existing GITHUB_TOKEN in the project's env vars is already configured or needs to be created.
   - Recommendation: Plan 07-01 should include a note to create/verify GITHUB_TOKEN with Contents: Read and write on the ironPineOmnium repo only.

4. **Strava webhook subscription ID storage**
   - What we know: Creating a subscription returns an ID needed to delete/update the subscription later.
   - What's unclear: Where to store this ID (not in the repo, likely just noted in docs).
   - Recommendation: Document the ID in a `.planning` note after Plan 07-05 runs; no code storage needed.

---

## Sources

### Primary (HIGH confidence)
- https://docs.github.com/en/rest/repos/contents?apiVersion=2022-11-28 — GET/PUT/DELETE contents API, SHA requirements, status codes
- https://docs.netlify.com/configure-builds/build-hooks/ — Build hook POST trigger, URL format, optional params
- https://developers.strava.com/docs/webhooks/ — Subscription handshake, event payload structure, deauth event shape
- https://docs.netlify.com/functions/get-started/ — v1 Lambda event object shape, body/isBase64Encoded handling

### Secondary (MEDIUM confidence)
- https://communityhub.strava.com/developers-api-7/webhook-event-data-schema-2335 — Confirms `"authorized": "false"` is a string (not boolean)
- https://github.com/orgs/community/discussions/62198 — 409 conflict behavior on repeated writes, SHA stale issue
- https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens — Contents write permission for PUT/DELETE

### Tertiary (LOW confidence)
- WebSearch results on Netlify function form body parsing — suggests URLSearchParams works but JSON fetch approach avoids ambiguity

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs are official, well-documented, used in similar projects
- Architecture patterns: HIGH — GET-then-PUT with SHA is the canonical GitHub Contents API pattern
- Pitfalls: HIGH (SHA requirement, locked fields) / MEDIUM (authorized field string vs bool, 2-second window)
- Code examples: HIGH — derived directly from official API docs

**Research date:** 2026-04-07
**Valid until:** 2026-09-01 (GitHub API stable; Strava webhook schema unlikely to change before event)
