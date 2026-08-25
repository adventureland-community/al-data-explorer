/**
 * Summarize differences between two Adventure Land data.json snapshots for PR bodies.
 * Ignores version/timestamp for "has content change" checks elsewhere.
 */
import { readFileSync } from "fs";

type Dict = Record<string, unknown>;

const SKIP_KEYS = new Set(["version", "timestamp"]);

function keySet(obj: unknown): Set<string> {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return new Set();
  return new Set(Object.keys(obj as Dict));
}

function summarizeKeyedSection(name: string, before: unknown, after: unknown, cap = 30): string[] {
  const a = keySet(before);
  const b = keySet(after);
  const added = [...b].filter((k) => !a.has(k)).sort();
  const removed = [...a].filter((k) => !b.has(k)).sort();
  const lines: string[] = [];
  if (added.length === 0 && removed.length === 0) return lines;
  lines.push(`### ${name}`);
  lines.push(`- keys: +${added.length} −${removed.length} (was ${a.size}, now ${b.size})`);
  if (added.length > 0) {
    const shown = added.slice(0, cap);
    lines.push(
      `- added: ${shown.join(", ")}${added.length > cap ? ` …(+${added.length - cap})` : ""}`,
    );
  }
  if (removed.length > 0) {
    const shown = removed.slice(0, cap);
    lines.push(
      `- removed: ${shown.join(", ")}${removed.length > cap ? ` …(+${removed.length - cap})` : ""}`,
    );
  }
  return lines;
}

export function dataHasContentChange(before: Dict, after: Dict): boolean {
  const strip = (d: Dict) => {
    const next = { ...d };
    for (const k of SKIP_KEYS) delete next[k];
    return next;
  };
  return JSON.stringify(strip(before)) !== JSON.stringify(strip(after));
}

export function summarizeDataDiff(before: Dict, after: Dict): string {
  const lines: string[] = [];
  lines.push(`## Game data update`);
  lines.push("");
  lines.push(`- version: \`${before.version}\` → \`${after.version}\``);
  if (before.timestamp || after.timestamp) {
    lines.push(
      `- timestamp: \`${String(before.timestamp ?? "")}\` → \`${String(after.timestamp ?? "")}\``,
    );
  }
  lines.push("");

  const sections = ["items", "monsters", "maps", "npcs", "classes", "skills", "conditions", "sets"];
  for (const section of sections) {
    lines.push(...summarizeKeyedSection(section, before[section], after[section]));
  }

  lines.push("");
  lines.push("See the Files tab for the full `public/data.json` diff.");
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

function main() {
  const beforePath = process.argv[2];
  const afterPath = process.argv[3];
  if (!beforePath || !afterPath) {
    console.error("Usage: ts-node scripts/summarize-data-diff.ts <before.json> <after.json>");
    process.exit(1);
  }
  const before = JSON.parse(readFileSync(beforePath, "utf8")) as Dict;
  const after = JSON.parse(readFileSync(afterPath, "utf8")) as Dict;
  process.stdout.write(summarizeDataDiff(before, after));
  process.stdout.write("\n");
}

if (require.main === module) {
  main();
}
