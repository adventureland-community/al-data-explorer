import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type DropSimMode = "exchange" | "kill";

export type DropSimParams = {
  mode: DropSimMode;
  table: string;
  monster: string;
  n: number;
  luckm: number;
  share: number;
  contributors: number;
  cooperative: boolean;
  oneHp: boolean;
  level: number;
  map: string;
  globals: boolean;
  konami: boolean;
  homeServer: boolean;
};

const DEFAULTS: DropSimParams = {
  mode: "exchange",
  table: "",
  monster: "",
  n: 1000,
  luckm: 1,
  share: 1,
  contributors: 1,
  cooperative: false,
  oneHp: false,
  level: 1,
  map: "",
  globals: false,
  konami: false,
  homeServer: false,
};

function parsePositiveNumber(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseNonNegInt(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw == null) return fallback;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

function parseUnitInterval(raw: string | null, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function parseMode(raw: string | null): DropSimMode {
  return raw === "kill" ? "kill" : "exchange";
}

export function parseDropSimParams(searchParams: URLSearchParams): DropSimParams {
  return {
    mode: parseMode(searchParams.get("mode")),
    table: searchParams.get("table") ?? "",
    monster: searchParams.get("monster") ?? "",
    n: Math.min(100_000, Math.floor(parsePositiveNumber(searchParams.get("n"), DEFAULTS.n))),
    luckm: parsePositiveNumber(searchParams.get("luckm"), DEFAULTS.luckm),
    share: parseUnitInterval(searchParams.get("share"), DEFAULTS.share),
    contributors: parseNonNegInt(searchParams.get("contributors"), DEFAULTS.contributors),
    cooperative: parseBool(searchParams.get("coop"), DEFAULTS.cooperative),
    oneHp: parseBool(searchParams.get("oneHp"), DEFAULTS.oneHp),
    level: parsePositiveNumber(searchParams.get("level"), DEFAULTS.level),
    map: searchParams.get("map") ?? "",
    globals: parseBool(searchParams.get("globals"), DEFAULTS.globals),
    konami: parseBool(searchParams.get("konami"), DEFAULTS.konami),
    homeServer: parseBool(searchParams.get("home"), DEFAULTS.homeServer),
  };
}

function writeParam(next: URLSearchParams, key: string, value: string, defaultValue: string) {
  if (!value || value === defaultValue) next.delete(key);
  else next.set(key, value);
}

export function serializeDropSimParams(params: DropSimParams): URLSearchParams {
  const next = new URLSearchParams();
  if (params.mode !== "exchange") next.set("mode", params.mode);
  writeParam(next, "table", params.table, "");
  writeParam(next, "monster", params.monster, "");
  writeParam(next, "n", String(params.n), String(DEFAULTS.n));
  writeParam(next, "luckm", String(params.luckm), String(DEFAULTS.luckm));
  writeParam(next, "share", String(params.share), String(DEFAULTS.share));
  writeParam(next, "contributors", String(params.contributors), String(DEFAULTS.contributors));
  if (params.cooperative) next.set("coop", "1");
  if (params.oneHp) next.set("oneHp", "1");
  writeParam(next, "level", String(params.level), String(DEFAULTS.level));
  writeParam(next, "map", params.map, "");
  if (params.globals) next.set("globals", "1");
  if (params.konami) next.set("konami", "1");
  if (params.homeServer) next.set("home", "1");
  return next;
}

export function useDropSimParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseDropSimParams(searchParams), [searchParams]);

  const patch = useCallback(
    (partial: Partial<DropSimParams>, options?: { replace?: boolean }) => {
      const merged = { ...parseDropSimParams(searchParams), ...partial };
      setSearchParams(serializeDropSimParams(merged), { replace: options?.replace ?? true });
    },
    [searchParams, setSearchParams],
  );

  const setParams = useCallback(
    (next: DropSimParams, options?: { replace?: boolean }) => {
      setSearchParams(serializeDropSimParams(next), { replace: options?.replace ?? true });
    },
    [setSearchParams],
  );

  return { params, patch, setParams, defaults: DEFAULTS };
}
