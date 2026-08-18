import { overlayHex } from "./overlayColors";
import {
  MonsterFeature,
  NpcFeature,
  OverlayInspect,
  OverlayKind,
  OverlayPickKind,
  OverlayTooltip,
  ParsedDoor,
  ParsedMap,
  PointFeature,
  QuirkFeature,
  ZoneFeature,
} from "./types";

export type OverlayPick =
  | { kind: "door"; mapId: string; door: ParsedDoor }
  | { kind: "npc"; mapId: string; npc: NpcFeature }
  | { kind: "monster"; mapId: string; monster: MonsterFeature }
  | { kind: "quirk"; mapId: string; quirk: QuirkFeature }
  | { kind: "zone"; mapId: string; zone: ZoneFeature }
  | { kind: "spawn"; mapId: string; spawn: PointFeature };

export function overlayKindForPick(kind: OverlayPickKind): OverlayKind {
  switch (kind) {
    case "door":
      return "doors";
    case "npc":
      return "npcs";
    case "monster":
      return "monsters";
    case "quirk":
      return "quirks";
    case "zone":
      return "zones";
    case "spawn":
      return "spawns";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function overlayPickColor(kind: OverlayPickKind): string {
  return overlayHex(overlayKindForPick(kind));
}

export function isOverlayPickKind(value: unknown): value is OverlayPickKind {
  return (
    value === "door" ||
    value === "npc" ||
    value === "monster" ||
    value === "quirk" ||
    value === "zone" ||
    value === "spawn"
  );
}

export function overlayTooltip(pick: OverlayPick, maps: Record<string, ParsedMap>): OverlayTooltip {
  switch (pick.kind) {
    case "door": {
      const destId = pick.door.toMap;
      const destName = maps[destId]?.name;
      return {
        kind: pick.kind,
        title: destName ? `Door to ${destName}` : `Door to ${destId}`,
        hint: pick.door.lock ? `Locked (${pick.door.lock}) · click to enter` : "Click to enter",
      };
    }
    case "npc":
      return {
        kind: pick.kind,
        title: pick.npc.name || pick.npc.label || pick.npc.id,
        hint: "Click to inspect",
      };
    case "monster":
      return {
        kind: pick.kind,
        title: `${pick.monster.type} pack`,
        hint: "Click to inspect",
      };
    case "quirk":
      return {
        kind: pick.kind,
        title: pick.quirk.text || pick.quirk.kind,
        hint: pick.quirk.text && pick.quirk.kind ? pick.quirk.kind : "Click to inspect",
      };
    case "zone":
      return {
        kind: pick.kind,
        title: pick.zone.type,
        hint: "Click to inspect",
      };
    case "spawn":
      return {
        kind: pick.kind,
        title: `Spawn ${pick.spawn.label}`.trim(),
        hint: "Click to inspect",
      };
    default: {
      const exhaustive: never = pick;
      return exhaustive;
    }
  }
}

export function overlayInspect(pick: OverlayPick): OverlayInspect | null {
  switch (pick.kind) {
    case "door":
      return null;
    case "npc":
      return {
        kind: "npc",
        mapId: pick.mapId,
        id: pick.npc.id,
        name: pick.npc.name || pick.npc.label,
        skin: pick.npc.skin,
        x: pick.npc.x,
        y: pick.npc.y,
      };
    case "monster":
      return {
        kind: "monster",
        mapId: pick.mapId,
        type: pick.monster.type,
        x: pick.monster.x,
        y: pick.monster.y,
      };
    case "quirk":
      return {
        kind: "quirk",
        mapId: pick.mapId,
        quirkKind: pick.quirk.kind,
        text: pick.quirk.text,
        x: pick.quirk.x,
        y: pick.quirk.y,
        width: pick.quirk.width,
        height: pick.quirk.height,
      };
    case "zone":
      return {
        kind: "zone",
        mapId: pick.mapId,
        type: pick.zone.type,
      };
    case "spawn":
      return {
        kind: "spawn",
        mapId: pick.mapId,
        label: pick.spawn.label,
        x: pick.spawn.x,
        y: pick.spawn.y,
      };
    default: {
      const exhaustive: never = pick;
      return exhaustive;
    }
  }
}
