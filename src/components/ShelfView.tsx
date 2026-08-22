"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { EntryCard } from "@/components/EntryCard";
import { ShelfRow } from "@/components/ShelfRow";
import { LayoutGrid, Rows3 } from "lucide-react";
import { byShelf, shelfOf, type Shelf } from "@/lib/catalog";

type Sort = "recent" | "name" | "live";
type Density = "cards" | "rows";

const SORTS: { id: Sort; label: string }[] = [
  { id: "recent", label: "Recently moved" },
  { id: "live", label: "Live first" },
  { id: "name", label: "A to Z" },
];

export function ShelfView({ shelf }: { shelf: Shelf }) {
  const group = shelfOf(shelf);
  const all = useMemo(() => byShelf(shelf), [shelf]);

  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recent");
  const [liveOnly, setLiveOnly] = useState(false);
  /*
   * A shelf of eighty is a different object from a shelf of twelve, and wants a
   * different density. Cards default because a first visit is browsing; rows are
   * there for the second visit, when the reader is looking for one known name.
   */
  const [density, setDensity] = useState<Density>("cards");

  const visible = useMemo(() => {
    let list = category ? all.filter((e) => e.category === category) : all.slice();
    if (liveOnly) list = list.filter((e) => e.live);
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "live" && Boolean(a.live) !== Boolean(b.live)) return a.live ? -1 : 1;
      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });
    return list;
  }, [all, category, sort, liveOnly]);

  return (
    <div className="mx-auto w-[min(78rem,92vw)] pb-20 pt-12">
      <header className="mb-10">
        <h1 className="font-display text-[clamp(2rem,4.6vw,3rem)] font-light leading-tight tracking-[-0.025em] text-stone-50">
          {group?.label}
        </h1>
        <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-stone-200/85">
          {shelf === "tools"
            ? "Things you open and operate. Most run entirely in the browser: no account to make, nothing of yours leaves the machine."
            : "Ventures, products, and studies. Each was built to test a claim about how a job ought to be done."}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full border px-3.5 py-1.5 text-[0.8rem] transition ${
            category === null
              ? "border-brass-400/50 bg-brass-400/15 text-brass-300"
              : "border-white/10 text-stone-300 hover:border-white/25 hover:text-stone-100"
          }`}
        >
          Everything <span className="ml-1.5 font-mono text-[0.72rem] opacity-70">{all.length}</span>
        </button>

        {group?.categories.map((c) => (
          <button
            key={c.id}
            id={c.id}
            onClick={() => setCategory(c.id)}
            className={`scroll-mt-24 rounded-full border px-3.5 py-1.5 text-[0.8rem] transition ${
              category === c.id
                ? "border-brass-400/50 bg-brass-400/15 text-brass-300"
                : "border-white/10 text-stone-300 hover:border-white/25 hover:text-stone-100"
            }`}
          >
            {c.label} <span className="ml-1.5 font-mono text-[0.72rem] opacity-70">{c.count}</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <label className="flex cursor-pointer select-none items-center gap-2 text-[0.8rem] text-stone-300">
            <input
              type="checkbox"
              checked={liveOnly}
              onChange={(e) => setLiveOnly(e.target.checked)}
              className="size-3.5 accent-brass-400"
            />
            Live only
          </label>
          <div className="flex items-center rounded-lg border border-white/10 p-0.5" role="group" aria-label="Display density">
            {([["cards", LayoutGrid, "Cards"], ["rows", Rows3, "List"]] as const).map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => setDensity(id)}
                aria-pressed={density === id}
                title={label}
                className={`grid size-7 place-items-center rounded-md [transition-property:background-color,color] duration-150 ${
                  density === id ? "bg-white/8 text-stone-50" : "text-stone-400 hover:text-stone-200"
                }`}
              >
                <Icon className="size-3.5" />
                <span className="sr-only">{label}</span>
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort listings"
            className="rounded-lg border border-white/10 bg-shadow-800 px-2.5 py-1.5 text-[0.8rem] text-stone-200 outline-none transition hover:border-white/25"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-5 text-[0.78rem] text-stone-300">
        Showing {visible.length} of {all.length}
        {category ? ` in ${group?.categories.find((c) => c.id === category)?.label}` : ""}.
      </p>

      <motion.div
        key={density}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={
          density === "cards"
            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            : "border-t border-white/[0.06]"
        }
      >
        {visible.map((entry, i) =>
          density === "cards" ? (
            <EntryCard key={entry.slug} entry={entry} index={i} />
          ) : (
            <ShelfRow key={entry.slug} entry={entry} />
          )
        )}
      </motion.div>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-[0.9rem] text-stone-300">
          Nothing on this shelf matches those filters yet.
        </p>
      ) : null}
    </div>
  );
}
