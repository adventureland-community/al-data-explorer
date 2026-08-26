/** Typical full-party size for coop world bosses (drives table×2 at N=10). */
export const TYPICAL_COOP_PARTY = 10;

export type MonsterLiveFlags = {
  cooperative: boolean;
  oneHp: boolean;
};

export function equalSplitShare(contributors: number): number {
  const n = Math.max(1, Math.floor(contributors));
  return 1 / n;
}

/** Solo kill: full share, no table multiplier from party size. */
export function soloKillScenario(oneHp = false) {
  return {
    cooperative: false,
    oneHp,
    share: 1,
    contributors: 1,
  };
}

/** Coop kill with equal split unless 1hp (share forced to 1 on server). */
export function coopKillScenario(oneHp: boolean, contributors = TYPICAL_COOP_PARTY) {
  const n = Math.max(1, Math.floor(contributors));
  return {
    cooperative: true,
    oneHp,
    contributors: n,
    share: oneHp ? 1 : equalSplitShare(n),
  };
}

/** Seed from monster flags and typical party assumptions. */
export function liveKillScenario(
  flags: MonsterLiveFlags,
  opts?: { map?: string; globals?: boolean },
) {
  const mapDefaults = {
    map: opts?.map ?? "",
    globals: opts?.globals ?? true,
  };
  if (!flags.cooperative) {
    return { ...soloKillScenario(flags.oneHp), ...mapDefaults };
  }
  return { ...coopKillScenario(flags.oneHp, TYPICAL_COOP_PARTY), ...mapDefaults };
}
