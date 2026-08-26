import type { GData, GItem, ItemInfo, StatType } from "typed-adventureland";

import { resolveItemInstanceStats } from "./itemProperties";
import { getItemGrade, gradeLabel } from "./playerItemDisplay";
import { formatItemStatValue } from "./prettyNumbers";

export type ItemTooltipLine =
  | { kind: "text"; text: string; color?: string }
  | { kind: "stat"; label: string; value: string; labelColor?: string; valueColor?: string };

const GRADE_COLORS: Record<number, string> = {
  1: "#696354",
  2: "#6668AC",
  3: "#39A868",
  4: "#2875F9",
};

function formatPercent(value: number) {
  return formatItemStatValue("evasion", value);
}

const STAT_LINES: Array<{
  key: string;
  label: string;
  labelColor?: string;
  valueColor?: string;
  format?: (value: number, gItem: GItem) => string;
}> = [
  {
    key: "gold",
    label: "Gold",
    valueColor: "#fbbf24",
    format: (v) => formatItemStatValue("gold", v),
  },
  {
    key: "luck",
    label: "Luck",
    valueColor: "#34d399",
    format: (v) => formatItemStatValue("luck", v),
  },
  {
    key: "xp",
    label: "XP",
    valueColor: "#3b82f6",
    format: (v) => formatItemStatValue("xp", v),
  },
  { key: "lifesteal", label: "Lifesteal", valueColor: "#f472b6", format: formatPercent },
  { key: "manasteal", label: "Manasteal", valueColor: "#38bdf8", format: formatPercent },
  { key: "evasion", label: "Evasion", valueColor: "#7dd3fc", format: formatPercent },
  { key: "avoidance", label: "Avoidance", valueColor: "#7dd3fc", format: formatPercent },
  {
    key: "miss",
    label: "Miss",
    valueColor: "#f87171",
    format: (v) => formatItemStatValue("miss", v),
  },
  { key: "reflection", label: "Reflection", valueColor: "#a78bfa", format: formatPercent },
  { key: "dreturn", label: "D.Return", valueColor: "#f43f5e", format: formatPercent },
  { key: "crit", label: "Crit", valueColor: "#db2777", format: formatPercent },
  {
    key: "critdamage",
    label: "Crit Damage",
    valueColor: "#be123c",
    format: (v) => formatItemStatValue("critdamage", v),
  },
  {
    key: "attack",
    label: "Damage",
    valueColor: "#316EE6",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "range",
    label: "Range",
    valueColor: "#fb923c",
    format: (v) => (v > 0 ? `+${v}` : String(v)),
  },
  { key: "hp", label: "HP", valueColor: "#fb7185", format: (v) => String(Math.round(v)) },
  { key: "str", label: "Strength", valueColor: "#fdba74", format: (v) => String(Math.round(v)) },
  {
    key: "int",
    label: "Intelligence",
    valueColor: "#93c5fd",
    format: (v) => String(Math.round(v)),
  },
  { key: "dex", label: "Dexterity", valueColor: "#a3e635", format: (v) => String(Math.round(v)) },
  { key: "vit", label: "Vitality", valueColor: "#fda4af", format: (v) => String(Math.round(v)) },
  { key: "for", label: "Fortitude", valueColor: "#fde68a", format: (v) => String(Math.round(v)) },
  { key: "mp", label: "MP", valueColor: "#60a5fa", format: (v) => String(Math.round(v)) },
  {
    key: "mp_cost",
    label: "Attack MP Cost",
    valueColor: "#60a5fa",
    format: (v) => (v > 0 ? `+${v}` : String(v)),
  },
  {
    key: "mp_reduction",
    label: "Skill MP Reduction",
    valueColor: "#60a5fa",
    format: (v) => (v > 0 ? `%${v}` : `%${-v}`),
  },
  { key: "stat", label: "Stat", format: (v) => String(Math.round(v)) },
  { key: "armor", label: "Armor", valueColor: "#d4d4d8", format: (v) => String(Math.round(v)) },
  {
    key: "apiercing",
    label: "A.Piercing",
    valueColor: "#d4d4d8",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "rpiercing",
    label: "R.Piercing",
    valueColor: "#5eead4",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "resistance",
    label: "Resistance",
    valueColor: "#5eead4",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "pnresistance",
    label: "Poison Res.",
    valueColor: "#22c55e",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "firesistance",
    label: "Fire Res.",
    valueColor: "#ef4444",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "fzresistance",
    label: "Freeze Res.",
    valueColor: "#22d3ee",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "phresistance",
    label: "Impact Res.",
    valueColor: "#22d3ee",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "stresistance",
    label: "Status Res.",
    valueColor: "#cbd5e1",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "speed",
    label: "Speed",
    valueColor: "#fde047",
    format: (v) => (v > 0 ? `+${v}` : String(v)),
  },
  { key: "frequency", label: "A.Speed", valueColor: "#34d399", format: (v) => String(v) },
  {
    key: "output",
    label: "Damage Output",
    valueColor: "#f97316",
    format: (v) => `${v > 0 ? "+" : ""}${v}%`,
  },
  {
    key: "incdmgamp",
    label: "Incoming Damage",
    valueColor: "#f97316",
    format: (v) => `${v}%`,
  },
  { key: "stun", label: "Stun", valueColor: "#b45309", format: (v) => `${v}%` },
  { key: "explosion", label: "Explosion", valueColor: "#991b1b", format: (v) => `${v}%` },
  { key: "blast", label: "Blast", valueColor: "#c084fc", format: (v) => `${v}%` },
  { key: "breaks", label: "Breaks", valueColor: "#991b1b", format: formatPercent },
  {
    key: "charisma",
    label: "Charisma",
    valueColor: "#22c55e",
    format: (v) => String(Math.round(v)),
  },
  {
    key: "awesomeness",
    label: "Awesomeness",
    valueColor: "#fde047",
    format: (v) => String(Math.round(v)),
  },
  { key: "bling", label: "Bling", valueColor: "#bae6fd", format: (v) => String(Math.round(v)) },
  {
    key: "cuteness",
    label: "Cuteness",
    valueColor: "#f9a8d4",
    format: (v) => String(Math.round(v)),
  },
];

