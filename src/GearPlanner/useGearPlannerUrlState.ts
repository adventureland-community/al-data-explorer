import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MonsterKey, SlotType, ItemInfo, ClassKey } from "typed-adventureland";

import {
  LoadoutUrlState,
  parseGearPlannerSearchParams,
  writeGearPlannerSearchParams,
} from "../gameData/loadoutUrl";
import { SelectedCharacterClass } from "./types";

export function useGearPlannerUrlState(args: {
  classes: SelectedCharacterClass[];
  gear: { [slot in SlotType]?: ItemInfo };
  selectedClass?: SelectedCharacterClass;
  level: number;
  targetMonster: MonsterKey;
  setGear: (gear: { [slot in SlotType]?: ItemInfo }) => void;
  setSelectedClass: (c: SelectedCharacterClass | undefined) => void;
  setLevel: (level: number) => void;
  setTargetMonster: (key: MonsterKey) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const hydrated = useRef(false);
  const skipNextSync = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    const parsed = parseGearPlannerSearchParams(searchParams);
    skipNextSync.current = true;
    if (parsed) {
      if (Object.keys(parsed.gear).length > 0) {
        args.setGear(parsed.gear);
      }
      if (parsed.classKey) {
        const cls = args.classes.find((c) => c.className === parsed.classKey);
        if (cls) args.setSelectedClass(cls);
      }
      if (parsed.level) args.setLevel(parsed.level);
      if (parsed.target) args.setTargetMonster(parsed.target as MonsterKey);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once from URL on mount
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    const state: LoadoutUrlState = {
      gear: args.gear,
      classKey: args.selectedClass?.className as ClassKey | undefined,
      level: args.level,
      target: args.targetMonster,
    };
    const next = writeGearPlannerSearchParams(searchParams, state);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    args.gear,
    args.selectedClass,
    args.level,
    args.targetMonster,
    searchParams,
    setSearchParams,
  ]);
}
