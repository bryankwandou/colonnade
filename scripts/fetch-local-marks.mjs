/**
 * Takes each project's mark from its own working folder on this machine.
 *
 *   node scripts/fetch-local-marks.mjs
 *
 * The fourth and last place a logo lives. A site can render its mark from CSS
 * that never reaches a scraper; a repository can be empty or private; but the
 * folder the project was built in still holds the file the designer saved.
 *
 * One caution shapes the whole script. A file on this disk proves nothing to a
 * reader — nobody else can open E:\...\logo.svg to check it. So every mark taken
 * from here is recorded with evidence "local", kept separate from marks the
 * public can verify, and /provenance says so plainly. Where the same file also
 * appears in a published deployment, the digests match and the mark is promoted
 * to the verifiable tier instead.
 *
 * Files are copied byte for byte. Nothing is recoloured, resized, or redrawn.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, extname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const WORKSPACE = join(root, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const MARK_DIR = join(root, "public", "marks");
const MAP = join(root, "src", "data", "marks.json");

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".git", "dist", "build", "out", "target",
  ".turbo", ".vercel", "coverage", "vendor", ".cache", "__pycache__",
]);

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

/** Reduces a name to comparable letters, so "BLOCKBITE-GAME" meets "blockbite". */
const squash = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Folder names carry working notes the slug never had — "darurat", "lazarus",
 * "SALAH JALAN", a commit hash. Strip those before comparing.
 */
function stemFolder(name) {
  return squash(
    String(name)
      .replace(/\b(darurat|lazarus|salah jalan dan arah|persero|revamped|legacy|lama|rusak|arsip|backup|copy|final|test|old|new|v\d+)\b/gi, " ")
      .replace(/-[0-9a-f]{7,40}$/i, "")
  );
}

/**
 * Scores a file on how likely it is to be this project's brand mark.
 *
 * Framework conventions win outright: a file at app/icon.svg exists for exactly
 * one reason. Everything else has to earn it through its name, and anything
 * reading as a screenshot, an illustration, or another company's trademark is
 * refused before scoring begins.
 */
const VENDORS =
  "xampp|apache|mysql|mariadb|php|laravel|nodejs|npm|react|nextjs|vite|vuejs|angular|svelte|" +
  "tailwind|bootstrap|jquery|python|django|flask|spring|docker|kubernetes|github|gitlab|" +
  "vercel|netlify|firebase|supabase|aws|azure|google|facebook|instagram|tiktok|whatsapp|" +
  "telegram|discord|solana|ethereum|metamask|phantom|figma|vscode|midtrans|xendit|qris";
const VENDOR_RE = new RegExp(`(^|[^a-z])(${VENDORS})([^a-z]|$)`);

function scoreFile(relPath) {
  const lower = relPath.replace(/\\/g, "/").toLowerCase();
  const name = basename(lower);
  const ext = extname(lower);

  if (![".svg", ".png", ".webp"].includes(ext)) return 0;
  if (/screenshot|preview|banner|hero|cover|og-|opengraph|placeholder|example|avatar|thumb|sprite|texture|illustration/.test(lower)) return 0;
  if (VENDOR_RE.test(lower)) return 0;
  // Scaffold leftovers: create-next-app drops these into public/ and nobody
  // deletes them. They are the template's furniture, not anyone's mark.
  if (/^public\/(file|globe|window|next|vercel|turbo|check|arrow)\.svg$/.test(lower)) return 0;
  if (lower.split("/").length > 5) return 0;

  // A dedicated brand folder is as strong a declaration as a framework path:
  // nobody puts a stray graphic in public/brand.
  const inBrandFolder = /^(public|src|app|assets)\/(brand|branding|logo)\//.test(lower);

  let score = 0;
  if (/^(src\/)?app\/icon\d*\.(svg|png)$/.test(lower)) score = 100;
  else if (/^public\/(logo|logomark|brand|mark|wordmark|ikon|lambang)\.(svg|png)$/.test(lower)) score = 96;
  else if (inBrandFolder && /\.(svg|png)$/.test(lower)) score = 94;
  else if (/^(src\/)?app\/apple-icon\.(png|svg)$/.test(lower)) score = 90;
  else if (/^public\/logo-(mark|icon|dark|white|mono)\.(svg|png)$/.test(lower)) score = 88;
  else if (/^public\/(icon|ikon)\.(svg|png)$/.test(lower)) score = 84;
  // Indonesian names sit beside the English ones throughout this workspace.
  // An underscore is a word character, so \b would refuse logo_full.png.
  // Split on anything that is not a letter instead.
  else if (/(^|[^a-z])(logo|logomark|wordmark|brandmark|ikon|lambang|merek)([^a-z]|$)/.test(name)) score = 60;
  else if (/^(icon|ikon)\.(svg|png)$/.test(name)) score = 45;
  else return 0;

  if (ext === ".svg") score += 14;              // survives a 96px tile
  if (/\b(dark|white|inverse|mono)\b/.test(name)) score += 4;  // reads on a dark plate
  if (/\b(light|black)\b/.test(name)) score -= 4;
  return score;
}

