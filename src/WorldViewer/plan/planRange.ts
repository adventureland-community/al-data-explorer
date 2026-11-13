import { ClassKey, ItemKey } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { computeLoadoutStats, LoadoutClassDef } from "../../gameData/loadoutStats";
import { PlanEllipseObject, PlanGhostObject } from "./types";

/** Typical blank-token mainhand when a ghost has no loadout gear. */
const CLASS_DEFAULT_MAINHAND: Partial<Record<ClassKey, ItemKey>> = {
  warrior: "blade",
  paladin: "mace",
  rogue: "claw",
  ranger: "bow",
  mage: "staff",
  priest: "staff",
  merchant: "blade",
};

function classDefFromG(G: CustomGData, classKey: ClassKey): LoadoutClassDef | undefined {
  const raw = G.classes[classKey];
  if (!raw) {
    return undefined;
  }
  return {
    className: classKey,
    stats: raw.stats ?? {},
    lstats: raw.lstats ?? {},
    main_stat: raw.main_stat,
    mainhand: raw.mainhand,
    offhand: raw.offhand,
    doublehand: raw.doublehand,
  };
}

function rangeFromItem(G: CustomGData, itemName: string | undefined): number | null {
  if (!itemName) {
    return null;
  }
  const item = G.items[itemName as ItemKey];
  const range = item?.range;
  if (typeof range !== "number" || !Number.isFinite(range)) {
    return null;
  }
  return Math.max(0, range);
}

/** Attack range from class + optional loadout. Manual override on the disc wins. */
export function resolveGhostAttackRange(args: {
  ghost: Pick<PlanGhostObject, "classKey" | "loadout">;
  G: CustomGData;
  radiusOverride?: number;
}): number | null {
  if (args.radiusOverride != null && Number.isFinite(args.radiusOverride)) {
    return Math.max(0, args.radiusOverride);
  }
  const { loadout } = args.ghost;
  const classKey = loadout?.classKey ?? args.ghost.classKey;
  const characterClass = classDefFromG(args.G, classKey);
  const gear =
    loadout?.gear && Object.keys(loadout.gear).length > 0
      ? loadout.gear
      : {
          mainhand: { name: CLASS_DEFAULT_MAINHAND[classKey] ?? "blade", level: 0 },
        };
  const stats = computeLoadoutStats({
    characterClass,
    level: loadout?.level ?? 1,
    gear,
    G: args.G,
  });
  const { range } = stats;
  if (range != null && Number.isFinite(range)) {
    return Math.max(0, range);
  }
  return rangeFromItem(args.G, gear.mainhand?.name);
}

export function ellipseRadiusForRangeDisc(
  ellipse: PlanEllipseObject,
  ghost: PlanGhostObject | undefined,
  G: CustomGData,
): number {
  if (ellipse.radiusOverride != null && Number.isFinite(ellipse.radiusOverride)) {
    return Math.max(0, ellipse.radiusOverride);
  }
  if (ghost) {
    const resolved = resolveGhostAttackRange({
      ghost,
      G,
      radiusOverride: undefined,
    });
    if (resolved != null) {
      return resolved;
    }
  }
  return Math.max(ellipse.radiusX, ellipse.radiusY);
}
