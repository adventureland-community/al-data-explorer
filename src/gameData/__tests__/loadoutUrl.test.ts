import { encodeLoadoutParam, decodeLoadoutParam } from "../loadoutUrl";
import { parseCombatSimParams, writeCombatSimParams } from "../combatSimUrl";

describe("loadoutUrl", () => {
  it("roundtrips gear class level target and splash", () => {
    const state = {
      gear: { mainhand: { name: "harbringer", level: 8 } },
      classKey: "priest" as const,
      level: 80,
      target: "ent",
      splashTargetCount: 3,
    };
    const encoded = encodeLoadoutParam(state);
    const decoded = decodeLoadoutParam(encoded);
    expect(decoded?.gear.mainhand?.name).toBe("harbringer");
    expect(decoded?.gear.mainhand?.level).toBe(8);
    expect(decoded?.classKey).toBe("priest");
    expect(decoded?.level).toBe(80);
    expect(decoded?.target).toBe("ent");
    expect(decoded?.splashTargetCount).toBe(3);
  });

  it("roundtrips combat sim toggles in encoded gear blob", () => {
    const state = {
      gear: {},
      level: 80,
      assumeChargeBuffs: true,
      useSkillRotation: false,
      assumeMarked: true,
      comboStacks: 5,
    };
    const decoded = decodeLoadoutParam(encodeLoadoutParam(state));
    expect(decoded?.assumeChargeBuffs).toBe(true);
    expect(decoded?.useSkillRotation).toBe(false);
    expect(decoded?.assumeMarked).toBe(true);
    expect(decoded?.comboStacks).toBe(5);
  });
});

describe("combatSimUrl", () => {
  it("writes and parses sim query params", () => {
    const params = new URLSearchParams();
    writeCombatSimParams(params, {
      splashTargetCount: 2,
      assumeChargeBuffs: true,
      useSkillRotation: false,
      assumeMarked: true,
      comboStacks: 4,
    });
    const parsed = parseCombatSimParams(params);
    expect(parsed.splashTargetCount).toBe(2);
    expect(parsed.assumeChargeBuffs).toBe(true);
    expect(parsed.useSkillRotation).toBe(false);
    expect(parsed.assumeMarked).toBe(true);
    expect(parsed.comboStacks).toBe(4);
  });
});
