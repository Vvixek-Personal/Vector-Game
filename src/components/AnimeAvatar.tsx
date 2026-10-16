/**
 * Anime Style PFP (Profile Picture) Avatars.
 * Vector-rendered anime portraits with layered hair, detailed expressive eyes,
 * specular catchlights, facial decals, accessories, and glowing atmospheres.
 */

export const ANIME_IDS = [
  "ani-cipher",
  "ani-sakura",
  "ani-ryu",
  "ani-kage",
  "ani-kitsune",
  "ani-eva",
  "ani-ren",
  "ani-yuki",
  "ani-chiyo",
  "ani-nero",
  "ani-lumi",
  "ani-zen",
  "ani-miku",
  "ani-kaido",
  "ani-shin",
  "ani-astral",
  "ani-nova",
  "ani-valkyrie",
  "ani-vortex",
  "ani-raiden",
  "ani-chronos",
  "ani-mecha-zero",
  "ani-kitsune-fire",
] as const;

export type AnimeId = (typeof ANIME_IDS)[number];

interface AnimeDef {
  id: AnimeId;
  name: string;
  tagline: string;
  bgFrom: string;
  bgTo: string;
  skin: string;
  skinShadow: string;
  hair: string;
  hairShadow: string;
  hairHighlight: string;
  eyes: string;
  eyeHighlight: string;
  outfit: string;
  outfitAccent: string;
  accessory?: "visor" | "kitsune" | "neko" | "halo" | "horns" | "scarf" | "headband" | "headset" | "pilot" | "bandaid";
  accentColor: string;
}

