// Netlify Functions v1 (Lambda-compatible, ESM)
// Uses `export const handler` — NOT `export default` (which is v2, forbidden).
// This project has "type": "module" in package.json, so .js files are ESM.
//
// Accepts a POST with confirmed submission data from /submit-confirm.
// Validates session (reads strava_session cookie), verifies athlete ID matches,
// writes (or updates) the athlete JSON file to GitHub via the Contents API,
// and triggers a Netlify rebuild. All user-recoverable validation errors use
// HTTP 200 with { error: "code" } — only session/auth infrastructure failures
// use non-200.

import { parse } from "cookie-es";

const GITHUB_API = "https://api.github.com";

export const handler = async (event, _context) => {
  // Step 1: Read strava_session cookie
  const cookies = parse(event.headers.cookie || "");
  const rawSession = cookies.strava_session;

  if (!rawSession) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "no_session" }),
    };
  }

  let session;
  try {
    session = JSON.parse(rawSession);
  } catch (_err) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "no_session" }),
    };
  }

  // Step 2: Only accept POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "method_not_allowed" }),
    };
  }

  // Step 3: Parse and validate request body
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "invalid_payload" }),
    };
  }

  const { name, category, activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds, komEfforts } = body;

  // Basic validation
  const validCategories = ["men", "women", "non-binary"];
  if (
    !name || typeof name !== "string" || name.trim().length === 0 ||
    !validCategories.includes(category) ||
    !activityId || typeof activityId !== "string" || activityId.trim().length === 0 ||
    !athleteId || typeof athleteId !== "string" || athleteId.trim().length === 0
  ) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "invalid_payload" }),
    };
  }

  // Step 4: Athlete ID mismatch check (SECURITY)
  // body.athleteId must match the authenticated session's athleteId
  if (body.athleteId !== session.athleteId) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "athlete_mismatch" }),
    };
  }

  // Step 5: Determine which day from startDateLocal
  // TEMPORARY: accept any date for Strava review screenshots, default to Day 1
  let isDay1;
  if (startDateLocal === "2026-06-07") {
    isDay1 = false;
  } else {
    isDay1 = true;
  }

  // Step 6: GitHub Contents API — GET existing file
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const filePath = `public/data/results/athletes/${body.athleteId}.json`;
  const ghHeaders = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  let existingData = null;
  let sha;

  const getRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: ghHeaders }
  );

  if (getRes.status === 200) {
    const existing = await getRes.json();
    sha = existing.sha;
    // Decode base64 content — GitHub returns it with newlines, Buffer handles that
    const decoded = Buffer.from(existing.content, "base64").toString("utf-8");
    existingData = JSON.parse(decoded);
  } else if (getRes.status === 404) {
    existingData = null;
    sha = undefined;
  } else {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "github_error" }),
    };
  }

  // Step 7: Deduplication check — skip write if this activityId is already stored
  if (existingData !== null && activityId !== "manual") {
    if (
      existingData.day1?.activityId === activityId ||
      existingData.day2?.activityId === activityId
    ) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ok: true, duplicate: true }),
      };
    }
  }

  // Step 8: Build the athlete JSON object
  const now = new Date().toISOString();

  let athleteData;

  if (existingData === null) {
    // New athlete file — use submitted name and category
    athleteData = {
      athleteId: body.athleteId,
      displayName: body.name.trim(),
      category: body.category,
      day1: null,
      day2: null,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    // Updating existing file — identity lock: ignore submitted name/category
    athleteData = {
      ...existingData,
      updatedAt: now,
    };
  }

  // Set the appropriate day object
  if (isDay1) {
    athleteData.day1 = {
      movingTimeSeconds: Number(body.movingTimeSeconds),
      activityId: body.activityId,
      submittedAt: now,
    };
  } else {
    athleteData.day2 = {
      sectorEfforts: body.sectorEfforts || {},
      komSegmentIds: body.komSegmentIds || [],
      komEfforts: body.komEfforts || {},
      activityId: body.activityId,
      submittedAt: now,
    };
  }

  // Step 9: GitHub Contents API — PUT
  const putBody = {
    message: `submission: ${body.athleteId} ${isDay1 ? "day1" : "day2"}`,
    content: Buffer.from(JSON.stringify(athleteData, null, 2)).toString("base64"),
    ...(sha ? { sha } : {}),
  };

  let putRes = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    }
  );

  // Handle 409 SHA conflict with a single retry
  if (putRes.status === 409) {
    // Re-GET to fetch the current SHA
    const retryGetRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
      { headers: ghHeaders }
    );

    if (!retryGetRes.ok) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "write_conflict" }),
      };
    }

    const retryExisting = await retryGetRes.json();
    const retryPutBody = {
      ...putBody,
      sha: retryExisting.sha,
    };

    putRes = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify(retryPutBody),
      }
    );

    if (!putRes.ok) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "write_conflict" }),
      };
    }
  } else if (!putRes.ok) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "github_write_error" }),
    };
  }

  // Step 10: Trigger Netlify build hook (fire-and-forget)
  const hookUrl = process.env.NETLIFY_BUILD_HOOK;
  if (hookUrl) {
    fetch(hookUrl, { method: "POST", body: "{}" }).catch(() => {});
  }

  // Step 11: Return success
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true }),
  };
};
