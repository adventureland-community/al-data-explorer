import { classLooks } from "./characterLook";
import { CosmeticSlot, COSMETIC_SLOT_LABEL } from "./cosmeticsCatalog";
import { toAcquisitionDropSources } from "./dropTable";
import { DropSourceType } from "./types";
import { CustomGData } from "../GDataContext";

export type CosmeticAcquireKind = "class" | "cosmo" | "drop" | "unknown";

export type CosmeticAcquireSource = {
  kind: CosmeticAcquireKind;
  /** Cosmo pack item id (`cosmo0`…) when kind is cosmo. */
  packId?: string;
  packName?: string;
  /** Shell price of the pack (`G.items[pack].cash`). */
  shells?: number;
  /** Relative weight inside the pack / table. */
  weight?: number;
  /** Approximate share of the roll (0–1). */
  chance?: number;
  /** Vendor NPC that sells the pack for shells. */
  vendorId?: string;
  vendorName?: string;
  /** Haila (or other) exchange NPC. */
  exchangeNpcId?: string;
  exchangeNpcName?: string;
  /** Drop-table origin when kind is drop (`G.drops` via acquisition walk). */
  dropSourceType?: DropSourceType;
  dropSourceKey?: string;
  dropSourceName?: string;
  /** Item that yields the cosmetic (`cx` / `cxjar` / `cxbundle`). */
  dropItemKey?: string;
  /** True when this cx is part of a class starting look. */
  classDefault?: boolean;
  note?: string;
};

const COSMO_PACKS = ["cosmo0", "cosmo1", "cosmo2", "cosmo3", "cosmo4", "cosmo5"] as const;

const CX_DROP_ITEMS = new Set(["cx", "cxbundle", "cxjar"]);

function findShellVendor(G: Pick<CustomGData, "npcs">): { id: string; name: string } | undefined {
  const npcs = G.npcs as Record<string, { name?: string; items?: (string | null)[] } | undefined>;
  for (const [id, npc] of Object.entries(npcs)) {
    if (!npc?.items) continue;
    if (!npc.items.some((item) => typeof item === "string" && item.startsWith("cosmo"))) continue;
    return { id, name: npc.name ?? id };
  }
  return undefined;
}

function findCxNpc(G: Pick<CustomGData, "npcs">): { id: string; name: string } | undefined {
  const npcs = G.npcs as Record<string, { name?: string; role?: string } | undefined>;
  for (const [id, npc] of Object.entries(npcs)) {
    if (npc?.role === "cx") return { id, name: npc.name ?? id };
  }
  return undefined;
}

function isCosmoPackId(id: string): boolean {
  return (COSMO_PACKS as readonly string[]).includes(id);
}

function dropSourceLabel(
  G: Pick<CustomGData, "items" | "monsters" | "maps">,
  sourceType: DropSourceType,
  sourceKey: string,
): string {
  if (sourceType === "monster") {
    const monsters = G.monsters as Record<string, { name?: string } | undefined>;
    return monsters[sourceKey]?.name ?? sourceKey;
  }
  if (sourceType === "map") {
    const maps = G.maps as Record<string, { name?: string } | undefined> | undefined;
    return maps?.[sourceKey]?.name ?? sourceKey;
  }
  if (sourceType === "table") {
    const items = G.items as Record<string, { name?: string } | undefined>;
    return items[sourceKey]?.name ?? sourceKey;
  }
  return sourceKey;
}

/** Class starting looks — free / already unlocked baselines. */
export function classDefaultCosmeticIds(G: Pick<CustomGData, "classes">): Set<string> {
  const out = new Set<string>();
  for (const gClass of Object.values(G.classes ?? {})) {
    for (const look of classLooks(gClass)) {
      out.add(look.skin);
      for (const id of Object.values(look.cx)) {
        if (typeof id === "string" && id) out.add(id);
      }
    }
  }
  return out;
}

/**
 * Reverse index: cosmetic skin id → how you unlock it.
 * Deduced from G: class looks + every `cx` / `cxbundle` / `cxjar` row in `G.drops`
 * (cosmo packs, monster/map tables, exchange chests — same walk as item acquisition).
 */
