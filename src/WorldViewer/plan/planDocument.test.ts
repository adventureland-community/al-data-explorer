import {
  addPlanObject,
  applyZonePreset,
  createEmptyPlan,
  createPlanHistory,
  createPlanObjectId,
  movePlanObject,
  nextPackOrder,
  pushPlanHistory,
  redoPlanHistory,
  removePlanObjects,
  undoPlanHistory,
} from "./planDocument";
import { PlanObject } from "./types";

function rect(id: string): PlanObject {
  return {
    kind: "rect",
    id,
    color: "#ffffff",
    x: 0,
    y: 0,
    width: 10,
    height: 8,
  };
}

describe("planDocument", () => {
  it("creates empty plans and adds objects", () => {
    const doc = createEmptyPlan({ mapKey: "main", name: "Test" });
    expect(doc.objects).toEqual([]);
    expect(doc.version).toBe(1);
    const withRect = addPlanObject(doc, rect(createPlanObjectId()));
    expect(withRect.objects).toHaveLength(1);
    expect(withRect.objects[0].kind).toBe("rect");
  });

  it("applies zone presets as label+color+role", () => {
    const zoned = applyZonePreset(rect("a"), { label: "Camp", color: "#4caf50" });
    expect(zoned.role).toBe("zone");
    expect(zoned.label).toBe("Camp");
    expect(zoned.color).toBe("#4caf50");
  });

  it("moves geometry and skips pack markers", () => {
    let doc = createEmptyPlan({ mapKey: "cave", name: "Cave" });
    doc = addPlanObject(doc, rect("r1"));
    doc = addPlanObject(doc, {
      kind: "packMarker",
      id: "p1",
      color: "#ff0",
      packIndex: 0,
      order: 1,
    });
    doc = movePlanObject(doc, "r1", 5, -3);
    const moved = doc.objects.find((o) => o.id === "r1");
    expect(moved && moved.kind === "rect" && moved.x === 5 && moved.y === -3).toBe(true);
    doc = movePlanObject(doc, "p1", 9, 9);
    const pack = doc.objects.find((o) => o.id === "p1");
    expect(pack && pack.kind === "packMarker").toBe(true);
  });

  it("supports undo and redo", () => {
    let history = createPlanHistory(createEmptyPlan({ mapKey: "main", name: "A" }));
    history = pushPlanHistory(history, addPlanObject(history.present, rect("r1")));
    history = pushPlanHistory(history, removePlanObjects(history.present, ["r1"]));
    expect(history.present.objects).toHaveLength(0);
    history = undoPlanHistory(history);
    expect(history.present.objects).toHaveLength(1);
    history = redoPlanHistory(history);
    expect(history.present.objects).toHaveLength(0);
  });

  it("assigns increasing pack order", () => {
    let doc = createEmptyPlan({ mapKey: "main", name: "P" });
    expect(nextPackOrder(doc)).toBe(1);
    doc = addPlanObject(doc, {
      kind: "packMarker",
      id: "p1",
      color: "#fff",
      packIndex: 0,
      order: 2,
    });
    expect(nextPackOrder(doc)).toBe(3);
  });
});
