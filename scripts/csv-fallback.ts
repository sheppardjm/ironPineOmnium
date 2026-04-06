/**
 * csv-fallback.ts — Iron & Pine Omnium manual CSV ingestion script
 *
 * Usage:
 *   npx tsx scripts/csv-fallback.ts <path/to/results.csv> [--commit]
 *
 * Reads a CSV of rider results, validates against segment constants, builds
 * per-athlete JSON matching the DATA-MODEL.md schema, and optionally commits
 * each file to GitHub via the Contents API.
 *
 * By default this is a DRY RUN — pass --commit to actually write to GitHub.
 *
 * Environment variables (read from .env or process.env):
 *   GITHUB_TOKEN  — personal access token with repo write access
 *   GITHUB_OWNER  — GitHub repository owner (e.g. "sheppardjm")
 *   GITHUB_REPO   — GitHub repository name (e.g. "ironPineOmnium")
 *
 * Dependencies: Node.js built-ins only (fs, https, path). No npm install needed.
 */

import * as fs from "fs";
import * as https from "https";
import * as path from "path";

// ---------------------------------------------------------------------------
// Segment constants (source of truth — keep in sync with src/lib/segments.ts)
// ---------------------------------------------------------------------------

// Import directly from src/lib/segments.ts so there is a single source of truth.
// When running with npx tsx, TypeScript path resolution handles this correctly.
import {
  SECTOR_SEGMENT_IDS,
  KOM_SEGMENT_IDS,
} from "../src/lib/segments.js";

import { categoryIds } from "../src/lib/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryId = (typeof categoryIds)[number];

interface Day1Data {
  movingTimeSeconds: number;
  activityId: string;
  submittedAt: string;
}

interface Day2Data {
  sectorEfforts: Record<string, number>;
  komSegmentIds: string[];
  activityId: string;
  submittedAt: string;
}

interface AthleteJson {
  athleteId: string;
  displayName: string;
  category: CategoryId;
  day1: Day1Data | null;
  day2: Day2Data | null;
  createdAt: string;
  updatedAt: string;
}

interface ParsedRow {
  display_name: string;
  category: string;
  day1_moving_time_seconds: string;
  [key: string]: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  athleteJson?: AthleteJson;
}

// ---------------------------------------------------------------------------
// .env loader (simple — no dotenv dependency)
// ---------------------------------------------------------------------------

function loadDotEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// CSV parser (manual — no external deps)
// ---------------------------------------------------------------------------

