import {
  buildUpgradeBugReportSnapshot,
  buildUpgradeIssueUrl,
  formatUpgradeBugReportMarkdown,
  UPGRADE_BUG_REPORT_VERSION,
} from "../upgradeBugReport";
import type { UpgradeCalcParams } from "../useUpgradeCalcParams";

const params: UpgradeCalcParams = {
  mode: "upgrade",
  item: "glolipop",
  from: 0,
  target: 10,
  strategy: "cheapest",
  acquire: "buy",
  useMarketPrices: true,
  luckySlot: false,
  failstack: true,
  serverUgrace: false,
  statScrollGrace: false,
  wantShiny: true,
  polish: "",
  primstacking: true,
  ograce: true,
  scroll4: false,
  offeringp: true,
  offering: true,
  offeringx: true,
  taxRate: 0.025,
  greedScroll: "scroll1",
  greedOffering: null,
  greedTarget: 1,
};

describe("upgradeBugReport", () => {
  it("includes params, overrides, and ceil shopping list", () => {
    const snapshot = buildUpgradeBugReportSnapshot({
      url: "https://example.test/upgrade?item=glolipop&shiny=1&target=10",
      params,
      priceOverrides: { glolipop: 3_500_000 },
      prices: { glolipop: 3_500_000, scroll1: 400, offeringp: 2_500_000 },
      stepOverrides: { "0-1": { primstacking: 3 } },
      itemKey: "glolipop",
      itemName: "Lolipop Mace",
      itemValue: 3_500_000,
      planEv: 5_510_000_000,
      materials: [
        {
          itemKey: "glolipop",
          expectedQty: 437.2,
          unitPrice: 3_500_000,
          total: 437.2 * 3_500_000,
        },
        {
          itemKey: "scroll1",
          expectedQty: 10.2,
          unitPrice: 400,
          total: 4080,
        },
      ],
      steps: [
        {
          fromLevel: 0,
          toLevel: 1,
          scrollKey: "scroll1",
          offeringKey: null,
          primstacking: 3,
          primstackingStatClicks: 0,
          primstackingNormal: 3,
          primstackingStatScrollEach: 0,
          statScrollGrace: 0,
          failstack: 0,
          ograce: 0,
          chance: 0.9,
          attempts: 1 / 0.9,
          stepSpend: 1000,
          runningTotal: 1000,
          shrineMs: 0,
        },
      ],
    });

    expect(snapshot.reportVersion).toBe(UPGRADE_BUG_REPORT_VERSION);
    expect(snapshot.params.wantShiny).toBe(true);
    expect(snapshot.priceOverrides.glolipop).toBe(3_500_000);
    expect(snapshot.stepOverrides["0-1"]?.primstacking).toBe(3);
    expect(snapshot.plan.materials[0].buyQty).toBe(438);
    expect(snapshot.plan.materials[1].buyQty).toBe(11);

    const md = formatUpgradeBugReportMarkdown(snapshot);
    expect(md).toContain("glolipop × 438");
    expect(md).toContain("scroll1 × 11");
    expect(md).toContain('"wantShiny": true');
    expect(md).toContain("Machine-readable snapshot");
  });

  it("builds a GitHub issue URL when short enough", () => {
    const url = buildUpgradeIssueUrl({
      markdownBody: "short body",
      maxLength: 10_000,
    });
    expect(url).toContain("github.com/adventureland-community/al-data-explorer/issues/new");
    expect(url).toContain("body=short");
    expect(buildUpgradeIssueUrl({ markdownBody: "x".repeat(20_000), maxLength: 1000 })).toBeNull();
  });
});
