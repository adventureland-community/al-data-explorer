import { GItem, ItemKey, MapKey, MonsterKey } from "typed-adventureland";

export type GItems = {
  [T in ItemKey]: GItem;
};

export type DropSourceType = "monster" | "map" | "table" | "gold";

export type DropSource = {
  sourceType: DropSourceType;
  sourceKey: string;
  itemKey: string;
  probability: number | null;
  quantity: number | null;
  title: string;
  nestedTable: string;
};

export type NpcShopSource = {
  npcId: string;
  role: string | null;
  name: string | null;
  token: string | null;
};

export type TokenOfferSource = {
  tokenKey: string;
  cost: number | null;
  /** NPC that sells this token catalog (`G.npcs[…].token`). */
  npcId: string | null;
  npcName: string | null;
};

export type MapLocation = {
  mapKey: MapKey;
  mapName: string | null;
  posX: number | null;
  posY: number | null;
};

export type GameDataIndexes = {
  dropsByItem: Map<ItemKey, DropSource[]>;
  shopsByItem: Map<ItemKey, NpcShopSource[]>;
  tokenOffersByItem: Map<ItemKey, TokenOfferSource[]>;
  npcMaps: Map<string, MapLocation[]>;
  spawnsByMonster: Map<MonsterKey, MapKey[]>;
  /** Ingredient itemKey → craft output itemKeys that use it */
  craftsByIngredient: Map<ItemKey, ItemKey[]>;
  /** Ingredient itemKey → dismantle output itemKeys that yield it */
  dismantlesByIngredient: Map<ItemKey, ItemKey[]>;
};
