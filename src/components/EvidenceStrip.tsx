import Link from "next/link";
import { ArrowRight } from "lucide-react";
import marksData from "@/data/marks.json";
import { entries } from "@/lib/catalog";

type MarkRecord = { file: string; source: string; kind: string; evidence?: string };
const marks = marksData as Record<string, MarkRecord>;

/**
 * The page's argument, made with the page's own numbers.
 *
 * This block used to be a gradient card with a heading and a button — the shape
 * every landing page ends on, carrying nothing. What actually separates this
 * catalogue from a grid of screenshots is that each logo can be traced to the
 * file it came from, and that some of them provably cannot be. So the closing
 * section states the tally instead of a slogan, and admits the weakest tier in
 * the same breath as the strongest.
 *
 * Every figure here is computed at build time from the same data the shelf
 * renders. Nothing is typed in.
 */

const TIERS = [
  {
    keys: ["declared"],
    label: "The site declares it",
    note: "Linked from the page's own head, or committed at a framework path",
  },
  {
    keys: ["named"],
    label: "The markup names it",
    note: "The drawing carries the product's name on it",
  },
  {
    keys: ["committed"],
    label: "The repository holds it",
    note: "A file at app/icon.svg or public/logo.svg",
  },
  {
    keys: ["lockup", "header"],
    label: "Position corroborates it",
    note: "Sits inside the home link or the page header",
  },
  {
    keys: ["position"],
    label: "Position alone suggests it",
    note: "First drawing in the markup, and nothing further to confirm it",
    weak: true,
  },
  {
    keys: ["local"],
    label: "Only the working folder has it",
    note: "A file on the author's machine that nobody else can open",
    weak: true,
  },
];

export function EvidenceStrip() {
  const all = Object.values(marks);
  const total = all.length;
  const generated = entries.length - total;

  const rows = TIERS.map((tier) => ({
    ...tier,
    count: all.filter((m) => tier.keys.includes(m.evidence ?? "")).length,
  })).filter((r) => r.count > 0);

  const checkable = rows.filter((r) => !r.weak).reduce((n, r) => n + r.count, 0);
  const widest = Math.max(...rows.map((r) => r.count));

  return (
    <section className="mx-auto w-[min(78rem,92vw)] py-24">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-brass-300">
            Where the marks come from
          </p>
          <h2 className="mt-4 font-display text-[clamp(1.6rem,3.4vw,2.3rem)] font-light leading-[1.12] tracking-[-0.02em] text-stone-50">
            A logo is worth showing only if it belongs to the project.
          </h2>
          <p className="mt-5 text-[0.93rem] leading-relaxed text-stone-200/85">
            {checkable} of {total} marks rest on something anyone can fetch and check for
            themselves. The rest are listed too, in the same table, saying exactly what they rest
            on instead.
          </p>
          <p className="mt-4 text-[0.88rem] leading-relaxed text-stone-300/80">
            {generated} listings publish no mark anywhere, so the catalogue draws one from the slug
            rather than borrowing somebody else&rsquo;s.
          </p>
          <Link
            href="/provenance"
            className="group mt-8 inline-flex items-center gap-2 text-[0.9rem] text-brass-300 transition-colors hover:text-brass-200"
          >
            Read the whole table
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/*
          A plain bar per tier, ordered strongest first. No axis, no gridlines —
          the comparison is between six rows, and a chart frame would be more
          apparatus than the question needs.
        */}
        <ul className="flex flex-col justify-center gap-px">
          {rows.map((row) => (
            <li key={row.label} className="group grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 border-b border-white/[0.06] py-3.5 last:border-b-0">
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-[0.92rem] ${row.weak ? "text-stone-400" : "text-stone-50"}`}
                  >
                    {row.label}
                  </span>
                </div>
                <div className="mt-2 h-[3px] w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className={`h-full rounded-full ${row.weak ? "bg-rust-400/70" : "bg-brass-400"}`}
                    style={{ width: `${(row.count / widest) * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-[0.76rem] leading-snug text-stone-400">{row.note}</p>
              </div>
              <span
                className={`font-display text-[1.5rem] leading-none tabular-nums ${
                  row.weak ? "text-stone-400" : "text-stone-50"
                }`}
              >
                {row.count}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
