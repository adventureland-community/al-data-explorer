import { breakEvenListPrice, DEFAULT_MERCHANT_TAX, netAfterTax } from "../merchantTax";

describe("merchantTax", () => {
  it("defaults to 2.5% tax", () => {
    expect(DEFAULT_MERCHANT_TAX).toBe(0.025);
  });

  it("ceils list price so net covers cost", () => {
    const cost = 1_000_000;
    const list = breakEvenListPrice(cost, 0.025);
    expect(list).toBe(Math.ceil(cost / 0.975));
    expect(netAfterTax(list!, 0.025)).toBeGreaterThanOrEqual(cost);
  });

  it("returns 0 for zero cost", () => {
    expect(breakEvenListPrice(0, 0.025)).toBe(0);
  });

  it("rejects tax at or above 100%", () => {
    expect(breakEvenListPrice(100, 1)).toBeNull();
    expect(breakEvenListPrice(100, 1.5)).toBeNull();
    expect(netAfterTax(100, 1)).toBeNull();
  });

  it("rejects negative / non-finite inputs", () => {
    expect(breakEvenListPrice(-1, 0.025)).toBeNull();
    expect(breakEvenListPrice(NaN, 0.025)).toBeNull();
    expect(breakEvenListPrice(100, -0.1)).toBeNull();
    expect(breakEvenListPrice(100, NaN)).toBeNull();
  });

  it("with 0% tax, list equals ceil(cost)", () => {
    expect(breakEvenListPrice(100.4, 0)).toBe(101);
    expect(breakEvenListPrice(100, 0)).toBe(100);
  });
});
