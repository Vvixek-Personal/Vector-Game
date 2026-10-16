/** Illustrated cartoon portraits — not glyphs, not photos. */

export const CARTOON_IDS = [
  "cto-bean", "cto-pip", "cto-moss", "cto-nori", "cto-blush", "cto-kiwi",
  "cto-soda", "cto-pixel", "cto-blob", "cto-fox", "cto-bun", "cto-ember",
  "cto-royal", "cto-luna", "cto-bolt", "cto-sage", "cto-blaze",
] as const;

export type CartoonId = (typeof CARTOON_IDS)[number];

const FACE: Record<CartoonId, { skin: string; hair: string; shirt: string; accent: string; shape: "round" | "oval" | "sq" }> = {
  "cto-bean": { skin: "#f3c7a3", hair: "#2a1f18", shirt: "#5b8def", accent: "#ffd166", shape: "round" },
  "cto-pip": { skin: "#e8b48a", hair: "#6b3a1f", shirt: "#34d399", accent: "#fb7185", shape: "oval" },
  "cto-moss": { skin: "#c9956c", hair: "#1f2a1c", shirt: "#65a30d", accent: "#a3e635", shape: "sq" },
  "cto-nori": { skin: "#f6d0b1", hair: "#111827", shirt: "#7c3aed", accent: "#c4b5fd", shape: "round" },
  "cto-blush": { skin: "#f8c9b0", hair: "#f472b6", shirt: "#fb7185", accent: "#fecdd3", shape: "round" },
  "cto-kiwi": { skin: "#d9a066", hair: "#14532d", shirt: "#22c55e", accent: "#bbf7d0", shape: "oval" },
  "cto-soda": { skin: "#efc2a0", hair: "#1e3a8a", shirt: "#38bdf8", accent: "#7dd3fc", shape: "sq" },
  "cto-pixel": { skin: "#f0c8a0", hair: "#0f172a", shirt: "#f59e0b", accent: "#fde68a", shape: "sq" },
  "cto-blob": { skin: "#f5c6aa", hair: "#7c2d12", shirt: "#ea580c", accent: "#fdba74", shape: "round" },
  "cto-fox": { skin: "#f2b98a", hair: "#9a3412", shirt: "#dc2626", accent: "#fecaca", shape: "oval" },
  "cto-bun": { skin: "#f6d3b8", hair: "#431407", shirt: "#db2777", accent: "#f9a8d4", shape: "round" },
  "cto-ember": { skin: "#eab08a", hair: "#7f1d1d", shirt: "#b45309", accent: "#fbbf24", shape: "oval" },
  "cto-royal": { skin: "#e8c4a4", hair: "#111827", shirt: "#4338ca", accent: "#c4b5fd", shape: "oval" },
  "cto-luna": { skin: "#f0cbb0", hair: "#312e81", shirt: "#6366f1", accent: "#a5b4fc", shape: "round" },
  "cto-bolt": { skin: "#efc09a", hair: "#facc15", shirt: "#0f172a", accent: "#fde047", shape: "sq" },
  "cto-sage": { skin: "#d7a57a", hair: "#365314", shirt: "#3f6212", accent: "#bef264", shape: "oval" },
  "cto-blaze": { skin: "#fed7aa", hair: "#ea580c", shirt: "#c2410c", accent: "#fbbf24", shape: "oval" },
};

export default function CartoonAvatar({ id, size = 88 }: { id: string; size?: number }) {
  const key = (CARTOON_IDS.includes(id as CartoonId) ? id : "cto-bean") as CartoonId;
  const c = FACE[key];
  const rx = c.shape === "sq" ? 18 : c.shape === "oval" ? 40 : 46;
  return (
    <svg className="cartoon-avatar" width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="46" fill={c.accent} opacity=".22" />
      <ellipse cx="48" cy="78" rx="28" ry="14" fill={c.shirt} />
      <rect x="20" y="22" width="56" height="54" rx={rx} fill={c.skin} />
      <path d={hairPath(key)} fill={c.hair} />
      <circle cx="36" cy="48" r="4.2" fill="#1f2937" />
      <circle cx="60" cy="48" r="4.2" fill="#1f2937" />
      <circle cx="37.4" cy="46.6" r="1.3" fill="#fff" />
      <circle cx="61.4" cy="46.6" r="1.3" fill="#fff" />
      <path d="M40 62c5 5 11 5 16 0" fill="none" stroke="#7c2d12" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="32" cy="54" rx="5" ry="2.4" fill="#f9a8d4" opacity=".45" />
      <ellipse cx="64" cy="54" rx="5" ry="2.4" fill="#f9a8d4" opacity=".45" />
    </svg>
  );
}

function hairPath(id: CartoonId): string {
  switch (id) {
    case "cto-blush":
    case "cto-bun":
      return "M22 40c0-22 52-22 52 0v6H22z M48 14c8 0 10 8 10 12h-20c0-4 2-12 10-12z";
    case "cto-bolt":
      return "M20 38 40 12h10l-8 18h16L38 52 48 34H32z";
    case "cto-fox":
      return "M18 44 30 16l18 12L66 16l12 28v6H18z";
    case "cto-blaze":
      return "M18 42 32 14l14 14 16-16 16 30v8H18z";
    case "cto-pixel":
      return "M22 20h52v22H22z";
    default:
      return "M18 44c2-24 58-24 60 0v8H18z";
  }
}

export function isCartoonId(id: string): id is CartoonId {
  return (CARTOON_IDS as readonly string[]).includes(id);
}
