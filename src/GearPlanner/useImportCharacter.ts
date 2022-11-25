import { useCallback } from "react";
import axios from "axios";

import useIsLocalEnvironment from "./useIsLocalEnvironment";
import { SavedLoadouts } from "./types";

export default () => {
    const isLocalEnvironment = useIsLocalEnvironment();

    return useCallback<(query: string) => Promise<SavedLoadouts>>(async (query) => {
        if (!isLocalEnvironment) {
            return (await axios.get<SavedLoadouts>(
                `https://adventureland-character.deno.dev/${query}`
            )).data;
        }

        const regex = /var slots[^=]+=(?<gear>.+);(?:.|\n)+Name:<\/span>(?<name>.+)<\/div>(?:.|\n)+Class:<\/span>(?<classKey>.+)<\/div>(?:.|\n)+Level:<\/span>(?<level>.+)<\/div>/;

        const response = await axios.get(
            `/al/character/${query}`
        );

        const html = response.data;
        const match = html.match(regex);
        const name = match.groups.name;
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
    }, [isLocalEnvironment]);
}
