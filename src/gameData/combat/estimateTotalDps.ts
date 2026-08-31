import { ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import {
  applyBurnProc,
  rollAbilityProcsOnHit,
  collectSplashHitStats,
  totalSplashPerHit,
  type ActiveBurn,
} from "./abilityProc";
import { SUGARRUSH_DURATION_MS, chargeBuffFrequencyBonus, tickBurnDoTs } from "./conditionModel";
import { estimateHitDamage, type HitDamageTarget } from "./estimateHitDamage";
import {
  buildSustainLines,
  outgoingReflectionRisk,
  rogueStackBonusAtHit,
  stunDebuffLine,
  rogueStackDpsBoost,
  onHitSustain,
} from "./hitModifiers";
import {
  collectGearAbilities,
  collectSplashIntensities,
  collectUnsimulatedOnHitEffects,
  estimateAbilityDps,
} from "./estimateAbilityDps";
import { estimateSkillRotationDps } from "./skillRotationDps";
import { resolveBestAutoSwing } from "./attackShareDps";
import type { CombatEntity, CombatSimOptions, DpsBreakdown } from "./types";

export type TotalDpsMode = "formulation" | "event";

export type TotalDpsOptions = CombatSimOptions & {
  mode?: TotalDpsMode;
  classKey?: string;
};

function buildSplashBreakdown(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance">,
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  options: TotalDpsOptions | undefined,
  freq: number,
): {
  splashDps: number;
  splashLines: DpsBreakdown["splashLines"];
  unsimulatedEffects: DpsBreakdown["unsimulatedEffects"];
} {
  const splashTargetCount = options?.splashTargetCount ?? 0;
  const intensities = collectSplashIntensities(gear, G, options?.classKey, source.damage_type);
  const splashStats = collectSplashHitStats(source, target, intensities);
  const perHit = totalSplashPerHit(splashStats);

  if (splashTargetCount <= 0 || perHit <= 0 || freq <= 0) {
    return {
      splashDps: 0,
      splashLines: undefined,
      unsimulatedEffects: collectUnsimulatedOnHitEffects(
        gear,
        G,
        options?.classKey,
        source.damage_type,
        0,
      ),
    };
  }

  const splashDps = freq * splashTargetCount * perHit;
  const splashLines = splashStats.map((row) => ({
    key: row.key,
    label: row.label,
    dps: freq * splashTargetCount * row.damagePerTarget,
    detail: `${splashTargetCount} nearby · ${row.damagePerTarget.toFixed(1)} dmg/hit/target`,
  }));

  return { splashDps, splashLines, unsimulatedEffects: undefined };
}

/** Event-driven combat timeline with burn DoT ticks and sugarrush frequency buffs. */
export function simulateCombatTimeline(
  source: CombatEntity,
  target: HitDamageTarget & Pick<CombatEntity, "hp">,
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  options?: TotalDpsOptions,
): DpsBreakdown {
  const durationMs = options?.durationMs ?? 30_000;
  const baseFreq = source.frequency ?? 0;
  const rng = options?.rng ?? Math.random;
  const { damage: baseHit, mitigationMult } = estimateHitDamage(source, target, {
    ...options,
    expectedCrit: false,
    expectedEvasion: false,
  });
  const hitMult = baseHit / Math.max(1, source.attack);
  const evasionChance = source.damage_type === "physical" ? Math.min(50, target.evasion ?? 0) : 0;
  const missChance = source.miss ?? 0;
  const avoidChance = target.avoidance ?? 0;

  const abilities = collectGearAbilities(gear, G, options?.classKey);
  const burnAbility = abilities.burn;
  const splashTargetCount = options?.splashTargetCount ?? 0;
  const splashStats = collectSplashHitStats(
    source,
    target,
    collectSplashIntensities(gear, G, options?.classKey, source.damage_type),
  );
  const splashPerTargetPerHit = totalSplashPerHit(splashStats);

  if (baseFreq <= 0 || baseHit <= 0 || durationMs <= 0) {
    const splash = buildSplashBreakdown(source, target, gear, G, options, baseFreq);
    const { debuffLines } = estimateAbilityDps(source, target, abilities, {
      simDurationMs: durationMs,
    });
    return {
      hitDamage: baseHit,
      mitigationMult,
      autoAttackDps: 0,
      abilityDps: 0,
      splashDps: splash.splashDps,
      splashLines: splash.splashLines,
      debuffLines: debuffLines.length > 0 ? debuffLines : undefined,
      totalDps: 0,
      hitsToKill: null,
      unsimulatedEffects: splash.unsimulatedEffects,
      simDurationMs: durationMs,
      simIterations: 0,
    };
  }

  let autoDamage = 0;
  let abilityDamage = 0;
  let splashDamage = 0;
  let sustainHp = 0;
  let sustainMp = 0;
  let hits = 0;
  let rogueHitIndex = 0;
  let t = 0;
  let nextAttackAt = 0;
  let burns: ActiveBurn[] = [];
  let sugarrushUntil = 0;
  const abilityTotals: Record<string, number> = {};
  const debuffProcCounts: Record<string, number> = {};

  const currentFreq = () => (t < sugarrushUntil ? baseFreq + SUGARRUSH_FREQUENCY_BONUS : baseFreq);

  while (t < durationMs) {
    const stepMs = Math.min(50, durationMs - t, nextAttackAt > t ? nextAttackAt - t : 50);
    const burnTick = tickBurnDoTs(burns, stepMs);
    burns = burnTick.burns;
    abilityDamage += burnTick.damage;
    if (burnTick.damage > 0) {
      abilityTotals.burn = (abilityTotals.burn ?? 0) + burnTick.damage;
    }

    if (t >= nextAttackAt) {
      const freq = currentFreq();
      const evaded = evasionChance > 0 && rng() * 100 < evasionChance;
      const missed =
        (missChance > 0 && rng() * 100 < missChance) ||
        (avoidChance > 0 && rng() * 100 < avoidChance);

      if (!evaded && !missed) {
        const variance = 0.9 + rng() * 0.2;
        let hit = baseHit * variance;

        if (source.crit && rng() < source.crit / 100) {
          const critMult = 2 + (source.critdamage ?? 0) / 100;
          hit *= critMult;
        }

        if (options?.classKey === "rogue") {
          rogueHitIndex += 1;
          hit += rogueStackBonusAtHit(rogueHitIndex) * hitMult;
        }

        autoDamage += hit;
        hits += 1;

        const sustain = onHitSustain(source, hit, target.hp);
        sustainHp += sustain.lifestealHp;
        sustainMp += sustain.manastealMp;

        if (burnAbility && burnAbility.attr0 > 0 && rng() < burnAbility.attr0 / 100) {
          burns = applyBurnProc(burns, hit, burnAbility.unlimited, target);
        }

        const otherAbilities = { ...abilities };
        delete otherAbilities.burn;
        const procs = rollAbilityProcsOnHit(hit, otherAbilities, rng);
        abilityDamage += procs.total;
        for (const [key, amount] of Object.entries(procs.byKey)) {
          abilityTotals[key] = (abilityTotals[key] ?? 0) + amount;
        }
        if (procs.sugarrushProcs > 0) {
          sugarrushUntil = Math.max(sugarrushUntil, t + SUGARRUSH_DURATION_MS);
        }
        for (const [key, count] of Object.entries(procs.debuffProcs)) {
          debuffProcCounts[key] = (debuffProcCounts[key] ?? 0) + count;
        }

        if (splashTargetCount > 0 && splashPerTargetPerHit > 0) {
          splashDamage += splashPerTargetPerHit * splashTargetCount;
        }
      }

      nextAttackAt = t + 1000 / freq;
    }

    t += stepMs;
  }

  const seconds = durationMs / 1000;
  const autoAttackDps = autoDamage / seconds;
  const abilityDps = abilityDamage / seconds;
  const splashDps = splashDamage / seconds;

  const abilityLines = Object.entries(abilityTotals).map(([key, total]) => ({
    key,
    label: key,
    dps: total / seconds,
    detail: key === "burn" ? "Event sim DoT ticks" : "Event sim proc rolls",
  }));

  const { debuffLines: staticDebuffs } = estimateAbilityDps(source, target, abilities, {
    simDurationMs: durationMs,
  });
  const stunLine = stunDebuffLine(source);
  const debuffLines = [
    ...(stunLine ? [stunLine] : []),
    ...staticDebuffs.map((line) => ({
      ...line,
      detail:
        debuffProcCounts[line.key] != null
          ? `${line.detail} · ${debuffProcCounts[line.key]} procs rolled`
          : line.detail,
    })),
  ];

  const sustainLines: DpsBreakdown["sustainLines"] = [];
  if (sustainHp > 0) {
    sustainLines.push({
      key: "lifesteal",
      label: "Lifesteal",
      perSecond: sustainHp / seconds,
      detail: `${source.lifesteal ?? 0}% · event sim`,
    });
  }
  if (sustainMp > 0) {
    sustainLines.push({
      key: "manasteal",
      label: "Manasteal",
      perSecond: sustainMp / seconds,
      detail: `${source.manasteal ?? 0}% · event sim`,
    });
  }

  const splashLines =
    splashDps > 0
      ? splashStats.map((row) => ({
          key: row.key,
          label: row.label,
          dps: (row.damagePerTarget * splashTargetCount * hits) / seconds,
          detail: `${splashTargetCount} nearby · rolled ${hits} hits`,
        }))
      : undefined;

  let hitsToKill: number | null = null;
  if (target.hp != null && target.hp > 0 && baseHit > 0) {
    hitsToKill = Math.ceil(target.hp / baseHit);
  }

  const unsimulated =
    splashTargetCount <= 0
      ? collectUnsimulatedOnHitEffects(gear, G, options?.classKey, source.damage_type, 0)
      : undefined;

  return {
    hitDamage: baseHit,
    mitigationMult,
    autoAttackDps,
    abilityDps,
    abilityLines: abilityLines.length > 0 ? abilityLines : undefined,
    splashDps: splashDps > 0 ? splashDps : undefined,
    splashLines,
    debuffLines: debuffLines.length > 0 ? debuffLines : undefined,
    sustainLines: sustainLines.length > 0 ? sustainLines : undefined,
    totalDps: autoAttackDps + abilityDps + splashDps,
    hitsToKill,
    unsimulatedEffects: unsimulated?.length ? unsimulated : undefined,
    simDurationMs: durationMs,
    simIterations: hits,
  };
}

/** @deprecated Use simulateCombatTimeline */
export function simulateAutoAttackTimeline(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  options?: CombatSimOptions,
): DpsBreakdown {
  return simulateCombatTimeline(source, target, {}, {} as CustomGData, options);
}

/** Formulation + ability uplift + optional splash targets. */
export function estimateTotalDps(
  source: CombatEntity,
  target: HitDamageTarget & Pick<CombatEntity, "hp">,
  G: CustomGData,
  gear: { [slot in SlotType]?: ItemInfo },
  options?: TotalDpsOptions,
): DpsBreakdown {
  if (options?.mode === "event") {
    return simulateCombatTimeline(source, target, gear, G, options);
  }

  const simDurationMs = options?.durationMs ?? 30_000;
  const abilities = collectGearAbilities(gear, G, options?.classKey);
  let freq = source.frequency ?? 0;
  if (options?.assumeChargeBuffs) {
    freq += chargeBuffFrequencyBonus(abilities);
  }

  const { damage: plainHitDamage, mitigationMult: plainMitigation } = estimateHitDamage(
    source,
    target,
    options,
  );
  let hitDamage = plainHitDamage;
  let mitigationMult = plainMitigation;
  const abilityLinesExtra: { key: string; label: string; dps: number; detail?: string }[] = [];

  if (options?.useSkillRotation && options.classKey) {
    const swing = resolveBestAutoSwing(source, target, G, {
      classKey: options.classKey,
      playerLevel: options.playerLevel ?? 80,
      mainhandWtype: options.mainhandWtype,
      splashTargetCount: options.splashTargetCount ?? 0,
      simOptions: options,
    });
    hitDamage = swing.perSwingDamage;
    mitigationMult = swing.mitigationMult;
    if (swing.skillKey && swing.perSwingDamage > plainHitDamage) {
      abilityLinesExtra.push({
        key: `skill:${swing.skillKey}`,
        label: swing.skillLabel ?? swing.skillKey,
        dps: 0,
        detail: swing.skillDetail,
      });
    }
  }

  let autoAttackDps = hitDamage * freq;

  const rogueBoost = rogueStackDpsBoost({
    classKey: options?.classKey,
    frequency: freq,
    hitDamage,
    sourceAttack: source.attack,
    simDurationMs,
  });
  if (rogueBoost) {
    autoAttackDps += rogueBoost.dps;
    abilityLinesExtra.push({
      key: "stack",
      label: "Rogue stack",
      dps: rogueBoost.dps,
      detail: rogueBoost.detail,
    });
  }

  const { abilityDps, lines, debuffLines } = estimateAbilityDps(source, target, abilities, {
    simDurationMs,
  });

  let skillDps = 0;
  let skillLines: DpsBreakdown["abilityLines"] = [];
  let skillUnsimulated: DpsBreakdown["unsimulatedEffects"];
  if (options?.useSkillRotation && options.classKey) {
    const rotation = estimateSkillRotationDps(source, target, G, {
      classKey: options.classKey,
      playerLevel: options.playerLevel ?? 80,
      mainhandWtype: options.mainhandWtype,
      simOptions: options,
    });
    skillDps = rotation.skillDps;
    skillLines = rotation.lines;
    if (rotation.unsimulated.length > 0) {
      skillUnsimulated = rotation.unsimulated;
    }
  }

  const stunLine = stunDebuffLine(source);
  const allDebuffs = [...(stunLine ? [stunLine] : []), ...debuffLines];

  const { splashDps, splashLines, unsimulatedEffects } = buildSplashBreakdown(
    source,
    target,
    gear,
    G,
    options,
    freq,
  );
  const sustainLines = buildSustainLines(source, hitDamage, freq, target.hp);
  const reflectionRisk = outgoingReflectionRisk(source, target, hitDamage, freq);
  const riskLines = reflectionRisk
    ? [
        {
          key: "reflection",
          label: "Reflect risk",
          perSecond: reflectionRisk.perSecond,
          detail: reflectionRisk.detail,
        },
      ]
    : undefined;

  if (options?.assumeChargeBuffs && chargeBuffFrequencyBonus(abilities) > 0) {
    const buffFreq = chargeBuffFrequencyBonus(abilities);
    const buffKey = abilities.xpower ? "xpower" : "power";
    lines.unshift({
      key: buffKey,
      label: `${buffKey} buff`,
      dps: hitDamage * buffFreq,
      detail: `+${buffFreq} frequency (charge ability assumed active)`,
    });
  }

  const totalDps = autoAttackDps + abilityDps + skillDps + splashDps;

  let hitsToKill: number | null = null;
  if (target.hp != null && target.hp > 0 && hitDamage > 0) {
    hitsToKill = Math.ceil(target.hp / hitDamage);
  }

  const mergedUnsimulated = [...(unsimulatedEffects ?? []), ...(skillUnsimulated ?? [])];

  return {
    hitDamage,
    mitigationMult,
    autoAttackDps,
    abilityDps: abilityDps + skillDps,
    abilityLines: [...lines, ...abilityLinesExtra, ...skillLines],
    debuffLines: allDebuffs.length > 0 ? allDebuffs : undefined,
    sustainLines: sustainLines.length > 0 ? sustainLines : undefined,
    riskLines,
    splashDps: splashDps > 0 ? splashDps : undefined,
    splashLines,
    unsimulatedEffects: mergedUnsimulated.length > 0 ? mergedUnsimulated : undefined,
    totalDps,
    hitsToKill,
  };
}
