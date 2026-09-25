import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import { ItemSortKey } from "../gameData/itemFilters";
import { serializeLegacyBrowseFacets } from "./itemCatalogAdvancedForm";

export type ItemsBrowseParams = {
  search: string;
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

const LEGACY_FACET_KEYS = ["type", "wtype", "tier", "class"] as const;

/** Browse URL state: query search + sort. Legacy facet params migrate into `search`. */
export function useItemsBrowseParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const migratedRef = useRef(false);

  useEffect(() => {
    if (migratedRef.current) return;
    const types = parseCsvParam(searchParams.get("type"));
    const wtypes = parseCsvParam(searchParams.get("wtype"));
    const tiers = parseNumberCsvParam(searchParams.get("tier"));
    const classes = parseCsvParam(searchParams.get("class"));
    const hasLegacy =
      types.length > 0 || wtypes.length > 0 || tiers.length > 0 || classes.length > 0;
    if (!hasLegacy) {
      migratedRef.current = true;
      return;
    }
    migratedRef.current = true;
    const folded = serializeLegacyBrowseFacets({ types, wtypes, tiers, classes });
    const next = new URLSearchParams(searchParams);
    for (const key of LEGACY_FACET_KEYS) next.delete(key);
    const existing = (next.get("search") ?? "").trim();
    next.set("search", [existing, folded].filter(Boolean).join(" ").trim());
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const params: ItemsBrowseParams = {
    search: searchParams.get("search") ?? "",
    sort: (searchParams.get("sort") as ItemSortKey | null) ?? "name",
  };

  const setParam = useCallback(
    (key: string, value: string, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      // Search owns filters — drop leftover facet keys if any.
      if (key === "search") {
        for (const facet of LEGACY_FACET_KEYS) next.delete(facet);
      }
      setSearchParams(next, { replace: options?.replace ?? false });
    },
    [searchParams, setSearchParams],
  );

  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters = Boolean(params.search.trim());

  const browseQuery = searchParams.toString();

  return { params, setParam, clearFilters, hasActiveFilters, browseQuery };
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
