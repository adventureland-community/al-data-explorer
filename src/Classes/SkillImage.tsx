import { useContext } from "react";

import { GDataContext } from "../GDataContext";
import { getSkill } from "../gameData/classSkills";
import { SkinImage } from "../ItemImage";

export function SkillImage({ skillKey, size = 40 }: { skillKey: string; size?: number }) {
  const G = useContext(GDataContext);
  const skill = G ? getSkill(G.skills, skillKey) : undefined;
  const skin = skill?.skin ?? skillKey;
  return <SkinImage skin={skin} size={size} alt={skill?.name ?? skillKey} />;
}
