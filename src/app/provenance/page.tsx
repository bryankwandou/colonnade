import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ListingMark } from "@/components/Mark";
import { entries, counts, hostOf } from "@/lib/catalog";
import marksData from "@/data/marks.json";
import blurbData from "@/data/readme-blurbs.json";
import metaData from "@/data/site-meta.json";

export const metadata: Metadata = {
  title: "Where every mark came from",
  description:
    "One row per listing, naming the file each logo was taken from and the text each description was written against.",
};

type MarkRecord = { file: string; source: string; kind: string; bytes: number; evidence?: string };

/**
 * How much is known about each mark, rather than a single yes-or-no.
 *
 * The first four rest on something the author published and can be opened and
 * checked. The last rests on position in the markup alone, which is an
 * inference — worth saying out loud rather than counting as proof.
 */
const EVIDENCE: Record<string, { label: string; tone: string; rank: number }> = {
  declared: { label: "Site declares it as its icon", tone: "text-verdigris-300", rank: 1 },
  committed: { label: "Committed at a framework path", tone: "text-verdigris-300", rank: 2 },
  named: { label: "Markup names the product on it", tone: "text-verdigris-300", rank: 3 },
  lockup: { label: "Sits inside the home link", tone: "text-brass-300", rank: 4 },
  header: { label: "Sits inside the page header", tone: "text-brass-300", rank: 5 },
  position: { label: "Position in the markup only", tone: "text-stone-400", rank: 6 },
};
const marks = marksData as Record<string, MarkRecord>;
const blurbs = blurbData as Record<string, string[]>;
const siteMeta = metaData as Record<string, { title: string | null; description: string | null }>;

/**
 * Plain names for where a mark was found. The whole point of this page is that a
 * reader can go and check, so each label has to say what to go and look at.
 */
const ORIGIN: Record<string, { label: string; note: string; tone: string }> = {
  inline: {
    label: "Drawn in the page",
    note: "An svg element in the site's own header markup",
    tone: "text-verdigris-300",
  },
  header: {
    label: "Header image",
    note: "An image in the header, labelled with the product name",
    tone: "text-verdigris-300",
  },
  repo: {
    label: "Committed to the repo",
    note: "A file in the repository, usually app/icon.svg or public/logo.svg",
    tone: "text-brass-300",
  },
  svg: {
    label: "Published icon",
    note: "A vector icon linked from the site's head",
    tone: "text-brass-300",
  },
  apple: {
    label: "Published icon",
    note: "The site's apple-touch-icon",
    tone: "text-brass-300",
  },
};

function originOf(slug: string) {
  const mark = marks[slug];
  if (!mark) {
    return {
      label: "Generated",
      note: "No mark is published anywhere, so the catalogue draws one from the slug",
      tone: "text-stone-400",
      source: null as string | null,
    };
  }
  const known = ORIGIN[mark.kind] ?? {
    label: "Published icon",
    note: `Linked from the site's head (${mark.kind})`,
    tone: "text-brass-300",
  };
  return { ...known, source: mark.source };
}

/**
 * Repository names are withheld alongside the links themselves, so a path from
 * a repo is shown as the path only. The file is still named, which is what
 * makes a mark checkable; what is dropped is the address to fetch it from.
 */
