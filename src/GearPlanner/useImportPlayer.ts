import { useCallback } from "react";
import axios from "axios";

import useIsLocalEnvironment from "./useIsLocalEnvironment";
import { SavedLoadouts } from "./types";

export default function useImportPlayer() {
  const isLocalEnvironment = useIsLocalEnvironment();

  return useCallback<(query: string) => Promise<SavedLoadouts>>(
    async (query) => {
      if (!isLocalEnvironment) {
        return (await axios.get<SavedLoadouts>(`https://adventureland-player.deno.dev/${query}`))
          .data;
      }

      const regex =
        /var slots[^=]+=(?<gear>.+);(?:.|\n)+?Name:<\/span>(?<name>.+)<\/div>(?:.|\n)+?Class:<\/span>(?<classKey>.+)<\/div>(?:.|\n)+?Level:<\/span>(?<level>.+)<\/div>/gm;

      const response = await axios.get(`/al/player/${query}`);
      const html = response.data;

      const characters: SavedLoadouts = {};

      let match = regex.exec(html) as any;
      while (match !== null) {
        const name = (match.groups.name as string).trim();
        const gear = JSON.parse(match.groups.gear);
        const classKey = match.groups.classKey.trim().toLowerCase();
        const level = +match.groups.level.trim();
        characters[name] = { gear, classKey, level };
        match = regex.exec(html);
      }

      return characters;
    },
    [isLocalEnvironment],
  );
}
