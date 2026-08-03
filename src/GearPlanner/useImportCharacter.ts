import { useCallback } from "react";
import axios from "axios";

import useIsLocalEnvironment from "./useIsLocalEnvironment";
import { SavedLoadouts } from "./types";

const AL_PROXY_BASE = "https://al-proxy.thmsn.workers.dev";

export default function useImportCharacter() {
  const isLocalEnvironment = useIsLocalEnvironment();

  return useCallback<(query: string) => Promise<SavedLoadouts>>(
    async (query) => {
      const url = isLocalEnvironment
        ? `/al/character/${query}`
        : `${AL_PROXY_BASE}/character/${query}`;

      const regex =
        /var slots[^=]+=(?<gear>.+);(?:.|\n)+Name:<\/span>(?<name>.+)<\/div>(?:.|\n)+Class:<\/span>(?<classKey>.+)<\/div>(?:.|\n)+Level:<\/span>(?<level>.+)<\/div>/;

      const response = await axios.get(url);

      const html = response.data;
      const match = html.match(regex);
      const { name } = match.groups;
      const gear = JSON.parse(match.groups.gear);
      const classKey = match.groups.classKey.trim().toLowerCase();
      const level = Number(match.groups.level.trim());
      return {
        [name]: {
          gear,
          classKey,
          level,
        },
      };
    },
    [isLocalEnvironment],
  );
}
