import type { GData, GItem, ItemInfo } from "typed-adventureland";

import { buildItemTooltipLines, type ItemTooltipLine } from "./itemTooltipLines";

export type EntityTooltipLine = ItemTooltipLine;

export type EntityRef =
  | {
      kind: "item";
      key: string;
      level?: number;
      title?: string;
      /** Property/stat scroll type (ItemInfo.stat_type). */
      statType?: string;
      quantity?: number;
    }
  | { kind: "monster"; key: string }
  | { kind: "npc"; key: string };

export type EntityTooltipModel = {
  kind: EntityRef["kind"];
  key: string;
  displayName: string;
  badges: string[];
  lines: EntityTooltipLine[];
  json: unknown;
};

function pushStat(
  lines: EntityTooltipLine[],
  label: string,
  value: string | number | undefined | null,
  valueColor?: string,
) {
  if (value == null || value === "") return;
  lines.push({
    kind: "stat",
    label,
    value: String(value),
    labelColor: "text.secondary",
    valueColor,
  });
}

function buildMonsterTooltipLines(
  key: string,
  monster: Record<string, unknown>,
): EntityTooltipLine[] {
  const lines: EntityTooltipLine[] = [];
  pushStat(lines, "HP", monster.hp as number | undefined, "#fb7185");
  pushStat(lines, "MP", monster.mp as number | undefined, "#60a5fa");
  pushStat(lines, "Damage", monster.attack as number | undefined, "#316EE6");
  if (typeof monster.damage_type === "string") {
    pushStat(lines, "Type", monster.damage_type);
  }
  pushStat(lines, "Range", monster.range as number | undefined, "#fb923c");
  pushStat(lines, "Speed", monster.speed as number | undefined, "#fde047");
  pushStat(lines, "XP", monster.xp as number | undefined, "#3b82f6");
  pushStat(lines, "Respawn", monster.respawn as number | undefined);
  pushStat(lines, "Frequency", monster.frequency as number | undefined);
  if (typeof monster.explanation === "string" && monster.explanation.trim()) {
    lines.push({ kind: "text", text: monster.explanation, color: "text.secondary" });
  }
  if (lines.length === 0) {
    lines.push({ kind: "text", text: key, color: "text.secondary" });
  }
  return lines;
}

function buildNpcTooltipLines(key: string, npc: Record<string, unknown>): EntityTooltipLine[] {
  const lines: EntityTooltipLine[] = [];
  if (typeof npc.role === "string") pushStat(lines, "Role", npc.role);
  if (typeof npc.quest === "string") pushStat(lines, "Quest", npc.quest);
  if (typeof npc.token === "string") pushStat(lines, "Token", npc.token);
  if (typeof npc.says === "string" && npc.says.trim()) {
    lines.push({ kind: "text", text: `"${npc.says}"`, color: "text.secondary" });
  }
  const { items } = npc;
  if (Array.isArray(items)) {
    const count = items.filter((x) => typeof x === "string" && x).length;
    if (count > 0) pushStat(lines, "Shop items", count);
  }
  if (lines.length === 0) {
    lines.push({ kind: "text", text: key, color: "text.secondary" });
  }
  return lines;
}

/** Resolve pretty lines + JSON payload for an item / monster / NPC. */
export function buildEntityTooltipModel(entity: EntityRef, G: GData): EntityTooltipModel | null {
  switch (entity.kind) {
    case "item": {
      const gItem = G.items?.[entity.key as keyof typeof G.items] as GItem | undefined;
      if (!gItem) return null;
      const itemInfo: ItemInfo = {
        name: entity.key as ItemInfo["name"],
        level: entity.level ?? 0,
        ...(entity.title ? { p: entity.title as ItemInfo["p"] } : {}),
        ...(entity.statType ? { stat_type: entity.statType as ItemInfo["stat_type"] } : {}),
        ...(entity.quantity != null && entity.quantity > 1 ? { q: entity.quantity } : {}),
      };
      const level = entity.level ?? 0;
      const badges: string[] = [];
      if (level > 0) badges.push(`+${level}`);
      if (entity.title) badges.push(entity.title);
      if (entity.statType) badges.push(entity.statType);
      if (entity.quantity != null && entity.quantity > 1) badges.push(`×${entity.quantity}`);
      return {
        kind: "item",
        key: entity.key,
        displayName: gItem.name,
        badges,
        lines: buildItemTooltipLines(gItem, itemInfo, G),
        json: { itemInfo, gItem },
      };
    }
    case "monster": {
      const monster = G.monsters?.[entity.key as keyof typeof G.monsters] as unknown as
        | Record<string, unknown>
        | undefined;
      if (!monster) return null;
      const name = typeof monster.name === "string" ? monster.name : entity.key;
      return {
        kind: "monster",
        key: entity.key,
        displayName: name,
        badges: [],
        lines: buildMonsterTooltipLines(entity.key, monster),
        json: { key: entity.key, monster },
      };
    }
    case "npc": {
      const npc = (G.npcs as unknown as Record<string, Record<string, unknown> | undefined>)?.[
        entity.key
      ];
      if (!npc) return null;
      const name = typeof npc.name === "string" ? npc.name : entity.key;
      return {
        kind: "npc",
        key: entity.key,
        displayName: name,
        badges: typeof npc.role === "string" ? [npc.role] : [],
        lines: buildNpcTooltipLines(entity.key, npc),
        json: { key: entity.key, npc },
      };
    }
    default: {
      const _exhaustive: never = entity;
      return _exhaustive;
    }
  }
}
