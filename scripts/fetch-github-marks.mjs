/**
 * Pulls brand marks out of the repositories themselves.
 *
 *   node scripts/fetch-github-marks.mjs
 *
 * The third place a logo lives, after the deployed page's <head> and its header
 * markup: committed to the repo as a file. Next.js projects keep `app/icon.svg`,
 * others keep `public/logo.svg` or `assets/brand/mark.png`. None of it appears
 * in the served HTML, so scraping the site never finds it.
 *
 * One tree listing per repository, then the best-scoring path is downloaded raw.
 * Fills gaps left by scripts/fetch-marks.mjs rather than replacing its results.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const MARK_DIR = join(root, "public", "marks");
const MAP = join(root, "src", "data", "marks.json");

const OWNER = "bryankwandou";
const isWindows = process.platform === "win32";

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

function gh(args) {
  const opts = {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
  };
  try {
    return execFileSync("gh", args, opts);
  } catch (err) {
    if (!isWindows || typeof err.status === "number") throw err;
    return execFileSync("gh.cmd", args, { ...opts, shell: true });
  }
}

/**
 * Scores a repository path on how likely it is to be the project's own mark.
 *
 * Framework conventions score highest because they are unambiguous: a file at
 * `app/icon.svg` exists for exactly one reason. Generic image directories score
 * low, and anything reading as a screenshot, illustration, or vendor asset is
 * excluded outright.
 */
function scorePath(path) {
  const lower = path.toLowerCase();
  const name = basename(lower);
  const ext = extname(lower);

  if (![".svg", ".png", ".webp", ".ico"].includes(ext)) return 0;
  if (lower.includes("node_modules/") || lower.includes("/vendor/")) return 0;
  if (/screenshot|preview|banner|hero|cover|og-|opengraph|placeholder|demo|example|avatar|thumb/.test(lower)) return 0;
  if (/sprite|pattern|texture|background|bg-|illustration/.test(lower)) return 0;
  // Deeply nested files are components, not brand assets.
  if (path.split("/").length > 4) return 0;

  let score = 0;

  // Framework conventions: these paths mean "this is the app's mark".
  if (/^(src\/)?app\/icon(\d*)?\.(svg|png)$/.test(lower)) score += 100;
  if (/^(src\/)?app\/apple-icon\.(png|svg)$/.test(lower)) score += 92;
  if (/^public\/(logo|brand|mark|logomark|wordmark)\.(svg|png)$/.test(lower)) score += 95;
  if (/^public\/icon\.(svg|png)$/.test(lower)) score += 88;
  if (/^(logo|brand|mark)\.(svg|png)$/.test(lower)) score += 80;

  // Anything else whose filename names the brand.
  if (score === 0 && /\b(logo|logomark|wordmark|brandmark)\b/.test(name)) score += 60;
  if (score === 0 && /^icon\.(svg|png)$/.test(name)) score += 45;
  if (score === 0 && /^favicon\.svg$/.test(name)) score += 40;

  if (score === 0) return 0;

  // Vector survives the shelf's 96px tile; a 16px ico barely survives anything.
  if (ext === ".svg") score += 14;
  if (ext === ".ico") score -= 10;
  if (/\b(dark|white|inverse|mono)\b/.test(name)) score += 4; // reads on a dark plate
  if (/\b(light|black)\b/.test(name)) score -= 4;

  return score;
}

async function download(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, { redirect: "follow", signal: controller.signal });
    if (res.status >= 400) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const catalog = readJson(CATALOG, { entries: [] });
  const marks = readJson(MAP, {});
  mkdirSync(MARK_DIR, { recursive: true });

  // Only listings that still fall back to a generated mark, and only those with
  // a repository to look inside.
  const gaps = catalog.entries.filter((e) => !marks[e.slug] && e.repoName && !e.private);
  console.log(`looking inside ${gaps.length} repositories for a committed mark\n`);

  let found = 0;

  for (const entry of gaps) {
    let tree;
    try {
      const raw = gh([
        "api",
        `repos/${OWNER}/${entry.repoName}/git/trees/HEAD?recursive=1`,
        "--jq",
        "[.tree[] | select(.type==\"blob\") | .path] | @json",
      ]);
      tree = JSON.parse(JSON.parse(raw.trim()));
    } catch {
      console.log(`   --  ${entry.slug.padEnd(34)} tree unavailable`);
      continue;
    }

    const ranked = tree
      .map((path) => ({ path, score: scorePath(path) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
      console.log(`   --  ${entry.slug.padEnd(34)} no mark committed`);
      continue;
    }

    let stored = null;
    for (const candidate of ranked.slice(0, 3)) {
      const url = `https://raw.githubusercontent.com/${OWNER}/${entry.repoName}/HEAD/${candidate.path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;
      const body = await download(url);
      if (!body || body.length < 90) continue;
      // Git LFS pointers are text, not images.
      if (body.slice(0, 40).toString("utf8").startsWith("version https://git-lfs")) continue;

      const ext = extname(candidate.path).toLowerCase();
      const file = `${entry.slug}${ext}`;
      writeFileSync(join(MARK_DIR, file), body);
      stored = {
        file,
        source: `github:${entry.repoName}/${candidate.path}`,
        kind: "repo",
        bytes: body.length,
        digest: createHash("sha256").update(body).digest("hex"),
      };
      console.log(`  got  ${entry.slug.padEnd(34)} ${candidate.path}`);
      break;
    }

    if (stored) {
      marks[entry.slug] = stored;
      found += 1;
    } else {
      console.log(`   --  ${entry.slug.padEnd(34)} candidates would not download`);
    }
  }

  // Same rule as the site scrape: a mark worn by more than two listings is a
  // shared default rather than anybody's logo.
  const byDigest = new Map();
  for (const [slug, m] of Object.entries(marks)) {
    if (!m.digest) continue;
    if (!byDigest.has(m.digest)) byDigest.set(m.digest, []);
    byDigest.get(m.digest).push(slug);
  }
  let dropped = 0;
  for (const [, slugs] of byDigest) {
    if (slugs.length <= 2) continue;
    for (const slug of slugs) {
      delete marks[slug];
      dropped += 1;
    }
  }

  writeFileSync(MAP, JSON.stringify(marks, null, 2) + "\n");

  const distinct = new Set(Object.values(marks).map((m) => m.digest)).size;
  console.log(`\n${found} marks recovered from repositories`);
  if (dropped) console.log(`${dropped} dropped as shared defaults`);
  console.log(`${Object.keys(marks).length} listings now carry their own mark (${distinct} distinct)`);
}

main();
