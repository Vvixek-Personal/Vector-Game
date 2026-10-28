import re

file_path = "src/components/CartoonAvatar.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Update CARTOON_IDS
new_cartoon_ids = '''export const CARTOON_IDS = [
  "cto-bean", "cto-pip", "cto-moss", "cto-nori", "cto-blush", "cto-kiwi",
  "cto-soda", "cto-pixel", "cto-blob", "cto-fox", "cto-bun", "cto-ember",
  "cto-royal", "cto-luna", "cto-bolt", "cto-sage", "cto-blaze",
  "cto-cosmo", "cto-sprout", "cto-glitch",
] as const;'''

content = re.sub(r'export const CARTOON_IDS = \[[\s\S]*?\] as const;', new_cartoon_ids, content)

# Update FACE object
new_faces = '''  "cto-sage": { skin: "#d7a57a", hair: "#365314", shirt: "#3f6212", accent: "#bef264", shape: "oval" },
  "cto-blaze": { skin: "#fed7aa", hair: "#ea580c", shirt: "#c2410c", accent: "#fbbf24", shape: "oval" },
  "cto-cosmo": { skin: "#f3e8ff", hair: "#6b21a8", shirt: "#9333ea", accent: "#e9d5ff", shape: "round" },
  "cto-sprout": { skin: "#dcfce7", hair: "#15803d", shirt: "#16a34a", accent: "#86efac", shape: "oval" },
  "cto-glitch": { skin: "#cff4fc", hair: "#0891b2", shirt: "#0284c7", accent: "#a5f3fc", shape: "sq" },
};'''

content = re.sub(r'  "cto-sage":[\s\S]*?};', new_faces, content)

with open(file_path, "w") as f:
    f.write(content)

print("Updated CartoonAvatar.tsx")
