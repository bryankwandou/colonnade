/**
 * Reads the title and description each live site publishes about itself.
 *
 *   node scripts/fetch-site-meta.mjs
 *
 * Some repositories carry no README and no description, which left their
 * taglines with nothing behind them. The deployment usually says what it is in
 * its own <head> — copy the author wrote for visitors and for search engines.
 * That counts as a source; a guess from the repository name does not.
 *
 * Written to src/data/site-meta.json, which audit-taglines.mjs reads alongside
 * the README blurbs.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const OUT = join(root, "src", "data", "site-meta.json");

const TIMEOUT = 15_000;

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&#x27;/g, "'")
    .trim();
}

async function metaFor(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "colonnade-meta-read" },
    });
    if (res.status >= 400) return null;
    const html = await res.text();

    const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const description =
      html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1];

    if (!title && !description) return null;
    return {
      title: title ? decodeEntities(title) : null,
      description: description ? decodeEntities(description) : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8").replace(/^﻿/, ""));
  const live = catalog.entries.filter((e) => e.live);

  console.log(`reading <head> from ${live.length} live sites\n`);
  const out = {};

  const BATCH = 8;
  for (let i = 0; i < live.length; i += BATCH) {
    const slice = live.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async (e) => [e, await metaFor(e.live)]));
    for (const [entry, meta] of results) {
      if (!meta) {
        console.log(`   --  ${entry.slug}`);
        continue;
      }
      out[entry.slug] = meta;
      const shown = (meta.description ?? meta.title ?? "").slice(0, 110);
      console.log(`  ok  ${entry.slug.padEnd(34)} ${shown}`);
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  const withDesc = Object.values(out).filter((m) => m.description).length;
  console.log(`\n${Object.keys(out).length} sites described themselves (${withDesc} with a description)`);
}

main();
