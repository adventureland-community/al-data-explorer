import {
  decodeListShareSnapshot,
  encodeListShareSnapshot,
  listToShareSnapshot,
} from "../listShareState";
import type { NamedList } from "../types";

describe("listShareState", () => {
  it("round-trips a wishlist snapshot", () => {
    const list: NamedList = {
      id: "w1",
      type: "wishlist",
      name: "Event gear",
      updatedAt: 1,
      entries: [
        {
          id: "e1",
          itemKey: "firestaff",
          level: 9,
          p: "lucky",
          qty: 1,
          note: "main hand",
          createdAt: 2,
        },
        { id: "e2", note: "stock up on HP pots", qty: 1, createdAt: 1 },
      ],
    };
    const snap = listToShareSnapshot(list);
    const encoded = encodeListShareSnapshot(snap);
    const decoded = decodeListShareSnapshot(encoded);
    expect(decoded).toStrictEqual(snap);
    expect(decoded?.entries).toHaveLength(2);
  });

  it("omits checked shopping rows from the share payload", () => {
    const list: NamedList = {
      id: "s1",
      type: "shopping",
      name: "Tonight",
      updatedAt: 1,
      entries: [
        { id: "a", itemKey: "scroll0", qty: 12, createdAt: 2 },
        { id: "b", itemKey: "scroll1", qty: 2, checked: true, createdAt: 1 },
      ],
    };
    const snap = listToShareSnapshot(list);
    expect(snap.entries).toHaveLength(1);
    expect(snap.entries[0]?.itemKey).toBe("scroll0");
  });

  it("returns null for invalid payloads", () => {
    expect(decodeListShareSnapshot("")).toBeNull();
    expect(decodeListShareSnapshot("not-valid")).toBeNull();
  });
});
