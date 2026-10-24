import axios from "axios";
import { ItemInfo, SlotType } from "typed-adventureland";

import { isClassKey } from "../gameData/classSkills";
import { CharacterLoadout, parseCharacterLookFromHtml } from "./fetchCharacterLoadout";

const AL_PROXY_BASE = "https://al-proxy.thmsn.workers.dev";

function playerUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  const isLocal = process.env.NODE_ENV !== "production";
  return isLocal ? `/al/player/${encoded}` : `${AL_PROXY_BASE}/player/${encoded}`;
}

/** Parse all public characters from an adventure.land player page. */
export function parsePlayerCharactersHtml(html: string): CharacterLoadout[] {
  const regex =
    /var slots[^=]+=(?<gear>.+);(?:.|\n)+?Name:<\/span>(?<name>.+)<\/div>(?:.|\n)+?Class:<\/span>(?<classKey>.+)<\/div>(?:.|\n)+?Level:<\/span>(?<level>.+)<\/div>/gm;

  const pageLook = parseCharacterLookFromHtml(html);
  const results: CharacterLoadout[] = [];
  let match = regex.exec(html);
  while (match !== null) {
    if (match.groups) {
      const name = match.groups.name.trim();
      const gear = JSON.parse(match.groups.gear) as { [slot in SlotType]?: ItemInfo };
      const classRaw = match.groups.classKey.trim().toLowerCase();
      const level = Number(match.groups.level.trim());
      results.push({
        name,
        gear,
        classKey: isClassKey(classRaw) ? classRaw : undefined,
        level: Number.isFinite(level) ? level : 0,
        // Player pages often share one preview skin; use it only as a soft fallback.
        look: pageLook,
      });
    }
    match = regex.exec(html);
  }
  return results;
}

export async function fetchPlayerCharacters(playerName: string): Promise<CharacterLoadout[]> {
  const response = await axios.get<string>(playerUrl(playerName), {
    responseType: "text",
    timeout: 60000,
  });
  const list = parsePlayerCharactersHtml(response.data);
  if (list.length === 0) {
    throw new Error(`No public characters found for player "${playerName}".`);
  }
  return list;
}
