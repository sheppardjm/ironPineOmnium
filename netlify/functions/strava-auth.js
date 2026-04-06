// Netlify Functions v1 (Lambda-compatible, ESM)
// Uses `export const handler` — NOT `export default` (which is v2, forbidden).
// This project has "type": "module" in package.json, so .js files are ESM.
//
// Initiates the Strava OAuth flow by redirecting the user to Strava's
// authorization page with a CSRF nonce stored in an HttpOnly cookie.

import crypto from "crypto";
import { serialize } from "cookie-es";

export const handler = async (event, context) => {
  // Generate a 32-byte random CSRF nonce (hex string)
  const nonce = crypto.randomBytes(32).toString("hex");

  // Detect local dev so we can relax the Secure flag
  const isLocal = process.env.NETLIFY_DEV === "true";

  // Serialize the CSRF cookie — HttpOnly prevents JS access
  const csrfCookie = serialize("strava_csrf", nonce, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  // Build the Strava authorization URL
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:read_all",
    state: nonce,
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params.toString()}`;

  return {
    statusCode: 302,
    headers: {
      Location: stravaAuthUrl,
      "Set-Cookie": csrfCookie,
      "Cache-Control": "no-cache",
    },
    body: "",
  };
};
