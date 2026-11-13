import type { GData } from "typed-adventureland";
import { useEffect, useState } from "react";

import { barterCalcSides, type BarterCalcSides, type GoldEstimate } from "./marketPriceCompare";
import { wantTradeSides, type WantOfferRow } from "./marketOfferRows";
import type { ItemsByNameTitleLevel } from "./merchantTypes";

export type WantBarterCalcState = {
  /** True until every row has been evaluated (spinner). */
  pending: boolean;
  /** Parallel to `rows`; null slots mean not yet computed. */
  splits: (BarterCalcSides | null)[];
};

/**
 * Upgrade/compound EV for want-barter rows, after the panel paints.
 * One row per idle slice so expand stays interactive; shared cache across rows.
 */
export function useWantBarterCalcs(
  rows: WantOfferRow[],
  viewedItem: { name: string; level?: number },
  args: { G?: GData; market?: ItemsByNameTitleLevel },
): WantBarterCalcState {
  const { G, market } = args;
  const viewedName = viewedItem.name;
  const viewedLevel = viewedItem.level;
  // Seed pending so the first paint shows spinners, not dashes, before the effect runs.
  const [splits, setSplits] = useState<(BarterCalcSides | null)[]>(() =>
    rows.length > 0 ? rows.map(() => null) : [],
  );
  const [pending, setPending] = useState(() => rows.length > 0);

  useEffect(() => {
    const viewed = { name: viewedName, level: viewedLevel };
    if (rows.length === 0) {
      setSplits([]);
      setPending(false);
      return;
    }

    let cancelled = false;
    const next: (BarterCalcSides | null)[] = rows.map(() => null);
    setSplits(next.slice());
    setPending(true);

    const cache = new Map<string, GoldEstimate | undefined>();
    let index = 0;

    const win = window as Window & {
      requestIdleCallback?: (
        cb: (deadline: { timeRemaining: () => number }) => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    let idleId: number | undefined;
    let timeoutId: number | undefined;
    let rafId = 0;

    const publish = () => {
      if (!cancelled) setSplits(next.slice());
    };

    const runChunk = (timeRemaining?: () => number) => {
      if (cancelled) return;
      // At least one row per wake; stop when the frame budget is spent.
      const budgetMs = 8;
      const started = performance.now();
      while (index < rows.length) {
        const row = rows[index];
        const sides = wantTradeSides(row, viewed);
        next[index] = sides
          ? barterCalcSides(sides, { G, market, light: false }, cache)
          : { compare: null };
        index += 1;
        const elapsed = performance.now() - started;
        const remaining = timeRemaining ? timeRemaining() : budgetMs - elapsed;
        if (remaining <= 0 || elapsed >= budgetMs) break;
      }
      publish();
      if (index >= rows.length) {
        if (!cancelled) setPending(false);
        return;
      }
      if (typeof win.requestIdleCallback === "function") {
        idleId = win.requestIdleCallback((deadline) => runChunk(() => deadline.timeRemaining()), {
          timeout: 200,
        });
      } else {
        timeoutId = window.setTimeout(() => runChunk(), 0);
      }
    };

    // Yield so the want table + spinners paint before the first EV.
    rafId = window.requestAnimationFrame(() => {
      if (cancelled) return;
      if (typeof win.requestIdleCallback === "function") {
        idleId = win.requestIdleCallback((deadline) => runChunk(() => deadline.timeRemaining()), {
          timeout: 200,
        });
      } else {
        timeoutId = window.setTimeout(() => runChunk(), 0);
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
  }, [rows, viewedName, viewedLevel, G, market]);

  return { pending, splits };
}
