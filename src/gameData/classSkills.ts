import { ClassKey, GClass, GSkill } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { calculateClassStatByLevel } from "./classLevelStats";
import { STAT_DISPLAY_LABELS } from "./statLabels";

export const CLASS_KEYS: ClassKey[] = [
  "warrior",
  "paladin",
  "rogue",
  "ranger",
  "mage",
  "priest",
  "merchant",
];

export type SkillKind = "class" | "item" | "shared" | "monster" | "utility";

export const SKILL_KIND_LABELS: Record<SkillKind, string> = {
  class: "Class",
  item: "Item",
  shared: "Shared",
  monster: "Monster",
  utility: "Utility",
};

export const SKILL_KIND_ORDER: SkillKind[] = ["class", "item", "shared", "monster", "utility"];

export type SkillSortKey = "name" | "class" | "mp" | "cooldown" | "type";

export type SkillQuery = {
  search?: string;
  classes?: string[];
  kinds?: SkillKind[];
  types?: string[];
  sort?: SkillSortKey;
};

export type SkillRow = {
  key: string;
  skill: GSkill;
  kind: SkillKind;
};

export type ClassCatalogEntry = {
  key: ClassKey;
  gClass: GClass;
  skillCount: number;
  lookSkin?: string;
};

export type ClassCombatStat = { key: string; label: string; value: string };

export type ClassAttrRow = {
  key: string;
  label: string;
  base: number;
  growth: number;
  atLevel: number;
};

export type WeaponBonusRow = {
  wtype: string;
  bonuses: { key: string; label: string; value: string }[];
};

const MAIN_STATS = ["str", "dex", "int", "vit", "for"] as const;

export function isClassKey(key: string): key is ClassKey {
  for (const known of CLASS_KEYS) {
    if (known === key) return true;
  }
  return false;
}

export function isSkillKind(value: string): value is SkillKind {
  for (const known of SKILL_KIND_ORDER) {
    if (known === value) return true;
  }
  return false;
}

