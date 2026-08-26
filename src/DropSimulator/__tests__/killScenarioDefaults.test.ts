import {
  coopKillScenario,
  equalSplitShare,
  liveKillScenario,
  soloKillScenario,
  TYPICAL_COOP_PARTY,
} from "../killScenarioDefaults";

describe("killScenarioDefaults", () => {
  it("solo monster gets share 1 and contributors 1", () => {
    expect(liveKillScenario({ cooperative: false, oneHp: false })).toStrictEqual({
      cooperative: false,
      oneHp: false,
      share: 1,
      contributors: 1,
      map: "",
      globals: true,
    });
  });

  it("coop monster gets equal split at typical party size", () => {
    expect(liveKillScenario({ cooperative: true, oneHp: false })).toStrictEqual({
      cooperative: true,
      oneHp: false,
      share: 0.1,
      contributors: TYPICAL_COOP_PARTY,
      map: "",
      globals: true,
    });
  });

  it("coop 1hp monster keeps share 1", () => {
    expect(liveKillScenario({ cooperative: true, oneHp: true })).toStrictEqual({
      cooperative: true,
      oneHp: true,
      share: 1,
      contributors: TYPICAL_COOP_PARTY,
      map: "",
      globals: true,
    });
  });

  it("seeds spawn map when provided", () => {
    expect(
      liveKillScenario({ cooperative: false, oneHp: false }, { map: "main", globals: true }),
    ).toMatchObject({ map: "main", globals: true });
  });

  it("equalSplitShare divides by party size", () => {
    expect(equalSplitShare(10)).toBe(0.1);
    expect(equalSplitShare(5)).toBe(0.2);
  });

  it("coopKillScenario respects custom party size", () => {
    expect(coopKillScenario(false, 5)).toStrictEqual({
      cooperative: true,
      oneHp: false,
      share: 0.2,
      contributors: 5,
    });
  });

  it("soloKillScenario clears coop knobs", () => {
    expect(soloKillScenario()).toStrictEqual({
      cooperative: false,
      oneHp: false,
      share: 1,
      contributors: 1,
    });
  });
});