function maskSource(source: string): string {
  if (source.startsWith("github:")) {
    const path = source.slice("github:".length);
    const cut = path.indexOf("/");
    return cut === -1 ? "committed in the repository" : `repository → ${path.slice(cut + 1)}`;
  }
  return source.replace(/^https?:\/\//, "");
}

function descriptionOrigin(slug: string) {
  if (blurbs[slug]?.length) return { label: "README", tone: "text-verdigris-300" };
  if (siteMeta[slug]?.description) return { label: "Site description", tone: "text-verdigris-300" };
  if (siteMeta[slug]?.title) return { label: "Site title", tone: "text-brass-300" };
  return { label: "None published", tone: "text-stone-400" };
}

export default function ProvenancePage() {
  const rows = [...entries].sort((a, b) => a.name.localeCompare(b.name));

  const realMarks = rows.filter((e) => marks[e.slug]).length;
  const distinct = new Set(Object.values(marks).map((m) => m.file)).size;
  const described = rows.filter((e) => e.tagline).length;

  const byOrigin = rows.reduce<Record<string, number>>((acc, e) => {
    const key = originOf(e.slug).label;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="mx-auto w-[min(78rem,92vw)] pb-20 pt-12">
      <header className="mb-10">
        <h1 className="font-display text-[clamp(2rem,4.6vw,3rem)] font-light leading-tight tracking-[-0.025em] text-stone-50">
          Where every mark came from
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone-200/85">
          A logo is only worth showing if it belongs to the project. This names the exact file
          behind each one, so any row here can be opened and checked against the deployment or the
          repository it claims to come from.
        </p>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-stone-200/70">
          Marks worn by more than two listings are refused. A site that never set a favicon still
          answers when asked for one, because the host serves its own — thirty-three listings once
          wore the identical placeholder as though it were thirty-three logos.
        </p>
      </header>

      <div className="mb-12 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
        {[
          { n: realMarks, k: "carry their own mark" },
          { n: distinct, k: "distinct mark files" },
          { n: described, k: `described, of ${counts.listed}` },
          { n: counts.live, k: "with a live deployment" },
        ].map((s) => (
          <div key={s.k} className="bg-stone-950 px-5 py-4">
            <span className="block font-display text-[1.9rem] leading-none tabular-nums text-stone-50">
              {s.n}
            </span>
            <span className="mt-1.5 block text-[0.78rem] leading-snug text-stone-300/80">{s.k}</span>
          </div>
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-x-7 gap-y-2 text-[0.82rem] text-stone-300/80">
        {Object.entries(
          rows.reduce<Record<string, number>>((acc, e) => {
            const ev = marks[e.slug]?.evidence;
            if (ev) acc[ev] = (acc[ev] ?? 0) + 1;
            return acc;
          }, {})
        )
          .sort((a, b) => (EVIDENCE[a[0]]?.rank ?? 9) - (EVIDENCE[b[0]]?.rank ?? 9))
          .map(([key, n]) => (
            <span key={key} className={EVIDENCE[key]?.tone ?? "text-stone-400"}>
              <span className="font-mono tabular-nums">{n}</span>{" "}
              {(EVIDENCE[key]?.label ?? key).toLowerCase()}
            </span>
          ))}
      </div>

      <div className="mb-10 flex flex-wrap gap-x-7 gap-y-2 text-[0.82rem] text-stone-300/80">
        {Object.entries(byOrigin)
          .sort((a, b) => b[1] - a[1])
          .map(([label, n]) => (
            <span key={label}>
              <span className="font-mono tabular-nums text-stone-50">{n}</span>{" "}
              {label.toLowerCase()}
            </span>
          ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[54rem] border-collapse text-[0.88rem]">
          <thead>
            <tr className="border-b border-white/12 text-left font-mono text-[0.68rem] uppercase tracking-[0.12em] text-stone-400">
              <th className="py-3 pr-4 font-normal">Listing</th>
              <th className="py-3 pr-4 font-normal">Mark taken from</th>
              <th className="py-3 pr-4 font-normal">Exact file</th>
              <th className="py-3 pr-4 font-normal">How it is known to be theirs</th>
              <th className="py-3 pr-4 font-normal">Description written against</th>
              <th className="py-3 font-normal">Door</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const origin = originOf(entry.slug);
              const source = descriptionOrigin(entry.slug);
              return (
                <tr key={entry.slug} className="border-b border-white/[0.07] align-top">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/app/${entry.slug}`}
                      className="flex items-center gap-3 text-stone-50 transition-colors hover:text-brass-300"
                    >
                      <ListingMark entry={entry} size={28} />
                      <span>{entry.name}</span>
                    </Link>
                  </td>
                  <td className={`py-3 pr-4 ${origin.tone}`}>
                    {origin.label}
                    <span className="mt-0.5 block text-[0.76rem] leading-snug text-stone-400">
                      {origin.note}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-[0.72rem] leading-snug text-stone-300/75">
                    {origin.source ? maskSource(origin.source) : "—"}
                  </td>
                  <td className="py-3 pr-4">
                    {(() => {
                      const e = marks[entry.slug]?.evidence;
                      const known = e ? EVIDENCE[e] : null;
                      return known ? (
                        <span className={known.tone}>{known.label}</span>
                      ) : (
                        <span className="text-stone-500">—</span>
                      );
                    })()}
                  </td>
                  <td className={`py-3 pr-4 ${source.tone}`}>{source.label}</td>
                  <td className="py-3">
                    {entry.live ? (
                      <a
                        href={entry.live}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[0.75rem] text-brass-300 transition-colors hover:text-brass-200"
                      >
                        {hostOf(entry.live)}
                        <ArrowUpRight className="size-3" />
                      </a>
                    ) : (
                      <span className="text-[0.78rem] text-stone-500">no public door</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
