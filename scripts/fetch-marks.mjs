/**
 * Downloads each listing's real icon from its own deployment.
 *
 *   node scripts/fetch-marks.mjs
 *
 * Initials in a coloured box are a placeholder pretending to be a logo. Every
 * live site already ships its own mark in its <head>; this fetches that, so the
 * shelf shows what each project actually calls itself.
 *
 * Preference order favours what will still look sharp at 96px:
 *   SVG > apple-touch-icon > sized PNG > og:image > favicon.ico
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const MARK_DIR = join(root, "public", "marks");
const MAP = join(root, "src", "data", "marks.json");

const TIMEOUT = 15_000;

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

async function get(url, as = "text") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "colonnade-mark-fetch" },
    });
    if (res.status >= 400) return null;
    const body = as === "buffer" ? Buffer.from(await res.arrayBuffer()) : await res.text();
    return { body, type: res.headers.get("content-type") ?? "", url: res.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pulls every icon declaration out of a page's head, scored by usefulness. */
function iconCandidates(html, baseUrl) {
  const out = [];
  const push = (href, score, note) => {
    if (!href) return;
    try {
      out.push({ url: new URL(href, baseUrl).toString(), score, note });
    } catch {
      /* malformed href */
    }
  };

  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = (tag.match(/rel=["']([^"']+)["']/i)?.[1] ?? "").toLowerCase();
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
    const sizes = tag.match(/sizes=["']([^"']+)["']/i)?.[1] ?? "";
    const type = (tag.match(/type=["']([^"']+)["']/i)?.[1] ?? "").toLowerCase();
    if (!href || !/icon/.test(rel)) continue;

    const px = parseInt(sizes.split("x")[0], 10) || 0;
    if (type.includes("svg") || /\.svg(\?|$)/i.test(href)) push(href, 100, "svg");
    else if (rel.includes("apple-touch")) push(href, 80 + Math.min(px, 512) / 100, "apple");
    else if (px >= 180) push(href, 70 + Math.min(px, 512) / 100, `${px}px`);
    else if (px > 0) push(href, 40 + px / 100, `${px}px`);
    else push(href, 30, rel);
  }

  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  if (og) push(og, 20, "og:image");

  push("/icon.svg", 15, "guess");
  push("/favicon.ico", 10, "guess");

  return out.sort((a, b) => b.score - a.score);
}

function extensionFor(url, contentType) {
  const fromUrl = extname(new URL(url).pathname).toLowerCase();
  if ([".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".avif"].includes(fromUrl)) return fromUrl;
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("jpeg")) return ".jpg";
  if (contentType.includes("icon")) return ".ico";
  return ".png";
}

async function markFor(entry) {
  const page = await get(entry.live);
  if (!page) return null;

  for (const candidate of iconCandidates(page.body, page.url).slice(0, 6)) {
    const asset = await get(candidate.url, "buffer");
    if (!asset) continue;
    if (!/image|octet-stream/.test(asset.type) && !/\.(svg|png|ico|jpg|webp)$/i.test(candidate.url)) continue;
    // Vercel's own 404 page is HTML; a real icon never is.
    if (/^\s*<(!doctype|html)/i.test(asset.body.slice(0, 40).toString("utf8"))) continue;
    if (asset.body.length < 70) continue;

    const ext = extensionFor(candidate.url, asset.type);
    const file = `${entry.slug}${ext}`;
    const digest = createHash("sha256").update(asset.body).digest("hex");
    writeFileSync(join(MARK_DIR, file), asset.body);
    return {
      file,
      source: candidate.url,
      kind: candidate.note,
      bytes: asset.body.length,
      digest,
    };
  }
  return null;
}

/**
 * Throws out icons that are not the project's own.
 *
 * A site that never set a favicon still answers /favicon.ico — the host serves
 * its own. Thirty-three listings came back wearing the identical Vercel
 * triangle, which looked like thirty-three logos and was one. The tell is that
 * the bytes repeat: a real logo belongs to one product, so anything worn by
 * more than a couple of listings is a platform or framework default.
 *
 * Two listings sharing a mark is left alone, because sibling deployments of one
 * product legitimately share a logo (solgig and solgig-mainnet, for instance).
 */
const SHARED_LIMIT = 2;

function rejectSharedDefaults(marks) {
  const byDigest = new Map();
  for (const [slug, mark] of Object.entries(marks)) {
    if (!mark.digest) continue;
    if (!byDigest.has(mark.digest)) byDigest.set(mark.digest, []);
    byDigest.get(mark.digest).push(slug);
  }

  const kept = {};
  const rejected = [];

  for (const [slug, mark] of Object.entries(marks)) {
    const sharers = mark.digest ? byDigest.get(mark.digest) ?? [slug] : [slug];
    if (sharers.length > SHARED_LIMIT) {
      rejected.push({ slug, count: sharers.length });
      const path = join(MARK_DIR, mark.file);
      if (existsSync(path)) rmSync(path);
      continue;
    }
    kept[slug] = mark;
  }

  return { kept, rejected, byDigest };
}

async function main() {
  const catalog = readJson(CATALOG, { entries: [] });
  const live = catalog.entries.filter((e) => e.live);
  mkdirSync(MARK_DIR, { recursive: true });

  const existing = readJson(MAP, {});
  console.log(`fetching marks for ${live.length} live listings\n`);

  const marks = {};
  let recovered = 0;

  const BATCH = 6;
  for (let i = 0; i < live.length; i += BATCH) {
    const slice = live.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (entry) => {
        // Keep a mark already on disk rather than re-downloading it, but make
        // sure it carries a digest so the shared-default check can see it.
        const prior = existing[entry.slug];
        const priorPath = prior && join(MARK_DIR, prior.file);
        if (prior && existsSync(priorPath)) {
          const digest =
            prior.digest ?? createHash("sha256").update(readFileSync(priorPath)).digest("hex");
          return [entry, { ...prior, digest }, true];
        }
        return [entry, await markFor(entry), false];
      })
    );

    for (const [entry, mark, cached] of results) {
      if (mark) {
        marks[entry.slug] = mark;
        recovered += 1;
        console.log(`  ${cached ? "kept" : " got"}  ${entry.slug.padEnd(34)} ${mark.kind.padEnd(8)} ${mark.file}`);
      } else {
        console.log(`   --   ${entry.slug.padEnd(34)} no icon published`);
      }
    }
  }

  const { kept, rejected, byDigest } = rejectSharedDefaults(marks);

  if (rejected.length) {
    const groups = new Map();
    for (const r of rejected) groups.set(r.count, (groups.get(r.count) ?? 0) + 1);
    console.log(`\nrejected ${rejected.length} icons that were not the project's own:`);
    for (const [digest, slugs] of byDigest) {
      if (slugs.length <= SHARED_LIMIT) continue;
      console.log(`  ${slugs.length} listings shared ${digest.slice(0, 12)} — a platform default, not a logo`);
    }
  }

  writeFileSync(MAP, JSON.stringify(kept, null, 2) + "\n");

  const distinct = new Set(Object.values(kept).map((m) => m.digest)).size;
  console.log(
    `\n${Object.keys(kept).length} of ${live.length} listings carry their own icon ` +
      `(${distinct} distinct designs); the rest fall back to a generated mark`
  );
}

main();
