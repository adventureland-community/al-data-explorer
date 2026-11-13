import type { GData, ItemKey } from "typed-adventureland";
import { useEffect, useState } from "react";

import { itemUpgradeMode } from "../gameData/itemUpgradeSnapshot";
import { itemCalcUnitRange, type ItemCalcRange, type ItemRef } from "./marketPriceCompare";
import type { ItemsByNameTitleLevel } from "./merchantTypes";

export type ItemCalcRangeStatus = "idle" | "loading" | "ready";

export type ItemCalcRangeState = {
  status: ItemCalcRangeStatus;
  range?: ItemCalcRange;
};

function needsHeavyUpgradeCalc(item: ItemRef, G: GData | undefined): boolean {
  if (!G) return false;
  const level = item.level ?? 0;
  if (level < 1) return false;
  const gItem = G.items[item.name as ItemKey];
  return !!gItem && !!itemUpgradeMode(gItem);
}

/**
 * Compute market calc range after the expand paints.
 * Upgrade/compound paths are deferred (spinner). Flat items settle sync with no upgrade path
 * (NPC ranges may still be returned for gold "vs npc"; the Calc glance ignores them).
 */
export function useItemCalcRange(
  enabled: boolean,
  item: ItemRef,
  args: { G?: GData; market?: ItemsByNameTitleLevel },
): ItemCalcRangeState {
  const { G, market } = args;
  const { name, level } = item;
  const [state, setState] = useState<ItemCalcRangeState>({ status: "idle" });

  useEffect(() => {
    const ref: ItemRef = { name, level };

    if (!enabled) {
      setState({ status: "idle" });
      return;
    }

    if (!needsHeavyUpgradeCalc(ref, G)) {
      setState({
        status: "ready",
        range: itemCalcUnitRange(ref, { G, market }),
      });
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });

    const run = () => {
      if (cancelled) return;
      const range = itemCalcUnitRange(ref, { G, market });
      if (!cancelled) setState({ status: "ready", range });
    };

    // Yield so Collapse / offer tables (and the spinner) paint before heavy EV work.
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    let rafId = 0;
    rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      if (typeof win.requestIdleCallback === "function") {
        idleId = win.requestIdleCallback(run, { timeout: 400 });
      } else {
        timeoutId = window.setTimeout(run, 0);
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (idleId != null && typeof win.cancelIdleCallback === "function") {
        win.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [enabled, name, level, G, market]);

  return state;
}
