import type { GCraft, GData, GItem } from "typed-adventureland";

import type { CustomGData } from "../../GDataContext";

export type ItemSearchFlag =
  | "exchange"
  | "upgrade"
  | "compound"
  | "craft"
  | "craftable"
  | "event"
  | "legacy";

export const ITEM_FLAG_ALIASES: Record<string, ItemSearchFlag> = {
  exchange: "exchange",
  upgrade: "upgrade",
  compound: "compound",
  craft: "craft",
  craftable: "craftable",
  event: "event",
  legacy: "legacy",
};

export function itemHasSearchFlag(
  gItem: GItem,
  itemKey: string,
  flag: ItemSearchFlag,
  G: GData | undefined,
): boolean {
  const extras = gItem as GItem & {
    e?: number | boolean;
    event?: boolean;
    legacy?: boolean;
  };
  switch (flag) {
    case "exchange":
      return Boolean(extras.e);
    case "upgrade":
      return Boolean(gItem.upgrade);
    case "compound":
      return Boolean(gItem.compound);
    case "craft":
    case "craftable": {
      const craftMap = (G as CustomGData | undefined)?.craft as Record<string, GCraft> | undefined;
      return Boolean(craftMap?.[itemKey]);
    }
    case "event":
      return Boolean(extras.event);
    case "legacy":
      return Boolean(extras.legacy);
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}
