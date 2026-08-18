import raw from "@/data/catalog.json";
import summary from "@/data/summary.json";
import type { Entry, Shelf } from "./format";
export { accentFor, initials, relativeDate, hostOf } from "./format";
export type { Entry, Shelf } from "./format";



export type Category = { id: string; label: string; blurb: string; count: number };
export type ShelfGroup = { id: Shelf; label: string; categories: Category[] };

export type Catalog = {
  generatedAt: string;
  counts: {
    repos: number;
    listed: number;
    withheld: number;
    live: number;
    private: number;
    tools: number;
    projects: number;
  };
  shelves: ShelfGroup[];
  entries: Entry[];
};

export const catalog = raw as unknown as Catalog;
export const entries = catalog.entries;
export const shelves = catalog.shelves;
export const counts = catalog.counts;

export function byShelf(shelf: Shelf): Entry[] {
  return entries.filter((e) => e.shelf === shelf);
}

export function byCategory(id: string): Entry[] {
  return entries.filter((e) => e.category === id);
}

export function findEntry(slug: string): Entry | undefined {
  return entries.find((e) => e.slug === slug);
}

export function shelfOf(id: Shelf): ShelfGroup | undefined {
  return shelves.find((s) => s.id === id);
}

export const featured = entries.filter((e) => e.featured && e.live);

/** Most recently touched work that someone can actually open. */
export const recentlyLive = entries
  .filter((e) => e.live)
  .slice()
  .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

/** Deterministic accent per entry, so a card looks the same on every render. */

/** Two initials for the tile glyph, preferring word boundaries. */



/**
 * The shape the search API returns. Deliberately narrow: eight fields is what a
 * result row draws, and sending the whole listing would put the weight back on
 * the browser that moving search to Postgres just took off it.
 */
export type SearchHit = {
  slug: string;
  name: string;
  tagline: string | null;
  category_label: string;
  live: string | null;
  mark_file?: string | null;
};

/**
 * Eight featured rows, inlined at build time so the search panel has something
 * to show the instant it opens, before any query has been typed.
 */
/**
 * Read from the small summary file rather than derived from `entries` here. A
 * module-scope derive keeps the whole catalogue inside whatever bundle imports
 * it, which is exactly the 103KB the header was shipping to every visitor.
 */
export const featuredSeed: SearchHit[] = summary.featured as SearchHit[];

