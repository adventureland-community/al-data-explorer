import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { GItem, ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { CustomGData, GItems } from "../GDataContext";
import { ItemSourcesPanel } from "../Items/components/ItemSourcesPanel";
import { ItemPicker, ItemPickerRow } from "./ItemPicker";

/** Cap for sources on stacked (xs) layout; desktop height follows the picker column. */
const SOURCES_STACKED_MAX_HEIGHT = 440;

export function ItemPickerWithSources({
  G,
  items,
  filterItem,
  onSelect,
  searchAttributes = false,
  searchPlaceholder,
  statColumn = "attack",
  /** When this changes, hover preview resets (e.g. gear slot). */
  resetFocusKey,
  classKey,
  showAffixes = false,
  slot,
  initialItem,
  selectedKey,
}: {
  G: CustomGData;
  items?: GItems;
  filterItem?: (itemKey: ItemKey, gItem: GItem) => boolean;
  onSelect?: (row: ItemPickerRow) => void;
  searchAttributes?: boolean;
  searchPlaceholder?: string;
  statColumn?: "attack" | "luck";
  resetFocusKey?: unknown;
  classKey?: string;
  showAffixes?: boolean;
  slot?: SlotType | false;
  initialItem?: ItemInfo;
  selectedKey?: ItemKey;
}) {
  const [focusKey, setFocusKey] = useState<ItemKey | null>(null);

  useEffect(() => {
    setFocusKey(initialItem?.name ?? null);
  }, [resetFocusKey, initialItem?.name]);

  const sources = focusKey ? (
    <ItemSourcesPanel itemKey={focusKey} G={G} compact showMarket={false} />
  ) : (
    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
      Hover a row for drop sources
    </Typography>
  );

  return (
    <Box
      sx={{
        position: "relative",
        // Leave a column for the absolutely positioned sources panel on md+.
        pr: { md: "calc(33.333% + 16px)" },
      }}
    >
      <ItemPicker
        items={items}
        filterItem={filterItem}
        onSelect={onSelect}
        onFocusItem={setFocusKey}
        searchAttributes={searchAttributes}
        searchPlaceholder={searchPlaceholder}
        statColumn={statColumn}
        classKey={classKey}
        showAffixes={showAffixes}
        slot={slot}
        initialItem={initialItem}
        selectedKey={selectedKey ?? focusKey ?? undefined}
      />
      <Box
        sx={{
          mt: { xs: 2, md: 0 },
          maxHeight: { xs: SOURCES_STACKED_MAX_HEIGHT, md: "none" },
          // Desktop: fill picker column height only — content scrolls, hover cannot grow the dialog.
          position: { md: "absolute" },
          top: { md: 0 },
          right: { md: 0 },
          bottom: { md: 0 },
          width: { md: "33.333%" },
          overflow: "auto",
          pl: { md: 2 },
          pr: 0.5,
          boxSizing: "border-box",
        }}
      >
        {sources}
      </Box>
    </Box>
  );
}
