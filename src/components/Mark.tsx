"use client";

import { useState } from "react";
import marksData from "@/data/marks.json";
import { accentFor, type Entry } from "@/lib/format";

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
  // FNV-1a, then a handful of independent draws from the same seed.
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  const draw = (n: number, mod: number) => Math.abs(Math.imul(hash ^ (n * 0x9e3779b9), 0x85ebca6b) >>> 8) % mod;

  const hue = accentFor(slug);
  const uid = slug.replace(/[^a-z0-9]/gi, "");

  // Two architectural families, both correct: a colonnade carries a flat
  // lintel, an arcade carries arches. Picking between them doubles the
  // vocabulary before any other variation is applied.
  const arcade = draw(1, 3) === 0;
  const bays = 3 + draw(2, 4); // three to six openings
  const flared = draw(3, 2) === 0; // capitals spread, or stay square
  const tall = draw(4, 2) === 0; // architrave sits high or low

  const pad = 3.4;
  const span = 48 - pad * 2;
  const gap = bays > 4 ? 2.1 : 2.9;
  const width = (span - gap * (bays - 1)) / bays;

  const beamY = tall ? 7.6 : 10.2;
  const capY = beamY + 4.2;
  const baseY = 38.6;
  const shaftTop = capY + (flared ? 2.4 : 1.6);

  const stone = `oklch(0.94 0.028 ${hue})`;

  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="block">
      <defs>
        <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`oklch(0.38 0.075 ${hue})`} />
          <stop offset="100%" stopColor={`oklch(0.17 0.032 ${hue})`} />
        </linearGradient>
        <linearGradient id={`col-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`oklch(0.90 0.055 ${hue})`} />
          <stop offset="100%" stopColor={`oklch(0.56 0.080 ${hue})`} />
        </linearGradient>
      </defs>

      <rect width="48" height="48" rx="11" fill={`url(#bg-${uid})`} />

      {/* Architrave */}
      <rect x={pad} y={beamY} width={span} height="3.2" rx="1" fill={stone} opacity="0.9" />

      {Array.from({ length: bays }, (_, i) => {
        const x = pad + i * (width + gap);
        const shaftH = baseY - shaftTop - (draw(10 + i, 40) / 40) * 7;
        const radius = Math.min(width / 2, 1.2);

        return (
          <g key={i}>
            {flared ? (
              <rect
                x={x - 0.7}
                y={capY}
                width={width + 1.4}
                height="1.9"
                rx="0.6"
                fill={stone}
                opacity="0.82"
              />
            ) : null}

            {arcade ? (
              // An arch springing from the shaft: half-round top, straight legs.
              <path
                d={`M ${x} ${baseY}
                    L ${x} ${shaftTop + width / 2}
                    A ${width / 2} ${width / 2} 0 0 1 ${x + width} ${shaftTop + width / 2}
                    L ${x + width} ${baseY} Z`}
                fill={`url(#col-${uid})`}
                opacity={0.74 + draw(20 + i, 22) / 100}
              />
            ) : (
              <rect
                x={x}
                y={shaftTop}
                width={width}
                height={shaftH}
                rx={radius}
                fill={`url(#col-${uid})`}
                opacity={0.74 + draw(20 + i, 22) / 100}
              />
            )}

            {/* Fluting, only where the shaft is wide enough to carry it */}
            {width > 6 ? (
              <rect
                x={x + width / 2 - 0.24}
                y={shaftTop + 2.4}
                width="0.48"
                height={Math.max(4, (arcade ? baseY - shaftTop - 6 : shaftH) - 4)}
                rx="0.24"
                fill={`oklch(0.17 0.03 ${hue})`}
                opacity="0.3"
              />
            ) : null}
          </g>
        );
      })}

      {/* Stylobate */}
      <rect x={pad} y={baseY} width={span} height="3.2" rx="1" fill={stone} opacity="0.9" />
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
