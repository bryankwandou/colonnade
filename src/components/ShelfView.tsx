"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EntryCard } from "@/components/EntryCard";
import { byShelf, shelfOf, type Shelf } from "@/lib/catalog";

type Sort = "recent" | "name" | "live";

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
            ? "Things you open and operate. Most of these run entirely in the browser, which means there is no account to make and nothing of yours leaves the machine."
            : "Ventures, products, and studies. Each one was built to test a specific claim about how a job ought to be done."}
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

      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${category}-${sort}-${liveOnly}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.map((entry, i) => (
            <EntryCard key={entry.slug} entry={entry} index={i} />
          ))}
        </motion.div>
      </AnimatePresence>

      {visible.length === 0 ? (
        <p className="py-20 text-center text-[0.9rem] text-stone-300">
          Nothing on this shelf matches those filters yet.
        </p>
      ) : null}
    </div>
  );
}
