"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ListingMark } from "@/components/Mark";
import { relativeDate, hostOf, type Entry } from "@/lib/format";

/**
 * A listing at scanning density.
 *
 * Cards are right when a shelf holds a dozen things and each one deserves to be
 * looked at. They are wrong when it holds eighty and the reader already knows
 * what they came for — then the card's padding is just distance between the
 * reader and the next name. This is the same listing set as one line.
 *
 * Deliberately not a table: rows collapse to two lines on a phone, where a table
 * would force a horizontal scroll for content that reads perfectly well stacked.
 */
export function ShelfRow({ entry }: { entry: Entry }) {
  return (
    <Link
      href={`/app/${entry.slug}`}
      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-white/[0.06] py-2.5 [transition-property:background-color] duration-150 hover:bg-white/[0.025] sm:grid-cols-[auto_minmax(0,22rem)_minmax(0,1fr)_auto_auto]"
    >
      <ListingMark entry={entry} size={30} />

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-[0.9rem] text-stone-50 group-hover:text-brass-300">
            {entry.name}
          </span>
          {entry.live ? (
            <span aria-label="Live" className="size-1.5 shrink-0 rounded-full bg-verdigris-400" />
          ) : null}
        </div>
        <span className="mt-0.5 block truncate text-[0.74rem] text-stone-400 sm:hidden">
          {entry.tagline ?? entry.categoryLabel}
        </span>
      </div>

      {/* The description gets its own column only where there is room for it. */}
      <span className="col-span-2 hidden min-w-0 truncate text-[0.8rem] text-stone-300/85 sm:col-span-1 sm:block">
        {entry.tagline ?? <span className="text-stone-500">No description published</span>}
      </span>

      <span className="hidden shrink-0 text-right font-mono text-[0.72rem] text-stone-400 lg:block">
        {relativeDate(entry.updatedAt)}
      </span>

      <span className="hidden shrink-0 items-center gap-1 font-mono text-[0.72rem] text-brass-300/80 xl:flex">
        {entry.live ? (
          <>
            {hostOf(entry.live)}
            <ArrowUpRight className="size-3" />
          </>
        ) : (
          <span className="text-stone-500">no door</span>
        )}
      </span>
    </Link>
  );
}
