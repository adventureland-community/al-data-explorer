import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type CalcMode = "upgrade" | "compound";
export type CalcStrategy = "cheapest" | "fewest";

export type UpgradeCalcParams = {
  mode: CalcMode;
  item: string;
  /** Starting level (inclusive). Upgrade-only; compound always plans from +0. */
  from: number;
  target: number;
  strategy: CalcStrategy;
  luckySlot: boolean;
  serverUgrace: boolean;
  /** Property scroll + offering for +1 item grace (items with a `stat` pool). */
  statScrollGrace: boolean;
  /** Append an ingot/nugget polish step for the Shiny title after the path. */
  wantShiny: boolean;
  /** Polish material key; empty = cheapest valid EV. */
  polish: string;
  primlings: boolean;
  scroll4: boolean;
  offeringp: boolean;
  offering: boolean;
  offeringx: boolean;
};

const DEFAULTS: UpgradeCalcParams = {
  mode: "upgrade",
  item: "",
  from: 0,
  target: 7,
  strategy: "cheapest",
  luckySlot: false,
  serverUgrace: false,
  statScrollGrace: false,
  wantShiny: false,
  polish: "",
  primlings: true,
  scroll4: false,
  offeringp: true,
  offering: true,
  offeringx: true,
};

function parseMode(raw: string | null): CalcMode {
  return raw === "compound" ? "compound" : "upgrade";
}

function parseStrategy(raw: string | null): CalcStrategy {
  return raw === "fewest" ? "fewest" : "cheapest";
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw == null) return fallback;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

function maxTarget(mode: CalcMode): number {
  return mode === "compound" ? 5 : 12;
}

function defaultTarget(mode: CalcMode): number {
  return mode === "compound" ? 3 : 7;
}

function parseTarget(raw: string | null, mode: CalcMode): number {
  const fallback = defaultTarget(mode);
  if (raw == null || raw === "") return fallback;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, maxTarget(mode));
}

function parseFrom(raw: string | null, mode: CalcMode, target: number): number {
  if (mode === "compound") return 0;
  if (raw == null || raw === "") return 0;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, Math.max(0, target - 1));
}

export function parseUpgradeCalcParams(searchParams: URLSearchParams): UpgradeCalcParams {
  const mode = parseMode(searchParams.get("mode"));
  const target = parseTarget(searchParams.get("target"), mode);
  return {
    mode,
    item: searchParams.get("item") ?? "",
    from: parseFrom(searchParams.get("from"), mode, target),
    target,
    strategy: parseStrategy(searchParams.get("strategy")),
    luckySlot: parseBool(searchParams.get("lucky"), DEFAULTS.luckySlot),
    serverUgrace: parseBool(searchParams.get("sugrace"), DEFAULTS.serverUgrace),
    statScrollGrace: parseBool(searchParams.get("ssgrace"), DEFAULTS.statScrollGrace),
    wantShiny: parseBool(searchParams.get("shiny"), DEFAULTS.wantShiny),
    polish: searchParams.get("polish") ?? DEFAULTS.polish,
    primlings: parseBool(searchParams.get("prim"), DEFAULTS.primlings),
    scroll4: parseBool(searchParams.get("s4"), DEFAULTS.scroll4),
    offeringp: parseBool(searchParams.get("op"), DEFAULTS.offeringp),
    offering: parseBool(searchParams.get("o"), DEFAULTS.offering),
    offeringx: parseBool(searchParams.get("ox"), DEFAULTS.offeringx),
  };
}

function writeParams(params: UpgradeCalcParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.mode !== DEFAULTS.mode) sp.set("mode", params.mode);
  if (params.item) sp.set("item", params.item);
  if (params.from > 0 && params.mode === "upgrade") sp.set("from", String(params.from));
  if (params.target !== defaultTarget(params.mode)) {
    sp.set("target", String(params.target));
  }
  if (params.strategy !== DEFAULTS.strategy) sp.set("strategy", params.strategy);
  if (params.luckySlot) sp.set("lucky", "1");
  if (params.serverUgrace) sp.set("sugrace", "1");
  if (params.statScrollGrace) sp.set("ssgrace", "1");
  if (params.wantShiny) sp.set("shiny", "1");
  if (params.wantShiny && params.polish) sp.set("polish", params.polish);
  if (!params.primlings) sp.set("prim", "0");
  if (params.scroll4) sp.set("s4", "1");
  if (!params.offeringp) sp.set("op", "0");
  if (!params.offering) sp.set("o", "0");
  if (!params.offeringx) sp.set("ox", "0");
  return sp;
}

function normalizePatch(
  prev: UpgradeCalcParams,
  partial: Partial<UpgradeCalcParams>,
): UpgradeCalcParams {
  const next = { ...prev, ...partial };

  if (partial.mode && partial.mode !== prev.mode && partial.target == null) {
    next.target = defaultTarget(partial.mode);
  }
  if (partial.mode === "compound" || (next.mode === "compound" && partial.from == null)) {
    next.from = 0;
  }
  if (next.mode === "compound") {
    next.wantShiny = false;
    next.polish = "";
  }
  if (!next.wantShiny) next.polish = "";

  const cap = maxTarget(next.mode);
  next.target = Math.min(Math.max(1, next.target), cap);
  next.from = next.mode === "compound" ? 0 : Math.min(Math.max(0, next.from), next.target - 1);

  if (partial.target != null && next.from >= next.target) {
    next.from = Math.max(0, next.target - 1);
  }
  if (partial.from != null && next.from >= next.target) {
    next.target = Math.min(cap, next.from + 1);
  }

  return next;
}

export function useUpgradeCalcParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseUpgradeCalcParams(searchParams), [searchParams]);

  const patch = useCallback(
    (partial: Partial<UpgradeCalcParams>, opts?: { replace?: boolean }) => {
      const next = normalizePatch(params, partial);
      setSearchParams(writeParams(next), { replace: opts?.replace ?? false });
    },
    [params, setSearchParams],
  );

  return { params, patch };
}
