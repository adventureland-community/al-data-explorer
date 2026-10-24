import {
  decodeGearShareState,
  encodeGearShareState,
  savedLoadoutToShareState,
  shareStateToSavedLoadout,
} from "./gearShareState";

describe("gearShareState", () => {
  it("round-trips a loadout through lz-string encoding", () => {
    const original = savedLoadoutToShareState({
      classKey: "warrior",
      level: 88,
      gear: { mainhand: { name: "fireblade", level: 9 } },
    });
    const encoded = encodeGearShareState(original);
    const decoded = decodeGearShareState(encoded);
    expect(decoded).toEqual(original);
    expect(shareStateToSavedLoadout(decoded!)).toEqual({
      classKey: "warrior",
      level: 88,
      gear: { mainhand: { name: "fireblade", level: 9 } },
    });
  });
});
