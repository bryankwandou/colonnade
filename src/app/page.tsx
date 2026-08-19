import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/Hero";
import { IndexBand } from "@/components/IndexBand";
import { EvidenceStrip } from "@/components/EvidenceStrip";
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

      <section className="mx-auto w-[min(78rem,92vw)] pb-14 pt-20">
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
            href="/catalogue"
            hrefLabel="Full catalogue"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentlyLive.slice(0, 8).map((entry, i) => (
              <EntryCard key={entry.slug} entry={entry} index={i} />
            ))}
          </div>
        </div>
      </section>

      <IndexBand />

      <ShelfBlock id="projects" />

      <EvidenceStrip />

    </>
  );
}