export function buildCosmeticAcquireIndex(
  G: Pick<CustomGData, "items" | "drops" | "npcs" | "classes" | "cosmetics" | "monsters" | "maps">,
): Map<string, CosmeticAcquireSource[]> {
  const index = new Map<string, CosmeticAcquireSource[]>();
  const vendor = findShellVendor(G);
  const exchangeNpc = findCxNpc(G);
  const defaults = classDefaultCosmeticIds(G);
  const drops = (G.drops ?? {}) as Record<string, unknown>;
  const items = G.items as Record<string, { name?: string; cash?: number } | undefined>;
  const bundles = (G.cosmetics as { bundle?: Record<string, unknown> } | undefined)?.bundle ?? {};

  const push = (id: string, source: CosmeticAcquireSource) => {
    const list = index.get(id) ?? [];
    list.push(source);
    index.set(id, list);
  };

  for (const id of defaults) {
    push(id, {
      kind: "class",
      classDefault: true,
      note: "Included on a class starting look",
    });
  }

  for (const row of toAcquisitionDropSources(drops)) {
    if (!CX_DROP_ITEMS.has(row.itemKey)) continue;
    const cxId = row.title;
    if (!cxId) continue;

    const fromPack = row.sourceType === "table" && isCosmoPackId(row.sourceKey);
    const pack = fromPack ? items[row.sourceKey] : undefined;
    const source: CosmeticAcquireSource = fromPack
      ? {
          kind: "cosmo",
          packId: row.sourceKey,
          packName: pack?.name ?? row.sourceKey,
          shells: typeof pack?.cash === "number" ? pack.cash : undefined,
          chance: row.probability ?? undefined,
          vendorId: vendor?.id,
          vendorName: vendor?.name,
          exchangeNpcId: exchangeNpc?.id,
          exchangeNpcName: exchangeNpc?.name,
          note: row.itemKey === "cxbundle" ? "Bundle unlock" : undefined,
        }
      : {
          kind: "drop",
          dropSourceType: row.sourceType,
          dropSourceKey: row.sourceKey,
          dropSourceName: dropSourceLabel(G, row.sourceType, row.sourceKey),
          dropItemKey: row.itemKey,
          chance: row.probability ?? undefined,
          note:
            row.itemKey === "cxjar"
              ? "CX Jar"
              : row.itemKey === "cxbundle"
              ? "Bundle unlock"
              : undefined,
        };

    push(cxId, source);

    if (row.itemKey === "cxbundle") {
      const members = bundles[cxId];
      if (Array.isArray(members)) {
        for (const skin of members) {
          if (typeof skin === "string" && skin) {
            push(skin, { ...source, note: `Part of bundle ${cxId}` });
          }
        }
      }
    }
  }

  return index;
}

export function acquireSourcesFor(
  index: Map<string, CosmeticAcquireSource[]>,
  cosmeticId: string,
): CosmeticAcquireSource[] {
  return index.get(cosmeticId) ?? [];
}

/**
 * Shared odds fragment for summaries / AcquirePanel.
 * `@param withPercent` appends `(x.xx%)` (4 digits when chance < 1%).
 */
export function formatAcquireOdds(chance: number | undefined, withPercent = false): string {
  if (chance == null || !(chance > 0)) return "";
  const odds = `~${Math.max(1, Math.round(1 / chance))}:1`;
  if (!withPercent) return ` · ${odds}`;
  const digits = chance < 0.01 ? 4 : 2;
  return ` · ${odds} (${(chance * 100).toFixed(digits)}%)`;
}

/** One-line summary for tooltips / collection chrome. */
export function formatAcquireSummary(sources: CosmeticAcquireSource[]): string {
  if (sources.length === 0) {
    return "Not unlockable in-game (unpublished / WIP)";
  }
  const classSrc = sources.find((s) => s.kind === "class");
  const cosmo = sources.find((s) => s.kind === "cosmo");
  const drop = sources.find((s) => s.kind === "drop");
  const parts: string[] = [];
  if (classSrc) parts.push("class default");
  if (cosmo?.packName && cosmo.shells != null) {
    parts.push(`${cosmo.shells} shells → ${cosmo.packName}${formatAcquireOdds(cosmo.chance)}`);
  } else if (cosmo?.packName) {
    parts.push(cosmo.packName);
  }
  if (drop) {
    const where = drop.dropSourceName ?? drop.dropSourceKey ?? "drop";
    const via = drop.note ? `${drop.note} · ` : "";
    parts.push(`${via}${where}${formatAcquireOdds(drop.chance)}`);
  }
  return parts.join(" · ") || "Unknown source";
}

