import type { CombatSimOptions } from "./types";

type TargetWithAmp = { incdmgamp?: number };

/** Apply assumed target debuffs (hunter's mark, etc.) for outgoing DPS. */
export function withAssumedTargetDebuffs<T extends TargetWithAmp>(
  target: T,
  options?: Pick<CombatSimOptions, "assumeMarked">,
): T {
  if (!options?.assumeMarked) return target;
  return { ...target, incdmgamp: (target.incdmgamp ?? 0) + 10 };
}