export const ANIME_CHARACTERS: Record<AnimeId, AnimeDef> = {
  "ani-cipher": {
    id: "ani-cipher",
    name: "Cipher",
    tagline: "Cyberpunk Netrunner",
    bgFrom: "#0b1c2d",
    bgTo: "#00f0ff",
    skin: "#fbe4d8",
    skinShadow: "#e2b8a4",
    hair: "#06b6d4",
    hairShadow: "#0891b2",
    hairHighlight: "#a5f3fc",
    eyes: "#22d3ee",
    eyeHighlight: "#67e8f9",
    outfit: "#0f172a",
    outfitAccent: "#00f0ff",
    accessory: "visor",
    accentColor: "#00f0ff",
  },
  "ani-sakura": {
    id: "ani-sakura",
    name: "Sakura",
    tagline: "Star Idol",
    bgFrom: "#38102a",
    bgTo: "#f472b6",
    skin: "#fff1eb",
    skinShadow: "#fbcfe8",
    hair: "#f472b6",
    hairShadow: "#db2777",
    hairHighlight: "#fce7f3",
    eyes: "#ec4899",
    eyeHighlight: "#fbcfe8",
    outfit: "#4a044e",
    outfitAccent: "#f472b6",
    accentColor: "#f472b6",
  },
  "ani-ryu": {
    id: "ani-ryu",
    name: "Ryu",
    tagline: "Flame Ronin",
    bgFrom: "#3a0e08",
    bgTo: "#f97316",
    skin: "#fcd5ba",
    skinShadow: "#ea9d75",
    hair: "#ea580c",
    hairShadow: "#9a3412",
    hairHighlight: "#fed7aa",
    eyes: "#dc2626",
    eyeHighlight: "#fca5a5",
    outfit: "#1c1917",
    outfitAccent: "#ea580c",
    accessory: "headband",
    accentColor: "#f97316",
  },
  "ani-kage": {
    id: "ani-kage",
    name: "Kage",
    tagline: "Shadow Shinobi",
    bgFrom: "#170a2a",
    bgTo: "#8b5cf6",
    skin: "#ebd1c0",
    skinShadow: "#c9a794",
    hair: "#312e81",
    hairShadow: "#1e1b4b",
    hairHighlight: "#a5b4fc",
    eyes: "#ef4444",
    eyeHighlight: "#fca5a5",
    outfit: "#09090b",
    outfitAccent: "#a855f7",
    accessory: "scarf",
    accentColor: "#a855f7",
  },
  "ani-kitsune": {
    id: "ani-kitsune",
    name: "Kitsune",
    tagline: "Fox Spirit",
    bgFrom: "#3f1a0e",
    bgTo: "#fb923c",
    skin: "#fff3ec",
    skinShadow: "#fcd5ba",
    hair: "#fff7ed",
    hairShadow: "#fdba74",
    hairHighlight: "#ffffff",
    eyes: "#f59e0b",
    eyeHighlight: "#fde68a",
    outfit: "#7c2d12",
    outfitAccent: "#dc2626",
    accessory: "kitsune",
    accentColor: "#fb923c",
  },
  "ani-eva": {
    id: "ani-eva",
    name: "Eva",
    tagline: "Mecha Ace",
    bgFrom: "#0c1b33",
    bgTo: "#38bdf8",
    skin: "#fce7db",
    skinShadow: "#eab8a2",
    hair: "#2563eb",
    hairShadow: "#1e40af",
    hairHighlight: "#93c5fd",
    eyes: "#8b5cf6",
    eyeHighlight: "#c4b5fd",
    outfit: "#0f172a",
    outfitAccent: "#ef4444",
    accessory: "pilot",
    accentColor: "#38bdf8",
  },
  "ani-ren": {
    id: "ani-ren",
    name: "Ren",
    tagline: "Street Rebel",
    bgFrom: "#18181b",
    bgTo: "#71717a",
    skin: "#f6ded2",
    skinShadow: "#dbb3a2",
    hair: "#18181b",
    hairShadow: "#09090b",
    hairHighlight: "#e4e4e7",
    eyes: "#06b6d4",
    eyeHighlight: "#a5f3fc",
    outfit: "#27272a",
    outfitAccent: "#e4e4e7",
    accessory: "bandaid",
    accentColor: "#e4e4e7",
  },
  "ani-yuki": {
    id: "ani-yuki",
    name: "Yuki",
    tagline: "Frost Mage",
    bgFrom: "#082f49",
    bgTo: "#a5f3fc",
    skin: "#f8fafc",
    skinShadow: "#e2e8f0",
    hair: "#e0f2fe",
    hairShadow: "#7dd3fc",
    hairHighlight: "#ffffff",
    eyes: "#38bdf8",
    eyeHighlight: "#e0f2fe",
    outfit: "#0c4a6e",
    outfitAccent: "#38bdf8",
    accentColor: "#7dd3fc",
  },
  "ani-chiyo": {
    id: "ani-chiyo",
    name: "Chiyo",
    tagline: "Neko Champion",
    bgFrom: "#2e1022",
    bgTo: "#fb7185",
    skin: "#fff1e8",
    skinShadow: "#fbcfe8",
    hair: "#451a03",
    hairShadow: "#270f02",
    hairHighlight: "#d97706",
    eyes: "#10b981",
    eyeHighlight: "#a7f3d0",
    outfit: "#1e1b4b",
    outfitAccent: "#fbbf24",
    accessory: "neko",
    accentColor: "#fb7185",
  },
  "ani-nero": {
    id: "ani-nero",
    name: "Nero",
    tagline: "Abyss Prince",
    bgFrom: "#1a080c",
    bgTo: "#991b1b",
    skin: "#ebe3df",
    skinShadow: "#c7b6af",
    hair: "#18181b",
    hairShadow: "#09090b",
    hairHighlight: "#71717a",
    eyes: "#f59e0b",
    eyeHighlight: "#fef08a",
    outfit: "#09090b",
    outfitAccent: "#b91c1c",
    accessory: "horns",
    accentColor: "#ef4444",
  },
  "ani-lumi": {
    id: "ani-lumi",
    name: "Lumi",
    tagline: "Astral Valkyrie",
    bgFrom: "#2e2107",
    bgTo: "#fde047",
    skin: "#fffbf0",
    skinShadow: "#fed7aa",
    hair: "#fef08a",
    hairShadow: "#eab308",
    hairHighlight: "#ffffff",
    eyes: "#818cf8",
    eyeHighlight: "#c7d2fe",
    outfit: "#1e1b4b",
    outfitAccent: "#facc15",
    accessory: "halo",
    accentColor: "#facc15",
  },
  "ani-zen": {
    id: "ani-zen",
    name: "Zen",
    tagline: "Gale Archer",
    bgFrom: "#062c1e",
    bgTo: "#4ade80",
    skin: "#fbe4d5",
    skinShadow: "#e2b8a2",
    hair: "#047857",
    hairShadow: "#064e3b",
    hairHighlight: "#6ee7b7",
    eyes: "#10b981",
    eyeHighlight: "#a7f3d0",
    outfit: "#064e3b",
    outfitAccent: "#34d399",
    accentColor: "#34d399",
  },
  "ani-miku": {
    id: "ani-miku",
    name: "Aria",
    tagline: "Cyber Vocalist",
    bgFrom: "#052e2b",
    bgTo: "#2dd4bf",
    skin: "#fff1ea",
    skinShadow: "#fcd5ba",
    hair: "#14b8a6",
    hairShadow: "#0f766e",
    hairHighlight: "#99f6e4",
    eyes: "#0d9488",
    eyeHighlight: "#5eead4",
    outfit: "#111827",
    outfitAccent: "#2dd4bf",
    accessory: "headset",
    accentColor: "#2dd4bf",
  },
  "ani-kaido": {
    id: "ani-kaido",
    name: "Kaido",
    tagline: "Thunder Fist",
    bgFrom: "#2c1c04",
    bgTo: "#eab308",
    skin: "#f5d0b5",
    skinShadow: "#dd9f78",
    hair: "#eab308",
    hairShadow: "#a16207",
    hairHighlight: "#fef08a",
    eyes: "#f59e0b",
    eyeHighlight: "#fef08a",
    outfit: "#1c1917",
    outfitAccent: "#eab308",
    accentColor: "#facc15",
  },
  "ani-shin": {
    id: "ani-shin",
    name: "Shinobi X",
    tagline: "Mecha Phantom",
    bgFrom: "#050508",
    bgTo: "#6366f1",
    skin: "#f1f5f9",
    skinShadow: "#cbd5e1",
    hair: "#312e81",
    hairShadow: "#1e1b4b",
    hairHighlight: "#818cf8",
    eyes: "#6366f1",
    eyeHighlight: "#c7d2fe",
    outfit: "#020617",
    outfitAccent: "#818cf8",
    accessory: "visor",
    accentColor: "#818cf8",
  },
  "ani-astral": {
    id: "ani-astral",
    name: "Astral Prime",
    tagline: "Cosmic Sovereign",
    bgFrom: "#1e0b36",
    bgTo: "#c084fc",
    skin: "#fdf4ff",
    skinShadow: "#f0abfc",
    hair: "#7e22ce",
    hairShadow: "#581c87",
    hairHighlight: "#f0abfc",
    eyes: "#e879f9",
    eyeHighlight: "#fae8ff",
    outfit: "#0f051d",
    outfitAccent: "#fbbf24",
    accessory: "halo",
    accentColor: "#fbbf24",
  },
  "ani-nova": {
    id: "ani-nova",
    name: "Nova",
    tagline: "Solar Alchemist",
    bgFrom: "#3a1700",
    bgTo: "#f59e0b",
    skin: "#fff5eb",
    skinShadow: "#fbd38d",
    hair: "#fbbf24",
    hairShadow: "#d97706",
    hairHighlight: "#fef08a",
    eyes: "#f59e0b",
    eyeHighlight: "#fef9c3",
    outfit: "#1c1917",
    outfitAccent: "#fbbf24",
    accessory: "halo",
    accentColor: "#f59e0b",
  },
  "ani-valkyrie": {
    id: "ani-valkyrie",
    name: "Valkyrie",
    tagline: "Celestial Blade",
    bgFrom: "#082f49",
    bgTo: "#38bdf8",
    skin: "#fff1eb",
    skinShadow: "#fed7aa",
    hair: "#e0f2fe",
    hairShadow: "#7dd3fc",
    hairHighlight: "#ffffff",
    eyes: "#0284c7",
    eyeHighlight: "#bae6fd",
    outfit: "#0f172a",
    outfitAccent: "#38bdf8",
    accessory: "halo",
    accentColor: "#38bdf8",
  },
  "ani-vortex": {
    id: "ani-vortex",
    name: "Vortex",
    tagline: "Quantum Speedster",
    bgFrom: "#180828",
    bgTo: "#c084fc",
    skin: "#ede9fe",
    skinShadow: "#c4b5fd",
    hair: "#9333ea",
    hairShadow: "#581c87",
    hairHighlight: "#f3e8ff",
    eyes: "#d946ef",
    eyeHighlight: "#fae8ff",
    outfit: "#09090b",
    outfitAccent: "#a855f7",
    accessory: "visor",
    accentColor: "#c084fc",
  },
  "ani-raiden": {
    id: "ani-raiden",
    name: "Raiden",
    tagline: "Thunder Katana",
    bgFrom: "#1e1b4b",
    bgTo: "#8b5cf6",
    skin: "#fef2f2",
    skinShadow: "#e0e7ff",
    hair: "#a855f7",
    hairShadow: "#6b21a8",
    hairHighlight: "#d8b4fe",
    eyes: "#c084fc",
    eyeHighlight: "#ede9fe",
    outfit: "#0f172a",
    outfitAccent: "#a855f7",
    accessory: "headband",
    accentColor: "#c084fc",
  },
  "ani-chronos": {
    id: "ani-chronos",
    name: "Chronos",
    tagline: "Time Weaver",
    bgFrom: "#1f1305",
    bgTo: "#f59e0b",
    skin: "#fff7ed",
    skinShadow: "#fed7aa",
    hair: "#f59e0b",
    hairShadow: "#b45309",
    hairHighlight: "#fef3c7",
    eyes: "#ea580c",
    eyeHighlight: "#ffedd5",
    outfit: "#1c1917",
    outfitAccent: "#fbbf24",
    accessory: "halo",
    accentColor: "#f59e0b",
  },
  "ani-mecha-zero": {
    id: "ani-mecha-zero",
    name: "Unit Zero",
    tagline: "Phantom Mech Pilot",
    bgFrom: "#022c22",
    bgTo: "#10b981",
    skin: "#f0fdf4",
    skinShadow: "#bbf7d0",
    hair: "#059669",
    hairShadow: "#065f46",
    hairHighlight: "#6ee7b7",
    eyes: "#34d399",
    eyeHighlight: "#d1fae5",
    outfit: "#064e3b",
    outfitAccent: "#10b981",
    accessory: "pilot",
    accentColor: "#34d399",
  },
  "ani-kitsune-fire": {
    id: "ani-kitsune-fire",
    name: "Homura Foxfire",
    tagline: "Celestial Fox Deity",
    bgFrom: "#450a0a",
    bgTo: "#ef4444",
    skin: "#fff1f2",
    skinShadow: "#fecdd3",
    hair: "#f43f5e",
    hairShadow: "#9f1239",
    hairHighlight: "#fda4af",
    eyes: "#fb7185",
    eyeHighlight: "#ffe4e6",
    outfit: "#881337",
    outfitAccent: "#f43f5e",
    accessory: "kitsune",
    accentColor: "#fb7185",
  },
};