/** Keys copied onto resolved item stats but not shown as tooltip lines. */
const HIDDEN_STAT_KEYS = new Set([
  "level",
  "attr0",
  "attr1",
  "set",
  "class",
  "s",
  "g",
  "tier",
  "offering",
  "markup",
  "charge",
  "duration",
  "version",
]);

function pushGivesLines(gItem: GItem, lines: ItemTooltipLine[]) {
  const { gives } = gItem as { gives?: unknown };
  if (!Array.isArray(gives)) return;

  for (const give of gives) {
    if (!Array.isArray(give) || give.length < 2) continue;
    const [kind, amount] = give;
    if (kind === "hp") {
      const value = Number(amount);
      lines.push({
        kind: "stat",
        label: "HP",
        value: value < 0 ? String(value) : `+${value}`,
        valueColor: "#fb7185",
      });
    } else if (kind === "mp") {
      lines.push({
        kind: "stat",
        label: "MP",
        value: `+${amount}`,
        valueColor: "#60a5fa",
      });
    }
  }
}

function formatClassName(classKey: string): string {
  if (!classKey) return classKey;
  return classKey.charAt(0).toUpperCase() + classKey.slice(1);
}

function pushClassLine(gItem: GItem, lines: ItemTooltipLine[]) {
  const classes = (gItem as { class?: string[] }).class;
  if (!Array.isArray(classes) || classes.length === 0) return;

  lines.push({
    kind: "stat",
    label: "Class",
    value: classes.map(formatClassName).join(", "),
    labelColor: "text.secondary",
  });
}

type AbilityContext = {
  attr0?: number;
  attr1?: number;
};

type AbilityDef = {
  name: string;
  color?: string;
  describe: (ctx: AbilityContext) => string;
};

