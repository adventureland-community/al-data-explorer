import { DoorConnection, MapBand, MapPose, ParsedMap } from "./types";

export interface LinkedNeighbor {
  id: string;
  name: string;
  band: MapBand;
  doors: number;
  outbound: boolean;
  inbound: boolean;
  twoWay: boolean;
  oneWay: boolean;
  layerLabel: string;
}

const BAND_ORDER: MapBand[] = ["overworld", "indoor", "underground"];

function layerRelation(selectedZ: number | undefined, otherZ: number | undefined): string {
  if (selectedZ === undefined || otherZ === undefined) {
    return "";
  }
  if (otherZ === selectedZ) {
    return "same layer";
  }
  return otherZ > selectedZ ? "above" : "below";
}

export function summarizeNeighbors(
  selectedId: string,
  selectedZ: number | undefined,
  connections: DoorConnection[],
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
): LinkedNeighbor[] {
  const byId = new Map<string, LinkedNeighbor>();
  for (const connection of connections) {
    const outbound = connection.fromMap === selectedId;
    const otherId = outbound ? connection.toMap : connection.fromMap;
    const existing = byId.get(otherId);
    if (existing) {
      existing.doors += 1;
      existing.outbound = existing.outbound || outbound;
      existing.inbound = existing.inbound || !outbound;
      existing.twoWay = existing.twoWay || connection.twoWay;
      existing.oneWay = existing.oneWay || !connection.twoWay;
      continue;
    }
    const other = maps[otherId];
    byId.set(otherId, {
      id: otherId,
      name: other?.name || otherId,
      band: other?.band || "indoor",
      doors: 1,
      outbound,
      inbound: !outbound,
      twoWay: connection.twoWay,
      oneWay: !connection.twoWay,
      layerLabel: layerRelation(selectedZ, poses[otherId]?.z),
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function groupNeighborsByBand(
  neighbors: LinkedNeighbor[],
): Array<{ band: MapBand; items: LinkedNeighbor[] }> {
  const groups = new Map<MapBand, LinkedNeighbor[]>();
  for (const neighbor of neighbors) {
    const items = groups.get(neighbor.band) || [];
    items.push(neighbor);
    groups.set(neighbor.band, items);
  }
  const ordered: Array<{ band: MapBand; items: LinkedNeighbor[] }> = [];
  for (const band of BAND_ORDER) {
    const items = groups.get(band);
    if (items && items.length > 0) {
      ordered.push({ band, items });
    }
  }
  return ordered;
}
