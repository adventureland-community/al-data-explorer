import type { GearAbility } from "./estimateAbilityDps";
import { burnResistanceScale, type HitTarget } from "./hitModifiers";

/** Server G.conditions.burned.interval */
export const BURN_TICK_MS = 210;
/** Default burn duration from add_condition (ms). */
export const BURN_DURATION_MS = 5000;
/** Server G.conditions.sugarrush.duration */
export const SUGARRUSH_DURATION_MS = 10_000;
/** Server G.conditions.sugarrush.frequency bonus. */
export const SUGARRUSH_FREQUENCY_BONUS = 240;

export type ActiveBurn = {
  intensity: number;
  msRemaining: number;
  msUntilNextTick: number;
};

/** Burn tick damage: ceil(intensity / 5) per server conditions loop. */
export function burnTickDamage(intensity: number): number {
  return Math.ceil(intensity / 5);
}

/** Ticks dealt over a full burn window (no refresh stacking). */
export function burnTicksInDuration(durationMs = BURN_DURATION_MS): number {
  return Math.floor(durationMs / BURN_TICK_MS);
}

/** Total burn damage from one proc at given hit intensity. */
export function burnTotalDamageFromProc(
  hitDamage: number,
  options?: { durationMs?: number; unlimited?: boolean; target?: HitTarget },
): number {
  if (hitDamage <= 0) return 0;
  const durationMs = options?.durationMs ?? BURN_DURATION_MS;
  const scale = options?.target ? burnResistanceScale(options.target) : 1;
  const intensity = hitDamage * scale;
  const ticks = burnTicksInDuration(durationMs);
  let total = burnTickDamage(intensity) * ticks;
  if (options?.unlimited) {
    total = Math.round(total * 1.15);
  }
  return total;
}

/** Apply a burn proc; stacks intensity per server add_condition divider logic (simplified). */
export function applyBurnProc(
  burns: ActiveBurn[],
  hitDamage: number,
  unlimited?: boolean,
  target?: HitTarget,
): ActiveBurn[] {
  if (hitDamage <= 0) return burns;
  const scaledHit = hitDamage * (target ? burnResistanceScale(target) : 1);
  const divider = unlimited ? 1.5 : 3;
  const existing = burns[0];
  const intensity = existing
    ? Math.max(existing.intensity, Math.floor(existing.intensity / divider) + scaledHit)
    : scaledHit;
  return [{ intensity, msRemaining: BURN_DURATION_MS, msUntilNextTick: BURN_TICK_MS }];
}

/** Advance burn timers and return tick damage dealt this step. */
export function tickBurnDoTs(
  burns: ActiveBurn[],
  deltaMs: number,
): { damage: number; burns: ActiveBurn[] } {
  if (burns.length === 0 || deltaMs <= 0) {
    return { damage: 0, burns };
  }

  let damage = 0;
  const next: ActiveBurn[] = [];

  for (const burn of burns) {
    const msRemaining = burn.msRemaining - deltaMs;
    let msUntilTick = burn.msUntilNextTick - deltaMs;

    while (msRemaining > 0 && msUntilTick <= 0) {
      damage += burnTickDamage(burn.intensity);
      msUntilTick += BURN_TICK_MS;
    }

    if (msRemaining > 0) {
      next.push({
        intensity: burn.intensity,
        msRemaining,
        msUntilNextTick: msUntilTick,
      });
    }
  }

  return { damage, burns: next };
}

/** Expected sugarrush uptime fraction over a window (independent procs). */
export function sugarrushUptimeFactor(procRate: number, durationMs: number): number {
  if (procRate <= 0 || durationMs <= 0) return 0;
  const coverage = Math.min(1, SUGARRUSH_DURATION_MS / durationMs);
  return Math.min(1, procRate * coverage * 4);
}

/** Effective frequency with sugarrush buff uptime. */
export function effectiveFrequencyWithSugarrush(
  baseFrequency: number,
  sugarrushAttr0: number,
  simDurationMs = 30_000,
): number {
  const procRate = Math.min(1, sugarrushAttr0 / 100);
  const uptime = sugarrushUptimeFactor(procRate, simDurationMs);
  return baseFrequency + SUGARRUSH_FREQUENCY_BONUS * uptime;
}

export type ProcOutcome =
  | { kind: "burn"; hitDamage: number; unlimited?: boolean }
  | { kind: "sugarrush" }
  | { kind: "debuff"; key: string; label: string; detail: string };

/** Classify on-hit proc — only burn and sugarrush add to outgoing DPS. */
export function classifyAbilityProc(ability: GearAbility, hitDamage: number): ProcOutcome | null {
  if (ability.key === "weave") {
    return {
      kind: "debuff",
      key: "weave",
      label: "Weave",
      detail: "Slow stacks on target (−3 speed/stack)",
    };
  }
  if (ability.attr0 <= 0) return null;

  switch (ability.key) {
    case "burn":
      return { kind: "burn", hitDamage, unlimited: ability.unlimited };
    case "sugarrush":
      return { kind: "sugarrush" };
    case "poison":
      return {
        kind: "debuff",
        key: "poison",
        label: "Poison",
        detail: "Target −10% attack speed for 5s (no direct damage)",
      };
    case "freeze":
      return {
        kind: "debuff",
        key: "freeze",
        label: "Freeze",
        detail: "Target −70% attack speed for 5s (no direct damage)",
      };
    case "bash":
      return {
        kind: "debuff",
        key: "bash",
        label: "Bash",
        detail: "Stun — not modeled in DPS sim",
      };
    case "weave":
      return {
        kind: "debuff",
        key: "weave",
        label: "Weave",
        detail: "Slow stacks on target (−3 speed/stack)",
      };
    default:
      return null;
  }
}
