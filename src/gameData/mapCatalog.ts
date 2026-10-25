import type { GMap, GNpc, ItemKey } from "typed-adventureland";

import type { CustomGData } from "../GDataContext";
import { formatDropProbability, getMapDisplayName, parseDropEntry } from "./drops";
import {
  buildTravelEdges,
  travelPathDirections,
  travelPathToMap,
  worldFocusHref,
  type TravelDirectionLeg,
  type TravelEdge,
} from "./mapTravel";
import { npcHref } from "./npcCatalog";

export function mapDetailHref(mapKey: string): string {
  return `/maps/${encodeURIComponent(mapKey)}`;
}

export type MapCatalogRow = {
  key: string;
  name: string;
  outside: boolean;
  instance: boolean;
  ignored: boolean;
  unlisted: boolean;
  monsterCount: number;
  npcCount: number;
};

export type MapNpcRow = {
  id: string;
  name: string;
  skin: string;
  role: string;
  href: string;
  x: number | null;
  y: number | null;
};

export type MapMonsterRow = {
  type: string;
  name: string;
  count: number;
  href: string;
  grow: boolean;
  roam: boolean;
};

export type MapDropRow = {
  itemKey: string;
  nestedTable: string;
  label: string;
  oddsLabel: string;
  href?: string;
};

export type MapExitRef = {
  mapKey: string;
  mapName: string;
  spawnIndex: number | null;
  href: string;
};

export type MapDetailView = {
  key: string;
  name: string;
  outside: boolean;
  instance: boolean;
  ignored: boolean;
  unlisted: boolean;
  dropNorm: number | null;
  onDeath: MapExitRef | null;
  onExit: MapExitRef | null;
  worldHref: string;
  npcs: MapNpcRow[];
  monsters: MapMonsterRow[];
  mapDrops: MapDropRow[];
  outbound: TravelEdge[];
  inbound: TravelEdge[];
  directions: TravelDirectionLeg[] | null;
};

function asMaps(G: CustomGData): Record<string, GMap | undefined> {
  return G.maps as unknown as Record<string, GMap | undefined>;
}

function asNpcs(G: CustomGData): Record<string, GNpc | undefined> {
  return G.npcs as unknown as Record<string, GNpc | undefined>;
}

function monsterPackCount(spawn: { count?: number }): number {
  if (typeof spawn.count === "number" && Number.isFinite(spawn.count)) return spawn.count;
  return 1;
}

function npcPosition(raw: {
  position?: number[] | [number, number];
  positions?: number[][] | [number, number][];
}): { x: number | null; y: number | null } {
  const pos = raw.position;
  if (Array.isArray(pos) && typeof pos[0] === "number" && typeof pos[1] === "number") {
    return { x: pos[0], y: pos[1] };
  }
  const first = raw.positions?.[0];
  if (Array.isArray(first) && typeof first[0] === "number" && typeof first[1] === "number") {
    return { x: first[0], y: first[1] };
  }
  return { x: null, y: null };
}

