/**
 * Pulls the opening description out of each README that still has no tagline.
 *
 *   node scripts/fetch-readmes.mjs
 *
 * A catalogue entry with no description is close to useless, and inventing one
 * is worse than leaving it blank. This fetches what the author already wrote and
 * writes it to src/data/readme-blurbs.json for review before it becomes copy.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const CATALOG = join(root, "src", "data", "catalog.json");
const OUT = join(root, "src", "data", "readme-blurbs.json");

const isWindows = process.platform === "win32";

function gh(args) {
  const opts = { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, windowsHide: true };
  try {
    return execFileSync("gh", args, opts);
  } catch (err) {
    if (!isWindows) throw err;
    return execFileSync("gh.cmd", args, { ...opts, shell: true });
  }
}

/**
 * Strips the decoration READMEs collect — badges, centred divs, emoji headings,
 * link rows — and returns the first sentence that actually says something.
 */
function firstMeaningfulLine(markdown) {
  const lines = markdown.split(/\r?\n/);
  const candidates = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (/^<\/?(div|p|img|br|a|h\d|center|picture|source)/i.test(line)) continue;
    if (/^!\[/.test(line)) continue;                    // badge or image
    if (/^\[!\[/.test(line)) continue;                  // linked badge
    if (/^[-=*_]{3,}$/.test(line)) continue;            // rule
    if (/^#{1,6}\s/.test(line)) continue;               // heading
    if (/^>\s/.test(line)) line = line.replace(/^>\s*/, "");
    if (/^```/.test(line)) break;                       // hit a code fence, stop
    if (/^\|/.test(line)) continue;                     // table
    if (/^(\[.+?\]\(.+?\)\s*[·|•]?\s*)+$/.test(line)) continue; // link row

    // Drop leading emoji and surrounding bold markers.
    const cleaned = line
      .replace(/^[\p{Extended_Pictographic}\p{Emoji_Presentation}\s]+/u, "")
      .replace(/^\*\*(.+?)\*\*$/, "$1")
      .replace(/\*\*/g, "")
      .trim();

    if (cleaned.length < 25) continue;
    candidates.push(cleaned);
    if (candidates.length >= 2) break;
  }

  return candidates;
}

function main() {
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8").replace(/^﻿/, ""));
  const missing = catalog.entries.filter((e) => !e.tagline && !e.private);

  console.log(`${missing.length} public listings have no description\n`);
  const out = {};

  for (const entry of missing) {
    try {
      const raw = gh(["api", `repos/bryankwandou/${entry.repoName}/readme`, "--jq", ".content"]);
      const markdown = Buffer.from(raw.trim(), "base64").toString("utf8");
      const lines = firstMeaningfulLine(markdown);
      if (lines.length) {
        out[entry.slug] = lines;
        console.log(`${entry.slug}\n    ${lines[0].slice(0, 150)}\n`);
      } else {
        console.log(`${entry.slug}\n    (README has no usable prose)\n`);
      }
    } catch {
      console.log(`${entry.slug}\n    (no README on GitHub)\n`);
    }
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`\n${Object.keys(out).length} descriptions recovered into src/data/readme-blurbs.json`);
}

main();
