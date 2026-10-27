import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClassKey } from "typed-adventureland";

import { SavedLoadout } from "../../GearPlanner/types";
import {
  addPlanObject,
  createEmptyPlan,
  createPlanHistory,
  createPlanObjectId,
  movePlanObject,
  nextPackOrder,
  pushPlanHistory,
  redoPlanHistory,
  removePlanObjects,
  replacePlanObject,
  undoPlanHistory,
  applyZonePreset,
  PlanHistoryState,
} from "./planDocument";
import {
  deletePlan,
  listAllPlans,
  listPlansForMap,
  readPlanLibrary,
  upsertPlan,
  writePlanLibrary,
} from "./planLibrary";
import {
  cloneSharedPlanIntoLibrary,
  decodePlanShareState,
  encodePlanShareState,
  planShareUrl,
} from "./planShareState";
import { ZONE_PRESETS } from "./zonePresets";
import {
  PlanDocument,
  PlanGhostLoadout,
  PlanObject,
  PlanPoint,
  PlanStampKind,
  PlanTool,
  ZonePresetId,
} from "./types";

const AUTOSAVE_MS = 400;

function readSavedLoadouts(): Record<string, SavedLoadout> {
  try {
    const raw = localStorage.getItem("loadouts");
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as Record<string, SavedLoadout>;
  } catch {
    return {};
  }
}

export type PlanSession = {
  active: boolean;
  document: PlanDocument | null;
  tool: PlanTool;
  setTool: (tool: PlanTool) => void;
  color: string;
  setColor: (color: string) => void;
  stamp: PlanStampKind;
  setStamp: (stamp: PlanStampKind) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  libraryForMap: PlanDocument[];
  allPlans: PlanDocument[];
  loadouts: Record<string, SavedLoadout>;
  draftPoint: PlanPoint | null;
  polygonDraft: PlanPoint[];
  routeDraft: PlanPoint[];
  playback: {
    routeId: string | null;
    playing: boolean;
    t: number;
    speedMul: number;
    trail: boolean;
    loop: boolean;
  };
  setPlayback: PlanSession["playback"] extends infer P ? (patch: Partial<P>) => void : never;
  enterPlan: (mapKey: string, existing?: PlanDocument) => void;
  exitPlan: () => void;
  createNamedPlan: (mapKey: string, name: string) => void;
  loadPlan: (id: string) => void;
  renamePlan: (name: string) => void;
  deleteCurrentPlan: () => void;
  undo: () => void;
  redo: () => void;
  deleteSelected: () => void;
  applyPreset: (presetId: ZonePresetId) => void;
  shareUrl: () => string | null;
  importShare: (encoded: string) => PlanDocument | null;
  handleMapPointer: (args: {
    phase: "down" | "move" | "up";
    point: PlanPoint;
    mapKey: string;
    packIndex?: number;
  }) => void;
  placeGhost: (args: {
    point: PlanPoint;
    classKey: ClassKey;
    loadoutName?: string;
    loadout?: PlanGhostLoadout;
  }) => void;
  placePackMarker: (packIndex: number) => void;
};

