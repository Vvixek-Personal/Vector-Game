import re

file_path = "src/components/AnimeAvatar.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Update ANIME_IDS
new_anime_ids = '''export const ANIME_IDS = [
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
  "ani-solaria",
  "ani-phantom",
  "ani-kyubi",
  "ani-mecha-zero",
] as const;'''

content = re.sub(r'export const ANIME_IDS = \[[\s\S]*?\] as const;', new_anime_ids, content)

# Add character definitions before the closing brace of ANIME_CHARACTERS
new_chars = '''  "ani-solaria": {
    id: "ani-solaria",
    name: "Solaria",
    tagline: "Solar Priestess",
    bgFrom: "#451a03",
    bgTo: "#f59e0b",
    skin: "#fff7ed",
    skinShadow: "#fed7aa",
    hair: "#f59e0b",
    hairShadow: "#b45309",
    hairHighlight: "#fef08a",
    eyes: "#ea580c",
    eyeHighlight: "#fef08a",
    outfit: "#292524",
    outfitAccent: "#fbbf24",
    accessory: "halo",
    accentColor: "#fbbf24",
  },
  "ani-phantom": {
    id: "ani-phantom",
    name: "Phantom",
    tagline: "Void Spectre",
    bgFrom: "#020617",
    bgTo: "#7c3aed",
    skin: "#f1f5f9",
    skinShadow: "#cbd5e1",
    hair: "#4c1d95",
    hairShadow: "#2e1065",
    hairHighlight: "#c084fc",
    eyes: "#a855f7",
    eyeHighlight: "#f0abfc",
    outfit: "#020617",
    outfitAccent: "#a855f7",
    accessory: "scarf",
    accentColor: "#a855f7",
  },
  "ani-kyubi": {
    id: "ani-kyubi",
    name: "Kyubi",
    tagline: "Nine-Tailed Sovereign",
    bgFrom: "#450a0a",
    bgTo: "#dc2626",
    skin: "#fff1f2",
    skinShadow: "#fecdd3",
    hair: "#e11d48",
    hairShadow: "#881337",
    hairHighlight: "#fda4af",
    eyes: "#fbbf24",
    eyeHighlight: "#fef08a",
    outfit: "#1c1917",
    outfitAccent: "#e11d48",
    accessory: "kitsune",
    accentColor: "#dc2626",
  },
  "ani-mecha-zero": {
    id: "ani-mecha-zero",
    name: "Mecha Zero",
    tagline: "Cyber Sentinel",
    bgFrom: "#082f49",
    bgTo: "#06b6d4",
    skin: "#f0f9ff",
    skinShadow: "#bae6fd",
    hair: "#0284c7",
    hairShadow: "#0369a1",
    hairHighlight: "#7dd3fc",
    eyes: "#06b6d4",
    eyeHighlight: "#a5f3fc",
    outfit: "#0f172a",
    outfitAccent: "#22d3ee",
    accessory: "visor",
    accentColor: "#22d3ee",
  },
};'''

content = re.sub(r'};\n\nexport default function AnimeAvatar', new_chars + '\n\nexport default function AnimeAvatar', content)

with open(file_path, "w") as f:
    f.write(content)

print("Updated AnimeAvatar.tsx")
