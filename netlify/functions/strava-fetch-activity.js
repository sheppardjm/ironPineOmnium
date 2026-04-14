// Netlify Functions v1 (Lambda-compatible, ESM)
// Uses `export const handler` — NOT `export default` (which is v2, forbidden).
// This project has "type": "module" in package.json, so .js files are ESM.
//
// Accepts a POST with { activityUrl: string } in the body.
// Validates session, refreshes token if needed, fetches the activity from
// the Strava API, checks ownership and date range, extracts segment efforts,
// and returns structured JSON. All user-recoverable validation errors use
// HTTP 200 with { error: "code" } — only session/auth infrastructure failures
// use HTTP 401.

import { parse, serialize } from "cookie-es";
import { getValidAccessToken } from "./lib/strava-tokens.js";
import { SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from "../../src/lib/segments.ts";
import {
  EVENT_DATES,
  DAY1_DATE,
  DAY2_DATE,
  DAY1_MIN_DISTANCE_METERS,
  DAY2_MIN_DISTANCE_METERS,
  GUN_EPOCH_SECONDS,
  START_WINDOW_SECONDS,
} from "../../src/lib/event-config.ts";

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

  // Step 2: Refresh token if needed
  let accessToken, refreshToken, expiresAt, updated;
  try {
    ({ accessToken, refreshToken, expiresAt, updated } = await getValidAccessToken(session));
  } catch (_err) {
    return {
      statusCode: 401,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "token_refresh_failed" }),
    };
  }

  // If the token was refreshed, prepare an updated session cookie
  const multiValueHeaders = {};
  if (updated) {
    const isLocal = process.env.NETLIFY_DEV === "true";
    const updatedPayload = JSON.stringify({
      athleteId: session.athleteId,
      athleteFirstname: session.athleteFirstname || "",
      athleteLastname: session.athleteLastname || "",
      accessToken,
      refreshToken,
      expiresAt,
    });
    const updatedCookie = serialize("strava_session", updatedPayload, {
      httpOnly: true,
      secure: !isLocal,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    multiValueHeaders["Set-Cookie"] = [updatedCookie];
  }

  // Step 3: Parse activity URL
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (_err) {
    body = {};
  }

  const activityUrl = body.activityUrl || "";
  const match = activityUrl.match(/strava\.com\/activities\/(\d+)/);

  if (!match) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({ error: "invalid_url" }),
    };
  }

  const activityId = match[1]; // string

  // Step 4: Fetch activity from Strava API
  let activity;
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const status = res.status;
      if (status === 401 || status === 404) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
          body: JSON.stringify({ error: "activity_not_found" }),
        };
      }
      if (status === 429) {
        return {
          statusCode: 200,
          headers: { "Content-Type": "application/json" },
          ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
          body: JSON.stringify({ error: "rate_limited" }),
        };
      }
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
        body: JSON.stringify({ error: "strava_api_error", statusCode: status }),
      };
    }

    activity = await res.json();
  } catch (_err) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({ error: "network_error" }),
    };
  }

  // Step 5: Ownership check
  // activity.athlete.id is a number from the API; session.athleteId is a string.
  if (String(activity.athlete.id) !== session.athleteId) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({ error: "wrong_athlete" }),
    };
  }

  // Step 6: Date validation
  // start_date_local has a misleading Z suffix — slice(0,10) gives the local date directly.
  const localDateStr = activity.start_date_local.slice(0, 10);

  if (!EVENT_DATES.includes(localDateStr)) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({
        error: "wrong_date",
        actualDate: localDateStr,
        expectedDates: EVENT_DATES,
      }),
    };
  }

  // Step 7: Segment effort extraction
  const efforts = activity.segment_efforts || [];

  // Build sectorEfforts: segId -> elapsed_time (fastest effort per segment)
  const sectorEfforts = {};
  for (const effort of efforts) {
    const segId = String(effort.segment.id);
    if (SECTOR_SEGMENT_IDS.includes(segId)) {
      if (!(segId in sectorEfforts) || effort.elapsed_time < sectorEfforts[segId]) {
        sectorEfforts[segId] = effort.elapsed_time;
      }
    }
  }

  // Build komSegmentIds: unique segment IDs for KOM segments the rider completed
  const komSet = new Set();
  for (const effort of efforts) {
    const segId = String(effort.segment.id);
    if (KOM_SEGMENT_IDS.includes(segId)) {
      komSet.add(segId);
    }
  }
  const komSegmentIds = Array.from(komSet);

  // Build komEfforts: segId -> elapsed_time (fastest effort per KOM segment)
  const komEfforts = {};
  for (const effort of efforts) {
    const segId = String(effort.segment.id);
    if (KOM_SEGMENT_IDS.includes(segId)) {
      if (!(segId in komEfforts) || effort.elapsed_time < komEfforts[segId]) {
        komEfforts[segId] = effort.elapsed_time;
      }
    }
  }

  const distanceMeters = activity.distance;
  const startDate = activity.start_date;

  // Step 7.5: Validation gates (VAL-01 through VAL-04)
  // Order is critical: hidden_start_time MUST precede epoch arithmetic.

  // VAL-04: Hidden start time — reject before any epoch arithmetic.
  // Strava emits T00:00:01Z when "Hide Start Time" is enabled, which parses
  // as midnight UTC and would falsely trigger the start-time window check.
  if (startDate.endsWith("T00:00:01Z")) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({ error: "hidden_start_time" }),
    };
  }

  // VAL-01 / VAL-02: Distance gate — enforces per-day minimum.
  const isDay1 = localDateStr === DAY1_DATE;
  const minDistanceMeters = isDay1 ? DAY1_MIN_DISTANCE_METERS : DAY2_MIN_DISTANCE_METERS;
  const minDistanceKm = isDay1 ? 156 : 153;

  if (distanceMeters < minDistanceMeters) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({
        error: "distance_too_short",
        actualDistanceKm: Math.round(distanceMeters / 10) / 100,
        minDistanceKm,
      }),
    };
  }

  // VAL-03: Start-time window — Day 1 only.
  // Reject if activity started more than 30 minutes after the 8:00 AM ET gun.
  if (isDay1) {
    const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
    const cutoffEpoch = GUN_EPOCH_SECONDS + START_WINDOW_SECONDS;
    if (startEpoch > cutoffEpoch) {
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
        body: JSON.stringify({
          error: "start_too_late",
          actualStartTime: startDate,
          cutoffTime: new Date(cutoffEpoch * 1000).toISOString(),
        }),
      };
    }
  }

  // Step 8: Return trimmed response
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : undefined),
    body: JSON.stringify({
      activityId: String(activity.id),
      athleteId: session.athleteId,
      athleteFirstname: session.athleteFirstname || "",
      athleteLastname: session.athleteLastname || "",
      movingTimeSeconds: activity.moving_time,
      startDateLocal: localDateStr,
      sectorEfforts,
      komSegmentIds,
      komEfforts,   // NEW: elapsed times for KOM segments
      distanceMeters,
      startDate,
    }),
  };
};
