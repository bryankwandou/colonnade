"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Lock } from "lucide-react";
import { accentFor, relativeDate, hostOf, type Entry } from "@/lib/format";
import { ListingMark } from "@/components/Mark";

function Tile({ entry, size = 52 }: { entry: Entry; size?: number }) {
  return <ListingMark entry={entry} size={size} />;
}

export function EntryCard({ entry, index = 0 }: { entry: Entry; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.035 }}
      className="group relative"
    >
      <Link
        href={`/app/${entry.slug}`}
        className="flex h-full flex-col gap-3.5 rounded-2xl border border-white/8 bg-shadow-800/70 p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-white/16 hover:bg-shadow-700/80 hover:shadow-[0_20px_45px_-28px_rgba(0,0,0,0.9)]"
      >
        <div className="flex items-start gap-3.5">
          <Tile entry={entry} />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-display text-[1.02rem] leading-snug text-stone-50">{entry.name}</h3>
            <p className="mt-0.5 truncate text-[0.76rem] text-stone-300">{entry.categoryLabel}</p>
          </div>
          {entry.live ? (
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-verdigris-500/35 bg-verdigris-500/12 px-2 py-0.5 text-[0.66rem] font-medium tracking-wide text-verdigris-400">
              <span className="size-1.5 rounded-full bg-verdigris-400" />
              Live
            </span>
          ) : null}
        </div>

        <p className="line-clamp-3 text-[0.83rem] leading-relaxed text-stone-200/85">
          {entry.tagline ?? "No description was written for this one yet."}
        </p>

        <div className="mt-auto flex items-center gap-3 pt-1 text-[0.7rem] text-stone-300">
          {entry.language ? <span>{entry.language}</span> : null}
          <span className="ml-auto">{relativeDate(entry.updatedAt)}</span>
        </div>
      </Link>

      {/* Direct exits, layered above the card link so a click does not bubble. */}
      <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-end gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
        {/*
          Source links are withheld across the catalogue, so this is always the
          closed state. The lock is kept rather than removed: a listing with no
          visible repository should read as deliberately closed, not as missing.
        */}
        <span
          title="Source not published"
          className="pointer-events-auto grid size-7 place-items-center rounded-lg border border-white/8 bg-shadow-900/85 text-stone-300 backdrop-blur"
        >
          <Lock className="size-3.5" />
        </span>
        {entry.live ? (
          <a
            href={entry.live}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`Open ${entry.name} at ${hostOf(entry.live)}`}
            className="pointer-events-auto grid size-7 place-items-center rounded-lg border border-brass-400/40 bg-brass-400/15 text-brass-300 backdrop-blur transition hover:bg-brass-400/25 hover:text-brass-300"
          >
            <ArrowUpRight className="size-3.5" />
          </a>
        ) : null}
      </div>
    </motion.article>
  );
}

/** Wide variant used on the featured rail, where there is room to breathe. */
export function FeatureCard({ entry, index = 0 }: { entry: Entry; index?: number }) {
  const hue = accentFor(entry.slug);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: index * 0.06 }}
      className="group w-[19rem] shrink-0 sm:w-[21.5rem]"
    >
      <Link
        href={`/app/${entry.slug}`}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-shadow-800 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-white/16 hover:shadow-[0_24px_55px_-30px_rgba(0,0,0,0.95)]"
      >
        <div
          className="relative h-28 overflow-hidden"
          style={{ background: `linear-gradient(140deg, oklch(0.40 0.08 ${hue}), oklch(0.17 0.03 ${hue}))` }}
        >
          {/* The colonnade rhythm, echoed as light through columns. */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-45 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-2"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 26px)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-shadow-800 to-transparent" />
          <div className="absolute bottom-3 left-4">
            <Tile entry={entry} size={44} />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-display text-[1.1rem] leading-snug text-stone-50">{entry.name}</h3>
          <p className="line-clamp-2 text-[0.83rem] leading-relaxed text-stone-200/85">
            {entry.tagline ?? "No description was written for this one yet."}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-2 text-[0.7rem] text-stone-300">
            <span className="rounded-full border border-white/10 px-2 py-0.5">{entry.categoryLabel}</span>
            {entry.live ? <span className="ml-auto text-verdigris-400">{hostOf(entry.live)}</span> : null}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
