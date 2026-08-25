import { GCraft } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { buildCraftsByIngredient } from "./craft";
import { buildDismantlesByIngredient, GDismantle } from "./dismantle";
import { buildDropsByItem } from "./drops";
import { buildNpcMaps, buildShopsByItem, buildTokenOffersByItem } from "./shops";
import { buildSpawnIndex } from "./spawnIndex";
import { GameDataIndexes } from "./types";

export function buildGameDataIndexes(G: CustomGData): GameDataIndexes {
  return {
    dropsByItem: buildDropsByItem(G.drops ?? {}),
    shopsByItem: buildShopsByItem(G.npcs),
    tokenOffersByItem: buildTokenOffersByItem(
      G.tokens as Record<string, unknown> | undefined,
      G.npcs,
    ),
    npcMaps: buildNpcMaps(G.maps),
    spawnsByMonster: buildSpawnIndex(G.maps as Record<string, import("typed-adventureland").GMap>),
    craftsByIngredient: buildCraftsByIngredient(G.craft as Record<string, GCraft> | undefined),
    dismantlesByIngredient: buildDismantlesByIngredient(
      G.dismantle as Record<string, GDismantle> | undefined,
    ),
  };
}
