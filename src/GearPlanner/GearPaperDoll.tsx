import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Box, IconButton, Tooltip } from "@mui/material";
import { ItemInfo, SlotType } from "typed-adventureland";

import { GearSlot } from "./GearSlot";

export function GearPaperDoll({
  gear,
  onSlotClick,
  onRemoveSlot,
  dhConflict,
}: {
  gear: { [slot in SlotType]?: ItemInfo };
  onSlotClick: (slot: SlotType) => void;
  onRemoveSlot?: (slot: SlotType) => void;
  dhConflict: boolean;
}) {
  const slotBox = (slot: SlotType, invalid = false) => (
    <Box sx={{ position: "relative", display: "inline-block" }}>
      <GearSlot gear={gear} onClick={onSlotClick} slot={slot} invalid={invalid} />
      {onRemoveSlot && gear[slot] ? (
        <Tooltip title="Remove item">
          <IconButton
            size="small"
            aria-label={`Remove ${slot}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveSlot(slot);
            }}
            sx={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              p: 0,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              "&:hover": { bgcolor: "error.main", color: "error.contrastText" },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );

  return (
    <Box sx={{ display: "inline-block", lineHeight: 0 }}>
      <Box sx={{ lineHeight: 0 }}>
        {slotBox("earring1")}
        {slotBox("helmet")}
        {slotBox("earring2")}
        {slotBox("amulet")}
      </Box>
      <Box sx={{ lineHeight: 0 }}>
        {slotBox("mainhand", dhConflict)}
        {slotBox("chest")}
        {slotBox("offhand", dhConflict)}
        {slotBox("cape")}
      </Box>
      <Box sx={{ lineHeight: 0 }}>
        {slotBox("ring1")}
        {slotBox("pants")}
        {slotBox("ring2")}
        {slotBox("orb")}
      </Box>
      <Box sx={{ lineHeight: 0 }}>
        {slotBox("belt")}
        {slotBox("shoes")}
        {slotBox("gloves")}
        {slotBox("elixir")}
      </Box>
    </Box>
  );
}
