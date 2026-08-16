/**
 * Finds live URLs that neither GitHub nor Vercel knows about.
 *
 *   node scripts/discover-links.mjs
 *
 * Plenty of projects announce their deployment in the README and nowhere else:
 * the repo has no homepage set, and the Vercel project may sit under a scope the
 * CLI is not currently pointed at. This walks the sibling project folders, pulls
 * every candidate URL out of their documentation, checks each one over HTTP, and
 * writes the survivors to src/data/discovered.json for the catalogue builder.
 *
 * Only URLs that answer are kept. A dead link is worse than no link.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const WORKSPACE = join(root, "..");
const OUT = join(root, "src", "data", "discovered.json");

const DOC_FILES = ["README.md", "readme.md", "README.MD", "AGENTS.md", "CLAUDE.md"];
const URL_PATTERN = /https:\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:vercel\.app|my\.id|netlify\.app|pages\.dev))(\/[^\s)\]"'>]*)?/gi;

/** Addresses that describe someone else's site, not one of ours. */
const IGNORE = /^(vercel|nextjs|www|docs|api|registry|shadcn|ui|tailwindcss|solana)\./i;

function docsFor(dir) {
  const out = [];
  for (const name of DOC_FILES) {
    const path = join(dir, name);
    if (existsSync(path)) {
      try {
        out.push(readFileSync(path, "utf8"));
      } catch {
        /* unreadable, skip */
      }
    }
  }
  return out;
}

function candidates() {
  const found = new Map(); // url -> Set of folder names

  let dirs = [];
  try {
    dirs = readdirSync(WORKSPACE).filter((name) => {
      try {
        return statSync(join(WORKSPACE, name)).isDirectory() && !name.startsWith(".");
      } catch {
        return false;
      }
    });
  } catch (err) {
    console.error("cannot read workspace:", err.message);
    return found;
  }

  for (const dir of dirs) {
    const full = join(WORKSPACE, dir);
    for (const text of docsFor(full)) {
      for (const match of text.matchAll(URL_PATTERN)) {
        const host = match[1];
        if (IGNORE.test(host)) continue;
        const path = (match[2] ?? "").replace(/[.,;:]+$/, "");
        const url = `https://${host}${path}`;
        if (!found.has(url)) found.set(url, new Set());
        found.get(url).add(basename(full));
      }
    }
  }
  return found;
}

async function reachable(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "colonnade-link-check" },
      });
      clearTimeout(timer);
      if (res.status < 400) return { ok: true, status: res.status, final: res.url };
      if (method === "GET") return { ok: false, status: res.status };
    } catch {
      if (method === "GET") return { ok: false, status: 0 };
    }
  }
  return { ok: false, status: 0 };
}

async function main() {
  const found = candidates();
  console.log(`${found.size} candidate URLs found across project documentation\n`);

  const live = {};
  const dead = [];
  const urls = [...found.keys()].sort();

  // Checked in small batches so a slow host does not stall the whole sweep.
  const BATCH = 8;
  for (let i = 0; i < urls.length; i += BATCH) {
    const slice = urls.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async (url) => [url, await reachable(url)]));
    for (const [url, result] of results) {
      const owners = [...found.get(url)];
      if (result.ok) {
        live[url] = owners;
        console.log(`  ok  ${String(result.status).padEnd(3)} ${url}`);
      } else {
        dead.push(url);
        console.log(`  --  ${String(result.status || "err").padEnd(3)} ${url}`);
      }
    }
  }

  writeFileSync(
    OUT,
    JSON.stringify({ checkedAt: new Date().toISOString(), live, dead }, null, 2) + "\n"
  );

  console.log(`\n${Object.keys(live).length} reachable, ${dead.length} dead. Written to src/data/discovered.json`);
}

main();
