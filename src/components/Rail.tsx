"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A horizontally scrolled shelf, the way a storefront presents a row of
 * featured items. Arrows appear only when there is somewhere left to scroll.
 */
export function Rail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(el.clientWidth * 0.8, 280), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={measure}
        className="rail -mx-[3vw] flex gap-4 overflow-x-auto px-[3vw] pb-2"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => nudge(-1)}
          disabled={edges.start}
          aria-label={`Scroll ${label} left`}
          className="grid size-8 place-items-center rounded-lg border border-white/10 text-stone-300 transition hover:border-white/25 hover:text-stone-50 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => nudge(1)}
          disabled={edges.end}
          aria-label={`Scroll ${label} right`}
          className="grid size-8 place-items-center rounded-lg border border-white/10 text-stone-300 transition hover:border-white/25 hover:text-stone-50 disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function SectionHead({
  title,
  blurb,
  href,
  hrefLabel = "See all",
}: {
  title: string;
  blurb?: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end gap-6">
      <div className="min-w-0">
        <h2 className="font-display text-[1.55rem] leading-tight tracking-[-0.02em] text-stone-50">{title}</h2>
        {blurb ? <p className="mt-1.5 text-[0.87rem] text-stone-300">{blurb}</p> : null}
      </div>
      {href ? (
        <a
          href={href}
          className="ml-auto shrink-0 text-[0.82rem] text-brass-300 transition hover:text-brass-400"
        >
          {hrefLabel}
        </a>
      ) : null}
    </div>
  );
}
