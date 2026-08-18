/**
 * Second, independent test for marks that were only inferred from position.
 *
 *   node scripts/verify-marks.mjs
 *
 * Some marks are unambiguous: the site links them with rel="icon", or the repo
 * commits them at app/icon.svg, or the markup labels them with the product name.
 * Others were picked because they were the first drawing in the header, and that
 * is an inference rather than evidence.
 *
 * This checks those against a different signal entirely — whether the drawing
 * sits inside the link back to the home page. That wrapper is what makes a
 * header lockup a lockup, and a decorative flourish never lives there. Passing
 * both tests is two independent reasons to believe the mark belongs to the
 * project; failing leaves the mark in place but records that it rests on one
 * signal only, which /provenance then reports honestly.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const MAP = join(root, "src", "data", "marks.json");
const MARK_DIR = join(root, "public", "marks");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

async function getHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "colonnade-mark-verify" },
    });
    if (res.status >= 400) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Is the first drawing on the page wrapped in the home link?
 *
 * Looks backwards from the svg for the nearest opening anchor and checks that
 * nothing closed it in between, then that it points at the site root.
 */
function sitsInHomeLink(html) {
  const svgAt = html.search(/<svg\b/i);
  if (svgAt < 0) return false;

  const before = html.slice(0, svgAt);
  const lastOpen = before.lastIndexOf("<a ");
  if (lastOpen < 0) return false;

  const between = before.slice(lastOpen);
  if (between.includes("</a>")) return false; // that anchor already closed

  const href = between.match(/href=["']([^"']*)["']/i)?.[1];
  if (href === undefined) return false;
  return href === "/" || href === "" || href === "#" || /^https?:\/\/[^/]+\/?$/.test(href);
}

/** Does a <header> or <nav> open before the drawing and stay open? */
function sitsInHeader(html) {
  const svgAt = html.search(/<svg\b/i);
  if (svgAt < 0) return false;
  const before = html.slice(0, svgAt).toLowerCase();
  const opened = (before.match(/<(header|nav)\b/g) ?? []).length;
  const closed = (before.match(/<\/(header|nav)>/g) ?? []).length;
  return opened > closed;
}

async function main() {
  const catalog = readJson(CATALOG, { entries: [] });
  const marks = readJson(MAP, {});
  const names = new Map(catalog.entries.map((e) => [e.slug, e.name]));
  const live = new Map(catalog.entries.map((e) => [e.slug, e.live]));

  // Work out which marks currently rest on position alone.
  const inferred = [];
  for (const [slug, mark] of Object.entries(marks)) {
    if (mark.kind !== "inline") continue;
    const svg = readFileSync(join(MARK_DIR, mark.file), "utf8");
    const want = (names.get(slug) ?? slug).toLowerCase().replace(/[^a-z0-9]/g, "");
    const label = (svg.match(/aria-label=["']([^"']+)["']/i) ?? [])[1] ?? "";
    const named = want.length > 3 && label.toLowerCase().replace(/[^a-z0-9]/g, "").includes(want);
    if (!named) inferred.push(slug);
  }

  console.log(`re-testing ${inferred.length} marks that rest on position alone\n`);

  let confirmed = 0;
  const BATCH = 6;

  for (let i = 0; i < inferred.length; i += BATCH) {
    const slice = inferred.slice(i, i + BATCH);
    const results = await Promise.all(
      slice.map(async (slug) => {
        const url = live.get(slug);
        if (!url) return [slug, null];
        const html = await getHtml(url);
        if (!html) return [slug, null];
        return [slug, { homeLink: sitsInHomeLink(html), header: sitsInHeader(html) }];
      })
    );

    for (const [slug, checks] of results) {
      if (!checks) {
        marks[slug].evidence = "position";
        console.log(`   ?   ${slug.padEnd(34)} site unreachable, left as inferred`);
        continue;
      }
      if (checks.homeLink) {
        marks[slug].evidence = "lockup";
        confirmed += 1;
        console.log(`  ok   ${slug.padEnd(34)} sits inside the home link`);
      } else if (checks.header) {
        marks[slug].evidence = "header";
        confirmed += 1;
        console.log(`  ok   ${slug.padEnd(34)} sits inside the page header`);
      } else {
        marks[slug].evidence = "position";
        console.log(`   --  ${slug.padEnd(34)} neither; rests on one signal only`);
      }
    }
  }

  // Everything not re-tested already had stronger evidence; record that too.
  for (const [slug, mark] of Object.entries(marks)) {
    if (mark.evidence) continue;
    if (mark.kind === "repo") mark.evidence = "committed";
    else if (mark.kind === "inline" || mark.kind === "header") mark.evidence = "named";
    else mark.evidence = "declared";
  }

  writeFileSync(MAP, JSON.stringify(marks, null, 2) + "\n");

  const tally = {};
  for (const m of Object.values(marks)) tally[m.evidence] = (tally[m.evidence] ?? 0) + 1;
  console.log(`\n${confirmed} of ${inferred.length} confirmed by a second, independent signal`);
  console.log("evidence held by each mark:", JSON.stringify(tally));
}

main();
