import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Lock } from "lucide-react";
import { entries, counts, shelves, relativeDate, hostOf } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Full index",
  description: `Every one of the ${counts.listed} listings in a single table, with its shelf, category, and door.`,
};

export default function IndexPage() {
  const grouped = shelves.map((shelf) => ({
    shelf,
    categories: shelf.categories.map((c) => ({
      category: c,
      items: entries
        .filter((e) => e.category === c.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    })),
  }));

  return (
    <div className="mx-auto w-[min(78rem,92vw)] pb-20 pt-12">
      <header className="mb-12">
        <h1 className="font-display text-[clamp(2rem,4.6vw,3rem)] font-light leading-tight tracking-[-0.025em] text-stone-50">
          The whole shelf
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone-200/85">
          All {counts.listed} listings, grouped the way they are shelved. {counts.live} have a
          running deployment; the rest are readable as source. {counts.withheld} private
          repositories are counted but withheld, because there is no public door to send you
          through.
        </p>
      </header>

      {grouped.map(({ shelf, categories }) => (
        <section key={shelf.id} className="mb-16">
          <h2 className="mb-6 font-display text-[1.7rem] tracking-[-0.02em] text-brass-300">
            {shelf.label}
          </h2>

          {categories.map(({ category, items }) =>
            items.length === 0 ? null : (
              <div key={category.id} id={category.id} className="mb-10 scroll-mt-24">
                <div className="mb-3 flex items-baseline gap-3 border-b border-white/8 pb-2">
                  <h3 className="font-display text-[1.08rem] text-stone-50">{category.label}</h3>
                  <span className="font-mono text-[0.74rem] text-stone-300">{items.length}</span>
                  <p className="ml-auto hidden text-[0.78rem] text-stone-300 sm:block">{category.blurb}</p>
                </div>

                <ul className="divide-y divide-white/5">
                  {items.map((e) => (
                    <li key={e.slug} className="group grid grid-cols-[1fr_auto] items-center gap-4 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/app/${e.slug}`}
                          className="text-[0.9rem] text-stone-50 transition group-hover:text-brass-300"
                        >
                          {e.name}
                        </Link>
                        <p className="truncate text-[0.78rem] text-stone-300">
                          {e.tagline ?? "No description written."}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 text-[0.74rem] text-stone-300">
                        <span className="hidden w-24 truncate text-right md:block">{e.language ?? "—"}</span>
                        <span className="hidden w-28 text-right lg:block">{relativeDate(e.updatedAt)}</span>
                        {e.private ? (
                          <Lock className="size-3.5 shrink-0" aria-label="Private repository" />
                        ) : null}
                        {e.live ? (
                          <a
                            href={e.live}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex w-40 items-center justify-end gap-1 truncate text-verdigris-400 transition hover:text-verdigris-500"
                          >
                            {hostOf(e.live)}
                            <ArrowUpRight className="size-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="w-40 text-right opacity-40">source only</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </section>
      ))}
    </div>
  );
}
