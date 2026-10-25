import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { GreedScrollKey, OfferingChoice, PriceTable, UPGRADE_SCROLL_KEYS } from "../calculators";

export type CalcMode = "upgrade" | "compound" | "greed";
export type CalcStrategy = "cheapest" | "fewest";
/** How Acquire costs the starting copy (upgrade/compound). */
export type AcquireMode = "buy" | "craft";

export type UpgradeCalcParams = {
  mode: CalcMode;
  item: string;
  /** Starting level (inclusive). Upgrade-only; compound always plans from +0. Greed = farm level. */
  from: number;
  target: number;
  strategy: CalcStrategy;
  /** Buy finished item, or craft from materials. */
  acquire: AcquireMode;
  luckySlot: boolean;
  serverUgrace: boolean;
  /** Property scroll + offering for +1 item grace (items with a `stat` pool). */
  statScrollGrace: boolean;
  /** Polish the +0 copy with an ingot/nugget for Shiny (server: level must be 0). */
  wantShiny: boolean;
  /** Polish material key; empty = cheapest valid EV. */
  polish: string;
  primstacking: boolean;
  scroll4: boolean;
  offeringp: boolean;
  offering: boolean;
  offeringx: boolean;
  /** Greed farm: uscroll key. */
  greedScroll: GreedScrollKey;
  /** Greed farm: offering grade (null = none). */
  greedOffering: OfferingChoice;
  /** Greed farm: target essence count. */
  greedTarget: number;
};

const DEFAULTS: UpgradeCalcParams = {
  mode: "upgrade",
  item: "",
  from: 0,
  target: 7,
  strategy: "cheapest",
  acquire: "buy",
  luckySlot: false,
  serverUgrace: false,
  statScrollGrace: false,
  wantShiny: false,
  polish: "",
  primstacking: true,
  scroll4: false,
  offeringp: true,
  offering: true,
  offeringx: true,
  /** High+ farm levels need scroll grade ≥ item grade; scroll0 never works for greed. */
  greedScroll: "scroll1",
  greedOffering: null,
  greedTarget: 1,
};

function parseMode(raw: string | null): CalcMode {
  if (raw === "compound") return "compound";
  if (raw === "greed") return "greed";
  return "upgrade";
}

function parseStrategy(raw: string | null): CalcStrategy {
  return raw === "fewest" ? "fewest" : "cheapest";
}

function parseAcquire(raw: string | null): AcquireMode {
  if (raw === "craft") return "craft";
  return "buy";
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw == null) return fallback;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return fallback;
}

function maxTarget(mode: CalcMode): number {
  if (mode === "compound") return 5;
  if (mode === "greed") return 12;
  return 12;
}

function defaultTarget(mode: CalcMode): number {
  if (mode === "compound") return 3;
  if (mode === "greed") return 1;
  return 7;
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
  if (mode === "greed") return Math.min(n, 12);
  return Math.min(n, Math.max(0, target - 1));
}

function parseGreedScroll(raw: string | null): GreedScrollKey {
  if (raw && (UPGRADE_SCROLL_KEYS as readonly string[]).includes(raw)) {
    return raw as GreedScrollKey;
  }
  return DEFAULTS.greedScroll;
}

function parseGreedOffering(raw: string | null): OfferingChoice {
  if (raw == null || raw === "" || raw === "none") return null;
  if (raw === "offeringp" || raw === "0") return 0;
  if (raw === "offering" || raw === "1") return 1;
  if (raw === "offeringx" || raw === "2") return 2;
  return null;
}

function parseGreedTarget(raw: string | null): number {
  if (raw == null || raw === "") return DEFAULTS.greedTarget;
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return DEFAULTS.greedTarget;
  return Math.min(n, 10_000);
}

function greedOfferingParam(offering: OfferingChoice): string | null {
  if (offering == null) return null;
  if (offering === 0) return "offeringp";
  if (offering === 1) return "offering";
  return "offeringx";
}

const PRICE_OVERRIDES_PARAM = "px";
const PRICE_KEY_RE = /^[a-zA-Z0-9_]+$/;

/** Parse `px=item:3e9,scroll0:100` price overrides from the share URL. */
export function parsePriceOverrides(searchParams: URLSearchParams): PriceTable {
  const raw = searchParams.get(PRICE_OVERRIDES_PARAM);
  if (!raw) return {};
  const out: PriceTable = {};
  for (const part of raw.split(",")) {
    const colon = part.indexOf(":");
    if (colon <= 0) continue;
    const key = part.slice(0, colon).trim();
    if (!PRICE_KEY_RE.test(key)) continue;
    const n = Number(part.slice(colon + 1));
    if (!Number.isFinite(n) || n < 0) continue;
    out[key] = n;
  }
  return out;
}

