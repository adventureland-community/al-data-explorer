import { useMemo } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { GMonster } from "typed-adventureland";
import { ParsedMap } from "./types";

type SearchGroup = "Maps" | "Monsters" | "NPCs";

interface SearchOption {
  group: SearchGroup;
  label: string;
  detail: string;
  mapId: string;
  x?: number;
  y?: number;
}

interface MapChoice {
  id: string;
  name: string;
}

interface WorldSearchBarProps {
  maps: Record<string, ParsedMap>;
  monsters: Record<string, GMonster>;
  mapChoices: MapChoice[];
  onFocusMap: (mapId: string) => void;
  onSelectMap: (mapId: string | null, focusAt?: { x: number; y: number }) => void;
}

export function WorldSearchBar({
  maps,
  monsters,
  mapChoices,
  onFocusMap,
  onSelectMap,
}: WorldSearchBarProps) {
  const options = useMemo(() => {
    const result: SearchOption[] = [];

    for (const choice of mapChoices) {
      result.push({
        group: "Maps",
        label: choice.name,
        detail: choice.id,
        mapId: choice.id,
      });
    }

    const monsterLocations = new Map<string, string[]>();
    for (const [mapId, map] of Object.entries(maps)) {
      for (const m of map.monsters) {
        const list = monsterLocations.get(m.type);
        if (list) {
          if (!list.includes(mapId)) list.push(mapId);
        } else {
          monsterLocations.set(m.type, [mapId]);
        }
      }
    }

    for (const [type, mapIds] of monsterLocations) {
      const displayName = monsters[type]?.name ?? type;
      const firstMap = mapIds[0];
      const map = maps[firstMap];
      const spawn = map?.monsters.find((m) => m.type === type);
      result.push({
        group: "Monsters",
        label: displayName,
        detail: `${type} — ${mapIds.map((id) => maps[id]?.name ?? id).join(", ")}`,
        mapId: firstMap,
        x: spawn ? spawn.x + spawn.width / 2 : undefined,
        y: spawn ? spawn.y + spawn.height / 2 : undefined,
      });
    }

    for (const [mapId, map] of Object.entries(maps)) {
      for (const npc of map.npcs) {
        result.push({
          group: "NPCs",
          label: npc.name ?? npc.label,
          detail: `${npc.id} — ${map.name}`,
          mapId,
          x: npc.x,
          y: npc.y,
        });
      }
    }

    return result;
  }, [maps, monsters, mapChoices]);

  return (
    <Autocomplete<SearchOption, false, false, false>
      size="small"
      sx={{ minWidth: 240, flex: "1 1 200px", maxWidth: 360 }}
      options={options}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => option.label}
      renderOption={(props, option) => (
        <li {...props} key={`${option.group}-${option.mapId}-${option.label}`}>
          <Box>
            <Typography variant="body2">{option.label}</Typography>
            <Typography variant="caption" color="text.secondary">
              {option.detail}
            </Typography>
          </Box>
        </li>
      )}
      filterOptions={(opts, state) => {
        const needle = state.inputValue.toLowerCase().trim();
        if (!needle) return opts;
        return opts.filter(
          (o) => o.label.toLowerCase().includes(needle) || o.detail.toLowerCase().includes(needle),
        );
      }}
      onChange={(_event, option) => {
        if (!option) return;
        switch (option.group) {
          case "Maps":
            onFocusMap(option.mapId);
            break;
          case "Monsters":
          case "NPCs":
            if (option.x !== undefined && option.y !== undefined) {
              onSelectMap(option.mapId, { x: option.x, y: option.y });
            } else {
              onFocusMap(option.mapId);
            }
            break;
          default: {
            const exhaustive: never = option.group;
            throw new Error(`Unhandled group: ${exhaustive}`);
          }
        }
      }}
      value={null}
      blurOnSelect
      clearOnBlur
      renderInput={(params) => <TextField {...params} label="Search maps, monsters, NPCs" />}
    />
  );
}
