import { CustomGData } from "../../GDataContext";
import { PlanDocument, PlanPoint, PlanTool } from "./types";

export type PlanCanvasBridge = {
  active: boolean;
  document: PlanDocument | null;
  selectedIds: ReadonlySet<string>;
  tool: PlanTool;
  G: CustomGData | null;
  /** When false, left-drag pans the map (select tool). */
  capturePointer: boolean;
  playbackPoint: PlanPoint | null;
  playbackRouteId: string | null;
  onSelectIds: (ids: Set<string>) => void;
  onPointer: (args: {
    phase: "down" | "move" | "up";
    point: PlanPoint;
    mapKey: string;
    packIndex?: number;
  }) => void;
};
