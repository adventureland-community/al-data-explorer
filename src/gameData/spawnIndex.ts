import { GMap, MapKey, MonsterKey } from "typed-adventureland";

export function buildSpawnIndex(maps: Record<string, GMap>): Map<MonsterKey, MapKey[]> {
  const index = new Map<MonsterKey, MapKey[]>();

  for (const mapName of Object.keys(maps)) {
    const map = maps[mapName];
    if (!map.monsters) continue;
    for (const spawn of map.monsters) {
      const monsterType = spawn.type as MonsterKey;
      const list = index.get(monsterType) ?? [];
      if (!list.includes(mapName as MapKey)) {
        list.push(mapName as MapKey);
      }
      index.set(monsterType, list);
    }
  }

  return index;
}
