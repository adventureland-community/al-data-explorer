export type CombatSimUrlOptions = {
  splashTargetCount?: number;
  assumeChargeBuffs?: boolean;
  useSkillRotation?: boolean;
  assumeMarked?: boolean;
  comboStacks?: number;
};

export const COMBAT_SIM_DEFAULTS = {
  splashTargetCount: 0,
  assumeChargeBuffs: false,
  useSkillRotation: true,
  assumeMarked: false,
  comboStacks: 1,
} as const;

function parseFlag(raw: string | null): boolean {
  return raw === "1" || raw === "true";
}

function parseCombo(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(12, Math.max(1, Math.round(n)));
}

function parseSplash(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(5, Math.max(0, Math.round(n)));
}

/** Read combat sim toggles from URL search params. */
export function parseCombatSimParams(searchParams: URLSearchParams): CombatSimUrlOptions {
  const splashTargetCount = parseSplash(searchParams.get("simSplash"));
  const assumeChargeBuffs = searchParams.has("simCharge")
    ? parseFlag(searchParams.get("simCharge"))
    : undefined;
  const useSkillRotation = searchParams.has("simSkills")
    ? parseFlag(searchParams.get("simSkills"))
    : undefined;
  const assumeMarked = searchParams.has("simMarked")
    ? parseFlag(searchParams.get("simMarked"))
    : undefined;
  const comboStacks = parseCombo(searchParams.get("simCombo"));

  return {
    splashTargetCount,
    assumeChargeBuffs,
    useSkillRotation,
    assumeMarked,
    comboStacks,
  };
}

/** Write combat sim toggles to URL search params (omit defaults). */
export function writeCombatSimParams(next: URLSearchParams, options: CombatSimUrlOptions): void {
  const splash = options.splashTargetCount ?? COMBAT_SIM_DEFAULTS.splashTargetCount;
  if (splash > 0) next.set("simSplash", String(splash));
  else next.delete("simSplash");

  if (options.assumeChargeBuffs) next.set("simCharge", "1");
  else next.delete("simCharge");

  const skills = options.useSkillRotation ?? COMBAT_SIM_DEFAULTS.useSkillRotation;
  if (!skills) next.set("simSkills", "0");
  else next.delete("simSkills");

  if (options.assumeMarked) next.set("simMarked", "1");
  else next.delete("simMarked");

  const combo = options.comboStacks ?? COMBAT_SIM_DEFAULTS.comboStacks;
  if (combo > 1) next.set("simCombo", String(combo));
  else next.delete("simCombo");
}
