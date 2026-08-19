import { GGeometry, GMap } from "typed-adventureland";

export type OverlayKind =
  | "bounds"
  | "spawns"
  | "quirks"
  | "doors"
  | "npcs"
  | "zones"
  | "monsters"
  | "rage"
  | "machines"
  | "animatables"
  | "traps";

/** Single-map top-down (default) vs full 3D world layout. */
export type ViewerMode = "map" | "world";

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
  /** NPC wander box (`G.maps[…].npcs[].boundary`). */
  roam?: RectFeature;
  /** True when `G.npcs[id].moving` — walks the map without a fixed box. */
  moving?: boolean;
}

export interface MonsterFeature {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Spawn quantity for this pack (`G.maps[…].monsters[].count`). */
  count: number;
  /** Extra monsters spawn if the pack is thinned. */
  grow: boolean;
  /** Pack may leave its box (`G.maps[…].monsters[].roam`). */
  roam?: boolean;
  radius?: number;
  polygon?: Array<[number, number]>;
  /** Aggro / rage box (`G.maps[…].monsters[].rage`). */
  rage?: RectFeature;
  /** Same-map extra roam boxes (`boundaries` entries for this map). */
  extraBounds?: RectFeature[];
}

export type SpawnLinkKind = "door" | "town" | "death" | "exit" | "transporter";

/** How you can arrive at a spawn, or a door that leaves from it. */
export interface SpawnLink {
  kind: SpawnLinkKind;
  label: string;
}

export interface SpawnFeature extends PointFeature {
  index: number;
  direction?: number;
  size?: number;
  arrivals: SpawnLink[];
  departures: SpawnLink[];
}

export interface QuirkFeature extends RectFeature {
  kind: string;
  text?: string;
}

export interface ZoneFeature {
  type: string;
  polygon: Array<[number, number]>;
}

export interface MachineFeature extends RectFeature {
  type: string;
}

export interface AnimatableFeature extends PointFeature {
  id: string;
  position: string;
}

export interface TrapFeature {
  type: string;
  x: number;
  y: number;
  polygon?: Array<[number, number]>;
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
  spawns: SpawnFeature[];
  /** Where this map sends you on death (`G.maps[…].on_death`). */
  onDeath?: { map: string; spawn: number };
  /** Where this map sends you on exit (`G.maps[…].on_exit`). */
  onExit?: { map: string; spawn: number };
  quirks: QuirkFeature[];
  npcs: NpcFeature[];
  monsters: MonsterFeature[];
  zones: ZoneFeature[];
  machines: MachineFeature[];
  animatables: AnimatableFeature[];
  traps: TrapFeature[];
  /** Indoor maps with a door onto an overworld map (town interiors). Not stack-pinned. */
  exitsToOverworld: boolean;
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

export type OverlayPickKind =
  | "door"
  | "npc"
  | "monster"
  | "quirk"
  | "zone"
  | "spawn"
  | "rage"
  | "machine"
  | "animatable"
  | "trap";

export interface OverlayTooltip {
  title: string;
  hint: string;
  kind: OverlayPickKind;
}

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
  rage: false,
  machines: true,
  animatables: true,
  traps: true,
};

export const OVERLAY_KINDS: OverlayKind[] = [
  "bounds",
  "spawns",
  "quirks",
  "doors",
  "npcs",
  "zones",
  "monsters",
  "rage",
  "machines",
  "animatables",
  "traps",
];
