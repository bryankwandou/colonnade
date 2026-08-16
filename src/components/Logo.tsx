/**
 * The Colonnade mark.
 *
 * Four columns carrying an architrave, standing on a stylobate. The same
 * silhouette reads three ways depending on where you meet it: a colonnade,
 * a bar chart of output, and the row of tiles on a storefront shelf.
 *
 * Classical detail kept on purpose: the outer bays are slightly narrower than
 * the centre ones, the way a real portico contracts at its corners. It is the
 * kind of thing nobody names but everybody feels.
 */

type MarkProps = {
  size?: number;
  className?: string;
  /** Draws the columns in on mount. Off by default so favicons stay static. */
  animated?: boolean;
};

const COLUMNS = [
  { x: 10.4, delay: 0 },
  { x: 19.9, delay: 0.08 },
  { x: 28.1, delay: 0.16 },
  { x: 37.6, delay: 0.24 },
];

export function Mark({ size = 32, className = "", animated = false }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Colonnade"
      className={className}
    >
      <defs>
        <linearGradient id="cn-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brass-300)" />
          <stop offset="55%" stopColor="var(--color-brass-400)" />
          <stop offset="100%" stopColor="var(--color-brass-600)" />
        </linearGradient>
        <linearGradient id="cn-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-stone-100)" />
          <stop offset="100%" stopColor="var(--color-stone-300)" />
        </linearGradient>
      </defs>

      {/* Architrave */}
      <rect x="4" y="9.5" width="40" height="5.4" rx="1.6" fill="url(#cn-beam)" />

      {COLUMNS.map((col, i) => (
        <g key={col.x}>
          {/* Capital */}
          <rect x={col.x - 1.2} y="16.4" width="6.4" height="2.1" rx="0.7" fill="var(--color-brass-300)" />
          {/* Shaft */}
          <rect
            x={col.x}
            y="18.5"
            width="4"
            height="18.6"
            rx="0.6"
            fill="url(#cn-shaft)"
            style={
              animated
                ? {
                    transformOrigin: "50% 100%",
                    animation: `cn-rise 700ms var(--ease-out-quint) ${col.delay}s both`,
                  }
                : undefined
            }
          />
          {/* Fluting: one hairline per shaft, visible only at larger sizes */}
          <rect x={col.x + 1.8} y="20" width="0.5" height="15.6" rx="0.25" fill="var(--color-shadow-900)" opacity="0.28" />
          <title>{`Column ${i + 1}`}</title>
        </g>
      ))}

      {/* Stylobate */}
      <rect x="4" y="37.1" width="40" height="5.4" rx="1.6" fill="url(#cn-beam)" />

      <style>{`@keyframes cn-rise { from { transform: scaleY(0); opacity: 0 } to { transform: scaleY(1); opacity: 1 } }`}</style>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[1.05rem] tracking-[-0.015em] text-stone-50 ${className}`}>
      Colonnade
    </span>
  );
}

export function Lockup({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      <Wordmark />
    </span>
  );
}
