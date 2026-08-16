import raw from "@/data/catalog.json";

export type Shelf = "tools" | "projects";

export type Entry = {
  slug: string;
  name: string;
  repoName: string;
  tagline: string | null;
  live: string | null;
  source: string | null;
  private: boolean;
  archived: boolean;
  language: string | null;
  stars: number;
  topics: string[];
  shelf: Shelf;
  category: string;
  categoryLabel: string;
  featured: boolean;
  updatedAt: string;
  createdAt: string;
};

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
export function accentFor(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return hash % 360;
}

/** Two initials for the tile glyph, preferring word boundaries. */
export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function relativeDate(iso: string): string {
  const days = Math.floor((Date.now() - +new Date(iso)) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
