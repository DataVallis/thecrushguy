/**
 * App covers (TASK-019): a unique, deterministic graphic per app — palette + pattern picked from a hash of the
 * slug, the app's initial on top. Our own artwork, never vendor images (design/CGP.md §7). Decorative: aria-hidden.
 */
const PALETTES: [bg: string, pattern: string, letter: string][] = [
  ["#FFE4EA", "#FF4D6D", "#C81E45"],
  ["#1B1530", "#FF4D6D", "#FFFFFF"],
  ["#F3F0FA", "#1B1530", "#1B1530"],
  ["#FF4D6D", "#FFE4EA", "#1B1530"],
  ["#FDF1D6", "#F5B83D", "#1B1530"],
  ["#3D3550", "#F3F0FA", "#FFE4EA"],
];
const PATTERNS = ["dots", "stripes", "hearts", "waves", "rings"] as const;

export function hashSlug(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function coverStyle(slug: string) {
  const h = hashSlug(slug);
  return {
    palette: PALETTES[h % PALETTES.length]!,
    pattern: PATTERNS[(h >>> 8) % PATTERNS.length]!,
    tilt: (h >>> 16) % 2,
  };
}

function Pattern({ id, kind, color }: { id: string; kind: (typeof PATTERNS)[number]; color: string }) {
  const common = { id, patternUnits: "userSpaceOnUse" as const };
  switch (kind) {
    case "dots":
      return (
        <pattern {...common} width="14" height="14">
          <circle cx="3" cy="3" r="2.2" fill={color} opacity="0.45" />
          <circle cx="10" cy="10" r="2.2" fill={color} opacity="0.3" />
        </pattern>
      );
    case "stripes":
      return (
        <pattern {...common} width="12" height="12" patternTransform="rotate(35)">
          <rect width="5" height="12" fill={color} opacity="0.3" />
        </pattern>
      );
    case "hearts":
      return (
        <pattern {...common} width="22" height="20">
          <path
            d="M11 17s-6-3.7-8-7.4C1.7 7 3.2 4 6.2 4c1.7 0 2.9 1 3.6 2.1L11 7.7l1.2-1.6C12.9 5 14.1 4 15.8 4c3 0 4.5 3 3.2 5.6C17 13.3 11 17 11 17z"
            fill={color}
            opacity="0.35"
          />
        </pattern>
      );
    case "waves":
      return (
        <pattern {...common} width="24" height="12">
          <path d="M0 6 Q6 0 12 6 T24 6" stroke={color} strokeWidth="2.2" fill="none" opacity="0.4" />
        </pattern>
      );
    case "rings":
      return (
        <pattern {...common} width="20" height="20">
          <circle cx="10" cy="10" r="6" stroke={color} strokeWidth="2" fill="none" opacity="0.35" />
        </pattern>
      );
  }
}

export function AppCover({
  slug,
  name,
  variant = "tile",
  className = "",
}: {
  slug: string;
  name: string;
  variant?: "tile" | "tile-lg" | "banner";
  className?: string;
}) {
  const { palette, pattern } = coverStyle(slug);
  const [bg, pc, letter] = palette;
  const id = `cv-${slug}-${variant}`;
  const banner = variant === "banner";
  const size =
    variant === "tile"
      ? "size-14 rounded-2xl"
      : variant === "tile-lg"
        ? "size-24 rounded-3xl"
        : "h-36 w-full rounded-[2rem] sm:h-44";
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 overflow-hidden ${size} ${className}`}
      style={{ background: bg }}
    >
      <svg className="absolute inset-0 size-full" preserveAspectRatio="none">
        <defs>
          <Pattern id={id} kind={pattern} color={pc} />
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      {banner ? null : (
        <span
          className={`absolute inset-0 flex items-center font-display font-extrabold ${
            banner ? "justify-end pr-8 text-[7rem] leading-none sm:pr-12 sm:text-[9rem]" : "justify-center"
          } ${variant === "tile" ? "text-2xl" : variant === "tile-lg" ? "text-5xl" : ""}`}
          style={{ color: letter }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </span>
  );
}