function parseCsv(content: string): ParsedRow[] {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  if (nonEmpty.length < 2) return [];

  const headers = parseCsvLine(nonEmpty[0]);
  const rows: ParsedRow[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const values = parseCsvLine(nonEmpty[i]);
    const row: ParsedRow = {
      display_name: "",
      category: "",
      day1_moving_time_seconds: "",
    };
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped double-quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ---------------------------------------------------------------------------
// Row validation and JSON builder
// ---------------------------------------------------------------------------

function buildAthleteJson(
  row: ParsedRow,
  athleteId: string,
  now: string
): ValidationResult {
  const errors: string[] = [];

  // --- Validate display_name ---
  const displayName = row.display_name?.trim();
  if (!displayName) {
    errors.push("display_name is required");
  }

  // --- Validate category ---
  const category = row.category?.trim() as CategoryId;
  if (!categoryIds.includes(category)) {
    errors.push(
      `category "${row.category}" is invalid — must be one of: ${categoryIds.join(", ")}`
    );
  }

  // --- Build Day 1 ---
  let day1: Day1Data | null = null;
  const rawDay1 = row.day1_moving_time_seconds?.trim();
  if (rawDay1) {
    const secs = parseInt(rawDay1, 10);
    if (isNaN(secs) || secs <= 0) {
      errors.push(
        `day1_moving_time_seconds "${rawDay1}" is invalid — must be a positive integer`
      );
    } else {
      day1 = {
        movingTimeSeconds: secs,
        activityId: "manual",
        submittedAt: now,
      };
    }
  }

  // --- Build Day 2 ---
  let day2: Day2Data | null = null;

  // Collect sector efforts from columns named day2_sector_{id}
  const sectorEfforts: Record<string, number> = {};
  for (const segId of SECTOR_SEGMENT_IDS) {
    const colName = `day2_sector_${segId}`;
    const raw = row[colName]?.trim();
    if (raw) {
      const secs = parseInt(raw, 10);
      if (isNaN(secs) || secs <= 0) {
        errors.push(
          `${colName} "${raw}" is invalid — must be a positive integer`
        );
      } else {
        sectorEfforts[segId] = secs;
      }
    }
  }

  // Collect KOM completions from columns named day2_kom_{id}
  const komSegmentIds: string[] = [];
  for (const segId of KOM_SEGMENT_IDS) {
    const colName = `day2_kom_${segId}`;
    const raw = row[colName]?.trim().toLowerCase();
    if (raw) {
      if (raw !== "yes" && raw !== "no") {
        errors.push(
          `${colName} "${row[colName]}" is invalid — must be "yes" or "no"`
        );
      } else if (raw === "yes") {
        komSegmentIds.push(segId);
      }
    }
  }

  // Only build day2 if at least one sector or KOM column has data
  const hasDay2Data =
    Object.keys(sectorEfforts).length > 0 || komSegmentIds.length > 0;
  if (hasDay2Data) {
    day2 = {
      sectorEfforts,
      komSegmentIds,
      activityId: "manual",
      submittedAt: now,
    };
  }

  // --- Validate at least one day present ---
  if (!day1 && !day2) {
    errors.push(
      "row has no day1 or day2 data — at least one day must have results"
    );
  }

  // --- Check for unknown day2_sector_* or day2_kom_* columns in the CSV ---
  for (const col of Object.keys(row)) {
    if (col.startsWith("day2_sector_")) {
      const segId = col.replace("day2_sector_", "");
      if (!(SECTOR_SEGMENT_IDS as readonly string[]).includes(segId)) {
        errors.push(
          `column "${col}" references unknown segment ID "${segId}" — not in SECTOR_SEGMENT_IDS`
        );
      }
    }
    if (col.startsWith("day2_kom_")) {
      const segId = col.replace("day2_kom_", "");
      if (!(KOM_SEGMENT_IDS as readonly string[]).includes(segId)) {
        errors.push(
          `column "${col}" references unknown segment ID "${segId}" — not in KOM_SEGMENT_IDS`
        );
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const athleteJson: AthleteJson = {
    athleteId,
    displayName: displayName!,
    category,
    day1,
    day2,
    createdAt: now,
    updatedAt: now,
  };

  return { valid: true, errors: [], athleteJson };
}

// ---------------------------------------------------------------------------
// GitHub Contents API helpers
// ---------------------------------------------------------------------------

function httpsRequest(
  options: https.RequestOptions,
  body?: string
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({ statusCode: res.statusCode ?? 0, body: data })
      );
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getFileShа(
  token: string,
  owner: string,
  repo: string,
  filePath: string
): Promise<string | null> {
  const res = await httpsRequest({
    hostname: "api.github.com",
    path: `/repos/${owner}/${repo}/contents/${filePath}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "iron-pine-csv-fallback",
      Accept: "application/vnd.github+json",
    },
  });
  if (res.statusCode === 404) return null;
  if (res.statusCode === 200) {
    const parsed = JSON.parse(res.body) as { sha?: string };
    return parsed.sha ?? null;
  }
  throw new Error(`GET ${filePath} returned HTTP ${res.statusCode}: ${res.body}`);
}

async function putFile(
  token: string,
  owner: string,
  repo: string,
  filePath: string,
  content: string,
  message: string,
  sha: string | null
): Promise<void> {
  const encoded = Buffer.from(content).toString("base64");
  const bodyObj: Record<string, unknown> = { message, content: encoded };
  if (sha) bodyObj.sha = sha;
  const bodyStr = JSON.stringify(bodyObj);

  const res = await httpsRequest(
    {
      hostname: "api.github.com",
      path: `/repos/${owner}/${repo}/contents/${filePath}`,
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "iron-pine-csv-fallback",
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
      },
    },
    bodyStr
  );

  if (res.statusCode !== 200 && res.statusCode !== 201) {
    throw new Error(
      `PUT ${filePath} returned HTTP ${res.statusCode}: ${res.body}`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  loadDotEnv();

  const args = process.argv.slice(2);
  const csvArg = args.find((a) => !a.startsWith("--"));
  const commitFlag = args.includes("--commit");

  if (!csvArg) {
    console.error(
      "Usage: npx tsx scripts/csv-fallback.ts <path/to/results.csv> [--commit]"
    );
    process.exit(1);
  }

  const csvPath = path.resolve(process.cwd(), csvArg);
  if (!fs.existsSync(csvPath)) {
    console.error(`Error: file not found: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csvContent);

  if (rows.length === 0) {
    console.error("Error: CSV has no data rows (only header or empty file).");
    process.exit(1);
  }

  console.log(`\nIron & Pine Omnium — CSV Fallback Script`);
  console.log(`=========================================`);
  console.log(`CSV file   : ${csvPath}`);
  console.log(`Mode       : ${commitFlag ? "COMMIT (writing to GitHub)" : "DRY RUN (no writes)"}`);
  console.log(`Rows found : ${rows.length}`);
  console.log(``);

  if (commitFlag) {
    const token = process.env.GITHUB_TOKEN;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if (!token || !owner || !repo) {
      console.error(
        "Error: --commit requires GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO " +
          "to be set in .env or as environment variables."
      );
      process.exit(1);
    }
  }

  const now = new Date().toISOString();
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const athleteId = `manual-${String(rowNum).padStart(3, "0")}`;

    console.log(`--- Row ${rowNum}: "${row.display_name}" → ${athleteId} ---`);

    const result = buildAthleteJson(row, athleteId, now);

    if (!result.valid) {
      console.error(`  VALIDATION FAILED:`);
      for (const err of result.errors) {
        console.error(`    • ${err}`);
      }
      console.error(`  → Skipping row ${rowNum}`);
      failed++;
      console.log(``);
      continue;
    }

    const json = JSON.stringify(result.athleteJson, null, 2);
    const filePath = `public/data/results/athletes/${athleteId}.json`;

    console.log(`  Athlete JSON:`);
    console.log(
      json
        .split("\n")
        .map((l) => `    ${l}`)
        .join("\n")
    );

    if (!commitFlag) {
      console.log(`  → [DRY RUN] Would commit to: ${filePath}`);
      succeeded++;
      console.log(``);
      continue;
    }

    // Commit to GitHub
    try {
      const token = process.env.GITHUB_TOKEN!;
      const owner = process.env.GITHUB_OWNER!;
      const repo = process.env.GITHUB_REPO!;

      console.log(`  Checking for existing file at ${filePath}...`);
      const sha = await getFileShа(token, owner, repo, filePath);
      const action = sha ? "Updating" : "Creating";
      console.log(`  ${action} file (sha: ${sha ?? "none"})...`);

      const msg = sha
        ? `chore(fallback): update ${athleteId} from CSV`
        : `chore(fallback): add ${athleteId} from CSV`;

      await putFile(token, owner, repo, filePath, json, msg, sha);
      console.log(`  SUCCESS: committed ${filePath}`);
      succeeded++;
    } catch (err) {
      console.error(`  ERROR: ${(err as Error).message}`);
      failed++;
      skipped++;
    }

    console.log(``);
  }

  // Summary
  console.log(`=========================================`);
  console.log(`Summary`);
  console.log(`  Succeeded : ${succeeded}`);
  console.log(`  Failed    : ${failed}`);
  if (!commitFlag) {
    console.log(``);
    console.log(`This was a dry run. Run with --commit to write to GitHub.`);
  }
  console.log(``);

  if (failed > 0 && succeeded === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
