import type { GGeometry, GItem, GNpc, ItemKey, MapKey } from "typed-adventureland";

import type { CustomGData } from "../GDataContext";
import type { MapLocation } from "./types";

export type NpcCatalogRow = {
  id: string;
  name: string;
  role: string;
  skin: string;
  maps: MapLocation[];
  shopItemCount: number;
  /** Shop item keys when this NPC sells items. */
  shopItemKeys: ItemKey[];
  token: string | null;
  quest: string | null;
  moving: boolean;
  ignored: boolean;
};

export type NpcShopItemRow = {
  itemKey: ItemKey;
  name: string;
  priceLabel: string;
  slotIndex: number;
};

export type NpcDetailView = {
  id: string;
  name: string;
  role: string;
  skin: string;
  quest: string | null;
  token: string | null;
  moving: boolean;
  interaction: string[];
  says: string[];
  maps: MapLocation[];
  shopItems: NpcShopItemRow[];
  worldHref: string | null;
};

function formatBuyPrice(item: { g?: number; cash?: number } | null | undefined): string {
  if (!item) return "—";
  if (item.cash != null && Number.isFinite(item.cash)) {
    return `${item.cash.toLocaleString("en-US")} shells`;
  }
  if (item.g != null && Number.isFinite(item.g)) {
    return `${item.g.toLocaleString("en-US")}g`;
  }
  return "—";
}

function asNpcRecord(npcs: CustomGData["npcs"]): Record<string, GNpc> {
  return npcs as unknown as Record<string, GNpc>;
}

function asItems(items: CustomGData["items"]): Record<string, GItem | undefined> {
  return items as unknown as Record<string, GItem | undefined>;
}

function saysLines(says: GNpc["says"]): string[] {
  if (!says) return [];
  if (typeof says === "string") return [says];
  return says.filter((line): line is string => typeof line === "string" && line.trim().length > 0);
}

/** Deep link into World viewer focused on the first known spawn. */
export function npcWorldHref(maps: MapLocation[]): string | null {
  for (const loc of maps) {
    if (loc.posX == null || loc.posY == null) continue;
    const params = new URLSearchParams();
    params.set("map", loc.mapKey);
    params.set("x", String(Math.round(loc.posX)));
    params.set("y", String(Math.round(loc.posY)));
    params.set("mode", "map");
    return `/world#${params.toString()}`;
  }
  if (maps[0]?.mapKey) return `/world#map=${encodeURIComponent(maps[0].mapKey)}&mode=map`;
  return null;
}

export function listNpcCatalog(G: CustomGData): NpcCatalogRow[] {
  const rows: NpcCatalogRow[] = [];
  const npcs = asNpcRecord(G.npcs);
  for (const [id, npc] of Object.entries(npcs)) {
    if (!npc) continue;
    const maps = G.indexes.npcMaps.get(id) ?? [];
    const shopItems = npc.items ? npc.items.filter((k): k is ItemKey => k != null) : [];
    rows.push({
      id,
      name: npc.name ?? id,
      role: npc.role ?? "unknown",
      skin: npc.skin ?? id,
      maps,
      shopItemCount: shopItems.length,
      shopItemKeys: shopItems,
      token: npc.token ?? null,
      quest: npc.quest ?? null,
      moving: Boolean(npc.moving),
      ignored: Boolean(npc.ignore),
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return rows;
}

export function getNpcDetail(npcId: string, G: CustomGData): NpcDetailView | null {
  const npc = asNpcRecord(G.npcs)[npcId];
  if (!npc) return null;
  const items = asItems(G.items);
  const maps = G.indexes.npcMaps.get(npcId) ?? [];
  const shopItems: NpcShopItemRow[] = [];
  if (npc.items) {
    for (let i = 0; i < npc.items.length; i += 1) {
      const itemKey = npc.items[i];
      if (!itemKey) continue;
      const def = items[itemKey];
      shopItems.push({
        itemKey,
        name: def?.name ?? itemKey,
        priceLabel: formatBuyPrice(def),
        slotIndex: i,
      });
    }
  }
  const interaction = Array.isArray(npc.interaction)
    ? npc.interaction.filter((line): line is string => typeof line === "string")
    : [];
  return {
    id: npcId,
    name: npc.name ?? npcId,
    role: npc.role ?? "unknown",
    skin: npc.skin ?? npcId,
    quest: npc.quest ?? null,
    token: npc.token ?? null,
    moving: Boolean(npc.moving),
    interaction,
    says: saysLines(npc.says),
    maps,
    shopItems,
    worldHref: npcWorldHref(maps),
  };
}

export function filterNpcCatalog(
  rows: NpcCatalogRow[],
  opts: { search?: string; roles?: string[]; mapKeys?: string[]; includeIgnored?: boolean },
): NpcCatalogRow[] {
  const needle = (opts.search ?? "").trim().toLowerCase();
  const roleSet = opts.roles?.length ? new Set(opts.roles) : null;
  const mapSet = opts.mapKeys?.length ? new Set(opts.mapKeys) : null;
  const out: NpcCatalogRow[] = [];
  for (const row of rows) {
    if (!opts.includeIgnored && row.ignored) continue;
    if (roleSet && !roleSet.has(row.role)) continue;
    if (mapSet) {
      let hit = false;
      for (const loc of row.maps) {
        if (mapSet.has(loc.mapKey)) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
    }
    if (needle) {
      const hay = `${row.name} ${row.id} ${row.role} ${row.token ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) continue;
    }
    out.push(row);
  }
  return out;
}

export function npcRolesInCatalog(rows: NpcCatalogRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) set.add(row.role);
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function npcMapKeysInCatalog(rows: NpcCatalogRow[]): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    for (const loc of row.maps) set.add(loc.mapKey);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function mapGeometryFor(G: CustomGData, mapKey: string): GGeometry | undefined {
  const geometry = G.geometry as unknown as Record<string, GGeometry | undefined> | undefined;
  return geometry?.[mapKey];
}

export function mapDisplayLabel(loc: MapLocation): string {
  return loc.mapName ?? loc.mapKey;
}

export function npcHref(npcId: string): string {
  return `/npcs/${encodeURIComponent(npcId)}`;
}

export type { MapKey };
