import LZString from "lz-string";

import { PLAN_DOCUMENT_VERSION, PlanDocument, PlanObject } from "./types";

function isPlanPoint(value: unknown): value is { x: number; y: number } {
  if (!value || typeof value !== "object") {
    return false;
  }
  const point = value as { x?: unknown; y?: unknown };
  return typeof point.x === "number" && typeof point.y === "number";
}

function isPlanObject(value: unknown): value is PlanObject {
  if (!value || typeof value !== "object") {
    return false;
  }
  const object = value as { id?: unknown; kind?: unknown; color?: unknown };
  return (
    typeof object.id === "string" &&
    typeof object.kind === "string" &&
    typeof object.color === "string"
  );
}

export function isPlanDocument(value: unknown): value is PlanDocument {
  if (!value || typeof value !== "object") {
    return false;
  }
  const doc = value as Partial<PlanDocument>;
  if (doc.version !== PLAN_DOCUMENT_VERSION) {
    return false;
  }
  if (
    typeof doc.id !== "string" ||
    typeof doc.mapKey !== "string" ||
    typeof doc.name !== "string"
  ) {
    return false;
  }
  if (typeof doc.updatedAt !== "number" || !Array.isArray(doc.objects)) {
    return false;
  }
  return doc.objects.every(isPlanObject);
}

export function encodePlanShareState(doc: PlanDocument): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(doc));
}

export function decodePlanShareState(encoded: string): PlanDocument | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPlanDocument(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Absolute World URL carrying a compressed plan (`plan=` hash param). */
export function planShareUrl(doc: PlanDocument, origin = window.location.origin): string {
  const encoded = encodePlanShareState(doc);
  return `${origin}/world#map=${encodeURIComponent(doc.mapKey)}&mode=plan&plan=${encoded}`;
}

export function cloneSharedPlanIntoLibrary(doc: PlanDocument): PlanDocument {
  return {
    ...doc,
    id: `imported_${Date.now().toString(36)}`,
    name: doc.name.endsWith(" (shared)") ? doc.name : `${doc.name} (shared)`,
    updatedAt: Date.now(),
    objects: doc.objects.map((object) => ({ ...object })),
  };
}

export { isPlanPoint };
