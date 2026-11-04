import type {
  MaterialLine,
  PlanSummaryStep,
  PriceTable,
  UpgradeStepOverride,
} from "../calculators";
import type { UpgradeCalcParams } from "./useUpgradeCalcParams";

export const UPGRADE_BUG_REPORT_VERSION = 1;

export const UPGRADE_ISSUES_URL =
  "https://github.com/adventureland-community/al-data-explorer/issues/new?title=Upgrade%20Calculator%3A%20";

export type UpgradeBugReportInput = {
  url: string;
  params: UpgradeCalcParams;
  priceOverrides: PriceTable;
  /** Resolved planner prices (vendor/market/overrides). */
  prices: PriceTable;
  stepOverrides: Record<string, UpgradeStepOverride>;
  itemKey: string | null;
  itemName?: string | null;
  itemValue: number;
  planEv: number | null;
  materials: MaterialLine[] | null;
  steps: PlanSummaryStep[] | null;
  notes?: string;
};

export type UpgradeBugReportSnapshot = {
  reportVersion: number;
  generatedAt: string;
  url: string;
  item: {
    key: string | null;
    name: string | null;
    unitPrice: number;
  };
  params: UpgradeCalcParams;
  priceOverrides: PriceTable;
  pricesUsed: PriceTable;
  stepOverrides: Record<string, UpgradeStepOverride>;
  plan: {
    totalExpectedCost: number | null;
    materials: {
      itemKey: string;
      expectedQty: number;
      buyQty: number;
      unitPrice: number;
      total: number;
    }[];
    steps: {
      kind?: PlanSummaryStep["kind"];
      fromLevel: number;
      toLevel: number;
      scrollKey: string;
      offeringKey: string | null;
      primstacking: number;
      failstack: number;
      ograce: number;
      chance: number;
      attempts: number;
      stepSpend: number;
    }[];
  };
};

function buyQty(expected: number): number {
  if (!Number.isFinite(expected) || expected <= 0) return 0;
  return Math.max(1, Math.ceil(expected));
}

function pickPricesUsed(prices: PriceTable, materials: MaterialLine[] | null): PriceTable {
  const out: PriceTable = {};
  const keys = new Set<string>();
  if (materials) {
    for (let i = 0; i < materials.length; i++) {
      keys.add(materials[i].itemKey);
    }
  }
  const extras = [
    "scroll0",
    "scroll1",
    "scroll2",
    "scroll3",
    "scroll4",
    "cscroll0",
    "cscroll1",
    "cscroll2",
    "cscroll3",
    "offeringp",
    "offering",
    "offeringx",
    "strscroll",
    "dexscroll",
    "bronzeingot",
    "bronzenugget",
  ];
  for (let i = 0; i < extras.length; i++) keys.add(extras[i]);
  for (const key of keys) {
    const n = prices[key];
    if (typeof n === "number" && Number.isFinite(n)) out[key] = n;
  }
  return out;
}

export function buildUpgradeBugReportSnapshot(
  input: UpgradeBugReportInput,
): UpgradeBugReportSnapshot {
  const materials = input.materials ?? [];
  const steps = input.steps ?? [];
  return {
    reportVersion: UPGRADE_BUG_REPORT_VERSION,
    generatedAt: new Date().toISOString(),
    url: input.url,
    item: {
      key: input.itemKey,
      name: input.itemName ?? null,
      unitPrice: input.itemValue,
    },
    params: { ...input.params },
    priceOverrides: { ...input.priceOverrides },
    pricesUsed: pickPricesUsed(input.prices, input.materials),
    stepOverrides: { ...input.stepOverrides },
    plan: {
      totalExpectedCost:
        input.planEv != null && Number.isFinite(input.planEv) ? input.planEv : null,
      materials: materials.map((m) => ({
        itemKey: m.itemKey,
        expectedQty: m.expectedQty,
        buyQty: m.itemKey === "_stacks" || m.itemKey === "_craft_fee" ? 0 : buyQty(m.expectedQty),
        unitPrice: m.unitPrice,
        total: m.total,
      })),
      steps: steps.map((s) => ({
        kind: s.kind,
        fromLevel: s.fromLevel,
        toLevel: s.toLevel,
        scrollKey: s.scrollKey,
        offeringKey: s.offeringKey,
        primstacking: s.primstacking,
        failstack: s.failstack,
        ograce: s.ograce,
        chance: s.chance,
        attempts: s.attempts,
        stepSpend: s.stepSpend,
      })),
    },
  };
}

export function formatUpgradeBugReportMarkdown(
  snapshot: UpgradeBugReportSnapshot,
  notes?: string,
): string {
  const lines: string[] = [
    "## Upgrade Calculator bug report",
    "",
    `reportVersion: ${snapshot.reportVersion}`,
    `generatedAt: ${snapshot.generatedAt}`,
    `url: ${snapshot.url}`,
    "",
    "### Item",
    `- key: ${snapshot.item.key ?? "(none)"}`,
    `- name: ${snapshot.item.name ?? "(none)"}`,
    `- unitPrice: ${snapshot.item.unitPrice}`,
    "",
    "### Params",
    "```json",
    JSON.stringify(snapshot.params, null, 2),
    "```",
    "",
    "### Price overrides (px)",
    "```json",
    JSON.stringify(snapshot.priceOverrides, null, 2),
    "```",
    "",
    "### Step overrides (ov)",
    "```json",
    JSON.stringify(snapshot.stepOverrides, null, 2),
    "```",
    "",
    "### Shopping list (ceil buy)",
  ];

  if (!snapshot.plan.materials.length) {
    lines.push("(no materials)");
  } else {
    for (let i = 0; i < snapshot.plan.materials.length; i++) {
      const m = snapshot.plan.materials[i];
      if (m.itemKey === "_stacks" || m.itemKey === "_craft_fee") {
        lines.push(`- ${m.itemKey}: ${m.total}`);
      } else {
        lines.push(`- ${m.itemKey} × ${m.buyQty} (expect ${m.expectedQty}) = ${m.total}`);
      }
    }
  }

  lines.push(
    "",
    `planEv: ${snapshot.plan.totalExpectedCost ?? "null"}`,
    "",
    "### Plan steps",
    "```json",
    JSON.stringify(snapshot.plan.steps, null, 2),
    "```",
    "",
    "### Prices used (resolved)",
    "```json",
    JSON.stringify(snapshot.pricesUsed, null, 2),
    "```",
    "",
    "### Machine-readable snapshot",
    "```json",
    JSON.stringify(snapshot),
    "```",
  );

  if (notes && notes.trim()) {
    lines.push("", "### Notes", notes.trim());
  }

  lines.push("", "### What went wrong?", "", "", "### What did you expect?", "");

  return lines.join("\n");
}

/** GitHub `new issue` URL; returns null when the body would blow typical URL limits. */
export function buildUpgradeIssueUrl(args: {
  title?: string;
  markdownBody: string;
  maxLength?: number;
}): string | null {
  const title = args.title ?? "Upgrade Calculator: ";
  const maxLength = args.maxLength ?? 6000;
  const base = "https://github.com/adventureland-community/al-data-explorer/issues/new";
  const sp = new URLSearchParams();
  sp.set("title", title);
  sp.set("body", args.markdownBody);
  const url = `${base}?${sp.toString()}`;
  if (url.length > maxLength) return null;
  return url;
}
