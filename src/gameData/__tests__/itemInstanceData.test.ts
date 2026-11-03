import {
  instanceVariantKey,
  itemInfoFromDropFields,
  parseCompoundItemKey,
  parseCraftOutput,
  parseInstanceVariantKey,
} from "../itemInstanceData";

describe("itemInstanceData", () => {
  it("parses token shop cxjar-data keys", () => {
    expect(parseCompoundItemKey("cxjar-beekeeper")).toStrictEqual({
      name: "cxjar",
      data: "beekeeper",
      offerKey: "cxjar-beekeeper",
    });
    expect(parseCompoundItemKey("cxjar-xgravestone2")).toStrictEqual({
      name: "cxjar",
      data: "xgravestone2",
      offerKey: "cxjar-xgravestone2",
    });
    expect(parseCompoundItemKey("hpot0")).toStrictEqual({ name: "hpot0", offerKey: "hpot0" });
  });

  it("prefers known item prefixes when cosmetics contain hyphens", () => {
    expect(parseCompoundItemKey("cxjar-foo-bar", { cxjar: {}, "cxjar-foo": {} })).toStrictEqual({
      name: "cxjar-foo",
      data: "bar",
      offerKey: "cxjar-foo-bar",
    });
  });

  it("maps drop data/title fields onto ItemInfo", () => {
    expect(itemInfoFromDropFields({ itemKey: "cxjar", quantity: 1, data: "breyes" })).toStrictEqual(
      {
        name: "cxjar",
        q: 1,
        data: "breyes",
      },
    );
    // Legacy: jar cosmetic stuffed into title still works.
    expect(itemInfoFromDropFields({ itemKey: "cx", title: "marmor10a" })).toStrictEqual({
      name: "cxjar",
      data: "marmor10a",
    });
    expect(
      itemInfoFromDropFields({ itemKey: "emotionjar", data: "smile", title: "lucky" }),
    ).toStrictEqual({
      name: "emotionjar",
      data: "smile",
      p: "lucky",
    });
    expect(itemInfoFromDropFields({ itemKey: "cxbundle", data: "pinkb" })).toStrictEqual({
      name: "cxbundle",
      data: "pinkb",
    });
    expect(itemInfoFromDropFields({ itemKey: "sword", title: "lucky" })).toStrictEqual({
      name: "sword",
      p: "lucky",
    });
  });

  it("reads craft output overrides", () => {
    expect(
      parseCraftOutput({ output: { name: "cxjar", data: "makeawish" } }, "makeawishjar"),
    ).toStrictEqual({
      name: "cxjar",
      data: "makeawish",
    });
    expect(parseCraftOutput({}, "basketofeggs")).toStrictEqual({ name: "basketofeggs" });
  });

  it("keeps cxjar cosmetics in separate market/bank variant keys", () => {
    expect(instanceVariantKey({ data: "breyes" })).toBe("\0breyes");
    expect(instanceVariantKey({ data: "bathat" })).not.toBe(instanceVariantKey({ data: "breyes" }));
    expect(parseInstanceVariantKey("\0breyes")).toStrictEqual({ title: "", data: "breyes" });
    expect(parseInstanceVariantKey("lucky\0")).toStrictEqual({ title: "lucky" });
  });
});
