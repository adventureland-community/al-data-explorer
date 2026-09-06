import {
  CROSSFADE_HALF_DEG,
  facingFromYaw,
  facingLabel,
  shortestYawDelta,
  snapYawToCardinal,
  turntableFaceViews,
  yawFromFacing,
} from "../turntableYaw";

describe("turntableYaw", () => {
  it("maps cardinals to AL facing rows (character turns right)", () => {
    expect(facingFromYaw(0)).toBe(0);
    expect(facingFromYaw(90)).toBe(1);
    expect(facingFromYaw(180)).toBe(3);
    expect(facingFromYaw(270)).toBe(2);
  });

  it("labels profiles from the viewer (Turn right → Right)", () => {
    expect(facingLabel(facingFromYaw(0))).toBe("Front");
    expect(facingLabel(facingFromYaw(90))).toBe("Right");
    expect(facingLabel(facingFromYaw(180))).toBe("Back");
    expect(facingLabel(facingFromYaw(270))).toBe("Left");
  });

  it("round-trips facing ↔ yaw", () => {
    for (const facing of [0, 1, 2, 3]) {
      expect(facingFromYaw(yawFromFacing(facing))).toBe(facing);
    }
  });

  it("snaps mid-turn yaw to the nearest cardinal", () => {
    expect(snapYawToCardinal(40)).toBe(0);
    expect(snapYawToCardinal(50)).toBe(90);
    expect(snapYawToCardinal(170)).toBe(180);
    expect(snapYawToCardinal(350)).toBe(0);
  });

  it("computes shortest signed yaw deltas for snap easing", () => {
    expect(shortestYawDelta(350, 0)).toBe(10);
    expect(shortestYawDelta(10, 0)).toBe(-10);
    expect(shortestYawDelta(80, 90)).toBe(10);
  });

  it("shows a single face-on card at cardinals", () => {
    const views = turntableFaceViews(0);
    expect(views).toHaveLength(1);
    expect(views[0]?.alFacing).toBe(0);
    expect(views[0]?.tiltDeg).toBe(0);
    expect(views[0]?.opacity).toBe(1);
  });

  it("is nearly edge-on at mid-corner with a soft dual fade", () => {
    const views = turntableFaceViews(45);
    expect(views).toHaveLength(2);
    expect(views.map((v) => v.alFacing).sort()).toStrictEqual([0, 1]);
    expect(Math.abs(views[0]?.tiltDeg ?? 0)).toBe(90);
    expect(Math.abs(views[1]?.tiltDeg ?? 0)).toBe(90);
    expect(views[0]?.opacity).toBeCloseTo(0.5, 2);
    expect(views[1]?.opacity).toBeCloseTo(0.5, 2);
  });

  it("opens the next facing after the edge-on handoff", () => {
    const views = turntableFaceViews(45 + CROSSFADE_HALF_DEG + 1);
    expect(views).toHaveLength(1);
    expect(views[0]?.alFacing).toBe(1);
    expect(views[0]?.opacity).toBe(1);
    expect(views[0]?.tiltDeg ?? 0).toBeLessThan(0);
  });

  it("closes the outgoing facing before the edge-on handoff", () => {
    const views = turntableFaceViews(45 - CROSSFADE_HALF_DEG - 1);
    expect(views).toHaveLength(1);
    expect(views[0]?.alFacing).toBe(0);
    expect(views[0]?.tiltDeg ?? 0).toBeGreaterThan(0);
  });
});
