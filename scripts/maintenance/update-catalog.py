import re

file_path = "src/game/catalog.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add new anime avatar items to STORE_ITEMS
new_anime_items = '''  { id: "ani-solaria", tab: "avatars", name: "Solaria", desc: "Solar priestess with incandescent halo and amber flame eyes.", ...S(1550), anime: "ani-solaria", apply: { avatarId: "ani-solaria" }, rarity: "epic", isNew: true },
  { id: "ani-phantom", tab: "avatars", name: "Phantom", desc: "Void spectre with violet ethereal hair and glowing aura.", ...S(1750), anime: "ani-phantom", apply: { avatarId: "ani-phantom" }, rarity: "epic", isNew: true },
  { id: "ani-kyubi", tab: "avatars", name: "Kyubi", desc: "Nine-tailed fox sovereign with crimson sacred ears & golden iris.", ...D(45), anime: "ani-kyubi", apply: { avatarId: "ani-kyubi" }, rarity: "ultra", isNew: true },
  { id: "ani-mecha-zero", tab: "avatars", name: "Mecha Zero", desc: "Next-gen cyber sentinel with animated laser visor.", ...D(60), anime: "ani-mecha-zero", apply: { avatarId: "ani-mecha-zero" }, rarity: "ultra", isNew: true },'''

content = content.replace('{ id: "ani-nova", tab: "avatars", name: "Nova", desc: "Solar alchemist with radiant golden hair and star prism earrings.", ...S(1450), anime: "ani-nova", apply: { avatarId: "ani-nova" }, rarity: "epic", isNew: true },', '{ id: "ani-nova", tab: "avatars", name: "Nova", desc: "Solar alchemist with radiant golden hair and star prism earrings.", ...S(1450), anime: "ani-nova", apply: { avatarId: "ani-nova" }, rarity: "epic", isNew: true },\n' + new_anime_items)

# Add new cartoon avatar items
new_cartoon_items = '''  { id: "cto-cosmo", tab: "avatars", name: "Cosmo", desc: "Deep space explorer with purple hair and stardust blush.", ...S(2500), cartoon: "cto-cosmo", apply: { avatarId: "cto-cosmo" }, rarity: "epic", isNew: true },
  { id: "cto-sprout", tab: "avatars", name: "Sprout", desc: "Nature guardian with fresh leaf green hair and cheerful smile.", ...S(2600), cartoon: "cto-sprout", apply: { avatarId: "cto-sprout" }, rarity: "epic", isNew: true },
  { id: "cto-glitch", tab: "avatars", name: "Glitch", desc: "Digital anomaly with cyan square frames and pixel energy.", ...D(25), cartoon: "cto-glitch", apply: { avatarId: "cto-glitch" }, rarity: "ultra", isNew: true },'''

content = content.replace('{ id: "cto-blaze", tab: "avatars", name: "Blaze", desc: "High-velocity pilot with fiery locks, goggles and flight jacket.", ...S(2400), cartoon: "cto-blaze", apply: { avatarId: "cto-blaze" }, rarity: "epic", isNew: true },', '{ id: "cto-blaze", tab: "avatars", name: "Blaze", desc: "High-velocity pilot with fiery locks, goggles and flight jacket.", ...S(2400), cartoon: "cto-blaze", apply: { avatarId: "cto-blaze" }, rarity: "epic", isNew: true },\n' + new_cartoon_items)

# Add new Banners
new_banners = '''  { id: "ban-prism-nebula", tab: "banners", name: "Prism Nebula", desc: "Vibrant cosmic shockwave blending laser magenta, violet & cyan.", preview: "linear-gradient(120deg,#1e1b4b,#a855f7 45%,#06b6d4)", apply: { bannerId: "prism-nebula" }, ...S(480), rarity: "epic", isNew: true },
  { id: "ban-cyber-grid", tab: "banners", name: "Cyber Horizon", desc: "Retro synthwave grid sunset wash.", preview: "linear-gradient(120deg,#09090b,#f43f5e 50%,#fbbf24)", apply: { bannerId: "cyber-horizon" }, ...S(380), rarity: "rare", isNew: true },'''

content = content.replace('{ id: "ban-aurora-borealis", tab: "banners", name: "Hyper Aurora", desc: "Prismatic northern light ribbons with drifting cosmic stardust.", preview: "linear-gradient(120deg,#064e3b,#10b981 40%,#6366f1 80%,#ec4899)", apply: { bannerId: "hyper-aurora" }, ...S(420), rarity: "epic", isNew: true },', '{ id: "ban-aurora-borealis", tab: "banners", name: "Hyper Aurora", desc: "Prismatic northern light ribbons with drifting cosmic stardust.", preview: "linear-gradient(120deg,#064e3b,#10b981 40%,#6366f1 80%,#ec4899)", apply: { bannerId: "hyper-aurora" }, ...S(420), rarity: "epic", isNew: true },\n' + new_banners)

