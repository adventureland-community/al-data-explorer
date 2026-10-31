import { createEmptyPlan, addPlanObject } from "./planDocument";
import {
  cloneSharedPlanIntoLibrary,
  decodePlanShareState,
  encodePlanShareState,
} from "./planShareState";

describe("planShareState", () => {
  it("round-trips a plan through lz-string encoding", () => {
    let doc = createEmptyPlan({ mapKey: "cave", name: "Bats", id: "plan_1" });
    doc = addPlanObject(doc, {
      kind: "rect",
      id: "r1",
      color: "#4caf50",
      role: "zone",
      label: "Camp",
      x: 10,
      y: 20,
      width: 40,
      height: 30,
    });
    doc = addPlanObject(doc, {
      kind: "ghost",
      id: "g1",
      color: "#fff",
      x: 0,
      y: 0,
      classKey: "ranger",
      name: "Kite",
    });
    const encoded = encodePlanShareState(doc);
    const decoded = decodePlanShareState(encoded);
    expect(decoded).toEqual(doc);
  });

  it("rejects garbage", () => {
    expect(decodePlanShareState("not-a-plan")).toBeNull();
  });

  it("clones a shared plan with a fresh id", () => {
    const doc = createEmptyPlan({ mapKey: "main", name: "Share me", id: "old" });
    const cloned = cloneSharedPlanIntoLibrary(doc);
    expect(cloned.id).not.toBe(doc.id);
    expect(cloned.name).toContain("(shared)");
    expect(cloned.mapKey).toBe("main");
  });
});
