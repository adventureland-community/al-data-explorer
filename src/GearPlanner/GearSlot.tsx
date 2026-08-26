import { Box } from "@mui/material";
import { ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { ItemImage } from "../ItemImage";
import { ItemInstance } from "../Shared/ItemInstance";

const SLOT_SIZE = 50;
const ITEM_SIZE = 40;

export function GearSlot({
  slot,
  onClick,
  gear,
  invalid = false,
}: {
  slot: SlotType;
  onClick: (slot: SlotType) => void;
  gear: { [slot in SlotType]?: ItemInfo };
  invalid?: boolean;
}) {
  const itemInfo = gear[slot];
  let itemName: ItemKey;

  switch (slot) {
    case "orb":
      itemName = "shade20_orb" as ItemKey;
      break;
    case "elixir":
      itemName = "shade20_elixir" as ItemKey;
      break;
    case "cape":
      itemName = "shade20_cape" as ItemKey;
      break;
    default:
      itemName = `shade_${slot.replace("1", "").replace("2", "")}` as ItemKey;
      break;
  }

  return (
    <Box
      onClick={() => onClick(slot)}
      title={itemInfo ? itemInfo.name : slot}
      sx={{
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        boxSizing: "border-box",
        border: invalid ? "2px solid #d32f2f" : "1px solid black",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "top",
        cursor: "pointer",
        overflow: "visible",
        "&:hover": { border: invalid ? "2px solid #d32f2f" : "1px solid white" },
      }}
    >
      {itemInfo ? (
        <ItemInstance itemInfo={itemInfo} size={ITEM_SIZE} />
      ) : (
        <ItemImage itemName={itemName} size={ITEM_SIZE} opacity={0.25} />
      )}
    </Box>
  );
}
