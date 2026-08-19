/** A single item drop: [probability, itemKey] or just itemKey (guaranteed). */
export interface ParsedDrop {
  key: string;
  probability?: number;
}

/**
 * Parse the raw drop table entry for a monster type.
 * The raw format is [gold_amount, ...entries] where each entry is
 * either a string (guaranteed item key) or [probability, itemKey].
 */
export function parseDropTable(raw: unknown[] | undefined): ParsedDrop[] {
  if (!raw || raw.length <= 1) {
    return [];
  }
  const result: ParsedDrop[] = [];
  for (let i = 1; i < raw.length; i += 1) {
    const entry = raw[i];
    if (typeof entry === "string") {
      result.push({ key: entry });
    } else if (
      Array.isArray(entry) &&
      entry.length >= 2 &&
      typeof entry[0] === "number" &&
      typeof entry[1] === "string"
    ) {
      result.push({ probability: entry[0], key: entry[1] });
    }
  }
  return result;
}
