export type DamageType = "physical" | "magical" | "pure";

/** Minimal entity shape for hit / DPS math (player or monster). */
export type CombatEntity = {
  attack: number;
  frequency: number;
  damage_type: DamageType;
  armor?: number;
  resistance?: number;
  apiercing?: number;
  rpiercing?: number;
  crit?: number;
  critdamage?: number;
  hp?: number;
  evasion?: number;
  for?: number;
};

export type DpsBreakdown = {
  /** Expected damage per auto-attack before frequency. */
  hitDamage: number;
  /** Mitigation multiplier applied to hit damage (0–1.32). */
  mitigationMult: number;
  /** Auto-attack DPS (hit × frequency). */
  autoAttackDps: number;
  /** Ability / DoT contribution (phase 2+). */
  abilityDps: number;
  /** AoE splash to nearby targets per hit × nearby count. */
  splashDps?: number;
  splashLines?: { key: string; label: string; dps: number; detail?: string }[];
  /** Per-ability lines for UI tooltips. */
  abilityLines?: { key: string; label: string; dps: number; detail?: string }[];
  /** Effects present on gear but not counted in single-target DPS. */
  unsimulatedEffects?: { key: string; label: string; reason: string }[];
  totalDps: number;
  hitsToKill: number | null;
  /** Set when breakdown comes from event simulation. */
  simDurationMs?: number;
  simIterations?: number;
};

export type CombatSimOptions = {
  /** Include expected crit uplift in hit damage (default true). */
  expectedCrit?: boolean;
  /** Simulation duration for event sim (ms). Phase 3. */
  durationMs?: number;
  /** Extra nearby targets hit by explosion/blast splash (0 = primary only). */
  splashTargetCount?: number;
  /** RNG for event sim (testing). */
  rng?: () => number;
};
