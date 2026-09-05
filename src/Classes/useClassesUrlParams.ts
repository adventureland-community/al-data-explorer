import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { isSkillKind, SkillKind, SkillSortKey } from "../gameData/classSkills";
import { parseCsvParam, writeCsvParam } from "../Items/useItemsUrlParams";

const SORT_KEYS: SkillSortKey[] = ["name", "class", "mp", "cooldown", "type"];

function parseSort(raw: string | null): SkillSortKey {
  if (!raw) return "name";
  for (const key of SORT_KEYS) {
    if (key === raw) return key;
  }
  return "name";
}

function parseKinds(raw: string | null): SkillKind[] {
  const kinds: SkillKind[] = [];
  for (const value of parseCsvParam(raw)) {
    if (isSkillKind(value) && !kinds.includes(value)) kinds.push(value);
  }
  return kinds;
}

export type ClassesBrowseParams = {
  search: string;
  classes: string[];
  kinds: SkillKind[];
  types: string[];
  sort: SkillSortKey;
};

export function useClassesUrlParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: ClassesBrowseParams = {
    search: searchParams.get("search") ?? "",
    classes: parseCsvParam(searchParams.get("class")),
    kinds: parseKinds(searchParams.get("kind")),
    types: parseCsvParam(searchParams.get("type")),
    sort: parseSort(searchParams.get("sort")),
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
    (key: "class" | "kind" | "type", values: string[]) => {
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
      params.classes.length > 0 ||
      params.kinds.length > 0 ||
      params.types.length > 0,
  );

  const browseQuery = searchParams.toString();

  return { params, setParam, setListParam, clearFilters, hasActiveFilters, browseQuery };
}
