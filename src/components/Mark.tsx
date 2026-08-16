"use client";

import { useState } from "react";
import marksData from "@/data/marks.json";
import { accentFor, type Entry } from "@/lib/catalog";

type MarkRecord = { file: string; source: string; kind: string; bytes: number };
const marks = marksData as Record<string, MarkRecord>;

export function hasRealMark(slug: string): boolean {
  return Boolean(marks[slug]);
}

/**
 * A generated mark for listings that never published an icon.
 *
 * Rather than fall back to initials in a box, each one gets a small colonnade
 * of its own: the slug hash decides how many columns stand, how tall each one
 * is, and where the light falls. Deterministic, so a project keeps the same
 * mark forever, and distinct enough that two listings never look alike.
 */
function GeneratedMark({ slug, size }: { slug: string; size: number }) {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  const hue = accentFor(slug);
  const columns = 3 + (hash % 3); // three to five bays
  const lean = (hash >> 6) % 2 === 0; // architrave sits high or low
  const gap = 3;
  const span = 48 - gap * 2;
  const width = (span - gap * (columns - 1)) / columns;

  const heights = Array.from({ length: columns }, (_, i) => {
    const local = (hash >> (i * 5 + 3)) % 100;
    return 16 + (local / 100) * 15;
  });

  const beamY = lean ? 8 : 10.5;

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="block">
      <defs>
        <linearGradient id={`bg-${slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`oklch(0.40 0.075 ${hue})`} />
          <stop offset="100%" stopColor={`oklch(0.19 0.035 ${hue})`} />
        </linearGradient>
        <linearGradient id={`col-${slug}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`oklch(0.88 0.055 ${hue})`} />
          <stop offset="100%" stopColor={`oklch(0.58 0.075 ${hue})`} />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="11" fill={`url(#bg-${slug})`} />
      <rect x={gap} y={beamY} width={span} height="3.4" rx="1.1" fill={`oklch(0.93 0.03 ${hue})`} opacity="0.92" />

      {heights.map((h, i) => (
        <rect
          key={i}
          x={gap + i * (width + gap)}
          y={beamY + 4.6}
          width={width}
          height={h}
          rx={Math.min(1.1, width / 3)}
          fill={`url(#col-${slug})`}
          opacity={0.72 + ((hash >> (i * 3)) % 24) / 100}
        />
      ))}

      <rect x={gap} y="39" width={span} height="3.4" rx="1.1" fill={`oklch(0.93 0.03 ${hue})`} opacity="0.92" />
    </svg>
  );
}

/**
 * The listing's own icon, pulled from its deployment at build time. Falls back
 * to a generated colonnade when the site publishes nothing, and again if the
 * downloaded file turns out not to render.
 */
export function ListingMark({
  entry,
  size = 52,
  className = "",
}: {
  entry: Pick<Entry, "slug" | "name">;
  size?: number;
  className?: string;
}) {
  const record = marks[entry.slug];
  const [broken, setBroken] = useState(false);
  const hue = accentFor(entry.slug);

  if (!record || broken) {
    return (
      <span
        className={`block shrink-0 overflow-hidden rounded-[14px] border border-white/10 ${className}`}
        style={{ width: size, height: size }}
      >
        <GeneratedMark slug={entry.slug} size={size} />
      </span>
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-[14px] border border-white/10 ${className}`}
      style={{
        width: size,
        height: size,
        // A neutral plate behind the icon: many favicons are transparent and
        // were drawn assuming a light page.
        background: `linear-gradient(155deg, oklch(0.30 0.03 ${hue}), oklch(0.16 0.015 ${hue}))`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/marks/${record.file}`}
        alt=""
        width={Math.round(size * 0.68)}
        height={Math.round(size * 0.68)}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        className="size-[68%] object-contain"
      />
    </span>
  );
}
