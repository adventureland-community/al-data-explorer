import { encodeLoadoutParam, decodeLoadoutParam } from "../loadoutUrl";

describe("loadoutUrl", () => {
  it("roundtrips gear class level and target", () => {
    const state = {
      gear: { mainhand: { name: "harbringer", level: 8 } },
      classKey: "priest" as const,
      level: 80,
      target: "ent",
    };
    const encoded = encodeLoadoutParam(state);
    const decoded = decodeLoadoutParam(encoded);
    expect(decoded?.gear.mainhand?.name).toBe("harbringer");
    expect(decoded?.gear.mainhand?.level).toBe(8);
    expect(decoded?.classKey).toBe("priest");
    expect(decoded?.level).toBe(80);
    expect(decoded?.target).toBe("ent");
  });
});
