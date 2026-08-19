/**
 * Checks whether a mark taken from disk is also being served publicly.
 *
 *   node scripts/corroborate-local.mjs
 *
 * A file on this machine is evidence only to whoever is sitting at it. But if
 * the deployment serves a byte-identical file at a public URL, the same mark
 * stops resting on the local copy and becomes something a reader can fetch and
 * hash themselves.
 *
 * So for every local mark, the site is asked for the same path. A digest match
 * promotes the mark and records the public URL; anything else leaves it exactly
 * as it was, still labelled as unverifiable, which is the honest state.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const MAP = join(root, "src", "data", "marks.json");
const CATALOG = join(root, "src", "data", "catalog.json");
const MARK_DIR = join(root, "public", "marks");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

async function fetchBytes(url) {
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

/**
 * Where the same file would sit once deployed.
 *
 * public/logo.svg is served at /logo.svg; app/icon.svg is rewritten by the
 * framework to /icon.svg. Everything before those roots is build-time layout
 * the browser never sees.
 */
function publicPathsFor(sourcePath) {
  const rel = sourcePath.replace(/^local:[^/]+\//, "");
  const out = new Set();
  const afterPublic = rel.match(/(?:^|\/)public\/(.+)$/)?.[1];
  if (afterPublic) out.add(`/${afterPublic}`);
  const afterApp = rel.match(/(?:^|\/)(?:src\/)?app\/(icon\d*\.\w+|apple-icon\.\w+)$/)?.[1];
  if (afterApp) out.add(`/${afterApp}`);
  const afterAssets = rel.match(/(?:^|\/)assets\/(.+)$/)?.[1];
  if (afterAssets) {
    out.add(`/assets/${afterAssets}`);
    out.add(`/${afterAssets}`);
  }
  return [...out];
}

async function main() {
  const marks = readJson(MAP, {});
  const catalog = readJson(CATALOG, { entries: [] });
  const live = new Map(catalog.entries.map((e) => [e.slug, e.live]));

  const local = Object.entries(marks).filter(([, m]) => m.kind === "local");
  console.log(`testing ${local.length} local marks against their deployments\n`);

  let promoted = 0;

  for (const [slug, mark] of local) {
    const base = live.get(slug);
    if (!base) {
      console.log(`   --  ${slug.padEnd(28)} no deployment to compare against`);
      continue;
    }

    const onDisk = readFileSync(join(MARK_DIR, mark.file));
    const wanted = createHash("sha256").update(onDisk).digest("hex");

    let matchedAt = null;
    for (const path of publicPathsFor(mark.source)) {
      const body = await fetchBytes(new URL(path, base).toString());
      if (!body) continue;
      if (createHash("sha256").update(body).digest("hex") === wanted) {
        matchedAt = new URL(path, base).toString();
        break;
      }
    }

    if (matchedAt) {
      marks[slug] = { ...mark, source: matchedAt, kind: "published", evidence: "declared" };
      promoted += 1;
      console.log(`  ok   ${slug.padEnd(28)} identical file served at ${matchedAt}`);
    } else {
      console.log(`   --  ${slug.padEnd(28)} not served publicly; stays unverifiable`);
    }
  }

  writeFileSync(MAP, JSON.stringify(marks, null, 2) + "\n");
  const stillLocal = Object.values(marks).filter((m) => m.kind === "local").length;
  console.log(`\n${promoted} promoted to publicly checkable, ${stillLocal} still rest on a local file`);
}

main();
