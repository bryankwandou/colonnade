/**
 * The last two places a published mark hides.
 *
 *   node scripts/fetch-deep-marks.mjs
 *
 * scripts/fetch-marks.mjs reads the <head> for declared icons and the header
 * markup for an inline drawing. Two publishing habits slip past both:
 *
 *   1. An <img> further down the page — in a nav that renders below the fold, a
 *      footer lockup, a splash screen — whose filename or alt text names it.
 *   2. A logo painted as a CSS background-image, which never appears in the HTML
 *      at all. The stylesheet has to be fetched and read to find it.
 *
 * Both are still published files at public URLs, so anything found here is as
 * checkable as an icon in the head. Only listings with no mark are visited, and
 * the vendor and scaffold refusals from the other scripts apply unchanged.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const MARK_DIR = join(root, "public", "marks");
const MAP = join(root, "src", "data", "marks.json");

const VENDORS =
  "xampp|apache|mysql|mariadb|php|laravel|nodejs|npm|react|nextjs|vite|vuejs|angular|svelte|" +
  "tailwind|bootstrap|jquery|python|django|flask|spring|docker|kubernetes|github|gitlab|" +
  "vercel|netlify|firebase|supabase|aws|azure|google|facebook|instagram|tiktok|whatsapp|" +
  "telegram|discord|solana|ethereum|metamask|phantom|figma|vscode|midtrans|xendit|qris";
const VENDOR_RE = new RegExp(`(^|[^a-z])(${VENDORS})([^a-z]|$)`);

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

async function get(url, as = "text") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "colonnade-deep-mark" },
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

/** Shared refusals: somebody else's trademark, or a scaffold's leftovers. */
function refused(url) {
  const lower = url.toLowerCase();
  if (VENDOR_RE.test(lower)) return true;
  if (/\/(vite|next|react|nuxt|svelte|astro|turbo|remix|file|globe|window)\.svg(\?|$)/.test(lower)) return true;
  if (/screenshot|banner|hero|cover|og[-_]|opengraph|placeholder|avatar|thumb|sprite|pattern/.test(lower)) return true;
  if (/^https?:\/\/(assets|static)\.(vercel|netlify)\.com\//.test(lower)) return true;
  return false;
}

/** An <img> anywhere on the page whose src or alt says it is the brand. */
function imageCandidates(html, base, entry) {
  const out = [];
  const wanted = entry.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  const slug = entry.slug.replace(/[^a-z0-9]/g, "");

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!src || src.startsWith("data:")) continue;
    const alt = (tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "").toLowerCase();
    const altKey = alt.replace(/[^a-z0-9]/g, "");

    let url;
    try {
      url = new URL(src, base).toString();
    } catch {
      continue;
    }
    if (refused(url)) continue;
    if (!/\.(svg|png|webp)(\?|$)/i.test(url)) continue;

    let score = 0;
    // The alt text naming the product is the strongest signal a page can give.
    if (wanted.length >= 4 && altKey.includes(wanted)) score += 100;
    else if (slug.length >= 4 && altKey.includes(slug)) score += 96;
    if (/\blogo\b|\bbrand\b|\bmark\b/.test(alt)) score += 50;
    if (/(^|[^a-z])(logo|logomark|brandmark|wordmark|ikon)([^a-z]|$)/i.test(url)) score += 44;
    if (/\/(icon|mark)\.(svg|png)(\?|$)/i.test(url)) score += 34;
    if (/\.svg(\?|$)/i.test(url)) score += 12;

    if (score >= 34) out.push({ url, score, how: "img" });
  }
  return out;
}

/** A logo painted by a stylesheet, which the HTML never mentions. */
async function cssCandidates(html, base) {
  const sheets = [...(html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) ?? [])]
    .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1])
    .filter(Boolean)
    .slice(0, 4);

  const out = [];
  for (const href of sheets) {
    let sheetUrl;
    try {
      sheetUrl = new URL(href, base).toString();
    } catch {
      continue;
    }
    const sheet = await get(sheetUrl);
    if (!sheet) continue;

    for (const m of sheet.body.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
      const raw = m[1];
      if (raw.startsWith("data:")) continue;
      let url;
      try {
        url = new URL(raw, sheetUrl).toString();
      } catch {
        continue;
      }
      if (refused(url)) continue;
      if (!/\.(svg|png|webp)(\?|$)/i.test(url)) continue;
      if (!/(^|[^a-z])(logo|logomark|brandmark|wordmark|mark|ikon)([^a-z]|$)/i.test(url)) continue;
      out.push({ url, score: /\.svg(\?|$)/i.test(url) ? 52 : 40, how: "css" });
    }
  }
  return out;
}

function extensionFor(url, type) {
  const fromUrl = extname(new URL(url).pathname).toLowerCase();
  if ([".svg", ".png", ".webp"].includes(fromUrl)) return fromUrl;
  if (type.includes("svg")) return ".svg";
  if (type.includes("webp")) return ".webp";
  return ".png";
}

async function main() {
  const catalog = readJson(CATALOG, { entries: [] });
  const marks = readJson(MAP, {});
  mkdirSync(MARK_DIR, { recursive: true });

  const gaps = catalog.entries.filter((e) => !marks[e.slug] && e.live);
  console.log(`looking deeper into ${gaps.length} live sites with no mark yet\n`);

  const used = new Map();
  for (const [slug, m] of Object.entries(marks)) if (m.digest) used.set(m.digest, slug);

  let found = 0;

  for (const entry of gaps) {
    const page = await get(entry.live);
    if (!page) {
      console.log(`   --  ${entry.slug.padEnd(30)} site did not answer`);
      continue;
    }

    const candidates = [
      ...imageCandidates(page.body, page.url, entry),
      ...(await cssCandidates(page.body, page.url)),
    ].sort((a, b) => b.score - a.score);

    if (!candidates.length) {
      console.log(`   --  ${entry.slug.padEnd(30)} nothing named as a mark`);
      continue;
    }

    let stored = null;
    for (const candidate of candidates.slice(0, 4)) {
      const file = await get(candidate.url, "buffer");
      if (!file || file.body.length < 120 || file.body.length > 2_000_000) continue;
      if (/text\/html/.test(file.type)) continue; // a 404 page dressed as an image

      const digest = createHash("sha256").update(file.body).digest("hex");
      const twin = used.get(digest);
      if (twin) {
        console.log(`   --  ${entry.slug.padEnd(30)} same file as ${twin}`);
        continue;
      }

      const name = `${entry.slug}${extensionFor(candidate.url, file.type)}`;
      writeFileSync(join(MARK_DIR, name), file.body);
      used.set(digest, entry.slug);
      stored = {
        file: name,
        source: candidate.url,
        kind: candidate.how === "css" ? "stylesheet" : "image",
        bytes: file.body.length,
        digest,
        evidence: candidate.score >= 96 ? "named" : "declared",
      };
      console.log(`  got  ${entry.slug.padEnd(30)} ${candidate.how}: ${candidate.url.replace(/^https?:\/\//, "").slice(0, 62)}`);
      break;
    }

    if (stored) {
      marks[entry.slug] = stored;
      found += 1;
    }
  }

  writeFileSync(MAP, JSON.stringify(marks, null, 2) + "\n");
  const distinct = new Set(Object.values(marks).map((m) => m.digest)).size;
  console.log(`\n${found} more marks recovered from page images and stylesheets`);
  console.log(`${Object.keys(marks).length} listings carry a mark (${distinct} distinct)`);
}

main();
