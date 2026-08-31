import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { MonsterKey, SlotType, ItemInfo } from "typed-adventureland";

import { ItemSortKey } from "../gameData/itemFilters";
import { decodeLoadoutParam, encodeLoadoutParam } from "../gameData/loadoutUrl";
import {
  COMBAT_SIM_DEFAULTS,
  parseCombatSimParams,
  writeCombatSimParams,
  type CombatSimUrlOptions,
} from "../gameData/combatSimUrl";
import type { MatrixSimScope } from "../gameData/combat/itemSimContext";

export type ItemsBrowseParams = {
  search: string;
  types: string[];
  wtypes: string[];
  tiers: number[];
  classes: string[];
  sort: ItemSortKey;
};

export function parseCsvParam(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  for (const part of raw.split(",")) {
    const value = part.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    values.push(value);
  }
  return values;
}

export function writeCsvParam(values: string[]): string {
  return values.join(",");
}

export function parseNumberCsvParam(raw: string | null): number[] {
  const values: number[] = [];
  const seen = new Set<number>();
  for (const part of parseCsvParam(raw)) {
    const n = Number(part);
    if (!Number.isFinite(n) || seen.has(n)) continue;
    seen.add(n);
    values.push(n);
  }
  return values;
}

export function useItemsBrowseParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: ItemsBrowseParams = {
    search: searchParams.get("search") ?? "",
    types: parseCsvParam(searchParams.get("type")),
    wtypes: parseCsvParam(searchParams.get("wtype")),
    tiers: parseNumberCsvParam(searchParams.get("tier")),
    classes: parseCsvParam(searchParams.get("class")),
    sort: (searchParams.get("sort") as ItemSortKey | null) ?? "name",
  };

  const setParam = useCallback(
    (key: string, value: string, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      setSearchParams(next, { replace: options?.replace ?? false });
    },
    [searchParams, setSearchParams],
  );

  const setListParam = useCallback(
    (key: "type" | "wtype" | "tier" | "class", values: string[]) => {
      const next = new URLSearchParams(searchParams);
      const encoded = writeCsvParam(values);
      if (encoded) next.set(key, encoded);
      else next.delete(key);
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters = Boolean(
    params.search ||
      params.types.length > 0 ||
      params.wtypes.length > 0 ||
      params.tiers.length > 0 ||
      params.classes.length > 0,
  );

  const browseQuery = searchParams.toString();

  return { params, setParam, setListParam, clearFilters, hasActiveFilters, browseQuery };
}

/** Matrix selection + optional baseline (`show` / `baseline` / legacy `highlight`). */
export function useMatrixUrlParams(validItem: (key: string) => boolean) {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedKeys = (() => {
    const fromShow = parseCsvParam(searchParams.get("show")).filter(validItem);
    if (fromShow.length > 0) return fromShow;
    const highlight = searchParams.get("highlight");
    if (highlight && validItem(highlight)) return [highlight];
    return [] as string[];
  })();

  const baselineRaw = searchParams.get("baseline");
  const baselineKey =
    baselineRaw && selectedKeys.includes(baselineRaw) && validItem(baselineRaw)
      ? baselineRaw
      : null;

  const patch = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setSelectedKeys = useCallback(
    (keys: string[]) => {
      patch((next) => {
        const unique = parseCsvParam(writeCsvParam(keys));
        if (unique.length > 0) next.set("show", writeCsvParam(unique));
        else next.delete("show");
        next.delete("highlight");
        const baseline = next.get("baseline");
        if (!baseline || !unique.includes(baseline) || unique.length < 2) {
          next.delete("baseline");
        }
      });
    },
    [patch],
  );

  const setBaseline = useCallback(
    (key: string | null) => {
      patch((next) => {
        if (key && selectedKeys.includes(key)) next.set("baseline", key);
        else next.delete("baseline");
      });
    },
    [patch, selectedKeys],
  );

  return { selectedKeys, baselineKey, setSelectedKeys, setBaseline };
}

export type MatrixViewMode = "stats" | "dps";

export type MatrixCombatParams = {
  view: MatrixViewMode;
  simClass: string | null;
  simLevel: number;
  simTarget: MonsterKey;
  simScope: MatrixSimScope;
  simGear: { [slot in SlotType]?: ItemInfo };
} & CombatSimUrlOptions;

const MATRIX_VIEW_DEFAULT: MatrixViewMode = "stats";
const MATRIX_CLASS_DEFAULT = "priest";
const MATRIX_LEVEL_DEFAULT = 80;
const MATRIX_TARGET_DEFAULT: MonsterKey = "ent";
const MATRIX_SCOPE_DEFAULT: MatrixSimScope = "mainhand";
const MATRIX_SPLASH_DEFAULT = COMBAT_SIM_DEFAULTS.splashTargetCount;

function parseMatrixView(raw: string | null): MatrixViewMode {
  return raw === "dps" ? "dps" : MATRIX_VIEW_DEFAULT;
}

function parseMatrixLevel(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return MATRIX_LEVEL_DEFAULT;
  return Math.min(200, Math.max(1, Math.round(n)));
}

/** Matrix DPS view + combat context (`view`, `simClass`, `simLevel`, `simTarget`). */
export function useMatrixCombatParams(
  validClass: (key: string) => boolean,
  validTarget: (key: string) => boolean,
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: MatrixCombatParams = useMemo(() => {
    const classRaw = searchParams.get("simClass");
    const targetRaw = searchParams.get("simTarget");
    const simOpts = parseCombatSimParams(searchParams);
    return {
      view: parseMatrixView(searchParams.get("view")),
      simClass: classRaw && validClass(classRaw) ? classRaw : MATRIX_CLASS_DEFAULT,
      simLevel: parseMatrixLevel(searchParams.get("simLevel")),
      simTarget:
        targetRaw && validTarget(targetRaw) ? (targetRaw as MonsterKey) : MATRIX_TARGET_DEFAULT,
      simScope: searchParams.get("simScope") === "loadout" ? "loadout" : MATRIX_SCOPE_DEFAULT,
      simGear: decodeLoadoutParam(searchParams.get("simGear"))?.gear ?? {},
      splashTargetCount: simOpts.splashTargetCount ?? MATRIX_SPLASH_DEFAULT,
      assumeChargeBuffs: simOpts.assumeChargeBuffs ?? COMBAT_SIM_DEFAULTS.assumeChargeBuffs,
      useSkillRotation: simOpts.useSkillRotation ?? COMBAT_SIM_DEFAULTS.useSkillRotation,
      assumeMarked: simOpts.assumeMarked ?? COMBAT_SIM_DEFAULTS.assumeMarked,
      comboStacks: simOpts.comboStacks ?? COMBAT_SIM_DEFAULTS.comboStacks,
    };
  }, [searchParams, validClass, validTarget]);

  const patch = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setView = useCallback(
    (view: MatrixViewMode) => {
      patch((next) => {
        if (view === MATRIX_VIEW_DEFAULT) next.delete("view");
        else next.set("view", view);
      });
    },
    [patch],
  );

  const setCombatContext = useCallback(
    (
      next: Pick<
        MatrixCombatParams,
        | "simClass"
        | "simLevel"
        | "simTarget"
        | "simScope"
        | "simGear"
        | "splashTargetCount"
        | "assumeChargeBuffs"
        | "useSkillRotation"
        | "assumeMarked"
        | "comboStacks"
      >,
    ) => {
      patch((draft) => {
        if (next.simClass && validClass(next.simClass)) {
          if (next.simClass === MATRIX_CLASS_DEFAULT) draft.delete("simClass");
          else draft.set("simClass", next.simClass);
        }
        if (next.simLevel === MATRIX_LEVEL_DEFAULT) draft.delete("simLevel");
        else draft.set("simLevel", String(next.simLevel));
        if (next.simTarget === MATRIX_TARGET_DEFAULT) draft.delete("simTarget");
        else draft.set("simTarget", next.simTarget);
        if (next.simScope === MATRIX_SCOPE_DEFAULT) draft.delete("simScope");
        else draft.set("simScope", next.simScope ?? MATRIX_SCOPE_DEFAULT);
        const gearKeys = next.simGear ? Object.keys(next.simGear).length : 0;
        if (gearKeys > 0 && next.simScope === "loadout") {
          draft.set("simGear", encodeLoadoutParam({ gear: next.simGear, level: next.simLevel }));
        } else {
          draft.delete("simGear");
        }
        writeCombatSimParams(draft, next);
      });
    },
    [patch, validClass],
  );

  return { params, setView, setCombatContext, searchParams };
}
