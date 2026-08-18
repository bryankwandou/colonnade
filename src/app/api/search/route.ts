import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { entries as fallbackEntries } from "@/lib/catalog";

/**
 * Search, moved off the browser.
 *
 * The header used to import the whole catalogue into a client component, so
 * every visitor downloaded 128KB of listings before they could type a letter.
 * Postgres answers the same question in a few hundred bytes.
 *
 * When no database is configured the route filters the build-time snapshot
 * instead — a preview deployment without secrets still has working search.
 */

export const runtime = "edge";

type Row = {
  slug: string;
  name: string;
  tagline: string | null;
  category_label: string;
  live: string | null;
  mark_file: string | null;
};

const LIMIT = 12;

function fromSnapshot(q: string): Row[] {
  const needle = q.toLowerCase();
  const scored = fallbackEntries
    .map((e) => {
      const name = e.name.toLowerCase();
      let score = 0;
      if (name === needle || e.slug === needle) score = 100;
      else if (name.startsWith(needle) || e.slug.startsWith(needle)) score = 80;
      else if (name.includes(needle) || e.slug.includes(needle)) score = 60;
      else if (e.categoryLabel.toLowerCase().includes(needle)) score = 40;
      else if ((e.tagline ?? "").toLowerCase().includes(needle)) score = 30;
      return { e, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, LIMIT);

  return scored.map(({ e }) => ({
    slug: e.slug,
    name: e.name,
    tagline: e.tagline,
    category_label: e.categoryLabel,
    live: e.live,
    mark_file: null,
  }));
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();

  if (q.length < 1) return NextResponse.json({ results: [] });
  if (q.length > 64) return NextResponse.json({ results: [] });

  const connection = process.env.DATABASE_URL;
  if (!connection) {
    return NextResponse.json({ results: fromSnapshot(q), source: "snapshot" });
  }

  try {
    const sql = neon(connection);
    const like = `%${q.toLowerCase()}%`;

    // Ranked the way a person reads a list: an exact name first, then a name
    // that begins with what they typed, then anything that merely contains it.
    const rows = (await sql`
      SELECT l.slug, l.name, l.tagline, l.category_label, l.live, m.file AS mark_file
      FROM listings l
      LEFT JOIN marks m ON m.slug = l.slug
      WHERE lower(l.name) LIKE ${like}
         OR l.slug LIKE ${like}
         OR lower(coalesce(l.tagline, '')) LIKE ${like}
         OR lower(l.category_label) LIKE ${like}
      ORDER BY
        CASE
          WHEN lower(l.name) = ${q.toLowerCase()} THEN 0
          WHEN lower(l.name) LIKE ${q.toLowerCase() + "%"} THEN 1
          WHEN lower(l.name) LIKE ${like} THEN 2
          ELSE 3
        END,
        l.featured DESC,
        l.updated_at DESC NULLS LAST
      LIMIT ${LIMIT}
    `) as Row[];

    return NextResponse.json(
      { results: rows, source: "postgres" },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" } }
    );
  } catch {
    // A database that is asleep or unreachable must not break the search box.
    return NextResponse.json({ results: fromSnapshot(q), source: "snapshot" });
  }
}
