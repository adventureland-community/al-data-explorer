import { buildStackTables, failstackUnitCost, ograceUnitCost } from "../upgradeStacks";
import { PriceTable } from "../upgradePrices";

const PRICES: PriceTable = {
  helmet: 3200,
  scroll0: 1000,
  scroll1: 40000,
  scroll2: 1_600_000,
  scroll3: 300_000_000,
  scroll4: 50_000_000_000,
  offeringp: 5_000_000,
  offering: 27_420_000,
  offeringx: 650_000_000,
};

describe("upgradeStacks", () => {
  it("zero stacks cost zero", () => {
    const tables = buildStackTables(PRICES);
    expect(failstackUnitCost(tables, 8, 0)).toBe(0);
    expect(ograceUnitCost(tables, 0)).toBe(0);
  });

  it("failstack ugrace 1..N has finite costs for mid levels", () => {
    const tables = buildStackTables(PRICES);
    for (let ugrace = 1; ugrace <= 6; ugrace++) {
      const cost = failstackUnitCost(tables, 8, ugrace);
      expect(Number.isFinite(cost)).toBe(true);
      expect(cost).toBeGreaterThan(0);
    }
  });

  it("ograce steps have finite increasing costs", () => {
    const tables = buildStackTables(PRICES);
    const c1 = ograceUnitCost(tables, 1);
    const c5 = ograceUnitCost(tables, 5);
    expect(Number.isFinite(c1)).toBe(true);
    expect(Number.isFinite(c5)).toBe(true);
    expect(c5).toBeGreaterThanOrEqual(c1);
  });
});
