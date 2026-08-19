import { overlayHex } from "./overlayColors";
import { packOverlayLabel } from "./packSpriteSlots";
import {
  AnimatableFeature,
  MachineFeature,
  MonsterFeature,
  NpcFeature,
  OverlayKind,
  OverlayPickKind,
  OverlayTooltip,
  ParsedDoor,
  ParsedMap,
  QuirkFeature,
  SpawnFeature,
  SpawnLink,
  TrapFeature,
  ZoneFeature,
} from "./types";

function spawnLinkOrder(kind: SpawnLink["kind"]): number {
  switch (kind) {
    case "town":
      return 0;
    case "transporter":
      return 1;
    case "door":
      return 2;
    case "exit":
      return 3;
    case "death":
      return 4;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

export function spawnOverlayHint(spawn: SpawnFeature): string {
  const lines: string[] = [];
  const arrivals = [...spawn.arrivals].sort(
    (a, b) => spawnLinkOrder(a.kind) - spawnLinkOrder(b.kind),
  );
  if (arrivals.length > 0) {
    lines.push("Possible connections:");
    for (const arrival of arrivals) {
      lines.push(arrival.label);
    }
  }
  if (spawn.departures.length > 0) {
    for (const departure of spawn.departures) {
      lines.push(`Door to ${departure.label}`);
    }
  }
  if (lines.length === 0) {
    return "Click to inspect";
  }
  return lines.join("\n");
}

function npcOverlayHint(npc: NpcFeature): string {
  if (npc.roam) {
    return "Moves around in this area";
  }
  if (npc.moving) {
    return "Roams the map · click to inspect";
  }
  return "Click to inspect";
}

function monsterOverlayHint(monster: MonsterFeature): string {
  if (monster.grow && monster.roam) {
    return "Grows when thinned · roams this area · click to inspect";
  }
  if (monster.grow) {
    return "Grows when thinned · click to inspect";
  }
  if (monster.roam) {
    return "Roams this area · click to inspect";
  }
  return "Click to inspect";
}

export type OverlayPick =
  | { kind: "door"; mapId: string; door: ParsedDoor }
  | { kind: "npc"; mapId: string; npc: NpcFeature }
  | { kind: "monster"; mapId: string; monster: MonsterFeature }
  | { kind: "quirk"; mapId: string; quirk: QuirkFeature }
  | { kind: "zone"; mapId: string; zone: ZoneFeature }
  | { kind: "spawn"; mapId: string; spawn: SpawnFeature }
  | { kind: "rage"; mapId: string; monster: MonsterFeature }
  | { kind: "machine"; mapId: string; machine: MachineFeature }
  | { kind: "animatable"; mapId: string; animatable: AnimatableFeature }
  | { kind: "trap"; mapId: string; trap: TrapFeature };

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
    case "rage":
      return "rage";
    case "machine":
      return "machines";
    case "animatable":
      return "animatables";
    case "trap":
      return "traps";
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
    value === "spawn" ||
    value === "rage" ||
    value === "machine" ||
    value === "animatable" ||
    value === "trap"
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
        hint: npcOverlayHint(pick.npc),
      };
    case "monster":
      return {
        kind: pick.kind,
        title: packOverlayLabel(pick.monster),
        hint: monsterOverlayHint(pick.monster),
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
    case "spawn": {
      const connections = spawnOverlayHint(pick.spawn);
      const spawnLabel = `Spawn ${pick.spawn.label}`.trim();
      if (connections === "Click to inspect") {
        return {
          kind: pick.kind,
          title: spawnLabel,
          hint: connections,
        };
      }
      return {
        kind: pick.kind,
        title: connections,
        hint: spawnLabel,
      };
    }
    case "rage":
      return {
        kind: pick.kind,
        title: `${pick.monster.type} rage`,
        hint: "Click to inspect",
      };
    case "machine":
      return {
        kind: pick.kind,
        title: pick.machine.type,
        hint: "Click to inspect",
      };
    case "animatable":
      return {
        kind: pick.kind,
        title: pick.animatable.id,
        hint: "Click to inspect",
      };
    case "trap":
      return {
        kind: pick.kind,
        title: `${pick.trap.type} trap`,
        hint: "Click to inspect",
      };
    default: {
      const exhaustive: never = pick;
      return exhaustive;
    }
  }
}
