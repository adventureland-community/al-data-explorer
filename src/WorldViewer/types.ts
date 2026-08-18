import { GGeometry, GMap } from "typed-adventureland";

export type OverlayKind = "bounds" | "spawns" | "quirks" | "doors" | "npcs" | "zones" | "monsters";

export type OverlayVisibility = Record<OverlayKind, boolean>;

export type MapBand = "overworld" | "indoor" | "underground";

export interface RectFeature {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PointFeature {
  x: number;
  y: number;
  label: string;
}

export interface NpcFeature extends PointFeature {
  id: string;
  skin: string;
  name?: string;
}

export interface MonsterFeature {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  polygon?: Array<[number, number]>;
}

export interface QuirkFeature extends RectFeature {
  kind: string;
  text?: string;
}

export interface ZoneFeature {
  type: string;
  polygon: Array<[number, number]>;
}

export interface ParsedDoor {
  fromMap: string;
  toMap: string;
  x: number;
  y: number;
  width: number;
  height: number;
  destSpawn: number;
  sourceSpawn?: number;
  lock?: string;
}

export interface DoorConnection {
  fromMap: string;
  toMap: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  twoWay: boolean;
}

export interface ParsedMap {
  id: string;
  name: string;
  ignore: boolean;
  outside: boolean;
  band: MapBand;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Geometry bounds used for tile art (may differ from minX/maxX when overlays extend further). */
  artMinX: number;
  artMaxX: number;
  artMinY: number;
  artMaxY: number;
  xLines: Array<[number, number, number]>;
  yLines: Array<[number, number, number]>;
  doors: ParsedDoor[];
  spawns: PointFeature[];
  quirks: QuirkFeature[];
  npcs: NpcFeature[];
  monsters: MonsterFeature[];
  zones: ZoneFeature[];
}

export interface MapPose {
  x: number;
  y: number;
  z: number;
}

export interface WorldLayout {
  maps: Record<string, ParsedMap>;
  poses: Record<string, MapPose>;
  connections: DoorConnection[];
}

export interface MapFocus {
  mapId: string;
  x: number;
  y: number;
  /** Bumped on each focus request so re-selecting the same map still recenters. */
  seq: number;
}

export interface DoorTravel {
  toMap: string;
  toX: number;
  toY: number;
  toName: string;
  lock?: string;
}

export interface NpcSelection {
  mapId: string;
  id: string;
  name: string;
  skin: string;
  x: number;
  y: number;
}

export interface MonsterSelection {
  mapId: string;
  type: string;
  x: number;
  y: number;
}

export type OverlayPickKind = "door" | "npc" | "monster" | "quirk" | "zone" | "spawn";

export interface OverlayTooltip {
  title: string;
  hint: string;
  kind: OverlayPickKind;
}

export interface QuirkInspect {
  kind: "quirk";
  mapId: string;
  quirkKind: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ZoneInspect {
  kind: "zone";
  mapId: string;
  type: string;
}

export interface SpawnInspect {
  kind: "spawn";
  mapId: string;
  label: string;
  x: number;
  y: number;
}

export type OverlayInspect =
  | ({ kind: "npc" } & NpcSelection)
  | ({ kind: "monster" } & MonsterSelection)
  | QuirkInspect
  | ZoneInspect
  | SpawnInspect;

export interface MapSource {
  maps: Record<string, GMap>;
  geometry: Record<string, GGeometry | undefined>;
}

export const DEFAULT_OVERLAYS: OverlayVisibility = {
  bounds: true,
  spawns: true,
  quirks: true,
  doors: true,
  npcs: true,
  zones: true,
  monsters: true,
};

export const OVERLAY_KINDS: OverlayKind[] = [
  "bounds",
  "spawns",
  "quirks",
  "doors",
  "npcs",
  "zones",
  "monsters",
];
