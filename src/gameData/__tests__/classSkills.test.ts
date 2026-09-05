import { readFileSync } from "fs";
import { join } from "path";
import { GSkill } from "typed-adventureland";

import {
  classAttributeRows,
  classLookSkins,
  formatSkillMs,
  getSkill,
  isClassKey,
  listClassCatalog,
  querySkills,
  skillAuraStates,
  skillEssenceItems,
  skillHeroStats,
  skillKind,
  skillLevelRows,
  skillMpReturnRows,
  skillsExclusiveWith,
  skillsForClass,
  skillsSharingCondition,
  skillsSharingCooldown,
} from "../classSkills";

function loadG() {
  return JSON.parse(readFileSync(join(process.cwd(), "public/data.json"), "utf8")) as {
    classes: import("../../GDataContext").CustomGData["classes"];
    skills: import("../../GDataContext").CustomGData["skills"];
  };
}

describe("classSkills", () => {
  const G = loadG();

  it("classifies class, item, monster, and utility skills", () => {
    expect(skillKind(G.skills.cleave)).toBe("class");
    expect(skillKind(G.skills.scare)).toBe("item");
    expect(skillKind(G.skills.attack)).toBe("shared");
    expect(skillKind(G.skills.fireball)).toBe("monster");
    expect(skillKind(G.skills.move_up)).toBe("utility");
  });

  it("lists every playable class from G.classes", () => {
    const catalog = listClassCatalog(G);
    expect(catalog.map((entry) => entry.key)).toStrictEqual([
      "warrior",
      "paladin",
      "rogue",
      "ranger",
      "mage",
      "priest",
      "merchant",
    ]);
    expect(catalog[0].skillCount).toBeGreaterThan(0);
  });

  it("filters warrior skills without including mage burst", () => {
    const rows = querySkills(G.skills, { classes: ["warrior"] });
    const keys = rows.map((row) => row.key);
    expect(keys).toContain("cleave");
    expect(keys).not.toContain("burst");
  });

  it("finds cleave by search text", () => {
    const rows = querySkills(G.skills, { search: "flurry" });
    expect(rows.map((row) => row.key)).toContain("cleave");
  });

  it("lists class skills for rogue", () => {
    const keys = skillsForClass(G.skills, "rogue").map((row) => row.key);
    expect(keys).toContain("quickstab");
    expect(keys).toContain("invis");
  });

  it("formats cooldowns in ms or seconds", () => {
    expect(formatSkillMs(250)).toBe("250ms");
    expect(formatSkillMs(6000)).toBe("6s");
    expect(formatSkillMs(0)).toBe("instant");
    expect(formatSkillMs(999999999)).toBe("until cancelled");
  });

  it("scales class attributes with the server formula", () => {
    const rows = classAttributeRows(G.classes.warrior, 1);
    const str = rows.find((row) => row.key === "str");
    expect(str?.base).toBe(10);
    expect(str?.atLevel).toBeGreaterThanOrEqual(10);
  });

  it("narrows class keys", () => {
    expect(isClassKey("warrior")).toBe(true);
    expect(isClassKey("goo")).toBe(false);
  });

  it("treats a skill without type as utility", () => {
    const skill = { name: "Toggle Code" } as GSkill;
    expect(skillKind(skill)).toBe("utility");
  });

  it("lists unique class look skins", () => {
    const skins = classLookSkins(G.classes.warrior);
    expect(skins.length).toBeGreaterThan(0);
    expect(skins[0]).toBe("marmor6d");
  });

  it("builds hero stats for cleave", () => {
    const keys = skillHeroStats(G.skills.cleave).map((row) => row.key);
    expect(keys).toContain("mp");
    expect(keys).toContain("cooldown");
    expect(keys).toContain("range");
  });

  it("lists the new paladin kit including aura ranks", () => {
    const keys = skillsForClass(G.skills, "paladin").map((row) => row.key);
    expect(keys).toContain("shield_slam");
    expect(keys).toContain("paladin_aura");
    expect(keys).toContain("aether_shield");
    const aura = getSkill(G.skills, "paladin_aura");
    expect(aura).toBeDefined();
    const auraStates = skillAuraStates(aura!).map((state) => state.key);
    expect(auraStates).toContain("bulwark");
    expect(auraStates).toContain("sanctuary");
    expect(auraStates).toContain("zeal");
    expect(auraStates).toContain("warding");
    const aether = getSkill(G.skills, "aether_shield");
    expect(aether).toBeDefined();
    expect(skillMpReturnRows(aether!).length).toBeGreaterThan(0);
  });

  it("resolves cooldown share groups in both directions", () => {
    const fromHub = skillsSharingCooldown(G.skills, "mshield").map((row) => row.key);
    expect(fromHub).toContain("aether_shield");
    expect(fromHub).not.toContain("mshield");
    const fromLeaf = skillsSharingCooldown(G.skills, "aether_shield").map((row) => row.key);
    expect(fromLeaf).toContain("mshield");
    const attackGroup = skillsSharingCooldown(G.skills, "attack").map((row) => row.key);
    expect(attackGroup).toContain("3shot");
    expect(attackGroup).toContain("5shot");
    expect(attackGroup).toContain("piercingshot");
    expect(attackGroup).toContain("fanofknives");
    expect(attackGroup).toContain("heal");
    expect(attackGroup).not.toContain("attack");
    const threeShot = skillsSharingCooldown(G.skills, "3shot").map((row) => row.key);
    expect(threeShot).toContain("attack");
    expect(threeShot).toContain("5shot");
  });

  it("finds other skills that apply the same condition", () => {
    const keys = skillsSharingCondition(G.skills, "curse").map((row) => row.key);
    expect(keys).toContain("curse_aura");
    expect(keys).not.toContain("curse");
  });

  it("finds exclusive skills from either side", () => {
    expect(skillsExclusiveWith(G.skills, "mshield").map((row) => row.key)).toContain(
      "aether_shield",
    );
    expect(skillsExclusiveWith(G.skills, "aether_shield").map((row) => row.key)).toContain(
      "mshield",
    );
  });

  it("indexes share targets so search can find reverse cooldown links", () => {
    const rows = querySkills(G.skills, { search: "mshield" });
    expect(rows.map((row) => row.key)).toContain("aether_shield");
  });

  it("lists throw essences and heal-by-level rows", () => {
    const throwSkill = getSkill(G.skills, "throw");
    expect(throwSkill).toBeDefined();
    const essences = skillEssenceItems(throwSkill!);
    expect(essences.map((row) => row.itemKey)).toContain("essenceoflife");
    expect(essences.map((row) => row.itemKey)).toContain("essenceoffire");
    expect(skillLevelRows(G.skills.partyheal).map((row) => row.level)).toStrictEqual([
      0, 60, 72, 80,
    ]);
  });
});
