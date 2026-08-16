import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/Hero";
import { Rail, SectionHead } from "@/components/Rail";
import { EntryCard, FeatureCard } from "@/components/EntryCard";
import { featured, recentlyLive, shelves, byCategory, counts } from "@/lib/catalog";

function ShelfBlock({ id }: { id: "tools" | "projects" }) {
  const shelf = shelves.find((s) => s.id === id);
  if (!shelf) return null;

  return (
    <section className="mx-auto w-[min(78rem,92vw)] py-16">
      <SectionHead
        title={id === "tools" ? "Tools" : "Projects"}
        blurb={
          id === "tools"
            ? "Software you open and operate. Editors, scanners, meters, and the rails underneath agents."
            : "Ventures and studies, each carrying an argument about how something ought to work."
        }
        href={`/${id}`}
        hrefLabel={`All ${id === "tools" ? counts.tools : counts.projects}`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {shelf.categories.map((category) => (
          <Link
            key={category.id}
            href={`/${id}#${category.id}`}
            className="group rounded-2xl border border-white/8 bg-shadow-800/50 p-4 transition hover:border-white/18 hover:bg-shadow-700/60"
          >
            <div className="flex items-baseline gap-2">
              <h3 className="font-display text-[1rem] text-stone-50">{category.label}</h3>
              <span className="ml-auto font-mono text-[0.72rem] text-brass-300">{category.count}</span>
            </div>
            <p className="mt-2 text-[0.78rem] leading-relaxed text-stone-300">{category.blurb}</p>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {shelf.categories
          .flatMap((c) => byCategory(c.id).filter((e) => e.live).slice(0, 2))
          .slice(0, 8)
          .map((entry, i) => (
            <EntryCard key={entry.slug} entry={entry} index={i} />
          ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />

      <section className="mx-auto w-[min(78rem,92vw)] py-16">
        <SectionHead
          title="Worth opening first"
          blurb="The pieces that best show what the rest of the shelf is doing."
        />
        <Rail label="Featured listings">
          {featured.map((entry, i) => (
            <FeatureCard key={entry.slug} entry={entry} index={i} />
          ))}
        </Rail>
      </section>

      <ShelfBlock id="tools" />

      <section className="border-y border-white/8 bg-shadow-800/30">
        <div className="mx-auto w-[min(78rem,92vw)] py-16">
          <SectionHead
            title="Moved most recently"
            blurb="Sorted by the last commit that touched them, newest first."
            href="/index"
            hrefLabel="Full index"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyLive.slice(0, 8).map((entry, i) => (
              <EntryCard key={entry.slug} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </section>

      <ShelfBlock id="projects" />

      <section className="mx-auto w-[min(78rem,92vw)] pb-8">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-shadow-800 to-shadow-900 p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-[clamp(1.6rem,3.4vw,2.3rem)] font-light leading-tight tracking-[-0.02em] text-stone-50">
            The shelf can prove it has not been quietly rewritten.
          </h2>
          <p className="mt-4 max-w-xl text-[0.93rem] leading-relaxed text-stone-200/85">
            Every listing is folded into a single fingerprint, and that fingerprint can be written
            to Solana devnet with a connected wallet. Anyone can recompute it in their own browser
            and check it against the chain. If a listing changed, the numbers stop agreeing.
          </p>
          <Link
            href="/verify"
            className="group mt-7 inline-flex items-center gap-2 rounded-xl border border-brass-400/40 bg-brass-400/12 px-5 py-2.5 text-[0.9rem] text-brass-300 transition hover:bg-brass-400/20"
          >
            Check the fingerprint
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </>
  );
}
