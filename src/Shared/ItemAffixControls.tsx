import { Box, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import { GItem, SlotType } from "typed-adventureland";

import {
  itemAcceptsStatScroll,
  listStatScrollOptions,
  listTitleOptions,
} from "../gameData/itemAffixes";
import { ItemTitleDefs } from "../gameData/itemProperties";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "./ItemInstance";

export function ItemAffixControls({
  titles,
  gItem,
  slot,
  titleKey,
  onTitleChange,
  statType,
  onStatTypeChange,
}: {
  titles?: ItemTitleDefs;
  gItem?: GItem;
  slot?: SlotType | false;
  titleKey: string;
  onTitleChange: (key: string) => void;
  statType: string;
  onStatTypeChange: (key: string) => void;
}) {
  const G = useContext(GDataContext);
  const options = listTitleOptions(titles, gItem, slot);
  const titleValue = options.some((o) => o.key === titleKey) ? titleKey : "";
  const focusAcceptsScroll = itemAcceptsStatScroll(gItem);
  const scrollOptions = useMemo(() => listStatScrollOptions(G?.items), [G?.items]);
  const selectedScroll = scrollOptions.find((o) => o.stat === statType);

  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <FormControl size="small" sx={{ minWidth: 180, flex: 1 }}>
          <InputLabel id="item-title-label">Title</InputLabel>
          <Select
            labelId="item-title-label"
            label="Title"
            value={titleValue}
            onChange={(e) => onTitleChange(String(e.target.value))}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {options.map((o) => (
              <MenuItem key={o.key} value={o.key}>
                {o.label}
                {o.luck != null ? ` (+${o.luck} luck)` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
          <InputLabel id="item-stat-scroll-label">Stat scroll</InputLabel>
          <Select
            labelId="item-stat-scroll-label"
            label="Stat scroll"
            value={statType}
            onChange={(e) => onStatTypeChange(String(e.target.value))}
            renderValue={(value) => {
              if (!value) return <em>None</em>;
              const opt = scrollOptions.find((o) => o.stat === value) ?? selectedScroll;
              if (!opt) return String(value);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ItemInstance itemInfo={{ name: opt.itemKey }} size={24} tooltip={false} />
                  <span>{opt.name}</span>
                </Box>
              );
            }}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {scrollOptions.map((o) => (
              <MenuItem key={o.stat} value={o.stat}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ItemInstance itemInfo={{ name: o.itemKey }} size={28} tooltip={false} />
                  <span>{o.name}</span>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Title and stat scroll apply when you click an item below
        {statType ? " · list limited to items that accept a stat scroll" : ""}
        {gItem && !focusAcceptsScroll ? " · this item has no stat scroll slot" : ""}.
      </Typography>
    </Stack>
  );
}
