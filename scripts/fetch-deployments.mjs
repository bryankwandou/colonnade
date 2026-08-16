/**
 * Pages through every Vercel project on the account.
 *
 *   node scripts/fetch-deployments.mjs
 *
 * `vercel project ls` returns 20 rows by default and silently stops there,
 * which is how a hundred-odd deployments can look like twenty. This walks the
 * cursor to the end and writes the complete list to src/data/deployments.json.
 *
 * This is also the ownership test. A subdomain answering on the open internet
 * proves only that somebody deployed it; appearing in this list proves it is
 * ours. Guessing at subdomains finds other people's work.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "src", "data", "deployments.json");
const isWindows = process.platform === "win32";

function vercel(args) {
  const opts = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true };
  try {
    return execFileSync("vercel", args, opts);
  } catch (err) {
    if (!isWindows) throw err;
    return execFileSync("vercel.cmd", args, { ...opts, shell: true });
  }
}

function parse(text) {
  // The CLI prints progress lines before the JSON body.
  const start = text.indexOf("{");
  if (start === -1) throw new Error("no JSON in vercel output");
  return JSON.parse(text.slice(start));
}

function main() {
  const all = new Map();
  let cursor = null;
  let page = 0;

  for (;;) {
    const args = ["project", "ls", "--json", "--limit", "100"];
    if (cursor) args.push("--next", String(cursor));

    const payload = parse(vercel(args));
    const projects = payload.projects ?? [];
    page += 1;

    for (const p of projects) all.set(p.name, p);
    console.log(`page ${page}: ${projects.length} projects (${all.size} total)`);

    const next = payload.pagination?.next;
    if (!next || projects.length === 0) break;
    cursor = next;
    if (page > 30) break; // guard against a cursor that never terminates
  }

  const list = [...all.values()].sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(OUT, JSON.stringify(list, null, 2) + "\n");

  const withUrl = list.filter((p) => p.latestProductionUrl).length;
  console.log(`\n${list.length} projects on the account, ${withUrl} with a production URL`);
}

main();
