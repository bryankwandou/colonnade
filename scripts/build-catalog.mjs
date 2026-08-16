/**
 * Builds src/data/catalog.json from live sources.
 *
 *   node scripts/build-catalog.mjs
 *
 * Sources, in order of trust:
 *   1. src/data/overrides.json  - hand-written curation, always wins
 *   2. `gh repo list`           - every repo on the account, public and private
 *   3. `vercel project ls`      - production URLs per project name
 *
 * A repo earns a place in the catalog when it has somewhere public to send
 * people: a homepage, a matched Vercel deployment, or a public source tree.
 * Private repos with no reachable link are counted but not listed.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const OUT = join(root, "src", "data", "catalog.json");
const OVERRIDES = join(root, "src", "data", "overrides.json");
const REPO_SNAPSHOT = join(root, "src", "data", "repos.snapshot.json");
const DEPLOY_SNAPSHOT = join(root, "src", "data", "deployments.json");

const isWindows = process.platform === "win32";

const REPO_FIELDS = [
  "name",
  "description",
  "url",
  "homepageUrl",
  "updatedAt",
  "createdAt",
  "isPrivate",
  "isArchived",
  "primaryLanguage",
  "stargazerCount",
  "repositoryTopics",
].join(",");

/** PowerShell writes UTF-8 with a BOM; JSON.parse chokes on the leading U+FEFF. */
function parseJson(text) {
  return JSON.parse(text.replace(/^﻿/, ""));
}

/**
 * gh installs as a real .exe, vercel as a .cmd shim. Node 24 will not spawn a
 * .cmd without a shell, so try the bare name first and fall back to the shim.
 */
function sh(cmd, args) {
  const opts = { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true };
  try {
    return execFileSync(cmd, args, opts);
  } catch (err) {
    if (!isWindows) throw err;
    return execFileSync(`${cmd}.cmd`, args, { ...opts, shell: true });
  }
}

