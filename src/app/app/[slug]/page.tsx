import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Lock, Calendar, Code2, Star } from "lucide-react";
import { GithubGlyph } from "@/components/icons";
import { EntryCard } from "@/components/EntryCard";
import {
  entries,
  findEntry,
  byCategory,
  accentFor,
  initials,
  relativeDate,
  hostOf,
} from "@/lib/catalog";

export function generateStaticParams() {
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) return { title: "Not on the shelf" };
  return {
    title: entry.name,
    description: entry.tagline ?? `${entry.name} — ${entry.categoryLabel} on Colonnade.`,
  };
}

type Glyph = (props: { className?: string }) => React.ReactNode;

function Fact({ icon: Icon, label, value }: { icon: Glyph; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-shadow-800/50 p-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-stone-300" />
      <div className="min-w-0">
        <div className="text-[0.71rem] tracking-wide text-stone-300">{label}</div>
        <div className="mt-0.5 truncate text-[0.87rem] text-stone-50">{value}</div>
      </div>
    </div>
  );
}

export default async function EntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = findEntry(slug);
  if (!entry) notFound();

  const hue = accentFor(entry.slug);
  const siblings = byCategory(entry.category)
    .filter((e) => e.slug !== entry.slug)
    .slice(0, 4);

  return (
    <article className="pb-20">
      {/* Masthead */}
      <div
        className="relative overflow-hidden border-b border-white/8"
        style={{ background: `linear-gradient(160deg, oklch(0.28 0.06 ${hue}), var(--color-shadow-900) 72%)` }}
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.10) 0 1px, transparent 1px 72px)" }}
        />
        <div className="relative mx-auto w-[min(78rem,92vw)] py-14">
          <nav className="mb-8 flex items-center gap-2 text-[0.78rem] text-stone-300">
            <Link href={`/${entry.shelf}`} className="hover:text-stone-50">
              {entry.shelf === "tools" ? "Tools" : "Projects"}
            </Link>
            <span aria-hidden>/</span>
            <Link href={`/${entry.shelf}#${entry.category}`} className="hover:text-stone-50">
              {entry.categoryLabel}
            </Link>
          </nav>

          <div className="flex flex-wrap items-start gap-6">
            <div
              aria-hidden
              className="grid size-20 shrink-0 place-items-center rounded-[22px] border border-white/10 font-display text-[1.5rem] text-stone-50"
              style={{
                background: `linear-gradient(155deg, oklch(0.44 0.08 ${hue}), oklch(0.20 0.04 ${hue}))`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 18px 40px -22px rgba(0,0,0,0.9)",
              }}
            >
              {initials(entry.name)}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[clamp(1.9rem,4.4vw,2.9rem)] font-light leading-tight tracking-[-0.025em] text-stone-50">
                {entry.name}
              </h1>
              {entry.tagline ? (
                <p className="mt-3 max-w-2xl text-[1.02rem] leading-relaxed text-stone-100/90">
                  {entry.tagline}
                </p>
              ) : (
                <p className="mt-3 text-[0.95rem] text-stone-300">
                  This one shipped without a written description. The source is the documentation.
                </p>
              )}

              <div className="mt-7 flex flex-wrap gap-3">
                {entry.live ? (
                  <a
                    href={entry.live}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-2 rounded-xl bg-brass-400 px-5 py-2.5 text-[0.9rem] font-medium text-shadow-900 transition hover:bg-brass-300"
                  >
                    Open {hostOf(entry.live)}
                    <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-[0.9rem] text-stone-300">
                    No deployment on this one
                  </span>
                )}

                {entry.source ? (
                  <a
                    href={entry.source}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[0.9rem] text-stone-100 transition hover:border-white/30 hover:bg-white/4"
                  >
                    <GithubGlyph className="size-4" />
                    Read the source
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-2.5 text-[0.9rem] text-stone-300">
                    <Lock className="size-4" />
                    Source kept private
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-[min(78rem,92vw)] gap-10 py-12 lg:grid-cols-[1fr_18rem]">
        <div>
          <h2 className="font-display text-[1.3rem] text-stone-50">Where this sits</h2>
          <p className="mt-3 max-w-2xl text-[0.93rem] leading-relaxed text-stone-200/85">
            {entry.name} is shelved under {entry.categoryLabel}, on the{" "}
            {entry.shelf === "tools" ? "Tools" : "Projects"} side of the catalogue.{" "}
            {entry.shelf === "tools"
              ? "That shelf holds software with an interface you operate directly."
              : "That shelf holds work that argues a position rather than performing a task."}{" "}
            The last commit landed {relativeDate(entry.updatedAt)}, and the repository has been open
            since {new Date(entry.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}.
          </p>

          {entry.topics.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {entry.topics.map((t) => (
                <span key={t} className="rounded-full border border-white/10 px-3 py-1 text-[0.75rem] text-stone-300">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {siblings.length ? (
            <section className="mt-14">
              <h2 className="mb-6 font-display text-[1.3rem] text-stone-50">
                Also under {entry.categoryLabel}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {siblings.map((e, i) => (
                  <EntryCard key={e.slug} entry={e} index={i} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <Fact icon={Code2} label="Primary language" value={entry.language ?? "Not detected"} />
          <Fact icon={Calendar} label="Last commit" value={relativeDate(entry.updatedAt)} />
          <Fact icon={Star} label="Stars" value={String(entry.stars)} />
          <Fact
            icon={entry.private ? Lock : GithubGlyph}
            label="Repository"
            value={entry.private ? "Private" : "Public"}
          />
        </aside>
      </div>
    </article>
  );
}
