import { SavedLoadout } from "../GearPlanner/types";

const STORAGE_KEY = "al-gear-planner-pending-loadout";

export type PendingGearPlannerLoadout = {
  name: string;
  data: SavedLoadout;
};

/** Stash a loadout for Gear Planner to apply on next open. */
export function stashLoadoutForGearPlanner(name: string, data: SavedLoadout): void {
  const payload: PendingGearPlannerLoadout = {
    name,
    data: {
      gear: data.gear,
      classKey: data.classKey,
      level: data.level,
    },
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error("Could not stash loadout for Gear Planner", err);
  }
}

/** Read and clear a pending Gear Planner loadout (if any). */
export function takePendingGearPlannerLoadout(): PendingGearPlannerLoadout | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw) as PendingGearPlannerLoadout;
    if (!parsed?.name || !parsed?.data?.gear) return null;
    return parsed;
  } catch {
    return null;
  }
}
