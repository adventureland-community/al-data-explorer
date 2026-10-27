import { resolvePlanShortcut } from "./planShortcuts";

const base = { ctrlKey: false, metaKey: false, shiftKey: false, target: null };

describe("resolvePlanShortcut", () => {
  it("maps strategy and draw tool keys", () => {
    expect(resolvePlanShortcut({ ...base, key: "v" })).toEqual({
      type: "tool",
      tool: "select",
      zoneMode: false,
    });
    expect(resolvePlanShortcut({ ...base, key: "Z" })).toEqual({
      type: "tool",
      tool: "rect",
      zoneMode: true,
    });
    expect(resolvePlanShortcut({ ...base, key: "3" })).toEqual({
      type: "tool",
      tool: "ghost",
      zoneMode: false,
    });
    expect(resolvePlanShortcut({ ...base, key: "a" })).toEqual({
      type: "tool",
      tool: "arrow",
      zoneMode: false,
    });
  });

  it("handles undo redo delete escape", () => {
    expect(resolvePlanShortcut({ ...base, key: "z", ctrlKey: true })).toEqual({ type: "undo" });
    expect(resolvePlanShortcut({ ...base, key: "z", ctrlKey: true, shiftKey: true })).toEqual({
      type: "redo",
    });
    expect(resolvePlanShortcut({ ...base, key: "y", metaKey: true })).toEqual({ type: "redo" });
    expect(resolvePlanShortcut({ ...base, key: "Delete" })).toEqual({ type: "delete" });
    expect(resolvePlanShortcut({ ...base, key: "Escape" })).toEqual({ type: "escape" });
  });

  it("ignores typing targets and bare modifier chords", () => {
    const input = document.createElement("input");
    expect(resolvePlanShortcut({ ...base, key: "v", target: input })).toBeNull();
    expect(resolvePlanShortcut({ ...base, key: "v", ctrlKey: true })).toBeNull();
  });
});
