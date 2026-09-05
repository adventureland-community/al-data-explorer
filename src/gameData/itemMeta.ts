import { GItem } from "typed-adventureland";

export type ItemBadge = {
  key: string;
  label: string;
  color?: "primary" | "secondary" | "success" | "warning" | "info" | "error" | "default";
};

export type ItemFact = {
  key: string;
  label: string;
  value: string;
  /** Optional deep-link (e.g. World Viewer hash). */
  href?: string;
};

type ItemExtras = {
  event?: boolean;
  exclusive?: boolean;
  special?: boolean;
  quest?: string | boolean;
  legacy?: unknown;
  protection?: boolean;
  e?: number | boolean;
  days?: number;
  cash?: number;
  note?: string;
  nopo?: string;
  opens?: string;
  unlocks?: string;
  spawn?: string;
  monster?: string;
  action?: string;
  gain?: string;
  offering?: number;
  multiplier?: number;
  charge?: number;
  cooldown?: number;
  duration?: number;
  gold_reward?: number;
  s?: number;
  credit?: string;
  debuff?: boolean;
  eat?: boolean;
  throw?: boolean;
  rare?: boolean;
  aura?: string;
  set?: string;
  class?: string[];
  grades?: number[];
  upgrade?: unknown;
  compound?: unknown;
  type?: string;
  wtype?: string;
  tier?: number;
};

function asExtras(gItem: GItem): ItemExtras {
  return gItem as GItem & ItemExtras;
}

