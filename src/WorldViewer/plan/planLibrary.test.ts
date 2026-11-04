import { createEmptyPlan } from "./planDocument";
import {
  deletePlan,
  emptyPlanLibrary,
  listPlansForMap,
  readPlanLibrary,
  upsertPlan,
  writePlanLibrary,
} from "./planLibrary";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    _data: data,
  };
}

describe("planLibrary", () => {
  it("round-trips plans through storage", () => {
    const storage = memoryStorage();
    let store = emptyPlanLibrary();
    const cave = createEmptyPlan({ mapKey: "cave", name: "Bats", id: "a" });
    const main = createEmptyPlan({ mapKey: "main", name: "Town", id: "b" });
    store = upsertPlan(store, cave);
    store = upsertPlan(store, main);
    writePlanLibrary(store, storage);
    const loaded = readPlanLibrary(storage);
    expect(listPlansForMap(loaded, "cave").map((p) => p.id)).toEqual(["a"]);
    expect(listPlansForMap(loaded, "main")).toHaveLength(1);
    const afterDelete = deletePlan(loaded, "a");
    expect(listPlansForMap(afterDelete, "cave")).toEqual([]);
  });

  it("ignores corrupt storage", () => {
    const storage = memoryStorage({ "al-world-plans-v1": "{not json" });
    expect(readPlanLibrary(storage)).toEqual(emptyPlanLibrary());
  });
});
