/**
 * Pure helpers and types, with no data behind them.
 *
 * These used to live beside the catalogue in lib/catalog.ts, which imports
 * catalog.json. Any client component reaching in for `accentFor` therefore
 * dragged all 159 listings into its bundle — a hundred kilobytes to work out a
 * hue. Splitting them apart means a component can take the helper and leave the
 * data behind.
 *
 * Nothing here may import catalog.json, directly or otherwise.
 */

export type Shelf = "tools" | "projects";

export type Entry = {
  slug: string;
  name: string;
  repoName: string | null;
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

/** A hue derived from the slug, so a listing keeps the same colour forever. */
export function accentFor(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  return hash % 360;
}

export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
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
