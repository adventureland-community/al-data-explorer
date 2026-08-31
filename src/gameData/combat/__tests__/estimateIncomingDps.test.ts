import { estimateIncomingDps } from "../estimateIncomingDps";
import { incomingReflectionFactor, outgoingReflectionRisk } from "../hitModifiers";

describe("estimateIncomingDps", () => {
  const player = {
    attack: 100,
    frequency: 2,
    damage_type: "physical" as const,
    armor: 200,
    resistance: 100,
    evasion: 40,
    hp: 1000,
    reflection: 50,
  };

  it("monster physical DPS is reduced by player armor and evasion", () => {
    const monster = {
      attack: 500,
      frequency: 1.2,
      damage_type: "physical" as const,
    };
    const incoming = estimateIncomingDps(monster, player);
    expect(incoming.totalDps).toBeGreaterThan(0);
    expect(incoming.totalDps).toBeLessThan(500 * 1.2);
    expect(incoming.evasionFactor).toBeCloseTo(0.6);
    expect(incoming.secondsToDeath).toBeGreaterThan(0);
  });

  it("player reflection blocks magical monster DPS", () => {
    const monster = {
      attack: 400,
      frequency: 1,
      damage_type: "magical" as const,
    };
    const withReflect = estimateIncomingDps(monster, player);
    const noReflect = estimateIncomingDps(monster, { ...player, reflection: 0 });
    expect(withReflect.totalDps).toBeLessThan(noReflect.totalDps);
    expect(withReflect.reflectionFactor).toBe(0.5);
  });
});

describe("reflection helpers", () => {
  it("outgoingReflectionRisk applies to magical vs reflective targets", () => {
    const risk = outgoingReflectionRisk({ damage_type: "magical" }, { reflection: 20 }, 100, 2);
    expect(risk?.perSecond).toBe(40);
  });

  it("incomingReflectionFactor is 1 for physical", () => {
    expect(incomingReflectionFactor({ damage_type: "physical" }, { reflection: 100 })).toBe(1);
  });
});
