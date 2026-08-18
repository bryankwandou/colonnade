"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { Lockup } from "@/components/Logo";
import { WalletPill } from "@/components/WalletPill";
import { ListingMark } from "@/components/Mark";
import summary from "@/data/summary.json";

type Hit = {
  slug: string;
  name: string;
  tagline: string | null;
  category_label: string;
  live: string | null;
};

/** Eight rows, embedded at build time, so the panel is never empty on open. */
const featured: Hit[] = summary.featured as Hit[];
const counts = summary.counts;

const NAV = [
  { href: "/tools", label: "Tools" },
  { href: "/projects", label: "Projects" },
  { href: "/catalogue", label: "Catalogue" },
  { href: "/provenance", label: "Provenance" },
  { href: "/verify", label: "Verify" },
];

function SearchPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Hit[]>(featured);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /*
   * Search runs in Postgres now, not here. The catalogue used to be imported
   * into this component, which meant every visitor downloaded all 158 listings
   * before they could type. Queries are debounced and the in-flight one is
   * aborted when the next keystroke lands, so results never arrive out of order.
   */
  useEffect(() => {
    const needle = q.trim();
    if (!needle) {
      setResults(featured);
      setPending(false);
      return;
    }

    const controller = new AbortController();
    setPending(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(needle)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        // Aborted by the next keystroke, or the network dropped. Either way the
        // panel keeps showing what it had rather than flashing empty.
      } finally {
        setPending(false);
      }
    }, 160);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] bg-shadow-900/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.99 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search the catalogue"
        className="mx-auto mt-[8vh] w-[min(38rem,92vw)] overflow-hidden rounded-2xl border border-white/10 bg-shadow-800 shadow-[0_40px_100px_-40px_rgba(0,0,0,1)]"
      >
        <div className="flex items-center gap-3 border-b border-white/8 px-4">
          <Search className="size-4 shrink-0 text-stone-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${counts.listed} listings by name, category, or what it does`}
            className="w-full bg-transparent py-3.5 text-[0.9rem] text-stone-50 outline-none placeholder:text-stone-300/70"
          />
          <button onClick={onClose} aria-label="Close search" className="text-stone-300 hover:text-stone-50">
            <X className="size-4" />
          </button>
        </div>

        <ul className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-[0.85rem] text-stone-300">
              {pending
                ? "Searching…"
                : `Nothing matches “${q}”. Try a category, a language, or part of a name.`}
            </li>
          ) : (
            results.map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/app/${e.slug}`}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/6"
                >
                  <ListingMark entry={{ slug: e.slug, name: e.name }} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.87rem] text-stone-50">{e.name}</span>
                    <span className="block truncate text-[0.74rem] text-stone-300">
                      {e.tagline ?? e.category_label}
                    </span>
                  </span>
                  {e.live ? <span className="size-1.5 shrink-0 rounded-full bg-verdigris-400" /> : null}
                </Link>
              </li>
            ))
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 ${
          lifted ? "border-b border-white/8 bg-shadow-900/85 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 w-[min(78rem,92vw)] items-center gap-6">
          <Link href="/" aria-label="Colonnade home" className="shrink-0">
            <Lockup />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-lg px-3 py-1.5 text-[0.845rem] transition-colors ${
                    active ? "text-stone-50" : "text-stone-300 hover:text-stone-100"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-px bg-brass-400"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[0.8rem] text-stone-300 transition hover:border-white/20 hover:text-stone-100"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border border-white/12 px-1.5 py-px font-mono text-[0.65rem] text-stone-300 lg:inline">
                ⌘K
              </kbd>
            </button>
            <WalletPill />
          </div>
        </div>
      </header>

      <AnimatePresence>{open ? <SearchPanel onClose={() => setOpen(false)} /> : null}</AnimatePresence>
    </>
  );
}
