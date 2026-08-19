/**
 * Finds deployments on the account that the catalogue has no listing for.
 *
 *   node scripts/probe-uncatalogued.mjs
 *
 * Fifty of the 168 Vercel projects were not on the shelf. Most are the same site
 * reached by a second name — a team-scoped URL, an older subdomain, a preview
 * project kept alive — and listing those would inflate the count with
 * duplicates, which is the failure this catalogue exists to avoid.
 *
 * So each one is fetched and fingerprinted by the text it actually serves. A
 * page whose body already appears under another name is recorded as an alias,
 * not as a new project. What survives is written to candidates.json with the
 * title and description the site gives itself, ready to be read before anything
 * is added.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const OUT = join(root, "src", "data", "candidates.json");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .trim();
}

/**
 * A fingerprint of what the page says, not of the bytes it sent.
 *
 * Two deployments of the same site rarely match byte for byte — build ids and
 * asset hashes differ — but the visible words do. Stripping the markup and
 * hashing the remaining prose catches the duplicates that a byte hash misses.
 */
function proseDigest(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
  return { digest: createHash("sha256").update(text).digest("hex"), length: text.length };
}

async function probe(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "colonnade-candidate-probe" },
    });
    if (res.status >= 400) return { status: res.status };
    const html = await res.text();
    const { digest, length } = proseDigest(html);
    return {
      status: res.status,
      finalUrl: res.url,
      title: decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? ""),
      description: decode(
        html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
          html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
          ""
      ),
      digest,
      prose: length,
    };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const deployments = readJson(join(root, "src", "data", "deployments.json"), []);
  const catalog = readJson(join(root, "src", "data", "catalog.json"), { entries: [] });
  const list = Array.isArray(deployments) ? deployments : (deployments.projects ?? []);

  const hostOf = (u) => String(u).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const listed = new Set(catalog.entries.filter((e) => e.live).map((e) => hostOf(e.live)));

  const unknown = list.filter((p) => p.latestProductionUrl && !listed.has(hostOf(p.latestProductionUrl)));
  console.log(`probing ${unknown.length} deployments with no listing\n`);

  // Fingerprint what is already on the shelf, so a second name for a site
  // already listed is recognised as an alias rather than added twice.
  const shelved = new Map();
  const shelvedList = catalog.entries.filter((e) => e.live);
  const BATCH = 8;
  for (let i = 0; i < shelvedList.length; i += BATCH) {
    const slice = shelvedList.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async (e) => [e, await probe(e.live)]));
    for (const [entry, r] of results) if (r.digest) shelved.set(r.digest, entry.slug);
    process.stdout.write(`  fingerprinting the shelf ${Math.min(i + BATCH, shelvedList.length)}/${shelvedList.length}\r`);
  }
  console.log(`\n  ${shelved.size} distinct pages already on the shelf\n`);

  const candidates = [];
  const aliases = [];
  const dead = [];

  for (let i = 0; i < unknown.length; i += BATCH) {
    const slice = unknown.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async (p) => [p, await probe(p.latestProductionUrl)]));

    for (const [project, r] of results) {
      if (!r.digest) {
        dead.push({ name: project.name, url: project.latestProductionUrl, status: r.status });
        console.log(`  dead   ${project.name.padEnd(32)} ${r.status || "no answer"}`);
        continue;
      }
      const twin = shelved.get(r.digest);
      if (twin) {
        aliases.push({ name: project.name, url: project.latestProductionUrl, sameAs: twin });
        console.log(`  alias  ${project.name.padEnd(32)} same page as ${twin}`);
        continue;
      }
      // A page with almost no prose is a placeholder, a redirect stub, or an
      // API root — real enough to answer, not real enough to shelve.
      if (r.prose < 220) {
        dead.push({ name: project.name, url: project.latestProductionUrl, status: "no content" });
        console.log(`  thin   ${project.name.padEnd(32)} ${r.prose} chars of prose`);
        continue;
      }

      shelved.set(r.digest, project.name);
      candidates.push({
        name: project.name,
        url: project.latestProductionUrl,
        title: r.title,
        description: r.description,
        prose: r.prose,
        updatedAt: project.updatedAt ? new Date(project.updatedAt).toISOString() : null,
      });
      console.log(`  NEW    ${project.name.padEnd(32)} ${(r.title || "").slice(0, 60)}`);
    }
  }

  writeFileSync(OUT, JSON.stringify({ candidates, aliases, dead }, null, 2) + "\n");
  console.log(`\n${candidates.length} genuinely new sites, ${aliases.length} aliases, ${dead.length} not serving anything`);
  console.log("written to src/data/candidates.json");
}

main();
