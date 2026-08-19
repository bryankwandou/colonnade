import Link from "next/link";
import { entries, counts } from "@/lib/catalog";

/**
 * The catalogue at its own scale.
 *
 * Everywhere else on this page the shelf is shown eight cards at a time, which
 * tells a visitor nothing about how much is on it. This drops the cards and sets
 * every listing as type — the way an index at the back of a book does — so the
 * size of the thing is legible at a glance rather than asserted in a statistic.
 *
 * It is also the page's one dense passage. Four card grids in a row read as one
 * long note held; this is where the rhythm breaks.
 */
export function IndexBand() {
  // Alphabetical, because an index is for finding, not for ranking.
  const listed = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="border-y border-white/8 bg-shadow-900">
      <div className="mx-auto w-[min(78rem,92vw)] py-20">
        <div className="mb-8 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h2 className="font-display text-[clamp(1.5rem,3.2vw,2.1rem)] font-light leading-tight tracking-[-0.02em] text-stone-50">
            The whole row, at its own size
          </h2>
          <p className="text-[0.85rem] text-stone-300/85">
            {counts.listed} listings.{" "}
            <span className="text-verdigris-400">{counts.live} answer when you knock.</span>
          </p>
        </div>

        {/*
          Columns rather than a grid: a name should sit next to the name that
          follows it alphabetically, reading down, the way an index reads.
        */}
        <ul className="columns-2 gap-x-8 sm:columns-3 lg:columns-4 xl:columns-5">
          {listed.map((entry) => (
            <li key={entry.slug} className="break-inside-avoid">
              <Link
                href={`/app/${entry.slug}`}
                className="group flex items-baseline gap-2 py-[3px] text-[0.8rem] leading-snug transition-colors"
              >
                <span
                  aria-hidden
                  className={`mt-[0.42em] size-[3px] shrink-0 rounded-full ${
                    entry.live ? "bg-verdigris-400/70" : "bg-stone-500/40"
                  }`}
                />
                <span className="truncate text-stone-300 group-hover:text-brass-300">
                  {entry.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-[0.78rem] text-stone-400">
          A filled dot marks a listing with a running deployment; a hollow one is shelved but not
          serving.
        </p>
      </div>
    </section>
  );
}
