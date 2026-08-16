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
const DISCOVERED = join(root, "src", "data", "discovered.json");

/**
 * Deployments whose subdomain drifted away from the repository name, usually
 * because the plain name was already taken on vercel.app. Verified by
 * scripts/discover-links.mjs before they land here.
 */
const HOST_ALIASES = {
  "matchmind-omega": "matchmind",
  "stele-gamma": "stele",
  "marque-eight-ruddy": "marque",
  mettlehq: "mettle",
  getkernly: "kernly",
  removix: "removix-ai",
  kopedux: "kopedu",
  "solq-demo": "solq",
  "blockbite-tdp": "BLOCKBITE-TDP",
};

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

/**
 * Deployments come from scripts/fetch-deployments.mjs rather than a call made
 * here. `vercel project ls` pages at 20 by default, so calling it inline used to
 * silently truncate 168 projects down to the first page and overwrite the good
 * snapshot with it. Refresh the list with `npm run deployments`.
 */
function readDeployments() {
  const projects = readJson(DEPLOY_SNAPSHOT, []);
  const list = Array.isArray(projects) ? projects : (projects.projects ?? []);
  console.log(`vercel snapshot: ${list.length} projects`);
  if (list.length < 50) {
    console.warn("  that looks truncated — run `npm run deployments` to refresh it");
  }
  return list;
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
    id: "games",
    shelf: "projects",
    label: "Games & Play",
    blurb: "Worlds, arcades, and dungeons — the work built to be played rather than used.",
    match: /\bgame\b|arcade|dungeon|rogue|quest|isles|adventure/i,
    names: [
      "skyseed-isles", "kubantara", "meadowfar", "blockblast", "proofofplay",
      "blockbite-corporation", "blockbite-game", "waliplay", "tapwali", "keelstack-gaming",
    ],
  },
  {
    id: "civic",
    shelf: "projects",
    label: "Civic & Local Economy",
    blurb: "Public services, cooperatives, and small businesses in Indonesia.",
    match: /pdam|desa|umkm|koperasi|kopedu|nusantara|satudata|pemda|warung|civic|harvest/i,
    names: [
      "tanki-request", "tanki-request-87c0dd3", "tugas-tahap-0-satudata-sulsel", "nusaharvest",
      "kopedu", "kubantara", "solumkm", "umkm-pintar", "warungpay", "kopedu-rintiskop",
    ],
  },
  {
    id: "coursework",
    shelf: "projects",
    label: "Coursework & Exercises",
    blurb: "University assignments and the drills that came with learning a stack.",
    match: /tugas|semester|kuliah|kelompok|project\d|finaltest|latihan|bootcamp|batches/i,
    names: [
      "springboot-login-jwt", "semester3dan4", "machinelearning-project3-kelompok2",
      "computervision-project1", "coffeeshop-enterprisefinaltest", "qrcode1",
      "qr-code-generator", "qrcodefail-1", "solidity-personal-vault-mancer",
      "portfolio-cv", "phiechyan-arsip", "ssfti-arsip",
    ],
  },
  {
    id: "early",
    shelf: "projects",
    label: "Early Work & Archive",
    blurb: "Starts that were parked, renamed, or folded into something later.",
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
  const rawOverrides = readJson(OVERRIDES, {});
  // Repo names carry every casing style there is (SmashGO, QUANTCOIN, MOVV-BMI),
  // so curation is keyed case-insensitively rather than demanding an exact match.
  const overrides = new Map(Object.entries(rawOverrides).map(([k, v]) => [k.toLowerCase(), v]));
  const repos = readRepos();
  const deployments = readDeployments();

  /*
   * Vercel project names drift from repository names in predictable ways:
   * a `get` prefix when the plain name was taken, and suffixes marking a rewrite
   * (-revamped, -v2), a retired version (-legacy, -lama, -broken), or a split
   * deployment (-app, -ui, -backend). Matching on the stem catches almost all of
   * it; PROJECT_ALIASES handles what stemming cannot.
   */
  const squash = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const STEM = /^(get)?(.+?)(-(app|ui|live|demo|backend|frontend|legacy|lama|rusak|broken|revamped|secure|production|mono|protocol|v2|site|web))*$/;

  function stemsOf(name) {
    const out = new Set([squash(name)]);
    let working = name.toLowerCase();
    if (working.startsWith("get")) out.add(squash(working.slice(3)));
    for (;;) {
      const next = working.replace(
        /-(app|ui|live|demo|backend|frontend|legacy|lama|rusak|broken|revamped|secure|production-secure|mono|protocol|v2|site|web|id)$/,
        ""
      );
      if (next === working) break;
      working = next;
      out.add(squash(working));
      if (working.startsWith("get")) out.add(squash(working.slice(3)));
    }
    return [...out].filter((s) => s.length >= 3);
  }

  /** Deployments whose name shares no stem with the repository it belongs to. */
  const PROJECT_ALIASES = {
    "chain-shift": "ChainShift",
    "proof-of-play": "proofofplay",
    "quorum-ai": "quorumai",
    trustpaysea: "trustpay-sea",
    nusaharvestid: "NusaHarvest",
    "nusa-harvest-backend": "NusaHarvest",
    "satudata-sulsel-tahap0": "tugas-tahap-0-satudata-sulsel",
    "machinelearning-kelompok2": "MachineLearning-project3-kelompok2",
    "phiechyan-lama": "phiechyan-arsip",
    phiechyan: "phiechyan-arsip",
    "ssfti-uajm": "ssfti-arsip",
    "ssfti-uajm-rusak": "ssfti-arsip",
    "fti-uajm": "ssfti-arsip",
    kopedux: "kopedu",
    arbiterbot: "arbiter",
    "tanki-request-87c0dd3": "tanki-request",
    "veilo-v01-finding": "veilo-v01-report",
    "perfect-portfolio": "portfolio-cv",
    "cv-app": "portfolio-cv",
    "blockbite-tdp": "BLOCKBITE-TDP",
    "nayrbryangaming-escrow-kita": "EscrowKita",
    "escrowkita.base": "EscrowKita",
    vestraid: "Veztra",
    "vericodev2": "vericodeai",
    "vericode-ai": "vericodeai",
    "getveristart": "veristart-agentic-feasibility",
    "understudy-live": "understudy",
    staketodone: "stake-to-done",
    antigravitycoffeeshop: "CoffeeShop-EnterpriseFinalTest",
  };

  const deployByStem = new Map();
  for (const p of deployments) {
    const url = normaliseUrl(p.latestProductionUrl);
    if (!url || url === "https://--") continue;

    const alias = PROJECT_ALIASES[p.name.toLowerCase()];
    const keys = alias ? [squash(alias)] : stemsOf(p.name);

    for (const key of keys) {
      const existing = deployByStem.get(key);
      // A bare vercel.app subdomain beats the long team-scoped fallback URL.
      const isClean = !/-nayrbryangamings-projects\./.test(url);
      if (!existing || (isClean && !existing.isClean)) {
        deployByStem.set(key, { url, isClean, project: p.name });
      }
    }
  }

  const deployByName = new Map();
  for (const [key, value] of deployByStem) deployByName.set(key, value.url);

  /*
   * Links harvested from project READMEs and verified over HTTP. Root addresses
   * beat deep links, since a listing should open the front door rather than
   * drop someone halfway inside.
   */
  const discovered = readJson(DISCOVERED, { live: {} });
  const discoveredByName = new Map();
  for (const url of Object.keys(discovered.live ?? {})) {
    let host;
    let path;
    try {
      const parsed = new URL(url);
      host = parsed.host;
      path = parsed.pathname;
    } catch {
      continue;
    }
    const sub = host.split(".")[0].toLowerCase();
    const key = (HOST_ALIASES[sub] ?? sub).toLowerCase();
    const isRoot = path === "/" || path === "";
    const existing = discoveredByName.get(key);
    // Keep the shallowest URL seen for any given project.
    if (!existing || (isRoot && !existing.isRoot)) {
      discoveredByName.set(key, { url: `https://${host}${isRoot ? "" : path}`, isRoot });
    }
  }

  const entries = [];
  let withheld = 0;

  for (const repo of repos) {
    if (repo.isArchived && !overrides.has(repo.name.toLowerCase())) {
      // Archived work stays out unless it was deliberately curated back in.
    }
    const override = overrides.get(repo.name.toLowerCase()) ?? null;

    const live =
      normaliseUrl(override?.live) ??
      normaliseUrl(repo.homepageUrl) ??
      deployByName.get(squash(repo.name)) ??
      discoveredByName.get(repo.name.toLowerCase())?.url ??
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
