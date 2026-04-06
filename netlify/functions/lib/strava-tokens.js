// Shared token refresh utility for Netlify Functions. Not a function endpoint — no handler export.
//
// Imported by downstream functions (Phase 4+) that need to make Strava API calls.
// Callers are responsible for reading/writing session cookies — this module is a pure utility.

const BUFFER_SECONDS = 300; // 5-minute buffer before expiry triggers a refresh

/**
 * Returns a valid access token, refreshing if needed.
 *
 * The athlete object is NOT included in refresh responses — only in the initial
 * authorization_code exchange (handled in strava-callback.js).
 *
 * @param {Object} session - { accessToken, refreshToken, expiresAt, athleteId }
 * @returns {Promise<{ accessToken: string, refreshToken: string, expiresAt: number, updated: boolean }>}
 *   `updated` is true if a refresh occurred — the caller must update the session cookie when true.
 */
export async function getValidAccessToken(session) {
  const { accessToken, refreshToken, expiresAt } = session;

  const nowUnix = Math.floor(Date.now() / 1000);

  // Token is still valid with buffer to spare — return as-is
  if (expiresAt - nowUnix > BUFFER_SECONDS) {
    return { accessToken, refreshToken, expiresAt, updated: false };
  }

  // Token is expired or expiring soon — refresh it
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error("Token refresh failed: " + res.status);
  }

  const data = await res.json();

  // CRITICAL: Strava may rotate the refresh token — always use the returned value.
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
    updated: true,
  };
}