/** Mirrors adventure.land item tooltip ability text (html.js render_item). */
const ITEM_ABILITIES: Record<string, AbilityDef> = {
  bash: {
    name: "Bash",
    describe: ({ attr0, attr1 }) =>
      `Stuns the opponent for ${attr1 ?? "?"} seconds with ${attr0 ?? "?"}% chance.`,
  },
  freeze: {
    name: "Freeze",
    color: "#2EBCE2",
    describe: ({ attr0 }) => `Freezes the opponent with a ${attr0 ?? "?"}% chance.`,
  },
  poison: {
    name: "Poison",
    color: "#22c55e",
    describe: ({ attr0 }) => `Poisons the opponent with a ${attr0 ?? "?"}% chance.`,
  },
  burn: {
    name: "Burn",
    color: "#E03D31",
    describe: ({ attr0 }) =>
      `Burns the opponent with a ${attr0 ?? "?"}% chance. Deals damage over time.`,
  },
  weave: {
    name: "Weave",
    color: "#AAA9D2",
    describe: () => "Each hit slows the opponent more and more.",
  },
  secondchance: {
    name: "Second Chance",
    describe: ({ attr0 }) => `Avoid death with a ${attr0 ?? "?"}% chance.`,
  },
  sugarrush: {
    name: "Sugar Rush",
    color: "#D64770",
    describe: ({ attr0 }) =>
      `Trigger a Sugar Rush on attack with ${
        attr0 ?? "?"
      }% chance. Gain 240 Attack Speed for 10 seconds!`,
  },
  charm: {
    name: "Charm",
    color: "#D64770",
    describe: ({ attr0 }) =>
      `Charm an enemy with ${attr0 ?? "?"}% chance. Activate the ability from the SKILLS system.`,
  },
  restore_mp: {
    name: "Restore MP",
    color: "#5D9ED9",
    describe: ({ attr0 }) =>
      `Instead of using MP, skills restore 2× the amount with ${attr0 ?? "?"}% chance.`,
  },
};

function pushAbilityLines(
  gItem: GItem,
  stats: { [T in StatType]?: number },
  G: GData,
  lines: ItemTooltipLine[],
) {
  const item = gItem as {
    ability?: string;
    aura?: string;
    abilities?: Record<string, { aura?: boolean }>;
  };
  const statBag = stats as Record<string, number | undefined>;
  const ctx: AbilityContext = {
    attr0: statBag.attr0,
    attr1: statBag.attr1,
  };

  if (item.ability) {
    const known = ITEM_ABILITIES[item.ability];
    if (known) {
      lines.push({
        kind: "stat",
        label: "Ability",
        value: known.name,
        valueColor: known.color ?? "#FC5F39",
      });
      lines.push({
        kind: "text",
        text: known.describe(ctx),
        color: "text.secondary",
      });
    } else {
      const skill = G.skills?.[item.ability as keyof typeof G.skills] as
        | { name?: string; explanation?: string }
        | undefined;
      const name = skill?.name ?? formatClassName(item.ability.replace(/_/g, " "));
      lines.push({
        kind: "stat",
        label: "Ability",
        value: name,
        valueColor: "#E1924D",
      });
      if (ctx.attr0 != null) {
        lines.push({
          kind: "stat",
          label: "Chance",
          value: `${ctx.attr0}%`,
          valueColor: "text.secondary",
        });
      }
      if (skill?.explanation) {
        lines.push({
          kind: "text",
          text: skill.explanation,
          color: "text.secondary",
        });
      } else {
        lines.push({
          kind: "text",
          text: "Activate the ability from the SKILLS system.",
          color: "text.secondary",
        });
      }
    }
  }

  if (item.abilities) {
    for (const skillId of Object.keys(item.abilities)) {
      const skill = G.skills?.[skillId as keyof typeof G.skills] as
        | { name?: string; explanation?: string }
        | undefined;
      if (!skill?.name) continue;
      const isAura = Boolean(item.abilities[skillId]?.aura);
      lines.push({
        kind: "stat",
        label: isAura ? "Aura" : "Ability",
        value: skill.name,
        valueColor: "#FC5F39",
      });
      if (skill.explanation) {
        lines.push({
          kind: "text",
          text: skill.explanation,
          color: "text.secondary",
        });
      }
    }
  }

  if (item.aura) {
    const condition = G.conditions?.[item.aura as keyof typeof G.conditions] as
      | { name?: string }
      | undefined;
    if (condition?.name) {
      lines.push({
        kind: "stat",
        label: "Aura",
        value: condition.name,
        valueColor: "#E1924D",
      });
      if (ctx.attr0 != null) {
        lines.push({
          kind: "stat",
          label: "Amount",
          value: `${ctx.attr0}%`,
          valueColor: "text.secondary",
        });
      }
    }
  }
}

