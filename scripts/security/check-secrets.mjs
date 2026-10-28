import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Lightweight local pre-review check. It never prints matched credential values.
const tracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const patterns = [
  { name: "private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "GitHub access token", re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b/ },
  { name: "OpenAI-style secret key", re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}\b/ },
  { name: "Slack token", re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "Google API key candidate", re: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: "Gemini key assignment", re: /\bGEMINI_API_KEY\s*[:=]\s*[\x22\x27]?[^\s\x22\x27#]{12,}/i },
];
const ignoredExample = new Set([".env.example", "functions/.env.example"]);
const findings = [];
for (const path of tracked) {
  if (ignoredExample.has(path)) continue;
  let content;
  try { content = readFileSync(resolve(path), "utf8"); } catch { continue; }
  if (content.includes("\u0000")) continue;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of patterns) {
      if (pattern.re.test(lines[i])) findings.push({ path, line: i + 1, type: pattern.name });
    }
  }
}
if (findings.length) {
  console.error("Potential secret/configuration candidates found (values intentionally hidden):");
  for (const item of findings) console.error(`${item.path}:${item.line} — ${item.type}`);
  console.error("Review each finding manually; public Firebase web keys are not server secrets but should be restricted.");
  process.exitCode = 1;
} else {
  console.log(`Secret scan passed: inspected ${tracked.length} tracked files; no configured patterns matched.`);
}
