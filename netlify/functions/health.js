// Netlify Functions v1 (Lambda-compatible, ESM)
// Uses `export const handler` — NOT `export default` (which is v2, forbidden).
// This project has "type": "module" in package.json, so .js files are ESM.

const REQUIRED_ENV = [
  "STRAVA_CLIENT_ID",
  "STRAVA_CLIENT_SECRET",
  "STRAVA_REDIRECT_URI",
  "STRAVA_VERIFY_TOKEN",
  "GITHUB_TOKEN",
  "GITHUB_OWNER",
  "GITHUB_REPO",
  "NETLIFY_BUILD_HOOK",
];

export const handler = async (event, context) => {
  const env = {};
  for (const key of REQUIRED_ENV) {
    env[key] = typeof process.env[key] === "string" && process.env[key].length > 0;
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, env }),
  };
};