export function usePlanSession(args: {
  mapKey: string | null;
  initialShare?: string | null;
}): PlanSession {
  const [active, setActive] = useState(false);
  const [history, setHistory] = useState<PlanHistoryState | null>(null);
  const [tool, setTool] = useState<PlanTool>("select");
  const [color, setColor] = useState("#ffeb3b");
  const [stamp, setStamp] = useState<PlanStampKind>("x");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [libraryTick, setLibraryTick] = useState(0);
  const [draftPoint, setDraftPoint] = useState<PlanPoint | null>(null);
  const [polygonDraft, setPolygonDraft] = useState<PlanPoint[]>([]);
  const [routeDraft, setRouteDraft] = useState<PlanPoint[]>([]);
  const [playback, setPlaybackState] = useState({
    routeId: null as string | null,
    playing: false,
    t: 0,
    speedMul: 1,
    trail: false,
    loop: true,
  });
  const dragRef = useRef<{ id: string; last: PlanPoint } | null>(null);
  const shapeRef = useRef<{ id: string; start: PlanPoint } | null>(null);
  const autosaveTimer = useRef<number | null>(null);

  const document = history?.present ?? null;

  const persist = useCallback((doc: PlanDocument) => {
    const store = upsertPlan(readPlanLibrary(), doc);
    writePlanLibrary(store);
    setLibraryTick((tick) => tick + 1);
  }, []);

  const commit = useCallback((next: PlanDocument) => {
    setHistory((current) => {
      if (!current) {
        return createPlanHistory(next);
      }
      return pushPlanHistory(current, next);
    });
  }, []);

  useEffect(() => {
    if (!document || !active) {
      return;
    }
    if (autosaveTimer.current) {
      window.clearTimeout(autosaveTimer.current);
    }
    autosaveTimer.current = window.setTimeout(() => {
      persist(document);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimer.current) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [document, active, persist]);

  useEffect(() => {
    if (!args.initialShare) {
      return;
    }
    const shared = decodePlanShareState(args.initialShare);
    if (!shared) {
      return;
    }
    const imported = cloneSharedPlanIntoLibrary(shared);
    persist(imported);
    setHistory(createPlanHistory(imported));
    setActive(true);
  }, [args.initialShare, persist]);

  const library = useMemo(
    () => readPlanLibrary(),
    // libraryTick bumps after writes so we re-read storage
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [libraryTick],
  );

  const libraryForMap = useMemo(
    () => (args.mapKey ? listPlansForMap(library, args.mapKey) : []),
    [library, args.mapKey],
  );

  const allPlans = useMemo(() => listAllPlans(library), [library]);
  const loadouts = useMemo(
    () => readSavedLoadouts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [libraryTick],
  );

  const enterPlan = useCallback(
    (mapKey: string, existing?: PlanDocument) => {
      if (existing) {
        setHistory(createPlanHistory(existing));
      } else if (history?.present.mapKey === mapKey) {
        // keep
      } else {
        const named = createEmptyPlan({ mapKey, name: `Plan · ${mapKey}` });
        setHistory(createPlanHistory(named));
        persist(named);
      }
      setActive(true);
      setTool("select");
      setSelectedIds(new Set());
    },
    [history, persist],
  );

  const exitPlan = useCallback(() => {
    setActive(false);
    setPlaybackState((current) => ({ ...current, playing: false }));
  }, []);

  const createNamedPlan = useCallback(
    (mapKey: string, name: string) => {
      const named = createEmptyPlan({ mapKey, name: name.trim() || `Plan · ${mapKey}` });
      persist(named);
      setHistory(createPlanHistory(named));
      setActive(true);
      setSelectedIds(new Set());
    },
    [persist],
  );

  const loadPlan = useCallback(
    (id: string) => {
      const doc = library.plans[id];
      if (!doc) {
        return;
      }
      setHistory(createPlanHistory(doc));
      setActive(true);
      setSelectedIds(new Set());
    },
    [library.plans],
  );

  const renamePlan = useCallback(
    (name: string) => {
      if (!document) {
        return;
      }
      commit({ ...document, name, updatedAt: Date.now() });
    },
    [commit, document],
  );

  const deleteCurrentPlan = useCallback(() => {
    if (!document) {
      return;
    }
    const store = deletePlan(readPlanLibrary(), document.id);
    writePlanLibrary(store);
    setLibraryTick((tick) => tick + 1);
    setHistory(null);
    setActive(false);
  }, [document]);

  const undo = useCallback(() => {
    setHistory((current) => (current ? undoPlanHistory(current) : current));
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => (current ? redoPlanHistory(current) : current));
  }, []);

  const deleteSelected = useCallback(() => {
    if (!document || selectedIds.size === 0) {
      return;
    }
    commit(removePlanObjects(document, selectedIds));
    setSelectedIds(new Set());
  }, [commit, document, selectedIds]);

  const applyPreset = useCallback(
    (presetId: ZonePresetId) => {
      if (!document) {
        return;
      }
      const preset = ZONE_PRESETS.find((entry) => entry.id === presetId);
      if (!preset) {
        return;
      }
      let next = document;
      for (const id of selectedIds) {
        const object = next.objects.find((entry) => entry.id === id);
        if (!object) {
          continue;
        }
        next = replacePlanObject(next, applyZonePreset(object, preset));
      }
      setColor(preset.color);
      commit(next);
    },
    [commit, document, selectedIds],
  );

  const shareUrl = useCallback(() => {
    if (!document) {
      return null;
    }
    return planShareUrl(document);
  }, [document]);

  const importShare = useCallback(
    (encoded: string) => {
      const shared = decodePlanShareState(encoded);
      if (!shared) {
        return null;
      }
      const imported = cloneSharedPlanIntoLibrary(shared);
      persist(imported);
      setHistory(createPlanHistory(imported));
      setActive(true);
      return imported;
    },
    [persist],
  );

  const placeGhost: PlanSession["placeGhost"] = useCallback(
    ({ point, classKey, loadoutName, loadout }) => {
      if (!document) {
        return;
      }
      const ghost: PlanObject = {
        kind: "ghost",
        id: createPlanObjectId(),
        color,
        x: point.x,
        y: point.y,
        classKey,
        name: loadoutName || classKey,
        loadout,
      };
      const range: PlanObject = {
        kind: "ellipse",
        id: createPlanObjectId(),
        color: "#80deea",
        role: "range",
        ghostId: ghost.id,
        x: point.x,
        y: point.y,
        radiusX: 40,
        radiusY: 40,
        label: "Range",
      };
      let next = addPlanObject(document, ghost);
      next = addPlanObject(next, range);
      commit(next);
      setSelectedIds(new Set([ghost.id]));
    },
    [color, commit, document],
  );

  const placePackMarker = useCallback(
    (packIndex: number) => {
      if (!document) {
        return;
      }
      const marker: PlanObject = {
        kind: "packMarker",
        id: createPlanObjectId(),
        color,
        packIndex,
        order: nextPackOrder(document),
        label: `Pack ${String.fromCharCode(64 + nextPackOrder(document))}`,
      };
      commit(addPlanObject(document, marker));
      setSelectedIds(new Set([marker.id]));
    },
    [color, commit, document],
  );

  const handleMapPointer: PlanSession["handleMapPointer"] = useCallback(
    ({ phase, point, mapKey, packIndex }) => {
      if (!document || document.mapKey !== mapKey) {
        return;
      }

      if (tool === "packMarker" && phase === "down" && packIndex != null) {
        placePackMarker(packIndex);
        return;
      }

      if (tool === "select") {
        if (phase === "down") {
          // selection resolved by caller via hit test id set externally when provided
          dragRef.current = null;
          const selected = [...selectedIds][0];
          if (selected) {
            dragRef.current = { id: selected, last: point };
          }
          return;
        }
        if (phase === "move" && dragRef.current) {
          const dx = point.x - dragRef.current.last.x;
          const dy = point.y - dragRef.current.last.y;
          if (dx === 0 && dy === 0) {
            return;
          }
          commit(movePlanObject(document, dragRef.current.id, dx, dy));
          // also move linked range disc with ghost
          const moved = document.objects.find((object) => object.id === dragRef.current?.id);
          if (moved?.kind === "ghost") {
            const range = document.objects.find(
              (object) => object.kind === "ellipse" && object.ghostId === moved.id,
            );
            if (range) {
              commit(movePlanObject(movePlanObject(document, moved.id, dx, dy), range.id, dx, dy));
            }
          }
          dragRef.current = { id: dragRef.current.id, last: point };
        }
        if (phase === "up") {
          dragRef.current = null;
        }
        return;
      }

      if (tool === "freehand") {
        if (phase === "down") {
          const id = createPlanObjectId();
          shapeRef.current = { id, start: point };
          commit(
            addPlanObject(document, {
              kind: "path",
              id,
              color,
              points: [point],
            }),
          );
          setSelectedIds(new Set([id]));
          return;
        }
        if (phase === "move" && shapeRef.current) {
          const current = document.objects.find((object) => object.id === shapeRef.current?.id);
          if (current?.kind === "path") {
            commit(
              replacePlanObject(document, {
                ...current,
                points: [...current.points, point],
              }),
            );
          }
        }
        if (phase === "up") {
          shapeRef.current = null;
        }
        return;
      }

      if (tool === "line" || tool === "arrow" || tool === "rect" || tool === "ellipse") {
        if (phase === "down") {
          const id = createPlanObjectId();
          shapeRef.current = { id, start: point };
          setDraftPoint(point);
          if (tool === "line") {
            commit(
              addPlanObject(document, {
                kind: "path",
                id,
                color,
                points: [point, point],
              }),
            );
          } else if (tool === "arrow") {
            commit(
              addPlanObject(document, {
                kind: "arrow",
                id,
                color,
                from: point,
                to: point,
              }),
            );
          } else if (tool === "rect") {
            commit(
              addPlanObject(document, {
                kind: "rect",
                id,
                color,
                x: point.x,
                y: point.y,
                width: 1,
                height: 1,
              }),
            );
          } else {
            commit(
              addPlanObject(document, {
                kind: "ellipse",
                id,
                color,
                x: point.x,
                y: point.y,
                radiusX: 1,
                radiusY: 1,
              }),
            );
          }
          setSelectedIds(new Set([id]));
          return;
        }
        if (phase === "move" && shapeRef.current) {
          const current = document.objects.find((object) => object.id === shapeRef.current?.id);
          const { start } = shapeRef.current;
          if (!current) {
            return;
          }
          if (current.kind === "path" && current.points.length >= 2) {
            commit(
              replacePlanObject(document, {
                ...current,
                points: [start, point],
              }),
            );
          } else if (current.kind === "arrow") {
            commit(replacePlanObject(document, { ...current, to: point }));
          } else if (current.kind === "rect") {
            commit(
              replacePlanObject(document, {
                ...current,
                x: (start.x + point.x) / 2,
                y: (start.y + point.y) / 2,
                width: Math.max(Math.abs(point.x - start.x), 1),
                height: Math.max(Math.abs(point.y - start.y), 1),
              }),
            );
          } else if (current.kind === "ellipse") {
            commit(
              replacePlanObject(document, {
                ...current,
                x: start.x,
                y: start.y,
                radiusX: Math.max(Math.abs(point.x - start.x), 1),
                radiusY: Math.max(Math.abs(point.y - start.y), 1),
              }),
            );
          }
        }
        if (phase === "up") {
          shapeRef.current = null;
          setDraftPoint(null);
        }
        return;
      }

      if (tool === "polygon") {
        if (phase !== "down") {
          return;
        }
        const nextDraft = [...polygonDraft, point];
        setPolygonDraft(nextDraft);
        return;
      }

      if (tool === "route") {
        if (phase !== "down") {
          return;
        }
        setRouteDraft((current) => [...current, point]);
        return;
      }

      if (phase !== "down") {
        return;
      }

      if (tool === "text" || tool === "pin") {
        const text = tool === "text" ? "Note" : "Callout";
        const id = createPlanObjectId();
        commit(
          addPlanObject(document, {
            kind: tool,
            id,
            color,
            x: point.x,
            y: point.y,
            text,
          }),
        );
        setSelectedIds(new Set([id]));
        return;
      }

      if (tool === "stamp") {
        const id = createPlanObjectId();
        commit(
          addPlanObject(document, {
            kind: "stamp",
            id,
            color,
            x: point.x,
            y: point.y,
            stamp,
          }),
        );
        setSelectedIds(new Set([id]));
        return;
      }

      if (tool === "ghost") {
        placeGhost({ point, classKey: "warrior" });
      }
    },
    [color, commit, document, placeGhost, placePackMarker, polygonDraft, selectedIds, stamp, tool],
  );

  // Finalize polygon / route when tool changes away
  useEffect(() => {
    if (!document) {
      return;
    }
    if (tool !== "polygon" && polygonDraft.length >= 3) {
      const id = createPlanObjectId();
      commit(
        addPlanObject(document, {
          kind: "polygon",
          id,
          color,
          points: polygonDraft,
        }),
      );
      setPolygonDraft([]);
      setSelectedIds(new Set([id]));
    }
    if (tool !== "route" && routeDraft.length >= 2) {
      const id = createPlanObjectId();
      const ghostId = [...selectedIds].find((sid) =>
        document.objects.some((object) => object.id === sid && object.kind === "ghost"),
      );
      commit(
        addPlanObject(document, {
          kind: "route",
          id,
          color,
          waypoints: routeDraft,
          loop: true,
          ghostId,
        }),
      );
      setRouteDraft([]);
      setSelectedIds(new Set([id]));
      setPlaybackState((current) => ({ ...current, routeId: id, loop: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  return {
    active,
    document,
    tool,
    setTool,
    color,
    setColor,
    stamp,
    setStamp,
    selectedIds,
    setSelectedIds,
    libraryForMap,
    allPlans,
    loadouts,
    draftPoint,
    polygonDraft,
    routeDraft,
    playback,
    setPlayback: (patch) => setPlaybackState((current) => ({ ...current, ...patch })),
    enterPlan,
    exitPlan,
    createNamedPlan,
    loadPlan,
    renamePlan,
    deleteCurrentPlan,
    undo,
    redo,
    deleteSelected,
    applyPreset,
    shareUrl,
    importShare,
    handleMapPointer,
    placeGhost,
    placePackMarker,
  };
}

export function encodePlanParam(doc: PlanDocument): string {
  return encodePlanShareState(doc);
}