function appendPriceOverrides(sp: URLSearchParams, overrides: PriceTable): void {
  const keys = Object.keys(overrides).sort();
  if (!keys.length) return;
  const parts: string[] = [];
  for (const key of keys) {
    if (!PRICE_KEY_RE.test(key)) continue;
    const n = overrides[key];
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) continue;
    parts.push(`${key}:${n}`);
  }
  if (parts.length) sp.set(PRICE_OVERRIDES_PARAM, parts.join(","));
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
    acquire: parseAcquire(searchParams.get("acquire")),
    luckySlot: parseBool(searchParams.get("lucky"), DEFAULTS.luckySlot),
    serverUgrace: parseBool(searchParams.get("sugrace"), DEFAULTS.serverUgrace),
    statScrollGrace: parseBool(searchParams.get("ssgrace"), DEFAULTS.statScrollGrace),
    wantShiny: parseBool(searchParams.get("shiny"), DEFAULTS.wantShiny),
    polish: searchParams.get("polish") ?? DEFAULTS.polish,
    primstacking: parseBool(searchParams.get("prim"), DEFAULTS.primstacking),
    scroll4: parseBool(searchParams.get("s4"), DEFAULTS.scroll4),
    offeringp: parseBool(searchParams.get("op"), DEFAULTS.offeringp),
    offering: parseBool(searchParams.get("o"), DEFAULTS.offering),
    offeringx: parseBool(searchParams.get("ox"), DEFAULTS.offeringx),
    greedScroll: parseGreedScroll(searchParams.get("gscroll")),
    greedOffering: parseGreedOffering(searchParams.get("goffer")),
    greedTarget: parseGreedTarget(searchParams.get("n")),
  };
}

function writeParams(params: UpgradeCalcParams, priceOverrides: PriceTable = {}): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.mode !== DEFAULTS.mode) sp.set("mode", params.mode);
  if (params.item) sp.set("item", params.item);
  if (params.mode === "greed") {
    if (params.from > 0) sp.set("from", String(params.from));
    if (params.greedScroll !== DEFAULTS.greedScroll) sp.set("gscroll", params.greedScroll);
    const go = greedOfferingParam(params.greedOffering);
    if (go) sp.set("goffer", go);
    if (params.greedTarget !== DEFAULTS.greedTarget) sp.set("n", String(params.greedTarget));
    if (params.luckySlot) sp.set("lucky", "1");
    appendPriceOverrides(sp, priceOverrides);
    return sp;
  }
  if (params.from > 0 && params.mode === "upgrade") sp.set("from", String(params.from));
  if (params.target !== defaultTarget(params.mode)) {
    sp.set("target", String(params.target));
  }
  if (params.strategy !== DEFAULTS.strategy) sp.set("strategy", params.strategy);
  if (params.acquire !== DEFAULTS.acquire) sp.set("acquire", params.acquire);
  if (params.luckySlot) sp.set("lucky", "1");
  if (params.serverUgrace) sp.set("sugrace", "1");
  if (params.statScrollGrace) sp.set("ssgrace", "1");
  if (params.wantShiny) sp.set("shiny", "1");
  if (params.wantShiny && params.polish) sp.set("polish", params.polish);
  if (!params.primstacking) sp.set("prim", "0");
  if (params.scroll4) sp.set("s4", "1");
  if (!params.offeringp) sp.set("op", "0");
  if (!params.offering) sp.set("o", "0");
  if (!params.offeringx) sp.set("ox", "0");
  appendPriceOverrides(sp, priceOverrides);
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
  if (next.mode === "compound" || next.mode === "greed") {
    next.wantShiny = false;
    next.polish = "";
  }
  if (!next.wantShiny) next.polish = "";
  if (next.mode === "greed") next.acquire = "buy";
  if (next.acquire !== "buy" && next.acquire !== "craft") {
    next.acquire = "buy";
  }

  if (next.mode === "greed") {
    next.from = Math.min(Math.max(0, next.from), 12);
    next.greedTarget = Math.min(Math.max(1, Math.floor(next.greedTarget)), 10_000);
    if (!(UPGRADE_SCROLL_KEYS as readonly string[]).includes(next.greedScroll)) {
      next.greedScroll = DEFAULTS.greedScroll;
    }
    return next;
  }

  const cap = maxTarget(next.mode);
  next.target = Math.min(Math.max(1, next.target), cap);
  next.from = next.mode === "compound" ? 0 : Math.min(Math.max(0, next.from), next.target - 1);

  if (partial.target != null && next.from >= next.target) {
    next.from = Math.max(0, next.target - 1);
  }
  if (partial.from != null && next.from >= next.target) {
    next.target = Math.min(cap, next.from + 1);
  }

  // Server polish only applies at item level 0.
  if (next.from > 0) {
    next.wantShiny = false;
    next.polish = "";
  }

  return next;
}

export function useUpgradeCalcParams() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(() => parseUpgradeCalcParams(searchParams), [searchParams]);
  const priceOverrides = useMemo(() => parsePriceOverrides(searchParams), [searchParams]);

  const patch = useCallback(
    (partial: Partial<UpgradeCalcParams>, opts?: { replace?: boolean }) => {
      const next = normalizePatch(params, partial);
      setSearchParams(writeParams(next, priceOverrides), { replace: opts?.replace ?? false });
    },
    [params, priceOverrides, setSearchParams],
  );

  const setPriceOverrides = useCallback(
    (next: PriceTable | ((prev: PriceTable) => PriceTable), opts?: { replace?: boolean }) => {
      const resolved = typeof next === "function" ? next(priceOverrides) : next;
      setSearchParams(writeParams(params, resolved), { replace: opts?.replace ?? true });
    },
    [params, priceOverrides, setSearchParams],
  );

  return { params, patch, priceOverrides, setPriceOverrides };
}
