import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { MonsterKey, SlotType, ItemInfo, ClassKey } from "typed-adventureland";

import { COMBAT_SIM_DEFAULTS } from "../gameData/combatSimUrl";
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
  splashTargetCount: number;
  assumeChargeBuffs: boolean;
  useSkillRotation: boolean;
  assumeMarked: boolean;
  comboStacks: number;
  setGear: (gear: { [slot in SlotType]?: ItemInfo }) => void;
  setSelectedClass: (c: SelectedCharacterClass | undefined) => void;
  setLevel: (level: number) => void;
  setTargetMonster: (key: MonsterKey) => void;
  setSplashTargetCount: (count: number) => void;
  setAssumeChargeBuffs: (value: boolean) => void;
  setUseSkillRotation: (value: boolean) => void;
  setAssumeMarked: (value: boolean) => void;
  setComboStacks: (count: number) => void;
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
      if (parsed.splashTargetCount != null) args.setSplashTargetCount(parsed.splashTargetCount);
      if (parsed.assumeChargeBuffs != null) args.setAssumeChargeBuffs(parsed.assumeChargeBuffs);
      if (parsed.useSkillRotation != null) args.setUseSkillRotation(parsed.useSkillRotation);
      if (parsed.assumeMarked != null) args.setAssumeMarked(parsed.assumeMarked);
      if (parsed.comboStacks != null) args.setComboStacks(parsed.comboStacks);
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
      splashTargetCount: args.splashTargetCount,
      assumeChargeBuffs: args.assumeChargeBuffs,
      useSkillRotation: args.useSkillRotation,
      assumeMarked: args.assumeMarked,
      comboStacks: args.comboStacks,
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
    args.splashTargetCount,
    args.assumeChargeBuffs,
    args.useSkillRotation,
    args.assumeMarked,
    args.comboStacks,
    searchParams,
    setSearchParams,
  ]);
}

export { COMBAT_SIM_DEFAULTS };
