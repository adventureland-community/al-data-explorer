import axios from "axios";
import { ClassKey, ItemInfo, SlotType } from "typed-adventureland";

import { isClassKey } from "../gameData/classSkills";
import { SavedLoadout } from "../GearPlanner/types";

const AL_PROXY_BASE = "https://al-proxy.thmsn.workers.dev";

export type CharacterLoadout = SavedLoadout & { name: string };

function characterUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  const isLocal = process.env.NODE_ENV !== "production";
  return isLocal ? `/al/character/${encoded}` : `${AL_PROXY_BASE}/character/${encoded}`;
}

/** Fetch and parse a single adventure.land character page into a loadout. */
export async function fetchCharacterLoadout(name: string): Promise<CharacterLoadout> {
  const response = await axios.get<string>(characterUrl(name), {
    responseType: "text",
    timeout: 60000,
  });
  const html = response.data;
  const match = html.match(
    /var slots[^=]+=(?<gear>.+);(?:.|\n)+Name:<\/span>(?<name>.+)<\/div>(?:.|\n)+Class:<\/span>(?<classKey>.+)<\/div>(?:.|\n)+Level:<\/span>(?<level>.+)<\/div>/,
  );
  if (!match?.groups) {
    throw new Error(`Could not parse character page for ${name}`);
  }

  const parsedName = match.groups.name.trim();
  const gear = JSON.parse(match.groups.gear) as { [slot in SlotType]?: ItemInfo };
  const classRaw = match.groups.classKey.trim().toLowerCase();
  const classKey: ClassKey | undefined = isClassKey(classRaw) ? classRaw : undefined;
  const level = Number(match.groups.level.trim());

  return {
    name: parsedName,
    gear,
    classKey,
    level: Number.isFinite(level) ? level : 0,
  };
}
