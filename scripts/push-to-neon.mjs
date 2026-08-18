/**
 * Moves the catalogue into Postgres and keeps it there.
 *
 *   node scripts/push-to-neon.mjs
 *
 * The pages themselves were never the weight — they are prerendered HTML. The
 * weight was the header search, a client component importing all 158 listings
 * so every visitor downloaded 128KB of catalogue to type into a box. With the
 * rows in Postgres, search becomes a query and the browser downloads nothing.
 *
 * The JSON files stay as a build-time fallback, so a build with no database
 * reachable still produces the whole site rather than failing.
 *
 * Reads DATABASE_URL from the environment. Never hard-code it: a connection
 * string in the repo is a credential in the repo.
 */

import { neon } from "@neondatabase/serverless";
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

/** Pulls DATABASE_URL from the environment, or from .env.local when running locally. */
function connectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const local = readFileSync(join(root, ".env.local"), "utf8");
  const line = local.split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL is not set and .env.local has no entry for it");
  return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
}

async function main() {
  const sql = neon(connectionString());

  const catalog = readJson(join(root, "src", "data", "catalog.json"), { entries: [] });
  const marks = readJson(join(root, "src", "data", "marks.json"), {});

  console.log(`pushing ${catalog.entries.length} listings\n`);

  await sql`
    CREATE TABLE IF NOT EXISTS listings (
      slug            text PRIMARY KEY,
      name            text NOT NULL,
      repo_name       text,
      tagline         text,
      live            text,
      source          text,
      is_private      boolean NOT NULL DEFAULT false,
      archived        boolean NOT NULL DEFAULT false,
      language        text,
      stars           integer NOT NULL DEFAULT 0,
      topics          text[]  NOT NULL DEFAULT '{}',
      shelf           text    NOT NULL,
      category        text    NOT NULL,
      category_label  text    NOT NULL,
      featured        boolean NOT NULL DEFAULT false,
      updated_at      timestamptz,
      created_at      timestamptz
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marks (
      slug      text PRIMARY KEY REFERENCES listings(slug) ON DELETE CASCADE,
      file      text NOT NULL,
      source    text NOT NULL,
      kind      text NOT NULL,
      bytes     integer NOT NULL,
      digest    text,
      evidence  text
    )
  `;

  // Search hits name, tagline, and category together, so index the three as one
  // document rather than adding three separate indexes that never combine.
  await sql`
    CREATE INDEX IF NOT EXISTS listings_search ON listings
    USING gin (to_tsvector('simple',
      coalesce(name,'') || ' ' || coalesce(tagline,'') || ' ' || coalesce(category_label,'')))
  `;
  await sql`CREATE INDEX IF NOT EXISTS listings_shelf ON listings (shelf, category)`;

  // A full replace each run: the catalogue is rebuilt from GitHub and Vercel, so
  // the JSON is the source of truth and the table is a serving copy. Rows are
  // deleted first so a listing that disappears upstream disappears here.
  await sql`DELETE FROM marks`;
  await sql`DELETE FROM listings`;

  const CHUNK = 25;
  for (let i = 0; i < catalog.entries.length; i += CHUNK) {
    const slice = catalog.entries.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(
        (e) => sql`
          INSERT INTO listings (
            slug, name, repo_name, tagline, live, source, is_private, archived,
            language, stars, topics, shelf, category, category_label, featured,
            updated_at, created_at
          ) VALUES (
            ${e.slug}, ${e.name}, ${e.repoName ?? null}, ${e.tagline ?? null},
            ${e.live ?? null}, ${e.source ?? null}, ${Boolean(e.private)},
            ${Boolean(e.archived)}, ${e.language ?? null}, ${e.stars ?? 0},
            ${e.topics ?? []}, ${e.shelf}, ${e.category}, ${e.categoryLabel},
            ${Boolean(e.featured)}, ${e.updatedAt ?? null}, ${e.createdAt ?? null}
          )
        `
      )
    );
    process.stdout.write(`  listings ${Math.min(i + CHUNK, catalog.entries.length)}/${catalog.entries.length}\r`);
  }
  console.log("");

  const markRows = Object.entries(marks).filter(([slug]) =>
    catalog.entries.some((e) => e.slug === slug)
  );
  for (let i = 0; i < markRows.length; i += CHUNK) {
    const slice = markRows.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(
        ([slug, m]) => sql`
          INSERT INTO marks (slug, file, source, kind, bytes, digest, evidence)
          VALUES (${slug}, ${m.file}, ${m.source}, ${m.kind}, ${m.bytes ?? 0},
                  ${m.digest ?? null}, ${m.evidence ?? null})
        `
      )
    );
    process.stdout.write(`  marks ${Math.min(i + CHUNK, markRows.length)}/${markRows.length}\r`);
  }
  console.log("");

  const [{ listings }] = await sql`SELECT count(*)::int AS listings FROM listings`;
  const [{ stored }] = await sql`SELECT count(*)::int AS stored FROM marks`;
  const [{ live }] = await sql`SELECT count(*)::int AS live FROM listings WHERE live IS NOT NULL`;

  console.log(`\n${listings} listings in Postgres, ${live} with a live deployment, ${stored} marks`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
