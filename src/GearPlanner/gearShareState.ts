import LZString from "lz-string";
import { ClassKey, ItemInfo, SlotType } from "typed-adventureland";

import { isClassKey } from "../gameData/classSkills";
import { SavedLoadout } from "./types";

export type GearShareState = {
  gear: { [slot in SlotType]?: ItemInfo };
  className?: ClassKey;
  level: number;
};

export function encodeGearShareState(state: GearShareState): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeGearShareState(encoded: string): GearShareState | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GearShareState;
    if (!parsed || typeof parsed !== "object" || !parsed.gear) return null;
    const level = Number(parsed.level);
    const className =
      parsed.className && isClassKey(parsed.className) ? parsed.className : undefined;
    return {
      gear: parsed.gear,
      className,
      level: Number.isFinite(level) ? level : 1,
    };
  } catch {
    return null;
  }
}

export function savedLoadoutToShareState(data: SavedLoadout): GearShareState {
  return {
    gear: data.gear,
    className: data.classKey,
    level: data.level,
  };
}

export function shareStateToSavedLoadout(state: GearShareState): SavedLoadout {
  return {
    gear: state.gear,
    classKey: state.className,
    level: state.level,
  };
}

/** Absolute Gear Planner URL carrying a compressed loadout. */
export function gearPlannerShareUrl(state: GearShareState): string {
  const encoded = encodeGearShareState(state);
  return `${window.location.origin}/gear?gear=${encoded}`;
}