export function titleCaseKey(key: string): string {
  return key
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function skillKind(skill: GSkill): SkillKind {
  if (skill.type === "monster") return "monster";
  if (skill.type === "utility" || skill.type === "gm" || skill.type == null) return "utility";
  if (skill.slot || skill.consume) return "item";
  if (skill.class && skill.class.length > 0) return "class";
  return "shared";
}

export function getSkill(skills: CustomGData["skills"], key: string): GSkill | undefined {
  return (skills as Record<string, GSkill | undefined>)[key];
}

export function getCondition(
  conditions: CustomGData["conditions"] | undefined,
  key: string,
): CustomGData["conditions"][keyof CustomGData["conditions"]] | undefined {
  if (!conditions) return undefined;
  return (
    conditions as Record<
      string,
      CustomGData["conditions"][keyof CustomGData["conditions"]] | undefined
    >
  )[key];
}

export function listSkills(skills: CustomGData["skills"]): SkillRow[] {
  const rows: SkillRow[] = [];
  for (const [key, skill] of Object.entries(skills)) {
    if (!skill) continue;
    rows.push({ key, skill, kind: skillKind(skill) });
  }
  return rows;
}

export function listSkillTypes(skills: CustomGData["skills"]): string[] {
  const types: string[] = [];
  const seen = new Set<string>();
  for (const skill of Object.values(skills)) {
    if (!skill) continue;
    const type = skill.type ?? "(none)";
    if (seen.has(type)) continue;
    seen.add(type);
    types.push(type);
  }
  types.sort((a, b) => a.localeCompare(b));
  return types;
}

export function skillMatchesClasses(skill: GSkill, classes: string[]): boolean {
  if (classes.length === 0) return true;
  const skillClasses = skill.class;
  if (!skillClasses || skillClasses.length === 0) return false;
  for (const wanted of classes) {
    for (const have of skillClasses) {
      if (have === wanted) return true;
    }
  }
  return false;
}

function skillSearchHaystack(row: SkillRow): string {
  const slotKeys: string[] = [];
  if (row.skill.slot) {
    for (const pair of row.skill.slot) {
      slotKeys.push(pair[1]);
    }
  }
  return `${row.key} ${row.skill.name} ${row.skill.explanation ?? ""} ${
    row.skill.class?.join(" ") ?? ""
  } ${row.skill.share ?? ""} ${row.skill.condition ?? ""} ${
    row.skill.consume ?? ""
  } ${slotKeys.join(" ")}`.toLowerCase();
}

function compareSkills(a: SkillRow, b: SkillRow, sort: SkillSortKey): number {
  if (sort === "mp") {
    const diff = (a.skill.mp ?? -1) - (b.skill.mp ?? -1);
    if (diff !== 0) return diff;
  } else if (sort === "cooldown") {
    const diff = (a.skill.cooldown ?? -1) - (b.skill.cooldown ?? -1);
    if (diff !== 0) return diff;
  } else if (sort === "type") {
    const diff = a.kind.localeCompare(b.kind);
    if (diff !== 0) return diff;
    const byType = (a.skill.type ?? "").localeCompare(b.skill.type ?? "");
    if (byType !== 0) return byType;
  } else if (sort === "class") {
    const aClass = a.skill.class?.[0] ?? "";
    const bClass = b.skill.class?.[0] ?? "";
    const diff = aClass.localeCompare(bClass);
    if (diff !== 0) return diff;
  }
  const byName = a.skill.name.localeCompare(b.skill.name);
  if (byName !== 0) return byName;
  return a.key.localeCompare(b.key);
}

export function querySkills(skills: CustomGData["skills"], query: SkillQuery = {}): SkillRow[] {
  const search = (query.search ?? "").trim().toLowerCase();
  const classFilter = query.classes ?? [];
  const kindFilter = query.kinds ?? [];
  const typeFilter = query.types ?? [];
  const sort = query.sort ?? "name";

  const rows: SkillRow[] = [];
  for (const row of listSkills(skills)) {
    if (!skillMatchesClasses(row.skill, classFilter)) continue;
    if (kindFilter.length > 0 && !kindFilter.includes(row.kind)) continue;
    if (typeFilter.length > 0 && !typeFilter.includes(row.skill.type ?? "(none)")) continue;
    if (search && !skillSearchHaystack(row).includes(search)) continue;
    rows.push(row);
  }
  rows.sort((a, b) => compareSkills(a, b, sort));
  return rows;
}

export function skillsForClass(skills: CustomGData["skills"], classKey: ClassKey): SkillRow[] {
  return querySkills(skills, { classes: [classKey], sort: "name" });
}

export function classLookSkin(gClass: GClass): string | undefined {
  const { looks } = gClass;
  if (!looks) return undefined;
  const first = looks[0];
  if (!first) return undefined;
  return first[0];
}

export function classLookSkins(gClass: GClass): string[] {
  const skins: string[] = [];
  if (!gClass.looks) return skins;
  for (const look of gClass.looks) {
    const skin = look?.[0];
    if (!skin) continue;
    let seen = false;
    for (const existing of skins) {
      if (existing === skin) {
        seen = true;
        break;
      }
    }
    if (!seen) skins.push(skin);
  }
  return skins;
}

export function listClassCatalog(G: Pick<CustomGData, "classes" | "skills">): ClassCatalogEntry[] {
  const entries: ClassCatalogEntry[] = [];
  for (const key of CLASS_KEYS) {
    const gClass = G.classes[key];
    if (!gClass) continue;
    entries.push({
      key,
      gClass,
      skillCount: skillsForClass(G.skills, key).length,
      lookSkin: classLookSkin(gClass),
    });
  }
  return entries;
}

export function formatSkillMs(ms: number): string {
  if (ms === 0) return "instant";
  if (ms >= 24 * 60 * 60 * 1000) return "until cancelled";
  if (ms >= 1000) {
    const seconds = ms / 1000;
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds}s`;
  }
  return `${ms}ms`;
}

function pushCombatStat(rows: ClassCombatStat[], key: string, value: unknown) {
  if (value == null || value === "") return;
  rows.push({
    key,
    label: STAT_DISPLAY_LABELS[key] ?? titleCaseKey(key),
    value: String(value),
  });
}

export function classCombatStats(gClass: GClass): ClassCombatStat[] {
  const rows: ClassCombatStat[] = [];
  pushCombatStat(rows, "hp", gClass.hp);
  pushCombatStat(rows, "mp", gClass.mp);
  pushCombatStat(rows, "attack", gClass.attack);
  pushCombatStat(rows, "range", gClass.range);
  pushCombatStat(rows, "speed", gClass.speed);
  pushCombatStat(rows, "frequency", gClass.frequency);
  pushCombatStat(rows, "armor", gClass.armor);
  pushCombatStat(rows, "resistance", gClass.resistance);
  pushCombatStat(rows, "output", gClass.output);
  pushCombatStat(rows, "mp_cost", gClass.mp_cost);
  pushCombatStat(rows, "courage", gClass.courage);
  pushCombatStat(rows, "mcourage", gClass.mcourage);
  pushCombatStat(rows, "pcourage", gClass.pcourage);
  pushCombatStat(rows, "projectile", gClass.projectile);
  return rows;
}

export function classAttributeRows(gClass: GClass, level: number): ClassAttrRow[] {
  const rows: ClassAttrRow[] = [];
  for (const key of MAIN_STATS) {
    const base = gClass.stats[key];
    const growth = gClass.lstats[key];
    rows.push({
      key,
      label: STAT_DISPLAY_LABELS[key] ?? titleCaseKey(key),
      base,
      growth,
      atLevel: calculateClassStatByLevel(base, growth, level),
    });
  }
  return rows;
}

export function classWeaponRows(table: object | undefined): WeaponBonusRow[] {
  if (!table) return [];
  const rows: WeaponBonusRow[] = [];
  for (const [wtype, bonuses] of Object.entries(table)) {
    const bonusRows: WeaponBonusRow["bonuses"] = [];
    if (bonuses && typeof bonuses === "object") {
      for (const [key, value] of Object.entries(bonuses)) {
        if (typeof value !== "number") continue;
        bonusRows.push({
          key,
          label: STAT_DISPLAY_LABELS[key] ?? titleCaseKey(key),
          value: value > 0 ? `+${value}` : String(value),
        });
      }
    }
    rows.push({ wtype, bonuses: bonusRows });
  }
  return rows;
}

type SkillAuraStateDef = {
  name?: string;
  condition?: string;
  values?: Record<string, number[]>;
};

type SkillExtra = GSkill & {
  instant?: boolean;
  no_self?: boolean;
  exclusive_condition?: string;
  fixed_range?: boolean;
  link_range?: number;
  offhand_type?: string;
  armor_cap?: number;
  armor_multiplier?: number;
  default_state?: string;
  rank_levels?: number[];
  mp_return_levels?: Array<[number, number]>;
  cooldown_multiplier?: number;
  kill_buff?: string;
  nprop?: string[];
  negative?: string[];
  positive?: string[];
  levels?: Array<[number, number]>;
  states?: Record<string, SkillAuraStateDef>;
};

export function skillExtra(skill: GSkill): SkillExtra {
  return skill as SkillExtra;
}

function toSkillRow(key: string, skill: GSkill): SkillRow {
  return { key, skill, kind: skillKind(skill) };
}

function sortSkillRowsByName(rows: SkillRow[]): SkillRow[] {
  rows.sort((a, b) => {
    const byName = a.skill.name.localeCompare(b.skill.name);
    if (byName !== 0) return byName;
    return a.key.localeCompare(b.key);
  });
  return rows;
}

/** Skills that share this skill's cooldown, including reverse `share` links. */
export function skillsSharingCooldown(skills: CustomGData["skills"], skillKey: string): SkillRow[] {
  const skill = getSkill(skills, skillKey);
  if (!skill) return [];
  const hub = skill.share ?? skillKey;
  const keys = new Set<string>();
  if (hub !== skillKey) keys.add(hub);
  for (const [key, other] of Object.entries(skills)) {
    if (!other || key === skillKey) continue;
    if (key === hub || other.share === hub || other.share === skillKey) {
      keys.add(key);
    }
  }
  const rows: SkillRow[] = [];
  for (const key of keys) {
    const other = getSkill(skills, key);
    if (!other) continue;
    rows.push(toSkillRow(key, other));
  }
  return sortSkillRowsByName(rows);
}

/** Other skills that apply the same condition. */
export function skillsSharingCondition(
  skills: CustomGData["skills"],
  skillKey: string,
): SkillRow[] {
  const skill = getSkill(skills, skillKey);
  const condition = skill?.condition;
  if (!skill || !condition) return [];
  const rows: SkillRow[] = [];
  for (const [key, other] of Object.entries(skills)) {
    if (!other || key === skillKey) continue;
    if (other.condition === condition) rows.push(toSkillRow(key, other));
  }
  return sortSkillRowsByName(rows);
}

/** Skills that cannot coexist with this one, both directions. */
export function skillsExclusiveWith(skills: CustomGData["skills"], skillKey: string): SkillRow[] {
  const skill = getSkill(skills, skillKey);
  if (!skill) return [];
  const named = skillExtra(skill).exclusive_condition;
  const seen = new Set<string>();
  const rows: SkillRow[] = [];
  if (named && named !== skillKey) {
    const other = getSkill(skills, named);
    if (other) {
      seen.add(named);
      rows.push(toSkillRow(named, other));
    }
  }
  for (const [key, other] of Object.entries(skills)) {
    if (!other || key === skillKey || seen.has(key)) continue;
    if (skillExtra(other).exclusive_condition === skillKey) {
      rows.push(toSkillRow(key, other));
    }
  }
  return sortSkillRowsByName(rows);
}

export type SkillEssenceLink = { itemKey: string; role: "positive" | "negative" };

export function skillEssenceItems(skill: GSkill): SkillEssenceLink[] {
  const extra = skillExtra(skill);
  const rows: SkillEssenceLink[] = [];
  for (const itemKey of extra.positive ?? []) {
    rows.push({ itemKey, role: "positive" });
  }
  for (const itemKey of extra.negative ?? []) {
    rows.push({ itemKey, role: "negative" });
  }
  return rows;
}

export function skillFlagLabels(skill: GSkill): string[] {
  const extra = skillExtra(skill);
  const flags: Array<[boolean | undefined, string]> = [
    [skill.hostile, "Hostile"],
    [extra.instant, "Instant"],
    [skill.heal, "Heal"],
    [skill.passive, "Passive"],
    [skill.aura, "Aura"],
    [skill.procs, "Procs"],
    [skill.toggle, "Toggle"],
    [skill.party, "Party"],
    [skill.global, "Global"],
    [skill.multi, "Multi"],
    [skill.monsters, "Monsters"],
    [extra.no_self, "No self"],
    [extra.fixed_range, "Fixed range"],
    [skill.ui, "UI"],
    [Boolean(skill.code), "Code"],
    [skill.persistent, "Persistent"],
    [skill.pierces_immunity, "Pierces immunity"],
    [skill.merchant_use, "Merchant"],
    [skill.list, "List"],
  ];
  const labels: string[] = [];
  for (const [on, label] of flags) {
    if (on) labels.push(label);
  }
  return labels;
}

export function formatWtype(wtype: GSkill["wtype"]): string | undefined {
  if (!wtype) return undefined;
  if (Array.isArray(wtype)) return wtype.join(", ");
  return wtype;
}

export type SkillHeroStat = { key: string; label: string; value: string };

export function skillHeroStats(skill: GSkill): SkillHeroStat[] {
  const stats: SkillHeroStat[] = [];
  if (skill.mp != null) stats.push({ key: "mp", label: "MP", value: String(skill.mp) });
  if (skill.cooldown != null) {
    stats.push({ key: "cooldown", label: "Cooldown", value: formatSkillMs(skill.cooldown) });
  }
  if (skill.reuse_cooldown != null) {
    stats.push({
      key: "reuse_cooldown",
      label: "Reuse",
      value: formatSkillMs(skill.reuse_cooldown),
    });
  }
  if (skill.range != null) stats.push({ key: "range", label: "Range", value: String(skill.range) });
  if (skill.damage != null) {
    stats.push({ key: "damage", label: "Damage", value: String(skill.damage) });
  }
  if (skill.ratio != null) stats.push({ key: "ratio", label: "Ratio", value: String(skill.ratio) });
  if (skill.duration != null) {
    stats.push({ key: "duration", label: "Duration", value: formatSkillMs(skill.duration) });
  } else if (skill.duration_min != null || skill.duration_max != null) {
    const min = skill.duration_min != null ? formatSkillMs(skill.duration_min) : "—";
    const max = skill.duration_max != null ? formatSkillMs(skill.duration_max) : "—";
    stats.push({ key: "duration", label: "Duration", value: `${min}–${max}` });
  }
  return stats;
}

export type SkillAuraState = {
  key: string;
  name: string;
  condition?: string;
  values: { stat: string; label: string; ranks: number[] }[];
};

export type SkillMpReturnRow = { level: number; ratio: number };

export function skillRankLevels(skill: GSkill): number[] {
  return skillExtra(skill).rank_levels ?? [];
}

export function skillMpReturnRows(skill: GSkill): SkillMpReturnRow[] {
  const rows: SkillMpReturnRow[] = [];
  const pairs = skillExtra(skill).mp_return_levels;
  if (!pairs) return rows;
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    rows.push({ level: pair[0], ratio: pair[1] });
  }
  return rows;
}

export function formatMpReturnRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export type SkillLevelRow = { level: number; value: number };

export function skillLevelRows(skill: GSkill): SkillLevelRow[] {
  const rows: SkillLevelRow[] = [];
  const pairs = skillExtra(skill).levels;
  if (!pairs) return rows;
  for (const pair of pairs) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    rows.push({ level: pair[0], value: pair[1] });
  }
  return rows;
}

export function formatSkillLevelValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 1000) / 1000);
}

export function skillAuraStates(skill: GSkill): SkillAuraState[] {
  const extra = skillExtra(skill);
  const { states } = extra;
  if (!states) return [];
  const ranks = extra.rank_levels ?? [];
  const rows: SkillAuraState[] = [];
  for (const [key, def] of Object.entries(states)) {
    if (!def) continue;
    const values: SkillAuraState["values"] = [];
    if (def.values) {
      for (const [stat, amounts] of Object.entries(def.values)) {
        if (!Array.isArray(amounts)) continue;
        const sliced = ranks.length > 0 ? amounts.slice(0, ranks.length) : amounts;
        values.push({
          stat,
          label: STAT_DISPLAY_LABELS[stat] ?? titleCaseKey(stat),
          ranks: sliced,
        });
      }
    }
    rows.push({
      key,
      name: def.name ?? titleCaseKey(key),
      condition: def.condition,
      values,
    });
  }
  return rows;
}