export default function AnimeAvatar({ id, size = 88, className = "" }: { id: string; size?: number; className?: string }) {
  const char = ANIME_CHARACTERS[(id as AnimeId) in ANIME_CHARACTERS ? (id as AnimeId) : "ani-cipher"];
  const gradId = `bg-${char.id}`;
  const hairGradId = `hair-${char.id}`;
  const eyeGradId = `eye-${char.id}`;

  return (
    <svg
      className={`anime-avatar ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-label={char.name}
      style={{ display: "block", borderRadius: "50%", overflow: "hidden" }}
    >
      <defs>
        {/* Background Gradient */}
        <radialGradient id={gradId} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={char.bgTo} stopOpacity="0.85" />
          <stop offset="100%" stopColor={char.bgFrom} />
        </radialGradient>

        {/* Hair Gradient */}
        <linearGradient id={hairGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={char.hairHighlight} />
          <stop offset="40%" stopColor={char.hair} />
          <stop offset="100%" stopColor={char.hairShadow} />
        </linearGradient>

        {/* Eye Gradient */}
        <linearGradient id={eyeGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="60%" stopColor={char.eyes} />
          <stop offset="100%" stopColor={char.eyeHighlight} />
        </linearGradient>

        {/* Ambient Ring */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Backdrop */}
      <circle cx="50" cy="50" r="50" fill={`url(#${gradId})`} />

      {/* Subtle background ambient particle / sparkles */}
      <circle cx="22" cy="22" r="1.5" fill="#ffffff" opacity="0.6" />
      <circle cx="78" cy="26" r="1" fill="#ffffff" opacity="0.5" />
      <circle cx="82" cy="70" r="1.5" fill="#ffffff" opacity="0.4" />
      <circle cx="16" cy="65" r="1.2" fill="#ffffff" opacity="0.4" />

      {/* 2. Accessories - Behind Hair (Horns, Ears, Halo) */}
      {char.accessory === "halo" && (
        <ellipse cx="50" cy="15" rx="22" ry="6" fill="none" stroke={char.accentColor} strokeWidth="2.5" opacity="0.9" filter="url(#glow)" />
      )}

      {char.accessory === "kitsune" && (
        <g>
          {/* Left Fox Ear */}
          <polygon points="25,40 14,14 42,28" fill="#ffffff" />
          <polygon points="25,36 18,18 36,27" fill="#ea580c" />
          <polygon points="23,34 20,22 30,27" fill="#fed7aa" />
          {/* Right Fox Ear */}
          <polygon points="75,40 86,14 58,28" fill="#ffffff" />
          <polygon points="75,36 82,18 64,27" fill="#ea580c" />
          <polygon points="77,34 80,22 70,27" fill="#fed7aa" />
        </g>
      )}

      {char.accessory === "neko" && (
        <g>
          {/* Left Neko Ear */}
          <polygon points="26,38 18,18 42,27" fill="#291408" />
          <polygon points="27,35 22,23 37,28" fill="#f472b6" />
          {/* Right Neko Ear */}
          <polygon points="74,38 82,18 58,27" fill="#291408" />
          <polygon points="73,35 78,23 63,28" fill="#f472b6" />
        </g>
      )}

      {char.accessory === "horns" && (
        <g>
          <path d="M 28 32 Q 18 18 12 10 Q 22 16 34 25 Z" fill="#09090b" stroke="#dc2626" strokeWidth="0.8" />
          <path d="M 72 32 Q 82 18 88 10 Q 78 16 66 25 Z" fill="#09090b" stroke="#dc2626" strokeWidth="0.8" />
        </g>
      )}

      {/* 3. Back Hair / Volume */}
      <path
        d="M 20 45 C 15 65 18 85 24 95 C 32 95 38 88 40 80 C 45 80 55 80 60 80 C 62 88 68 95 76 95 C 82 85 85 65 80 45 C 78 26 22 26 20 45 Z"
        fill={char.hairShadow}
      />

      {/* 4. Torso / Outfit & Collar */}
      <path d="M 24 100 Q 26 78 50 78 Q 74 78 76 100 Z" fill={char.outfit} />
      {/* Collar trim / inner shirt */}
      <path d="M 40 78 L 50 90 L 60 78 L 50 75 Z" fill={char.outfitAccent} />
      <path d="M 44 80 L 50 88 L 56 80 Z" fill={char.skin} />

      {/* Neck */}
      <path d="M 43 62 L 43 78 L 57 78 L 57 62 Z" fill={char.skinShadow} />
      <polygon points="43,68 50,75 57,68 57,78 43,78" fill={char.skinShadow} opacity="0.5" />

      {/* Scarf / Choker Accessories */}
      {char.accessory === "scarf" && (
        <path d="M 32 64 C 40 60 60 60 68 64 C 72 74 65 84 50 84 C 35 84 28 74 32 64 Z" fill="#09090b" stroke="#8b5cf6" strokeWidth="1" />
      )}
      {char.accessory === "neko" && (
        <g>
          <rect x="42" y="73" width="16" height="3" rx="1.5" fill="#e11d48" />
          <circle cx="50" cy="76" r="3" fill="#fbbf24" />
          <circle cx="50" cy="76" r="0.8" fill="#78350f" />
        </g>
      )}

      {/* 5. Head / Face Contour */}
      <path
        d="M 28 42 C 27 58 35 70 50 75 C 65 70 73 58 72 42 C 72 30 28 30 28 42 Z"
        fill={char.skin}
      />

      {/* Anime Cheeks Blush */}
      <ellipse cx="34" cy="56" rx="4.5" ry="2.2" fill="#fb7185" opacity="0.38" />
      <ellipse cx="66" cy="56" rx="4.5" ry="2.2" fill="#fb7185" opacity="0.38" />
      {/* Blush lines */}
      <line x1="32" y1="55" x2="36" y2="57" stroke="#f43f5e" strokeWidth="0.8" opacity="0.6" />
      <line x1="64" y1="55" x2="68" y2="57" stroke="#f43f5e" strokeWidth="0.8" opacity="0.6" />

      {/* Cheek Decals (Cyber, Scar, Band-aid, Kitsune marks) */}
      {char.accessory === "kitsune" && (
        <g fill="#dc2626">
          <path d="M 32 50 Q 26 53 31 56 Q 36 53 32 50 Z" />
          <path d="M 68 50 Q 74 53 69 56 Q 64 53 68 50 Z" />
        </g>
      )}
      {char.accessory === "bandaid" && (
        <g transform="rotate(-15 48 60)">
          <rect x="40" y="58" width="14" height="4.5" rx="1" fill="#fcd34d" />
          <rect x="44.5" y="58.5" width="5" height="3.5" rx="0.5" fill="#fef08a" />
        </g>
      )}
      {char.accessory === "headband" && (
        <line x1="35" y1="52" x2="38" y2="58" stroke="#dc2626" strokeWidth="1" strokeLinecap="round" />
      )}

      {/* Nose & Mouth */}
      {/* Cute Anime Nose: tiny stroke */}
      <circle cx="50" cy="58" r="0.9" fill={char.skinShadow} />
      {/* Anime Mouth: confident micro-smile */}
      <path d="M 47 64 Q 50 66 53 64" fill="none" stroke="#78350f" strokeWidth="1.2" strokeLinecap="round" />

      {/* 6. Anime Eyes */}
      {/* Left Eye */}
      <g>
        {/* Eye White Sclera */}
        <ellipse cx="37" cy="48" rx="7.5" ry="7" fill="#ffffff" />
        {/* Iris */}
        <ellipse cx="37.5" cy="48.5" rx="5.2" ry="6.2" fill={`url(#${eyeGradId})`} />
        {/* Pupil */}
        <ellipse cx="37.5" cy="48" rx="2.5" ry="3.2" fill="#09090b" />
        {/* Specular Catchlights */}
        <circle cx="35.5" cy="45.5" r="2" fill="#ffffff" />
        <circle cx="39.5" cy="51" r="1.1" fill="#ffffff" opacity="0.85" />
        {/* Anime Top Eyelash */}
        <path d="M 28 47 Q 37 41 46 46" fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 30 46 Q 37 42 44 45" fill="none" stroke={char.hairShadow} strokeWidth="1" strokeLinecap="round" />
        {/* Eyelid Crease & Eyebrow */}
        <path d="M 31 43 Q 37 39 43 42" fill="none" stroke="#64748b" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 29 38 Q 36 34 43 38" fill="none" stroke={char.hairShadow} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Right Eye */}
      <g>
        {/* Eye White Sclera */}
        <ellipse cx="63" cy="48" rx="7.5" ry="7" fill="#ffffff" />
        {/* Iris */}
        <ellipse cx="62.5" cy="48.5" rx="5.2" ry="6.2" fill={`url(#${eyeGradId})`} />
        {/* Pupil */}
        <ellipse cx="62.5" cy="48" rx="2.5" ry="3.2" fill="#09090b" />
        {/* Specular Catchlights */}
        <circle cx="60.5" cy="45.5" r="2" fill="#ffffff" />
        <circle cx="64.5" cy="51" r="1.1" fill="#ffffff" opacity="0.85" />
        {/* Anime Top Eyelash */}
        <path d="M 54 46 Q 63 41 72 47" fill="none" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M 56 45 Q 63 42 70 46" fill="none" stroke={char.hairShadow} strokeWidth="1" strokeLinecap="round" />
        {/* Eyelid Crease & Eyebrow */}
        <path d="M 57 42 Q 63 39 69 43" fill="none" stroke="#64748b" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M 57 38 Q 64 34 71 38" fill="none" stroke={char.hairShadow} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 7. Accessories across eyes/face */}
      {char.accessory === "visor" && (
        <g>
          {/* Cyber Visor Glass */}
          <path d="M 24 44 Q 50 41 76 44 L 74 52 Q 50 55 26 52 Z" fill={char.accentColor} opacity="0.75" filter="url(#glow)" />
          <path d="M 24 44 Q 50 41 76 44" stroke="#ffffff" strokeWidth="1" opacity="0.8" />
          <line x1="30" y1="47" x2="42" y2="47" stroke="#ffffff" strokeWidth="0.8" opacity="0.9" />
          <circle cx="70" cy="48" r="1.5" fill="#ffffff" />
        </g>
      )}

      {char.accessory === "pilot" && (
        <g>
          {/* Temple Neural Interface Clips */}
          <rect x="22" y="42" width="6" height="10" rx="2" fill="#ef4444" />
          <rect x="24" y="44" width="2" height="6" fill="#ffffff" />
          <rect x="72" y="42" width="6" height="10" rx="2" fill="#ef4444" />
          <rect x="74" y="44" width="2" height="6" fill="#ffffff" />
        </g>
      )}

      {char.accessory === "headset" && (
        <g>
          {/* Audio Headset band */}
          <path d="M 18 42 C 18 18 82 18 82 42" fill="none" stroke="#0f172a" strokeWidth="3.5" />
          <rect x="16" y="40" width="7" height="15" rx="3" fill="#2dd4bf" stroke="#0f172a" strokeWidth="1.5" />
          <rect x="77" y="40" width="7" height="15" rx="3" fill="#2dd4bf" stroke="#0f172a" strokeWidth="1.5" />
        </g>
      )}

      {char.accessory === "headband" && (
        <g>
          {/* Forehead Shinobi Headband */}
          <path d="M 24 31 Q 50 26 76 31 L 76 39 Q 50 34 24 39 Z" fill="#18181b" />
          <rect x="40" y="30" width="20" height="7" rx="1.5" fill="#d4d4d8" stroke="#71717a" strokeWidth="0.8" />
          <polygon points="49,32 52,34 48,35" fill="#ea580c" />
        </g>
      )}

      {/* 8. Front Anime Hair (Layered Bangs, Spikes & Highlights) */}
      <g>
        {/* Layered Hair Silhouette */}
        <path
          d="M 18 36 C 18 20 32 10 50 10 C 68 10 82 20 82 36 C 82 48 81 60 76 68 C 74 65 72 54 70 48 C 66 38 60 48 54 44 C 50 40 48 34 46 42 C 44 48 38 42 34 48 C 30 54 26 65 24 68 C 19 60 18 48 18 36 Z"
          fill={`url(#${hairGradId})`}
        />

        {/* Center Bang Tufts */}
        <path d="M 50 12 Q 46 28 38 38 Q 46 32 50 12 Z" fill={char.hairHighlight} opacity="0.75" />
        <path d="M 50 12 Q 54 28 62 38 Q 54 32 50 12 Z" fill={char.hairShadow} opacity="0.6" />
        <path d="M 46 22 L 50 40 L 52 24 Z" fill={char.hair} />

        {/* Side Locks framing face */}
        <path d="M 22 36 Q 25 55 30 64 Q 26 50 24 38 Z" fill={char.hairShadow} />
        <path d="M 78 36 Q 75 55 70 64 Q 74 50 76 38 Z" fill={char.hairShadow} />

        {/* Anime Hair Sheen Arc ("Angel Ring") */}
        <path
          d="M 26 26 Q 50 18 74 26"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="4,6,12,6,4"
          opacity="0.65"
        />
      </g>

      {/* 9. Hair Accessories (Ribbons, Star pins, Clips) */}
      {char.id === "ani-sakura" && (
        <g>
          {/* Star Hairpin */}
          <polygon points="30,26 32,31 37,31 33,34 35,39 30,36 25,39 27,34 23,31 28,31" fill="#fde047" />
        </g>
      )}

      {char.id === "ani-yuki" && (
        <g>
          {/* Snowflake crystal clip */}
          <circle cx="28" cy="28" r="3" fill="#ffffff" opacity="0.9" />
          <line x1="28" y1="23" x2="28" y2="33" stroke="#7dd3fc" strokeWidth="1" />
          <line x1="23" y1="28" x2="33" y2="28" stroke="#7dd3fc" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

export function isAnimeId(id: string): id is AnimeId {
  return (ANIME_IDS as readonly string[]).includes(id as AnimeId);
}
