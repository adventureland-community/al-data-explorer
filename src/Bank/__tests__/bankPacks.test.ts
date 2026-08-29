import {
  compareBankPackKeys,
  getBankItemPackKeys,
  isCustomBankPack,
  isOfficialBankPack,
} from "../bankPacks";

describe("bankPacks", () => {
  it("recognizes official bank packs", () => {
    expect(isOfficialBankPack("items0")).toBe(true);
    expect(isOfficialBankPack("items47")).toBe(true);
    expect(isCustomBankPack("earthMer")).toBe(true);
    expect(isCustomBankPack("inventory")).toBe(true);
  });

  it("sorts official packs before custom tabs", () => {
    const keys = getBankItemPackKeys({
      earthMer: [{ name: "hpot0" }],
      items1: [null],
      items0: [{ name: "blade" }],
    });

    expect(keys).toStrictEqual(["items0", "items1", "earthMer"]);
    expect(compareBankPackKeys("items10", "items2")).toBe(8);
  });
});
