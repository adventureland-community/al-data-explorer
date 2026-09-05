import { GItem } from "typed-adventureland";

import { buildLevelStats } from "./compareStats";
import { STAT_DISPLAY_LABELS } from "./statLabels";

export type ItemEffectView = {
  key: string;
  title: string;
  /** Short line for matrix / badges. */
  summary: string;
  /** Longer explanation when available from skills/conditions. */
  detail?: string;
  /** Role label shown above the title (Ability / Aura / Use). */
  kindLabel?: string;
  /** Sprite-sheet skin for skill/condition icon. */
  skin?: string;
  /** Fallback item sprite when no skill/condition skin exists. */
  itemIcon?: string;
  /** Deep-link when the ability is a known skill. */
  href?: string;
};

export type EffectLookups = {
  skills?: Record<string, { name?: string; explanation?: string; skin?: string } | undefined>;
  conditions?: Record<
    string,
    { name?: string; explanation?: string; duration?: number; skin?: string } | undefined
  >;
};

/** Single cast site for G.skills / G.conditions → effect lookups. */
export function effectLookupsFromG(G: { skills?: unknown; conditions?: unknown }): EffectLookups {
  return {
    skills: G.skills as EffectLookups["skills"],
    conditions: G.conditions as EffectLookups["conditions"],
  };
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

const CHANCE_ABILITIES = new Set([
  "burn",
  "freeze",
  "poison",
  "bash",
  "sugarrush",
  "secondchance",
  "charm",
]);

/** Ability keys that map to condition skins when G.skills has no entry. */
const ABILITY_CONDITION_SKIN: Record<string, string> = {
  burn: "burned",
  freeze: "deepfreezed",
  poison: "poisoned",
  sugarrush: "sugarrush",
};

function resolveAbilitySkin(ability: string, lookups?: EffectLookups): string | undefined {
  return (
    lookups?.skills?.[ability]?.skin ||
    lookups?.conditions?.[ability]?.skin ||
    ABILITY_CONDITION_SKIN[ability]
  );
}

function titleCaseKey(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function abilityTitle(ability: string, lookups?: EffectLookups): string {
  const skillName = lookups?.skills?.[ability]?.name;
  if (skillName) return skillName;
  const conditionName = lookups?.conditions?.[ability]?.name;
  if (conditionName) return conditionName;
  return titleCaseKey(ability);
}

function abilityDetail(ability: string, lookups?: EffectLookups): string | undefined {
  const skill = lookups?.skills?.[ability]?.explanation?.trim();
  if (skill) return skill;
  const condition = lookups?.conditions?.[ability]?.explanation?.trim();
  if (condition) return condition;
  return undefined;
}

function abilitySummary(
  ability: string,
  attr0: number | undefined,
  attr1: number | undefined,
): string {
  const a0 = attr0 != null ? formatNumber(attr0) : null;
  const a1 = attr1 != null ? formatNumber(attr1) : null;

  switch (ability) {
    case "burn":
      return a0 != null ? `${a0}% chance to burn on hit` : "Chance to burn on hit";
    case "freeze":
      return a0 != null ? `${a0}% chance to freeze on hit` : "Chance to freeze on hit";
    case "poison":
      return a0 != null ? `${a0}% chance to poison on hit` : "Chance to poison on hit";
    case "bash":
      return a0 != null ? `${a0}% chance to stun on hit` : "Chance to stun on hit";
    case "sugarrush":
      return a0 != null ? `${a0}% chance to trigger Sugar Rush` : "Chance to trigger Sugar Rush";
    case "secondchance":
      return a0 != null ? `${a0}% chance to survive a killing blow` : "Chance to survive death";
    case "charm":
      return a0 != null ? `${a0}% chance to charm a monster` : "Chance to charm a monster";
    case "splash":
      return "Hits nearby targets";
    case "heal":
      return "Restores HP";
    case "restore_mp":
      return a0 != null ? `Restores ${a0} MP` : "Restores MP";
    case "weave":
      return (
        [a0 != null ? `attr0 ${a0}` : null, a1 != null ? `attr1 ${a1}` : null]
          .filter(Boolean)
          .join(" · ") || "Weave"
      );
    case "warp":
      return "Warps space-time";
    case "power":
    case "xpower":
      return "Unleashes a power surge";
    case "poke":
      return "Pokey pokey";
    case "tangle":
      return "Hinders an opponent with nature";
    case "zapperzap":
      return "Zaps the target";
    case "temporalsurge":
      return "Hastens nearby spawns";
    case "scare":
      return "Scares away targeting monsters";
    case "shelter":
      return "Raises a sheltering flame";
    case "fanofknives":
      return "Sends knives at nearby foes";
    default:
      if (a0 != null && CHANCE_ABILITIES.has(ability)) return `${a0}%`;
      if (a0 != null && a1 != null) return `${a0} / ${a1}`;
      if (a0 != null) return a0;
      return titleCaseKey(ability);
  }
}

function formatGivesEntry(entry: unknown): string | null {
  if (!Array.isArray(entry) || entry.length < 2) return null;
  const [stat, amount] = entry;
  if (typeof stat !== "string" || typeof amount !== "number" || !Number.isFinite(amount)) {
    return null;
  }
  const label = STAT_DISPLAY_LABELS[stat] ?? titleCaseKey(stat);
  return `Restores ${formatNumber(amount)} ${label}`;
}

/**
 * Resolve player-facing ability / consumable effects for detail + matrix.
 * Prefer G.skills / G.conditions names and explanations when provided.
 */
export function getItemEffects(
  gItem: GItem,
  level = 0,
  lookups?: EffectLookups,
  itemKey?: string,
): ItemEffectView[] {
  const effects: ItemEffectView[] = [];
  const stats = buildLevelStats(gItem, level);
  const { ability } = gItem as { ability?: string };
  const attr0 = (stats.attr0 as number | undefined) ?? (gItem as { attr0?: number }).attr0;
  const { attr1 } = gItem as { attr1?: number };
  const fallbackItemIcon = itemKey;

  if (ability) {
    const title = abilityTitle(ability, lookups);
    const summary = abilitySummary(ability, attr0, attr1);
    const skin = resolveAbilitySkin(ability, lookups);
    effects.push({
      key: `ability-${ability}`,
      kindLabel: "Ability",
      title,
      summary,
      detail: abilityDetail(ability, lookups),
      skin,
      itemIcon: skin ? undefined : fallbackItemIcon,
      href: lookups?.skills?.[ability] ? `/skills/${ability}` : undefined,
    });
  }

  const { gives } = gItem as { gives?: unknown };
  if (Array.isArray(gives)) {
    for (let i = 0; i < gives.length; i += 1) {
      const line = formatGivesEntry(gives[i]);
      if (!line) continue;
      effects.push({
        key: `gives-${i}`,
        kindLabel: "Use",
        title: "Use",
        summary: line,
        itemIcon: fallbackItemIcon,
      });
    }
  }

  const { aura } = gItem as { aura?: string };
  if (aura) {
    const title = lookups?.conditions?.[aura]?.name ?? titleCaseKey(aura);
    const skin = lookups?.conditions?.[aura]?.skin;
    effects.push({
      key: `aura-${aura}`,
      kindLabel: "Aura",
      title,
      summary: attr0 != null ? `${formatNumber(attr0)}%` : title,
      detail: lookups?.conditions?.[aura]?.explanation?.trim(),
      skin,
      itemIcon: skin ? undefined : fallbackItemIcon,
    });
  }

  if ((gItem as { debuff?: boolean }).debuff) {
    effects.push({
      key: "debuff",
      kindLabel: "Effect",
      title: "Debuff",
      summary: "Applies a debuff",
    });
  }

  const { withdrawal } = gItem as { withdrawal?: string };
  if (withdrawal) {
    const title = lookups?.conditions?.[withdrawal]?.name ?? titleCaseKey(withdrawal);
    const skin = lookups?.conditions?.[withdrawal]?.skin;
    effects.push({
      key: `withdrawal-${withdrawal}`,
      kindLabel: "Withdrawal",
      title,
      summary: title,
      detail: lookups?.conditions?.[withdrawal]?.explanation?.trim(),
      skin,
    });
  }

  return effects;
}

/** Back-compat one-liner used by older callers / tests. */
export function abilityBlurb(
  ability: string | undefined,
  attr0: number | undefined,
  attr1?: number,
  lookups?: EffectLookups,
): string | null {
  if (!ability) return null;
  const title = abilityTitle(ability, lookups);
  const summary = abilitySummary(ability, attr0, attr1);
  return `${title}: ${summary}`;
}
