"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import summary from "@/data/summary.json";

const counts = summary.counts;

/**
 * The colonnade builds itself: columns rise from the stylobate, the architrave
 * settles on top. Heights are drawn from the shelf counts, so the silhouette is
 * a reading of the catalogue rather than decoration.
 */
function RisingColonnade() {
  const reduce = useReducedMotion();
  const bays = [0.62, 0.85, 0.71, 1, 0.78, 0.93, 0.66, 0.88, 0.74, 0.96, 0.68, 0.82];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[46vh] max-h-[26rem] overflow-hidden">
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-full w-[min(72rem,94vw)] items-end justify-between gap-[1.2vw]">
        {bays.map((h, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 1.05, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.055 }}
            style={{ height: `${h * 100}%`, transformOrigin: "50% 100%" }}
            className="relative flex-1 rounded-t-[3px]"
          >
            <div className="absolute inset-0 rounded-t-[3px] bg-gradient-to-b from-brass-400/[0.16] via-brass-500/[0.07] to-transparent" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-brass-300/25 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-brass-300/10 to-transparent" />
          </motion.div>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-shadow-900 via-shadow-900/80 to-transparent" />
    </div>
  );
}

function Stat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
      className="border-l border-white/10 pl-4"
    >
      <div className="font-display text-[1.6rem] leading-none text-stone-50">{value}</div>
      <div className="mt-1.5 text-[0.72rem] tracking-wide text-stone-300">{label}</div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="stone-field relative overflow-hidden border-b border-white/8">
      <RisingColonnade />

      <div className="relative mx-auto w-[min(78rem,92vw)] pb-40 pt-20 sm:pt-28">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[0.74rem] text-stone-200"
        >
          <span className="size-1.5 rounded-full bg-verdigris-400" />
          {counts.live} of them are running right now
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          className="max-w-4xl font-display text-[clamp(2.4rem,6.2vw,4.4rem)] font-light leading-[1.04] tracking-[-0.025em] text-stone-50"
        >
          Everything that got finished,
          <span className="block text-brass-300">standing in one row.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.14 }}
          className="mt-6 max-w-xl text-[1.02rem] leading-relaxed text-stone-200/90"
        >
          Work scatters across repositories until nobody can see the shape of it. Colonnade
          puts {counts.listed} finished pieces on two shelves — tools you operate, and projects
          with a thesis — and gives every one of them a door you can walk through.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.22 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <Link
            href="/tools"
            className="group inline-flex items-center gap-2 rounded-xl bg-brass-400 px-5 py-2.5 text-[0.9rem] font-medium text-shadow-900 transition hover:bg-brass-300"
          >
            Open the Tools shelf
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-5 py-2.5 text-[0.9rem] text-stone-100 transition hover:border-white/30 hover:bg-white/4"
          >
            Browse Projects
          </Link>
        </motion.div>

        <div className="mt-14 grid max-w-2xl grid-cols-2 gap-y-6 sm:grid-cols-4">
          <Stat value={String(counts.listed)} label="Listings on the shelf" delay={0.3} />
          <Stat value={String(counts.tools)} label="Tools" delay={0.35} />
          <Stat value={String(counts.projects)} label="Projects" delay={0.4} />
          <Stat value={String(counts.repos)} label="Repositories read" delay={0.45} />
        </div>
      </div>
    </section>
  );
}
