/**
 * Checks every hand-written tagline against what the author actually published.
 *
 *   node scripts/audit-taglines.mjs
 *
 * Curated copy is the one place in this pipeline where a claim can be invented
 * rather than derived. Several were: NusaHarvest was described as a supply
 * chain when its README says parametric crop insurance, and Everanima as an
 * animation library when it is an AI memory product. Both readings came from
 * the name alone.
 *
 * The check is deliberately crude — shared vocabulary between the tagline and
 * the source — because it only has to surface entries worth a second look, not
 * judge them. Exit code 1 when a tagline has no source at all.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, ""));
  } catch {
    return fallback;
  }
}

const STOP = new Set(
  ("a an the and or but of for to in on at by with from that this it its is are was were be been " +
    "you your they them their we our i my not no so as if then than into onto over under out up " +
    "dan yang di ke dari untuk pada dengan atau ini itu tidak bisa akan sudah agar bukan saja")
    .split(" ")
);

function tokens(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP.has(w))
  );
}

function overlap(a, b) {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / left.size;
}

function main() {
  const overrides = readJson(join(root, "src", "data", "overrides.json"), {});
  const blurbs = readJson(join(root, "src", "data", "readme-blurbs.json"), {});
  const siteMeta = readJson(join(root, "src", "data", "site-meta.json"), {});
  const repos = readJson(join(root, "src", "data", "repos.snapshot.json"), []);
  const descriptions = new Map(repos.map((r) => [r.name.toLowerCase(), r.description ?? ""]));

  const unsourced = [];
  const weak = [];
  let checked = 0;

  for (const [key, value] of Object.entries(overrides)) {
    if (!value.tagline) continue;
    const slug = key.toLowerCase();

    // Drop badge and link rows: they are markup, not a description of anything.
    const readme = (blurbs[slug] ?? [])
      .filter((line) => !/^(live|waitlist|demo|repo)\b|^https?:/i.test(line.trim()))
      .join(" ");
    const description = descriptions.get(slug) ?? "";
    // A third source: what the deployment says about itself in its own <head>.
    const meta = siteMeta[slug] ?? {};
    const source = `${readme} ${description} ${meta.description ?? ""} ${meta.title ?? ""}`.trim();

    // A short source still counts. "SOLQ — Solana × QRIS" is twenty characters
    // and tells you exactly what the product is; the bar is whether the author
    // published something, not whether they published a paragraph.
    if (source.length < 14) {
      unsourced.push(key);
      continue;
    }

    checked += 1;
    const score = overlap(value.tagline, source);

    // Vocabulary overlap cannot see through translation. Several taglines are
    // Indonesian paraphrases of English READMEs and score zero while being
    // perfectly faithful, so a language mismatch downgrades the finding to a
    // note rather than a flag.
    const translated = /\b(yang|dan|untuk|dengan|tidak|bisa|dari|pada)\b/i.test(value.tagline) !==
      /\b(the|and|for|with|that|from|this)\b/i.test(source);

    if (score < 0.2 && !translated) {
      weak.push({ key, score, tagline: value.tagline, source: source.slice(0, 130) });
    }
  }

  weak.sort((a, b) => a.score - b.score);

  console.log(`${checked} taglines checked against a published source\n`);

  if (weak.length) {
    console.log(`${weak.length} share little vocabulary with their source — read these again:`);
    for (const w of weak) {
      console.log(`\n  ${w.key}  (overlap ${(w.score * 100).toFixed(0)}%)`);
      console.log(`    written: ${w.tagline.slice(0, 120)}`);
      console.log(`    source : ${w.source}`);
    }
    console.log("");
  }

  if (unsourced.length) {
    console.log(`${unsourced.length} taglines have no published source at all:`);
    console.log(`  ${unsourced.join(", ")}\n`);
    console.log("Every listed claim needs something behind it. Remove the sentence or find the source.");
    process.exit(1);
  }

  console.log("Every tagline traces back to something the author published.");
}

main();
