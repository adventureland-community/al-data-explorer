import { ClassKey, ItemInfo, SlotType } from "typed-adventureland";

export const PLAN_DOCUMENT_VERSION = 1 as const;

export type PlanPoint = { x: number; y: number };

/** Soft farm meaning; geometry without a role is pure drawing. */
export type PlanRole = "zone" | "range";

export type PlanStampKind = "x" | "checkpoint" | "star";

export type PlanGhostLoadout = {
  classKey: ClassKey;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  /** Display name from the library entry when known. */
  loadoutName?: string;
};

export type PlanObjectBase = {
  id: string;
  /** Stroke / primary color (#rrggbb). */
  color: string;
  label?: string;
  role?: PlanRole;
};

export type PlanPathObject = PlanObjectBase & {
  kind: "path";
  points: PlanPoint[];
  closed?: boolean;
};

export type PlanArrowObject = PlanObjectBase & {
  kind: "arrow";
  from: PlanPoint;
  to: PlanPoint;
};

export type PlanRectObject = PlanObjectBase & {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PlanEllipseObject = PlanObjectBase & {
  kind: "ellipse";
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  /** When role is range, optional manual radius (uses radiusX as circle). */
  radiusOverride?: number;
  /** Ghost this range disc follows when role is range. */
  ghostId?: string;
};

export type PlanPolygonObject = PlanObjectBase & {
  kind: "polygon";
  points: PlanPoint[];
};

export type PlanTextObject = PlanObjectBase & {
  kind: "text";
  x: number;
  y: number;
  text: string;
};

export type PlanStampObject = PlanObjectBase & {
  kind: "stamp";
  x: number;
  y: number;
  stamp: PlanStampKind;
};

export type PlanGhostObject = PlanObjectBase & {
  kind: "ghost";
  x: number;
  y: number;
  classKey: ClassKey;
  name?: string;
  skin?: string;
  loadout?: PlanGhostLoadout;
};

export type PlanRouteObject = PlanObjectBase & {
  kind: "route";
  ghostId?: string;
  waypoints: PlanPoint[];
  loop: boolean;
};

export type PlanPinObject = PlanObjectBase & {
  kind: "pin";
  x: number;
  y: number;
  text: string;
};

export type PlanPackMarkerObject = PlanObjectBase & {
  kind: "packMarker";
  /** Index into `G.maps[mapKey].monsters`. */
  packIndex: number;
  order: number;
  zoneObjectId?: string;
  ghostObjectId?: string;
};

export type PlanObject =
  | PlanPathObject
  | PlanArrowObject
  | PlanRectObject
  | PlanEllipseObject
  | PlanPolygonObject
  | PlanTextObject
  | PlanStampObject
  | PlanGhostObject
  | PlanRouteObject
  | PlanPinObject
  | PlanPackMarkerObject;

export type PlanDocument = {
  version: typeof PLAN_DOCUMENT_VERSION;
  id: string;
  mapKey: string;
  name: string;
  objects: PlanObject[];
  updatedAt: number;
};

export type PlanTool =
  | "select"
  | "line"
  | "arrow"
  | "freehand"
  | "rect"
  | "ellipse"
  | "polygon"
  | "text"
  | "stamp"
  | "ghost"
  | "route"
  | "pin"
  | "packMarker";

export type ZonePresetId = "camp" | "safe" | "nogo" | "pull" | "merchant";

export type ZonePreset = {
  id: ZonePresetId;
  label: string;
  color: string;
};
