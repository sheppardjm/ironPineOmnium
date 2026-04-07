// Netlify Functions v1 (Lambda-compatible, ESM)
// Uses `export const handler` — NOT `export default` (which is v2, forbidden).
// This project has "type": "module" in package.json, so .js files are ESM.
//
// Handles two concerns:
// 1. GET: Strava subscription validation handshake — echoes hub.challenge when
//    hub.verify_token matches STRAVA_VERIFY_TOKEN.
// 2. POST: Ongoing Strava webhook events — detects deauth (athlete revokes access)
//    and deletes the athlete's JSON file from GitHub via the Contents API, then
//    triggers a Netlify rebuild. Always returns 200 to prevent Strava retries.
//
// No imports needed — uses only built-in fetch() (Node 18+).

const GITHUB_API = "https://api.github.com";

export const handler = async (event, _context) => {
  const method = event.httpMethod;

  // ── GET: Strava subscription handshake ──────────────────────────────────────
  if (method === "GET") {
    const params = event.queryStringParameters || {};
    if (
      params["hub.mode"] === "subscribe" &&
      params["hub.verify_token"] === process.env.STRAVA_VERIFY_TOKEN
    ) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "hub.challenge": params["hub.challenge"] }),
      };
    }
    return { statusCode: 403, body: "Forbidden" };
  }

  // ── POST: Incoming webhook events ───────────────────────────────────────────
  if (method === "POST") {
    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      // Unparseable body — acknowledge so Strava does not retry
      return { statusCode: 200, body: "EVENT_RECEIVED" };
    }

    // Detect deauth: athlete object update with authorized revoked.
    // Strava sends authorized as string "false"; check boolean false defensively.
    const isDeauth =
      payload.object_type === "athlete" &&
      payload.aspect_type === "update" &&
      (payload.updates?.authorized === "false" ||
        payload.updates?.authorized === false);

    if (isDeauth) {
      try {
        const athleteId = String(payload.owner_id);
        const filePath = `public/data/results/athletes/${athleteId}.json`;
        const owner = process.env.GITHUB_OWNER;
        const repo = process.env.GITHUB_REPO;
        const ghHeaders = {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        };

        // Step 1: GET the file to retrieve its SHA (required for DELETE)
        const getRes = await fetch(
          `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
          { headers: ghHeaders }
        );

        if (getRes.status === 404) {
          // File already gone — nothing to do
        } else if (getRes.ok) {
          const fileData = await getRes.json();
          const sha = fileData.sha;

          // Step 2: DELETE the file using the retrieved SHA
          const delRes = await fetch(
            `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
            {
              method: "DELETE",
              headers: ghHeaders,
              body: JSON.stringify({
                message: `deauth: remove athlete ${athleteId}`,
                sha,
              }),
            }
          );

          if (!delRes.ok && delRes.status !== 404) {
            console.error(
              `strava-webhook: DELETE failed for athlete ${athleteId} — status ${delRes.status}`
            );
          } else {
            // Step 3: Trigger rebuild (fire-and-forget)
            const hookUrl = process.env.NETLIFY_BUILD_HOOK;
            if (hookUrl) {
              fetch(hookUrl, { method: "POST", body: "{}" }).catch(() => {});
            }
          }
        } else {
          console.error(
            `strava-webhook: GET file failed for athlete ${athleteId} — status ${getRes.status}`
          );
        }
      } catch (err) {
        // Log but never return non-200 — Strava would retry on error
        console.error(`strava-webhook: deauth handling error — ${err.message}`);
      }
    }

    // Always acknowledge all POST events
    return { statusCode: 200, body: "EVENT_RECEIVED" };
  }

  // ── Other methods ────────────────────────────────────────────────────────────
  return { statusCode: 405, body: "Method Not Allowed" };
};
