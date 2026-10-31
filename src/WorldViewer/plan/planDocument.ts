import { PLAN_DOCUMENT_VERSION, PlanDocument, PlanObject, PlanPoint, ZonePreset } from "./types";

let idCounter = 0;

export function createPlanObjectId(): string {
  idCounter += 1;
  return `plan_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function createEmptyPlan(args: { mapKey: string; name: string; id?: string }): PlanDocument {
  return {
    version: PLAN_DOCUMENT_VERSION,
    id: args.id ?? createPlanObjectId(),
    mapKey: args.mapKey,
    name: args.name,
    objects: [],
    updatedAt: Date.now(),
  };
}

export function applyZonePreset(
  object: PlanObject,
  preset: Pick<ZonePreset, "label" | "color">,
): PlanObject {
  return {
    ...object,
    role: "zone",
    label: preset.label,
    color: preset.color,
  };
}

export function addPlanObject(doc: PlanDocument, object: PlanObject): PlanDocument {
  return {
    ...doc,
    objects: [...doc.objects, object],
    updatedAt: Date.now(),
  };
}

export function updatePlanObject(
  doc: PlanDocument,
  id: string,
  patch: Partial<PlanObject>,
): PlanDocument {
  const objects = doc.objects.map((object) => {
    if (object.id !== id) {
      return object;
    }
    return { ...object, ...patch, id: object.id, kind: object.kind } as PlanObject;
  });
  return { ...doc, objects, updatedAt: Date.now() };
}

export function replacePlanObject(doc: PlanDocument, next: PlanObject): PlanDocument {
  const objects = doc.objects.map((object) => (object.id === next.id ? next : object));
  return { ...doc, objects, updatedAt: Date.now() };
}

export function removePlanObjects(
  doc: PlanDocument,
  ids: ReadonlySet<string> | string[],
): PlanDocument {
  const remove = ids instanceof Set ? ids : new Set(ids);
  return {
    ...doc,
    objects: doc.objects.filter((object) => !remove.has(object.id)),
    updatedAt: Date.now(),
  };
}

export function findPlanObject(doc: PlanDocument, id: string): PlanObject | undefined {
  return doc.objects.find((object) => object.id === id);
}

function translatePoint(point: PlanPoint, dx: number, dy: number): PlanPoint {
  return { x: point.x + dx, y: point.y + dy };
}

export function translatePlanObject(object: PlanObject, dx: number, dy: number): PlanObject {
  switch (object.kind) {
    case "path":
      return {
        ...object,
        points: object.points.map((point) => translatePoint(point, dx, dy)),
      };
    case "arrow":
      return {
        ...object,
        from: translatePoint(object.from, dx, dy),
        to: translatePoint(object.to, dx, dy),
      };
    case "rect":
      return { ...object, x: object.x + dx, y: object.y + dy };
    case "ellipse":
      return { ...object, x: object.x + dx, y: object.y + dy };
    case "polygon":
      return {
        ...object,
        points: object.points.map((point) => translatePoint(point, dx, dy)),
      };
    case "text":
    case "stamp":
    case "ghost":
    case "pin":
      return { ...object, x: object.x + dx, y: object.y + dy };
    case "route":
      return {
        ...object,
        waypoints: object.waypoints.map((point) => translatePoint(point, dx, dy)),
      };
    case "packMarker":
      return object;
    default: {
      const exhaustive: never = object;
      return exhaustive;
    }
  }
}

export function movePlanObject(
  doc: PlanDocument,
  id: string,
  dx: number,
  dy: number,
): PlanDocument {
  const object = findPlanObject(doc, id);
  if (!object) {
    return doc;
  }
  return replacePlanObject(doc, translatePlanObject(object, dx, dy));
}

export type PlanHistoryState = {
  past: PlanDocument[];
  present: PlanDocument;
  future: PlanDocument[];
};

export function createPlanHistory(present: PlanDocument): PlanHistoryState {
  return { past: [], present, future: [] };
}

export function pushPlanHistory(state: PlanHistoryState, next: PlanDocument): PlanHistoryState {
  if (next === state.present) {
    return state;
  }
  return {
    past: [...state.past, state.present],
    present: next,
    future: [],
  };
}

export function undoPlanHistory(state: PlanHistoryState): PlanHistoryState {
  if (state.past.length === 0) {
    return state;
  }
  const previous = state.past[state.past.length - 1];
  return {
    past: state.past.slice(0, -1),
    present: previous,
    future: [state.present, ...state.future],
  };
}

export function redoPlanHistory(state: PlanHistoryState): PlanHistoryState {
  if (state.future.length === 0) {
    return state;
  }
  const [next, ...rest] = state.future;
  return {
    past: [...state.past, state.present],
    present: next,
    future: rest,
  };
}

export function nextPackOrder(doc: PlanDocument): number {
  let max = 0;
  for (const object of doc.objects) {
    if (object.kind === "packMarker" && object.order > max) {
      max = object.order;
    }
  }
  return max + 1;
}
