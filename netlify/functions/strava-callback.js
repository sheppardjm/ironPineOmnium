// Netlify Functions v1 (Lambda-compatible, ESM)
// Uses `export const handler` — NOT `export default` (which is v2, forbidden).
// This project has "type": "module" in package.json, so .js files are ESM.
//
// Handles the OAuth callback from Strava after the user authorizes (or denies).
// Verifies the CSRF nonce, exchanges the authorization code for tokens, sets a
// session cookie, and clears the CSRF cookie.

import { parse, serialize } from "cookie-es";

export const handler = async (event, context) => {
  const params = event.queryStringParameters || {};

  // Step 1: Handle user denial
  if (params.error === "access_denied") {
    return {
      statusCode: 302,
      headers: { Location: "/error?reason=strava_denied", "Cache-Control": "no-cache" },
      body: "",
    };
  }

  // Step 2: Verify CSRF nonce
  const cookies = parse(event.headers.cookie || "");
  const csrfCookie = cookies.strava_csrf;
  const stateParam = params.state;

  if (!csrfCookie || !stateParam || csrfCookie !== stateParam) {
    return {
      statusCode: 302,
      headers: { Location: "/error?reason=csrf_mismatch", "Cache-Control": "no-cache" },
      body: "",
    };
  }

  // Step 3: Verify granted scope includes activity:read_all
  const grantedScope = params.scope || "";
  if (!grantedScope.split(",").includes("activity:read_all")) {
    return {
      statusCode: 302,
      headers: { Location: "/error?reason=insufficient_scope", "Cache-Control": "no-cache" },
      body: "",
    };
  }

  // Step 4: Exchange authorization code for tokens
  const code = params.code;
  let tokenData;

  try {
    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      return {
        statusCode: 302,
        headers: { Location: "/error?reason=token_exchange_failed", "Cache-Control": "no-cache" },
        body: "",
      };
    }

    tokenData = await res.json();
  } catch (_err) {
    return {
      statusCode: 302,
      headers: { Location: "/error?reason=token_exchange_failed", "Cache-Control": "no-cache" },
      body: "",
    };
  }

  // The athlete object is ONLY present in the initial authorization_code exchange response.
  // It is never included in token refresh responses.
  const athleteId = String(tokenData.athlete.id);
  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token;
  const expiresAt = tokenData.expires_at;

  // Step 5: Set session cookie and clear CSRF cookie
  const isLocal = process.env.NETLIFY_DEV === "true";

  const sessionPayload = JSON.stringify({ athleteId, accessToken, refreshToken, expiresAt });

  const sessionCookie = serialize("strava_session", sessionPayload, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });

  const clearCsrf = serialize("strava_csrf", "", {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Use multiValueHeaders so both Set-Cookie headers are sent.
  // Using headers['Set-Cookie'] would only keep the last value.
  return {
    statusCode: 302,
    headers: { Location: "/", "Cache-Control": "no-cache" },
    multiValueHeaders: { "Set-Cookie": [sessionCookie, clearCsrf] },
    body: "",
  };
};