# Add new Frames
new_frames = '''  { id: "frm-phoenix", tab: "frames", name: "Phoenix Wings", desc: "Fiery incandescent aura with solar flare winglets.", frameCss: "0 0 0 3px #ea580c, 0 0 0 6px #f59e0b, 0 0 24px 6px #ea580caa", apply: { frameId: "phoenix" }, ...S(580), rarity: "epic", isNew: true },
  { id: "frm-quantum", tab: "frames", name: "Quantum Matrix", desc: "Dual cyan and magenta shifting energy ring.", frameCss: "0 0 0 3px #06b6d4, 0 0 0 6px #d946ef, 0 0 20px 4px #06b6d4aa", apply: { frameId: "quantum" }, ...D(35), rarity: "ultra", isNew: true },'''

content = content.replace('{ id: "frm-celestial", tab: "frames", name: "Celestial Corona", desc: "Radiant multi-layered astral ring with orbiting cyan light particles.", frameCss: "0 0 0 3px #38bdf8, 0 0 0 6px #818cf8, 0 0 28px 6px #38bdf8aa", apply: { frameId: "celestial" }, ...S(520), rarity: "epic", isNew: true },', '{ id: "frm-celestial", tab: "frames", name: "Celestial Corona", desc: "Radiant multi-layered astral ring with orbiting cyan light particles.", frameCss: "0 0 0 3px #38bdf8, 0 0 0 6px #818cf8, 0 0 28px 6px #38bdf8aa", apply: { frameId: "celestial" }, ...S(520), rarity: "epic", isNew: true },\n' + new_frames)

# Add new Themes
new_themes = '''  { id: "thm-overdrive", tab: "themes", name: "Overdrive", desc: "Electric orange and plasma cyan high-octane stadium.", preview: "#f97316", themeSwatch: ["#f97316", "#0c0a09", "#06b6d4"], ...S(450), rarity: "epic", isNew: true },
  { id: "thm-starlight", tab: "themes", name: "Starlight Void", desc: "Deep velvet space with shimmering silver and pastel rose.", preview: "#c084fc", themeSwatch: ["#c084fc", "#090514", "#f472b6"], ...S(420), rarity: "rare", isNew: true },'''

content = content.replace('{ id: "thm-matrix", tab: "themes", name: "Neon Matrix", desc: "Hyper-contrast digital rain emerald with obsidian core.", preview: "#10b981", themeSwatch: ["#10b981", "#020d08", "#059669"], ...S(380), rarity: "rare", isNew: true },', '{ id: "thm-matrix", tab: "themes", name: "Neon Matrix", desc: "Hyper-contrast digital rain emerald with obsidian core.", preview: "#10b981", themeSwatch: ["#10b981", "#020d08", "#059669"], ...S(380), rarity: "rare", isNew: true },\n' + new_themes)

# Add new Titles
new_titles = '''  { id: "ttl-supersonic", tab: "titles", name: "Supersonic", desc: "Breaking sound barrier reaction precision.", apply: { titleId: "supersonic" }, ...S(700), rarity: "rare", isNew: true },
  { id: "ttl-apex", tab: "titles", name: "Apex Predator", desc: "Dominates leaderboard streams.", apply: { titleId: "apex" }, ...D(25), rarity: "ultra", isNew: true },'''

content = content.replace('{ id: "ttl-godspeed", tab: "titles", name: "Godspeed", desc: "For arrow masters who read patterns at instantaneous reflex.", apply: { titleId: "godspeed" }, ...S(650), rarity: "rare", isNew: true },', '{ id: "ttl-godspeed", tab: "titles", name: "Godspeed", desc: "For arrow masters who read patterns at instantaneous reflex.", apply: { titleId: "godspeed" }, ...S(650), rarity: "rare", isNew: true },\n' + new_titles)

# Add new Audio Pack
new_audio = '''  { id: "aud-lofi", tab: "audio", name: "Lo-Fi Beats", desc: "Chill vinyl pops, warm bass sweeps, and soft rhodes chords.", apply: { audioPackId: "lofi" }, ...S(2800), rarity: "epic", isNew: true },'''

content = content.replace('{ id: "aud-retro", tab: "audio", name: "8-Bit Arcade", desc: "Classic chiptune sound effects and retro synthesizer hits.", apply: { audioPackId: "retro" }, ...S(2000), rarity: "rare" },', '{ id: "aud-retro", tab: "audio", name: "8-Bit Arcade", desc: "Classic chiptune sound effects and retro synthesizer hits.", apply: { audioPackId: "retro" }, ...S(2000), rarity: "rare" },\n' + new_audio)

with open(file_path, "w") as f:
    f.write(content)

print("Updated catalog.tsx")
