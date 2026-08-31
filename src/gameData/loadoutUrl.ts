import LZString from "lz-string";
import { ClassKey, ItemInfo, SlotType } from "typed-adventureland";

import { SavedLoadout } from "../GearPlanner/types";
import { cloneLoadoutGear } from "./loadoutStats";

export type LoadoutUrlState = {
  gear: { [slot in SlotType]?: ItemInfo };
  classKey?: ClassKey;
  level: number;
  target?: string;
  splashTargetCount?: number;
};

const GEAR_PARAM = "gear";
const CLASS_PARAM = "class";
const LEVEL_PARAM = "level";
const TARGET_PARAM = "target";

export function encodeLoadoutParam(state: LoadoutUrlState): string {
  const payload = JSON.stringify({
    gear: state.gear,
    className: state.classKey,
    level: state.level,
    target: state.target,
    splashTargetCount: state.splashTargetCount,
  });
  return LZString.compressToEncodedURIComponent(payload);
}

export function decodeLoadoutParam(raw: string | null): LoadoutUrlState | null {
  if (!raw) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const parsed = JSON.parse(json) as {
      gear?: { [slot in SlotType]?: ItemInfo };
      className?: ClassKey;
      classKey?: ClassKey;
      level?: number;
      target?: string;
      splashTargetCount?: number;
    };
    if (!parsed || typeof parsed !== "object") return null;
    return {
      gear: cloneLoadoutGear(parsed.gear ?? {}),
      classKey: parsed.classKey ?? parsed.className,
      level:
        typeof parsed.level === "number" && Number.isFinite(parsed.level)
          ? Math.min(200, Math.max(1, Math.round(parsed.level)))
          : 1,
      target: typeof parsed.target === "string" ? parsed.target : undefined,
      splashTargetCount:
        typeof parsed.splashTargetCount === "number"
          ? Math.min(5, Math.max(0, Math.round(parsed.splashTargetCount)))
          : undefined,
    };
  } catch {
    return null;
  }
}

export function loadoutFromSaved(saved: SavedLoadout): LoadoutUrlState {
  return {
    gear: cloneLoadoutGear(saved.gear),
    classKey: saved.classKey,
    level: saved.level,
  };
}

export function parseGearPlannerSearchParams(
  searchParams: URLSearchParams,
): LoadoutUrlState | null {
  const fromGear = decodeLoadoutParam(searchParams.get(GEAR_PARAM));
  const splashRaw = searchParams.get("simSplash");
  const splashFromParam =
    splashRaw != null ? Math.min(5, Math.max(0, Math.round(Number(splashRaw) || 0))) : undefined;

  if (fromGear) {
    return {
      ...fromGear,
      splashTargetCount: fromGear.splashTargetCount ?? splashFromParam,
    };
  }

  const classKey = searchParams.get(CLASS_PARAM);
  const levelRaw = searchParams.get(LEVEL_PARAM);
  const target = searchParams.get(TARGET_PARAM);
  if (!classKey && !levelRaw && !target && splashFromParam == null) return null;

  return {
    gear: {},
    classKey: (classKey as ClassKey | null) ?? undefined,
    level: levelRaw ? Math.min(200, Math.max(1, Number(levelRaw) || 1)) : 1,
    target: target ?? undefined,
    splashTargetCount: splashFromParam,
  };
}

export function writeGearPlannerSearchParams(
  current: URLSearchParams,
  state: LoadoutUrlState,
): URLSearchParams {
  const next = new URLSearchParams(current);
  const hasGear = Object.keys(state.gear).length > 0;

  if (hasGear) {
    next.set(GEAR_PARAM, encodeLoadoutParam(state));
    next.delete(CLASS_PARAM);
    next.delete(LEVEL_PARAM);
  } else {
    next.delete(GEAR_PARAM);
    if (state.classKey) next.set(CLASS_PARAM, state.classKey);
    else next.delete(CLASS_PARAM);
    if (state.level !== 1) next.set(LEVEL_PARAM, String(state.level));
    else next.delete(LEVEL_PARAM);
  }

  if (state.target && state.target !== "ent") next.set(TARGET_PARAM, state.target);
  else next.delete(TARGET_PARAM);

  if (state.splashTargetCount && state.splashTargetCount > 0) {
    next.set("simSplash", String(state.splashTargetCount));
  } else {
    next.delete("simSplash");
  }

  return next;
}

export function buildShareUrl(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  return `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
}

export function toSavedLoadout(state: LoadoutUrlState): SavedLoadout {
  return {
    gear: cloneLoadoutGear(state.gear),
    classKey: state.classKey,
    level: state.level,
  };
}