function titleCase(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDurationHours(hours: number): string {
  if (hours >= 24 && hours % 24 === 0) {
    const days = hours / 24;
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}

function formatMs(ms: number): string {
  if (ms >= 1000 && ms % 1000 === 0) return `${ms / 1000}s`;
  return `${ms}ms`;
}

/** Known class / map-only bonus keys on items (mirrors render_item). */
const CLASS_BONUS_KEYS = [
  "mage",
  "merchant",
  "paladin",
  "priest",
  "ranger",
  "rogue",
  "warrior",
] as const;

/**
 * Catalog chips: rarity / acquisition / progression flags players care about.
 * Grade / set / class / craftable are passed in so the caller owns display order.
 */
export function getItemBadges(
  gItem: GItem,
  options: {
    gradeName?: string | null;
    setName?: string | null;
    craftable?: boolean;
    dismantleable?: boolean;
  } = {},
): ItemBadge[] {
  const item = asExtras(gItem);
  const badges: ItemBadge[] = [];

  if (options.gradeName) {
    badges.push({ key: "grade", label: options.gradeName, color: "primary" });
  }
  if (options.setName) {
    badges.push({ key: "set", label: options.setName });
  }
  if (item.class?.length) {
    for (const c of item.class) {
      badges.push({ key: `class-${c}`, label: titleCase(c) });
    }
  }
  if (options.craftable) {
    badges.push({ key: "craft", label: "Craftable", color: "success" });
  }
  if (options.dismantleable) {
    badges.push({ key: "dismantle", label: "Dismantleable", color: "info" });
  }
  if (item.e) {
    badges.push({ key: "exchange", label: "Exchangeable", color: "secondary" });
  }
  if (gItem.upgrade) {
    badges.push({ key: "upgrade", label: "Upgradeable" });
  } else if (gItem.compound) {
    badges.push({ key: "compound", label: "Compoundable" });
  }
  if (item.event) {
    badges.push({ key: "event", label: "Event", color: "warning" });
  }
  if (item.exclusive) {
    badges.push({ key: "exclusive", label: "Exclusive", color: "warning" });
  }
  if (item.special) {
    badges.push({ key: "special", label: "Special" });
  }
  if (item.quest) {
    const questLabel = typeof item.quest === "string" ? `Quest: ${item.quest}` : "Quest";
    badges.push({ key: "quest", label: questLabel, color: "info" });
  }
  if (item.legacy) {
    badges.push({ key: "legacy", label: "Legacy" });
  }
  if (item.protection) {
    badges.push({ key: "protection", label: "Protected" });
  }
  if (item.rare) {
    badges.push({ key: "rare", label: "Rare" });
  }
  if (item.debuff) {
    badges.push({ key: "debuff", label: "Debuff", color: "error" });
  }
  if (item.eat) {
    badges.push({ key: "eat", label: "Edible" });
  }
  if (item.throw) {
    badges.push({ key: "throw", label: "Throwable" });
  }

  return badges;
}

export type ItemMetaLookups = {
  maps?: Record<string, { name?: string; ignore?: boolean } | undefined>;
  monsters?: Record<string, { name?: string } | undefined>;
  conditions?: Record<string, { name?: string } | undefined>;
};

/** Single cast site for G.maps / monsters / conditions → meta lookups. */
export function metaLookupsFromG(G: {
  maps?: unknown;
  monsters?: unknown;
  conditions?: unknown;
}): ItemMetaLookups {
  return {
    maps: G.maps as ItemMetaLookups["maps"],
    monsters: G.monsters as ItemMetaLookups["monsters"],
    conditions: G.conditions as ItemMetaLookups["conditions"],
  };
}

/**
 * Non-combat catalog facts for the detail header (type/tier plus duration,
 * keys, stacks, offerings, map/class-only bonuses, etc.).
 */
export function getItemFacts(gItem: GItem, lookups?: ItemMetaLookups): ItemFact[] {
  const item = asExtras(gItem);
  const facts: ItemFact[] = [];

  if (gItem.tier != null) {
    facts.push({ key: "tier", label: "Tier", value: String(gItem.tier) });
  }

  if (item.duration != null && Number.isFinite(item.duration)) {
    facts.push({
      key: "duration",
      label: "Duration",
      value: formatDurationHours(item.duration),
    });
  }
  if (item.days != null && Number.isFinite(item.days)) {
    facts.push({
      key: "days",
      label: "Expires",
      value: item.days === 1 ? "1 day" : `${item.days} days`,
    });
  }
  if (item.cooldown != null && Number.isFinite(item.cooldown)) {
    facts.push({ key: "cooldown", label: "Cooldown", value: formatMs(item.cooldown) });
  }
  if (item.charge != null && Number.isFinite(item.charge)) {
    facts.push({ key: "charge", label: "Max charge", value: String(item.charge) });
  }
  if (item.s != null && Number.isFinite(item.s) && item.s > 1) {
    facts.push({ key: "stack", label: "Stack", value: String(item.s) });
  }
  if (item.multiplier != null && item.multiplier !== 1) {
    facts.push({ key: "multiplier", label: "Multiplier", value: String(item.multiplier) });
  }
  if (item.offering != null && Number.isFinite(item.offering)) {
    facts.push({ key: "offering", label: "Offering", value: String(item.offering) });
  }
  if (item.gold_reward != null && Number.isFinite(item.gold_reward)) {
    facts.push({
      key: "gold_reward",
      label: "Victor gold",
      value: item.gold_reward.toLocaleString(),
    });
  }
  if (item.cash != null && Number.isFinite(item.cash)) {
    facts.push({
      key: "cash",
      label: "Shells",
      value: `${item.cash.toLocaleString()} shells`,
    });
  }
  if (item.action) {
    facts.push({ key: "action", label: "Action", value: item.action });
  }
  if (item.gain) {
    facts.push({ key: "gain", label: "Boosts", value: titleCase(item.gain) });
  }
  if (item.credit) {
    facts.push({ key: "credit", label: "Credit", value: item.credit });
  }
  if (item.monster) {
    const name = lookups?.monsters?.[item.monster]?.name ?? item.monster;
    facts.push({ key: "monster", label: "Monster", value: name });
  }
  if (item.spawn) {
    const name = lookups?.monsters?.[item.spawn]?.name ?? item.spawn;
    facts.push({ key: "spawn", label: "Spawns", value: name });
  }
  if (item.opens) {
    const mapName = lookups?.maps?.[item.opens]?.name ?? item.opens;
    const mapExists = Boolean(lookups?.maps?.[item.opens]);
    facts.push({
      key: "opens",
      label: "Opens",
      value: mapName,
      href: mapExists ? `/world#map=${encodeURIComponent(item.opens)}&mode=map` : undefined,
    });
  }
  if (item.unlocks) {
    const mapName = lookups?.maps?.[item.unlocks]?.name ?? item.unlocks;
    const mapExists = Boolean(lookups?.maps?.[item.unlocks]);
    facts.push({
      key: "unlocks",
      label: "Unlocks",
      value: mapName,
      href: mapExists ? `/world#map=${encodeURIComponent(item.unlocks)}&mode=map` : undefined,
    });
  }

  for (const classKey of CLASS_BONUS_KEYS) {
    const bonus = (gItem as unknown as Record<string, unknown>)[classKey];
    if (!bonus || typeof bonus !== "object") continue;
    const parts = Object.entries(bonus as Record<string, unknown>)
      .filter(([k]) => k !== "upgrade" && k !== "compound")
      .map(([k, v]) => `${k} ${String(v)}`);
    if (parts.length === 0) continue;
    facts.push({
      key: `class-bonus-${classKey}`,
      label: `${titleCase(classKey)} only`,
      value: parts.join(", "),
    });
  }

  // Map-only bonuses (e.g. winterland) — any key that looks like a map in lookups.
  if (lookups?.maps) {
    for (const [mapKey, mapDef] of Object.entries(lookups.maps)) {
      if (!mapDef || mapDef.ignore) continue;
      const bonus = (gItem as unknown as Record<string, unknown>)[mapKey];
      if (!bonus || typeof bonus !== "object") continue;
      const parts = Object.entries(bonus as Record<string, unknown>)
        .filter(([k]) => k !== "upgrade" && k !== "compound")
        .map(([k, v]) => `${k} ${String(v)}`);
      if (parts.length === 0) continue;
      facts.push({
        key: `map-bonus-${mapKey}`,
        label: `${mapDef.name ?? mapKey} only`,
        value: parts.join(", "),
        href: `/world#map=${encodeURIComponent(mapKey)}&mode=map`,
      });
    }
  }

  return facts;
}

/** Short note / flavor text that is not `explanation`. */
export function getItemNotes(gItem: GItem): string[] {
  const item = asExtras(gItem);
  const notes: string[] = [];
  if (typeof item.note === "string" && item.note.trim()) notes.push(item.note.trim());
  if (typeof item.nopo === "string" && item.nopo.trim()) notes.push(item.nopo.trim());
  return notes;
}

export function getItemClassList(gItem: GItem): string[] {
  return asExtras(gItem).class ?? [];
}

/** Compact ability key for browse rows (no lookups). */
export function getItemAbilityKey(gItem: GItem): string | undefined {
  const { ability } = gItem as { ability?: string };
  return ability;
}

export function itemMatchesClasses(gItem: GItem, classes: string[]): boolean {
  if (classes.length === 0) return true;
  const restricted = getItemClassList(gItem);
  // Unrestricted gear is usable by every class.
  if (restricted.length === 0) return true;
  return classes.some((c) => restricted.includes(c));
}

export function getItemClasses(items: Record<string, GItem>): string[] {
  const classes = new Set<string>();
  for (const gItem of Object.values(items)) {
    for (const c of getItemClassList(gItem)) {
      classes.add(c);
    }
  }
  return Array.from(classes).sort();
}