function readJson(path, fallback) {
  try {
    return parseJson(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * Live sources are preferred, but CI has neither a GitHub token nor a Vercel
 * session. Both readers fall back to a committed snapshot so `next build`
 * always has a catalog to render.
 */
function readRepos() {
  try {
    const repos = parseJson(sh("gh", ["repo", "list", "--limit", "400", "--json", REPO_FIELDS]));
    writeFileSync(REPO_SNAPSHOT, JSON.stringify(repos, null, 2) + "\n");
    console.log(`gh: ${repos.length} repos`);
    return repos;
  } catch (err) {
    const snap = readJson(REPO_SNAPSHOT, []);
    console.warn(`gh unavailable (${err.code ?? err.message}); using snapshot of ${snap.length} repos`);
    return snap;
  }
}

function readDeployments() {
  try {
    const raw = parseJson(sh("vercel", ["project", "ls", "--json"]));
    const projects = raw.projects ?? [];
    if (projects.length) {
      writeFileSync(DEPLOY_SNAPSHOT, JSON.stringify(projects, null, 2) + "\n");
      console.log(`vercel: ${projects.length} projects`);
      return projects;
    }
  } catch (err) {
    console.warn(`vercel unavailable (${err.code ?? err.message}); using snapshot`);
  }
  return readJson(DEPLOY_SNAPSHOT, []);
}

/* ------------------------------------------------------------------ *
 * Shelving rules
 *
 * Two storefronts, mirroring how the work actually divides:
 *   tools    - something you open and operate. An editor, a scanner, a meter.
 *   projects - a venture, product, or study with its own thesis.
 * ------------------------------------------------------------------ */

const CATEGORY_RULES = [
  {
    id: "creative-tools",
    shelf: "tools",
    label: "Creative Studio",
    blurb: "Editors that run in the tab you already have open.",
    match: /photo|video|audio|image|editor|darkroom|comic|design|type|font|render|frame|canvas|studio/i,
    names: ["grainroom", "cutwright", "stemloom", "kanvara", "handpress", "kiloframe", "inkfold", "glyphra"],
  },
  {
    id: "agent-infra",
    shelf: "tools",
    label: "Agent Infrastructure",
    blurb: "Rails, guards, and receipts for software that acts on its own.",
    match: /agent|mcp|llm|context|prompt|skill|autonom|copilot|inference/i,
    names: ["assaykit", "kernly", "tallystick", "forewrit", "aval-core", "aval-rail", "aval-site", "zeroclaw-plugins", "veylock", "x402gate", "nullstamp"],
  },
  {
    id: "developer",
    shelf: "tools",
    label: "Developer Workbench",
    blurb: "Things that sit between an idea and a shipped commit.",
    match: /ide|compiler|spec|debug|lint|sdk|registry|faucet|devnet|workbench|anchor/i,
    names: ["marque", "keelstack", "loomstack", "spigot", "mettle", "anchor-debugger-skill", "antigravity-ide-frontend", "vericodeai", "removix-ai"],
  },
  {
    id: "measurement",
    shelf: "tools",
    label: "Meters & Ledgers",
    blurb: "Counting what usually goes uncounted.",
    match: /token|meter|watt|track|ledger|analytic|dashboard|monitor|index|quant/i,
    names: ["tokenwatt", "atlas-quant", "chainops-dashboard-ui-kit", "pocketledger-offline-expense-tracker"],
  },
  {
    id: "operations",
    shelf: "projects",
    label: "Operations Software",
    blurb: "Industry workflows where a wrong call has a cost.",
    match: /operations|compliance|dispatch|fleet|schedul|clinic|care|repair|restaurant|freight|rental|municipal/i,
    names: ["visitrail", "servetrace", "freightlatch", "axleveto", "autorepairos", "dwellnerve", "stewardlane", "childcareos", "civiflow", "evercue", "galleryos", "clinicflow-ai", "briefrail", "vowrail", "accordos-ai", "mirrorqa-ai"],
  },
  {
    id: "web3",
    shelf: "projects",
    label: "Solana & Web3",
    blurb: "On-chain settlement, identity, and proof.",
    match: /solana|anchor|web3|chain|wallet|token|nft|escrow|stake|defi|devnet|crypto/i,
    names: ["solera", "stele", "wayproof", "kinferry", "anamneon", "proofcast", "lineproof", "verichain", "kopedu-nft-solana", "solgig", "solgig-mainnet", "diafund", "botcall-protocol", "deadmanswitch", "blockbite", "blockbite-xyz", "QUANTCOIN", "NNG-PROTOCOL", "EscrowKita", "trustpay-sea", "stake-to-done", "veilspire", "proofofplay", "basedrop"],
  },
  {
    id: "consumer",
    shelf: "projects",
    label: "Consumer & Culture",
    blurb: "Built for readers, players, and people who are not developers.",
    match: /novel|read|game|play|chat|companion|health|habit|social|esport|music|portfolio/i,
    names: ["kithra", "larasa", "cairin", "cadensa", "nngesport", "vinbryyt", "bryankwandou", "blockblast", "skyseed-isles", "waliplay", "tapwali", "habitforge", "focusforge-pomodoro", "flowtask-smart-todo-app", "hydraflow-water-reminder", "MOVV-BMI", "InspiraVerse", "SmashGO", "meadowfar", "everanima", "fluentia", "lectio", "sahih", "solq"],
  },
  {
    id: "research",
    shelf: "projects",
    label: "Research & Audit",
    blurb: "Findings, assessments, and the paper trail behind them.",
    match: /audit|security|assess|finding|report|forensic|feasib|research|archive|arsip/i,
    names: ["veilo-audit-bryan", "veilo-cleanroom-audit", "veilo-security-assessment", "veilo-privacy-pool-assessment", "veilo-v01-report", "veilo-v01-finding", "veristart-agentic-feasibility", "feasiflow-ai", "dissentgrid", "phiechyan-arsip", "ssfti-arsip", "quorumai"],
  },
  {
    id: "ventures",
    shelf: "projects",
    label: "Ventures & Studies",
    blurb: "Company-shaped work: entities, launches, coursework, and pitches.",
    match: /.*/,
    names: [],
  },
];

function categorise(repo, override) {
  if (override?.category) {
    const hit = CATEGORY_RULES.find((c) => c.id === override.category);
    if (hit) return hit;
  }
  const byName = CATEGORY_RULES.find((c) => c.names.includes(repo.name));
  if (byName) return byName;

  const haystack = [
    repo.name,
    repo.description ?? "",
    (repo.repositoryTopics ?? []).map((t) => t.name ?? t).join(" "),
  ].join(" ");

  return CATEGORY_RULES.find((c) => c.match.test(haystack)) ?? CATEGORY_RULES.at(-1);
}

/** Turns "keelstack-gaming" into "Keelstack Gaming" without mangling known casings. */
const KEEP_CASE = new Set(["ai", "os", "ide", "qa", "nng", "sdk", "api", "hq", "usa", "xyz", "cv", "bmi", "qr"]);
function titleise(slug) {
  return slug
    .replace(/[-_.]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase() && word.length > 1) return word;
      const lower = word.toLowerCase();
      if (KEEP_CASE.has(lower)) return lower.toUpperCase();
      return word[0].toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function normaliseUrl(url) {
  if (!url) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function main() {
  const overrides = readJson(OVERRIDES, {});
  const repos = readRepos();
  const deployments = readDeployments();

  const deployByName = new Map();
  for (const p of deployments) {
    if (p.latestProductionUrl) deployByName.set(p.name.toLowerCase(), normaliseUrl(p.latestProductionUrl));
  }

  const entries = [];
  let withheld = 0;

  for (const repo of repos) {
    if (repo.isArchived && !overrides[repo.name]) {
      // Archived work stays out unless it was deliberately curated back in.
    }
    const override = overrides[repo.name] ?? null;

    const live =
      normaliseUrl(override?.live) ??
      normaliseUrl(repo.homepageUrl) ??
      deployByName.get(repo.name.toLowerCase()) ??
      null;

    const source = repo.isPrivate ? null : repo.url;

    // The rule the brief asked for: if there is a public way in, show it.
    if (!live && !source) {
      withheld += 1;
      continue;
    }

    const category = categorise(repo, override);
    const topics = (repo.repositoryTopics ?? []).map((t) => t.name ?? t);

    entries.push({
      slug: repo.name.toLowerCase(),
      name: override?.name ?? titleise(repo.name),
      repoName: repo.name,
      tagline: override?.tagline ?? repo.description ?? null,
      live,
      source,
      private: Boolean(repo.isPrivate),
      archived: Boolean(repo.isArchived),
      language: repo.primaryLanguage?.name ?? null,
      stars: repo.stargazerCount ?? 0,
      topics,
      shelf: override?.shelf ?? category.shelf,
      category: category.id,
      categoryLabel: category.label,
      featured: Boolean(override?.featured),
      updatedAt: repo.updatedAt,
      createdAt: repo.createdAt,
    });
  }

  entries.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    if (Boolean(a.live) !== Boolean(b.live)) return a.live ? -1 : 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  const shelves = ["tools", "projects"].map((shelf) => ({
    id: shelf,
    label: shelf === "tools" ? "Tools" : "Projects",
    categories: CATEGORY_RULES.filter((c) => c.shelf === shelf).map((c) => ({
      id: c.id,
      label: c.label,
      blurb: c.blurb,
      count: entries.filter((e) => e.category === c.id).length,
    })),
  }));

  const catalog = {
    generatedAt: new Date().toISOString(),
    counts: {
      repos: repos.length,
      listed: entries.length,
      withheld,
      live: entries.filter((e) => e.live).length,
      private: entries.filter((e) => e.private).length,
      tools: entries.filter((e) => e.shelf === "tools").length,
      projects: entries.filter((e) => e.shelf === "projects").length,
    },
    shelves,
    entries,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(catalog, null, 2) + "\n");

  console.log(
    `catalog: ${catalog.counts.listed} listed (${catalog.counts.live} live, ` +
      `${catalog.counts.withheld} withheld) from ${catalog.counts.repos} repos`
  );
  for (const shelf of shelves) {
    console.log(`  ${shelf.label}`);
    for (const c of shelf.categories) console.log(`    ${String(c.count).padStart(3)}  ${c.label}`);
  }
}

main();