export function cosmoPacksForSlot(slot: CosmeticSlot): string[] {
  switch (slot) {
    case "skin":
      return ["cosmo0"];
    case "head":
    case "makeup":
    case "face":
      return ["cosmo1"];
    case "hair":
      return ["cosmo2"];
    case "hat":
      return ["cosmo3"];
    case "back":
    case "chin":
    case "tail":
      return ["cosmo4"];
    case "gravestone":
    case "misc":
      return ["cosmo5"];
    default:
      return ["cosmo5"];
  }
}

export function itemDeepLink(packId: string): string {
  return `/items/${encodeURIComponent(packId)}`;
}

export function dropsDeepLink(packId: string): string {
  return `/drops?mode=exchange&table=${encodeURIComponent(packId)}`;
}

export function dropSourceDeepLink(source: CosmeticAcquireSource): string | undefined {
  if (source.kind !== "drop" || !source.dropSourceKey) return undefined;
  if (source.dropSourceType === "monster") {
    return `/monsters?monster=${encodeURIComponent(source.dropSourceKey)}`;
  }
  if (source.dropSourceType === "map") {
    return `/world#map=${encodeURIComponent(source.dropSourceKey)}`;
  }
  if (source.dropSourceType === "table") {
    return dropsDeepLink(source.dropSourceKey);
  }
  return undefined;
}

export function acquireAvailability(
  sources: CosmeticAcquireSource[],
): "free" | "pack" | "unpublished" {
  if (sources.some((s) => s.kind === "class")) return "free";
  if (sources.some((s) => s.kind === "cosmo" || s.kind === "drop")) return "pack";
  return "unpublished";
}

export type AcquireBrowseMeta = {
  availabilityById: Map<string, "free" | "pack" | "unpublished">;
  shellsById: Map<string, number>;
  chanceById: Map<string, number>;
};

/** One browse index for chips + sort — stays aligned with tile/panel availability. */
export function buildAcquireBrowseMeta(
  index: Map<string, CosmeticAcquireSource[]>,
): AcquireBrowseMeta {
  const availabilityById = new Map<string, "free" | "pack" | "unpublished">();
  const shellsById = new Map<string, number>();
  const chanceById = new Map<string, number>();

  for (const [id, sources] of index) {
    availabilityById.set(id, acquireAvailability(sources));
    const cosmo = sources.find((s) => s.kind === "cosmo");
    if (cosmo?.shells != null) shellsById.set(id, cosmo.shells);
    const withChance = sources.find((s) => s.chance != null && s.chance > 0);
    if (withChance?.chance != null) chanceById.set(id, withChance.chance);
  }

  return { availabilityById, shellsById, chanceById };
}

export function slotAcquireHint(
  slot: CosmeticSlot,
  G: Pick<CustomGData, "items" | "npcs">,
): string {
  const packs = cosmoPacksForSlot(slot);
  const items = G.items as Record<string, { name?: string; cash?: number; e?: number } | undefined>;
  const vendor = findShellVendor(G);
  const exchangeNpc = findCxNpc(G);
  const bits: string[] = [];
  for (const packId of packs) {
    const pack = items[packId];
    if (!pack) continue;
    const shells = pack.cash != null ? `${pack.cash} shells` : "shells";
    const live = pack.e ? "" : " (exchange WIP)";
    bits.push(`${pack.name ?? packId} · ${shells}${live}`);
  }
  const where = [vendor?.name, exchangeNpc ? `exchange at ${exchangeNpc.name}` : null]
    .filter(Boolean)
    .join(" · ");
  if (!bits.length) return `${COSMETIC_SLOT_LABEL[slot]} — unlock path unpublished`;
  return `${bits.join(" / ")}${where ? ` · ${where}` : ""}`;
}