export function listMaps(G: CustomGData, opts?: { includeIgnored?: boolean }): MapCatalogRow[] {
  const includeIgnored = opts?.includeIgnored ?? false;
  const rows: MapCatalogRow[] = [];
  for (const [key, map] of Object.entries(asMaps(G))) {
    if (!map) continue;
    if (!includeIgnored && map.ignore) continue;
    rows.push({
      key,
      name: map.name ?? key,
      outside: Boolean(map.outside),
      instance: Boolean(map.instance),
      ignored: Boolean(map.ignore),
      unlisted: Boolean(map.unlist),
      monsterCount: map.monsters?.length ?? 0,
      npcCount: map.npcs?.length ?? 0,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
  return rows;
}

export function filterMapCatalog(
  rows: MapCatalogRow[],
  opts: { search?: string; includeIgnored?: boolean },
): MapCatalogRow[] {
  const needle = (opts.search ?? "").trim().toLowerCase();
  const out: MapCatalogRow[] = [];
  for (const row of rows) {
    if (!opts.includeIgnored && row.ignored) continue;
    if (needle) {
      const hay = `${row.name} ${row.key}`.toLowerCase();
      if (!hay.includes(needle)) continue;
    }
    out.push(row);
  }
  return out;
}

function mapDropHref(
  itemKey: string,
  nestedTable: string,
  items: CustomGData["items"],
): string | undefined {
  if (nestedTable) return `/drops?mode=exchange&table=${encodeURIComponent(nestedTable)}`;
  if (!itemKey) return undefined;
  if (items[itemKey as ItemKey]) return `/items/${encodeURIComponent(itemKey)}`;
  return `/drops?mode=exchange&table=${encodeURIComponent(itemKey)}`;
}

function parseMapExit(raw: unknown, maps: Record<string, GMap | undefined>): MapExitRef | null {
  if (!Array.isArray(raw) || typeof raw[0] !== "string") return null;
  const targetKey = raw[0];
  const spawnIndex = typeof raw[1] === "number" ? raw[1] : null;
  return {
    mapKey: targetKey,
    mapName: getMapDisplayName(targetKey, maps),
    spawnIndex,
    href: mapDetailHref(targetKey),
  };
}

type MapExtras = GMap & {
  drop_norm?: number;
  on_death?: unknown;
  on_exit?: unknown;
  unlist?: boolean;
};

export function getMapDetail(mapKey: string, G: CustomGData): MapDetailView | null {
  const maps = asMaps(G);
  const map = maps[mapKey] as MapExtras | undefined;
  if (!map) return null;
  const npcsById = asNpcs(G);
  const monstersById = G.monsters as Record<string, { name?: string } | undefined>;
  const itemsByKey = G.items as Record<string, { name?: string } | undefined>;

  const npcs: MapNpcRow[] = [];
  for (const raw of map.npcs ?? []) {
    const { id } = raw;
    if (!id) continue;
    const def = npcsById[id];
    const { x, y } = npcPosition(raw);
    npcs.push({
      id,
      name: def?.name ?? raw.name ?? id,
      skin: def?.skin ?? id,
      role: def?.role ?? "unknown",
      href: npcHref(id),
      x,
      y,
    });
  }
  npcs.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

  const monsters: MapMonsterRow[] = [];
  for (const spawn of map.monsters ?? []) {
    const { type } = spawn;
    if (!type) continue;
    monsters.push({
      type,
      name: monstersById[type]?.name ?? type,
      count: monsterPackCount(spawn),
      href: `/monsters?monster=${encodeURIComponent(type)}`,
      grow: Boolean(spawn.grow),
      roam: Boolean(spawn.roam),
    });
  }
  monsters.sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type));

  const mapDrops: MapDropRow[] = [];
  const rawMapDrops = (G.drops as { maps?: Record<string, unknown[]> } | undefined)?.maps?.[mapKey];
  if (Array.isArray(rawMapDrops)) {
    for (const entry of rawMapDrops) {
      for (const drop of parseDropEntry("map", mapKey, entry, "absolute")) {
        const { itemKey, nestedTable } = drop;
        if (!itemKey && !nestedTable) continue;
        const label = nestedTable ? `open → ${nestedTable}` : itemsByKey[itemKey]?.name ?? itemKey;
        mapDrops.push({
          itemKey,
          nestedTable,
          label,
          oddsLabel: drop.probability != null ? formatDropProbability(drop.probability) : "—",
          href: mapDropHref(itemKey, nestedTable, G.items),
        });
      }
    }
  }

  const edges = buildTravelEdges(G);
  const outbound = edges.filter((e) => e.fromMap === mapKey);
  const inbound = edges.filter((e) => e.toMap === mapKey);
  const path = travelPathToMap(G, mapKey);
  const directions = path ? travelPathDirections(G, path) : null;

  return {
    key: mapKey,
    name: getMapDisplayName(mapKey, maps),
    outside: Boolean(map.outside),
    instance: Boolean(map.instance),
    ignored: Boolean(map.ignore),
    unlisted: Boolean(map.unlist),
    dropNorm: typeof map.drop_norm === "number" ? map.drop_norm : null,
    onDeath: parseMapExit(map.on_death, maps),
    onExit: parseMapExit(map.on_exit, maps),
    worldHref: worldFocusHref(mapKey),
    npcs,
    monsters,
    mapDrops,
    outbound,
    inbound,
    directions,
  };
}
