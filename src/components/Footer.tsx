import Link from "next/link";
import { Mark } from "@/components/Logo";
import { counts, catalog } from "@/lib/catalog";

export function Footer() {
  const built = new Date(catalog.generatedAt);
  return (
    <footer className="mt-24 border-t border-white/8">
      <div className="mx-auto grid w-[min(78rem,92vw)] gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Mark size={30} />
          <p className="mt-4 max-w-sm text-[0.85rem] leading-relaxed text-stone-300">
            One shelf for {counts.listed} pieces of finished software. Each listing points at
            something you can open in a browser or read as source, and the shelf rebuilds itself
            from GitHub every time it deploys.
          </p>
        </div>

        <nav className="text-[0.85rem]">
          <p className="mb-3 font-display text-stone-50">Browse</p>
          <ul className="space-y-2 text-stone-300">
            <li><Link href="/tools" className="hover:text-stone-50">Tools</Link></li>
            <li><Link href="/projects" className="hover:text-stone-50">Projects</Link></li>
            <li><Link href="/catalogue" className="hover:text-stone-50">Full catalogue</Link></li>
            <li><Link href="/verify" className="hover:text-stone-50">Verify on devnet</Link></li>
          </ul>
        </nav>

        <nav className="text-[0.85rem]">
          <p className="mb-3 font-display text-stone-50">Elsewhere</p>
          <ul className="space-y-2 text-stone-300">
            <li>
              <a href="https://github.com/bryankwandou" target="_blank" rel="noreferrer noopener" className="hover:text-stone-50">
                GitHub
              </a>
            </li>
            <li>
              <a href="https://github.com/bryankwandou/colonnade" target="_blank" rel="noreferrer noopener" className="hover:text-stone-50">
                This repository
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/6">
        <div className="mx-auto flex w-[min(78rem,92vw)] flex-col gap-2 py-5 text-[0.74rem] text-stone-300 sm:flex-row sm:items-center">
          <p>Built by Bryan Kwandou.</p>
          <p className="sm:ml-auto">
            Shelf rebuilt{" "}
            <time dateTime={catalog.generatedAt}>
              {built.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </time>{" "}
            from {counts.repos} repositories.
          </p>
        </div>
      </div>
    </footer>
  );
}
