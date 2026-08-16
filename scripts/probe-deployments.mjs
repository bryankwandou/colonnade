/**
 * Tries every repository name as a vercel.app subdomain, plus the handful of
 * variants a taken name usually gets pushed into.
 *
 *   node scripts/probe-deployments.mjs
 *
 * README scraping only finds deployments somebody remembered to write down.
 * This finds the rest by asking the network directly. Results are merged into
 * src/data/discovered.json alongside the README sweep.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const REPOS = join(root, "src", "data", "repos.snapshot.json");
const DISCOVERED = join(root, "src", "data", "discovered.json");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

/** Subdomain candidates for one repository, most likely first. */
function variants(repoName) {
  const base = repoName.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  const stripped = base.replace(/-(ai|app|web|site|protocol)$/, "");
  const out = new Set([base]);
  if (stripped !== base) out.add(stripped);
  out.add(`${base}hq`);
  out.add(`get${base}`);
  out.add(`${base}-app`);
  return [...out].filter((v) => v.length >= 3 && v.length <= 63);
}

async function probe(host) {
  const url = `https://${host}.vercel.app`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "colonnade-deployment-probe" },
    });
    clearTimeout(timer);
    if (res.status >= 400) return null;

    // Vercel serves a 200 placeholder for parked or suspended projects.
    const body = await res.text();
    if (/DEPLOYMENT_NOT_FOUND|The deployment could not be found|404: NOT_FOUND/i.test(body)) return null;
    if (body.length < 300) return null;

    return { url, status: res.status, bytes: body.length };
  } catch {
    return null;
  }
}

async function main() {
  const repos = readJson(REPOS, []);
  if (!repos.length) {
    console.error("no repo snapshot; run build-catalog first");
    process.exit(1);
  }

  const discovered = readJson(DISCOVERED, { live: {}, dead: [] });
  const known = new Set(
    Object.keys(discovered.live ?? {}).map((u) => {
      try {
        return new URL(u).host;
      } catch {
        return u;
      }
    })
  );

  const jobs = [];
  for (const repo of repos) {
    for (const host of variants(repo.name)) {
      if (known.has(`${host}.vercel.app`)) continue;
      jobs.push({ repo: repo.name, host });
    }
  }

  console.log(`probing ${jobs.length} candidate subdomains for ${repos.length} repositories\n`);

  const found = {};
  const BATCH = 12;
  let checked = 0;

  for (let i = 0; i < jobs.length; i += BATCH) {
    const slice = jobs.slice(i, i + BATCH);
    const results = await Promise.all(slice.map(async (job) => [job, await probe(job.host)]));
    for (const [job, hit] of results) {
      checked += 1;
      if (hit) {
        found[hit.url] = [job.repo];
        console.log(`  found  ${hit.url}   (${job.repo})`);
      }
    }
    if (i % (BATCH * 10) === 0 && i > 0) console.log(`  ...${checked}/${jobs.length}`);
  }

  const merged = { ...(discovered.live ?? {}), ...found };
  writeFileSync(
    DISCOVERED,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), live: merged, dead: discovered.dead ?? [] },
      null,
      2
    ) + "\n"
  );

  console.log(
    `\n${Object.keys(found).length} new deployments found; ${Object.keys(merged).length} live URLs total`
  );
}

main();