function pushDamageTypeLine(gItem: GItem, lines: ItemTooltipLine[]) {
  if (!gItem.damage_type) return;

  const labels: Record<string, { label: string; color: string }> = {
    pure: { label: "Pure", color: "#AA9B55" },
    magical: { label: "Magical", color: "#8998AA" },
    physical: { label: "Physical", color: "#93AB98" },
  };
  const entry = labels[gItem.damage_type];
  if (!entry) return;

  lines.push({
    kind: "stat",
    label: "Type",
    value: entry.label,
    valueColor: entry.color,
  });
}

function pushSetLine(gItem: GItem, G: GData, lines: ItemTooltipLine[]) {
  if (!gItem.set) return;
  const setName = G.sets?.[gItem.set]?.name ?? gItem.set;
  lines.push({
    kind: "stat",
    label: "Set",
    value: setName,
    labelColor: "#f1c054",
  });
}

function pushGlitchedTitleLine(itemInfo: ItemInfo, lines: ItemTooltipLine[]) {
  if (itemInfo.p !== "glitched") return;
  lines.push({
    kind: "text",
    text: "Glitched: +1 random Strength, Intelligence, or Dexterity",
    color: "text.secondary",
  });
}

function pushExplanationLine(gItem: GItem, lines: ItemTooltipLine[]) {
  if (gItem.explanation) {
    lines.push({ kind: "text", text: gItem.explanation, color: "text.secondary" });
    return;
  }

  if (gItem.type === "material") {
    lines.push({
      kind: "text",
      text: "An unknown material, as in, you have no idea what to do with it!",
      color: "text.secondary",
    });
  }
}

function pushMetaLines(gItem: GItem, lines: ItemTooltipLine[]) {
  if (gItem.s && gItem.s > 1) {
    lines.push({
      kind: "stat",
      label: "Stack",
      value: String(gItem.s),
      labelColor: "text.secondary",
    });
  }

  if (gItem.g && gItem.g > 0) {
    lines.push({
      kind: "stat",
      label: "NPC value",
      value: gItem.g.toLocaleString("en-US"),
      labelColor: "text.secondary",
      valueColor: "#fbbf24",
    });
  }

  if ((gItem as { debuff?: boolean }).debuff) {
    lines.push({
      kind: "stat",
      label: "Effect",
      value: "Debuff",
      valueColor: "#818cf8",
    });
  }

  if ("poisonous" in gItem && (gItem as { poisonous?: boolean }).poisonous) {
    lines.push({ kind: "text", text: "Poisonous", color: "#22c55e" });
  }
}

/** Build game-client-style tooltip lines for an item instance (ported from al-market). */
export function buildItemTooltipLines(
  gItem: GItem,
  itemInfo: ItemInfo,
  G: GData,
): ItemTooltipLine[] {
  const lines: ItemTooltipLine[] = [];
  const stats = resolveItemInstanceStats({ def: gItem, itemInfo, G });

  pushGivesLines(gItem, lines);

  for (const def of STAT_LINES) {
    const raw = (stats as Record<string, number | undefined>)[def.key as StatType];
    if (raw == null || raw === 0 || HIDDEN_STAT_KEYS.has(def.key)) continue;
    // Scroll applied: points are shown as the chosen attribute, not raw "Stat".
    if (def.key === "stat" && itemInfo.stat_type) continue;
    lines.push({
      kind: "stat",
      label: def.label,
      value: def.format ? def.format(raw, gItem) : String(raw),
      labelColor: def.labelColor,
      valueColor: def.valueColor,
    });
  }

  pushDamageTypeLine(gItem, lines);
  pushClassLine(gItem, lines);

  const grade = getItemGrade(gItem, itemInfo.level ?? 0);
  const gradeName = gradeLabel(grade);
  if (gradeName && gItem.type !== "booster") {
    lines.push({
      kind: "stat",
      label: "Grade",
      value: gradeName,
      valueColor: GRADE_COLORS[grade],
    });
  }

  pushAbilityLines(gItem, stats, G, lines);
  pushSetLine(gItem, G, lines);
  pushMetaLines(gItem, lines);
  pushGlitchedTitleLine(itemInfo, lines);
  pushExplanationLine(gItem, lines);

  return lines;
}