/** Walks a project folder, shallowly, collecting scored candidates. */
function candidatesIn(dir, base = dir, depth = 0, out = []) {
  if (depth > 4) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      candidatesIn(full, base, depth + 1, out);
    } else {
      const rel = relative(base, full).replace(/\\/g, "/");
      const score = scoreFile(rel);
      if (score > 0) out.push({ full, rel, score });
    }
  }
  return out;
}

function main() {
  const catalog = readJson(CATALOG, { entries: [] });
  const marks = readJson(MAP, {});
  mkdirSync(MARK_DIR, { recursive: true });

  // Index the workspace once, by stemmed folder name.
  const folders = readdirSync(WORKSPACE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "colonnade" && !d.name.startsWith("."))
    .map((d) => ({ name: d.name, path: join(WORKSPACE, d.name), stem: stemFolder(d.name) }));

  console.log(`${folders.length} project folders on disk`);

  const gaps = catalog.entries.filter((e) => !marks[e.slug]);
  console.log(`${gaps.length} listings still without a mark\n`);

  // Digests already in use, so a folder cannot hand back a mark another listing
  // already wears — the duplicate problem, arriving by a new road.
  const usedDigests = new Map();
  for (const [slug, m] of Object.entries(marks)) if (m.digest) usedDigests.set(m.digest, slug);

  let taken = 0;
  const report = [];

  for (const entry of gaps) {
    const want = squash(entry.slug);
    const wantRepo = entry.repoName ? squash(entry.repoName) : null;

    // Prefer an exact stem match, then a folder that contains the slug.
    const matches = folders
      .map((f) => {
        let affinity = 0;
        if (f.stem === want || (wantRepo && f.stem === wantRepo)) affinity = 3;
        else if (want.length >= 5 && f.stem.includes(want)) affinity = 2;
        else if (want.length >= 6 && want.includes(f.stem) && f.stem.length >= 5) affinity = 1;
        return { f, affinity };
      })
      .filter((m) => m.affinity > 0)
      .sort((a, b) => b.affinity - a.affinity);

    if (!matches.length) continue;

    let stored = null;
    for (const { f } of matches.slice(0, 2)) {
      const found = candidatesIn(f.path).sort((a, b) => b.score - a.score);
      for (const candidate of found.slice(0, 4)) {
        let body;
        try {
          body = readFileSync(candidate.full);
        } catch {
          continue;
        }
        if (body.length < 120 || body.length > 3_000_000) continue;

        const digest = createHash("sha256").update(body).digest("hex");
        const twin = usedDigests.get(digest);
        if (twin) {
          report.push(`  dup   ${entry.slug.padEnd(30)} same file as ${twin}`);
          continue;
        }

        const ext = extname(candidate.rel).toLowerCase();
        const file = `${entry.slug}${ext}`;
        writeFileSync(join(MARK_DIR, file), body); // byte for byte, unmodified
        usedDigests.set(digest, entry.slug);
        stored = {
          file,
          source: `local:${f.name}/${candidate.rel}`,
          kind: "local",
          bytes: body.length,
          digest,
          evidence: "local",
        };
        report.push(`  got   ${entry.slug.padEnd(30)} ${f.name}/${candidate.rel}`);
        break;
      }
      if (stored) break;
    }

    if (stored) {
      marks[entry.slug] = stored;
      taken += 1;
    }
  }

  writeFileSync(MAP, JSON.stringify(marks, null, 2) + "\n");
  report.forEach((line) => console.log(line));

  const distinct = new Set(Object.values(marks).map((m) => m.digest)).size;
  const local = Object.values(marks).filter((m) => m.kind === "local").length;
  console.log(`\n${taken} marks taken from working folders`);
  console.log(`${Object.keys(marks).length} listings carry a mark (${distinct} distinct)`);
  console.log(`${local} of them rest on a local file the public cannot open`);
}

main();
