import { GData, ItemKey } from "typed-adventureland";

import { MapLocation, NpcShopSource, TokenOfferSource } from "./types";

export { normalizeTokenShopOffer } from "./tokenShopOffer";

function asFiniteCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function buildNpcMaps(maps: GData["maps"]): Map<string, MapLocation[]> {
  const index = new Map<string, MapLocation[]>();

  for (const [mapKey, map] of Object.entries(maps)) {
    if (!map.npcs) continue;
    for (const npc of map.npcs) {
      if (!npc?.id) continue;
      const position = Array.isArray(npc.position) ? npc.position : [];
      const entry: MapLocation = {
        mapKey: mapKey as MapLocation["mapKey"],
        mapName: map.name ?? null,
        posX: asFiniteCoord(position[0]),
        posY: asFiniteCoord(position[1]),
      };
      const list = index.get(npc.id) ?? [];
      list.push(entry);
      index.set(npc.id, list);
    }
  }

  return index;
}

export function buildShopsByItem(npcs: GData["npcs"]): Map<ItemKey, NpcShopSource[]> {
  const byItem = new Map<ItemKey, NpcShopSource[]>();

  for (const [npcId, npc] of Object.entries(npcs)) {
    if (!npc?.items) continue;
    const source: NpcShopSource = {
      npcId,
      role: npc.role ?? null,
      name: npc.name ?? null,
      token: npc.token ?? null,
    };
    for (const itemKey of npc.items) {
      if (!itemKey) continue;
      const key = itemKey as ItemKey;
      const list = byItem.get(key) ?? [];
      list.push(source);
      byItem.set(key, list);
    }
  }

  return byItem;
}

export function buildTokenOffersByItem(
  tokens: Record<string, unknown> | undefined,
  npcs: GData["npcs"] | undefined,
): Map<ItemKey, TokenOfferSource[]> {
  const byItem = new Map<ItemKey, TokenOfferSource[]>();
  if (!tokens) return byItem;

  const npcByToken = new Map<string, { npcId: string; npcName: string | null }>();
  if (npcs) {
    for (const [npcId, npc] of Object.entries(npcs)) {
      if (!npc?.token) continue;
      npcByToken.set(npc.token, { npcId, npcName: npc.name ?? null });
    }
  }

  for (const [tokenKey, shop] of Object.entries(tokens)) {
    if (!shop || typeof shop !== "object") continue;
    const vendor = npcByToken.get(tokenKey);
    for (const [itemKey, costRaw] of Object.entries(shop as Record<string, unknown>)) {
      const cost =
        typeof costRaw === "number" && Number.isFinite(costRaw) ? costRaw : Number(costRaw);
      const offer: TokenOfferSource = {
        tokenKey,
        cost: Number.isFinite(cost) ? cost : null,
        npcId: vendor?.npcId ?? null,
        npcName: vendor?.npcName ?? null,
      };
      const key = itemKey as ItemKey;
      const list = byItem.get(key) ?? [];
      list.push(offer);
      byItem.set(key, list);
    }
  }

  return byItem;
}
