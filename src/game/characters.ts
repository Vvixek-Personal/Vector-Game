export const HERO_CHARACTERS = [
  { id: "hero-spider", name: "Spider-Man", desc: "The friendly neighborhood hero. Classic scarlet mask, web lines and bright white lenses.", kind: "spider", from: "#0b1635", to: "#2563eb", suit: "#e32e3b", accent: "#2563eb", cost: 500 },
  { id: "hero-miles", name: "Miles Morales", desc: "A black-and-red spider suit with electric energy and bold crimson webbing.", kind: "miles", from: "#17112d", to: "#713244", suit: "#171a29", accent: "#fb394f", cost: 700 },
  { id: "hero-gwen", name: "Spider-Gwen", desc: "A white hood, pink lining, dark mask and cool cyan lenses.", kind: "gwen", from: "#271b47", to: "#d65da4", suit: "#f0edf8", accent: "#f46eac", cost: 750 },
  { id: "hero-iron", name: "Iron Man", desc: "Scarlet armor, sculpted gold plating and an icy blue arc reactor.", kind: "iron", from: "#2d1020", to: "#bd7332", suit: "#ad293b", accent: "#f3c56a", cost: 900 },
  { id: "hero-panther", name: "Black Panther", desc: "A midnight mask with silver contours and a pulse of violet energy.", kind: "panther", from: "#121329", to: "#6650a0", suit: "#222338", accent: "#c5b9e7", cost: 850 },
  { id: "hero-bat", name: "Batman", desc: "A sharp-eared dark cowl, steel-gray suit and a warm gold accent.", kind: "bat", from: "#151b2c", to: "#3d5368", suit: "#252e42", accent: "#e6c46d", cost: 800 },
  { id: "hero-deadpool", name: "Deadpool", desc: "Crimson mask, black eye patches and an unmistakable sideways look.", kind: "deadpool", from: "#291524", to: "#9b3949", suit: "#b82e41", accent: "#171a29", cost: 650 },
  { id: "hero-sentinel", name: "Vector Sentinel", desc: "An original arena guardian with a luminous cyan visor and a titanium shell.", kind: "sentinel", from: "#0a2536", to: "#238a91", suit: "#293e59", accent: "#75ecdb", cost: 450 },
] as const;
export type HeroId = typeof HERO_CHARACTERS[number]["id"];
export function heroFor(id: string) { return HERO_CHARACTERS.find(hero => hero.id === id); }
