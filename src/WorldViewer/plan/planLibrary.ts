import { PlanDocument } from "./types";
import { isPlanDocument } from "./planShareState";

export const PLAN_LIBRARY_STORAGE_KEY = "al-world-plans-v1";

export type PlanLibraryStore = {
  plans: Record<string, PlanDocument>;
};

export function emptyPlanLibrary(): PlanLibraryStore {
  return { plans: {} };
}

export function readPlanLibrary(
  storage: Pick<Storage, "getItem"> = localStorage,
  key = PLAN_LIBRARY_STORAGE_KEY,
): PlanLibraryStore {
  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return emptyPlanLibrary();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return emptyPlanLibrary();
    }
    const plansRaw = (parsed as { plans?: unknown }).plans;
    if (!plansRaw || typeof plansRaw !== "object") {
      return emptyPlanLibrary();
    }
    const plans: Record<string, PlanDocument> = {};
    for (const [id, value] of Object.entries(plansRaw as Record<string, unknown>)) {
      if (isPlanDocument(value)) {
        plans[id] = value;
      }
    }
    return { plans };
  } catch {
    return emptyPlanLibrary();
  }
}

export function writePlanLibrary(
  store: PlanLibraryStore,
  storage: Pick<Storage, "setItem"> = localStorage,
  key = PLAN_LIBRARY_STORAGE_KEY,
): void {
  storage.setItem(key, JSON.stringify(store));
}

export function upsertPlan(store: PlanLibraryStore, doc: PlanDocument): PlanLibraryStore {
  return {
    plans: {
      ...store.plans,
      [doc.id]: doc,
    },
  };
}

export function deletePlan(store: PlanLibraryStore, id: string): PlanLibraryStore {
  const plans = { ...store.plans };
  delete plans[id];
  return { plans };
}

export function listPlansForMap(store: PlanLibraryStore, mapKey: string): PlanDocument[] {
  const plans: PlanDocument[] = [];
  for (const doc of Object.values(store.plans)) {
    if (doc.mapKey === mapKey) {
      plans.push(doc);
    }
  }
  plans.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  return plans;
}

export function listAllPlans(store: PlanLibraryStore): PlanDocument[] {
  const plans = Object.values(store.plans);
  plans.sort((a, b) => b.updatedAt - a.updatedAt || a.name.localeCompare(b.name));
  return plans;
}
