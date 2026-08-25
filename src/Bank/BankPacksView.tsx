import { Box, Typography } from "@mui/material";
import { ItemInfo, ItemKey } from "typed-adventureland";
import { useContext } from "react";
import { BankDataProps } from "./getBankData";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";

const SLOTS_PER_PACK = 42;
const PACK_COLUMNS = 7;
const SLOT_SIZE = 48;

function comparePackKeys(a: string, b: string) {
  const itemsA = /^items(\d+)$/.exec(a);
  const itemsB = /^items(\d+)$/.exec(b);
  if (itemsA && itemsB) {
    return Number(itemsA[1]) - Number(itemsB[1]);
  }
  if (itemsA) return -1;
  if (itemsB) return 1;
  return a.localeCompare(b);
}

function getPackKeys(bankData: BankDataProps) {
  return Object.keys(bankData)
    .filter((key) => Array.isArray(bankData[key]))
    .sort(comparePackKeys);
}

function BankPackSlot({ itemInfo }: { itemInfo: ItemInfo | null }) {
  const G = useContext(GDataContext);
  const gItem = itemInfo && G ? G.items[itemInfo.name as ItemKey] : undefined;

  return (
    <Box
      sx={{
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        border: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        bgcolor: "action.hover",
        overflow: "hidden",
      }}
    >
      {itemInfo && gItem ? <ItemInstance showQuantity itemInfo={itemInfo} /> : null}
      {itemInfo && !gItem ? (
        <Typography
          variant="caption"
          sx={{ fontSize: "0.55rem", lineHeight: 1.1, textAlign: "center", padding: 0.25 }}
        >
          {itemInfo.name}
        </Typography>
      ) : null}
    </Box>
  );
}

function BankPack({ packKey, slots }: { packKey: string; slots: (ItemInfo | null)[] }) {
  const paddedSlots = Array.from({ length: SLOTS_PER_PACK }, (_, index) => slots[index] ?? null);

  return (
    <Box sx={{ display: "inline-block", verticalAlign: "top", margin: 1 }}>
      <Typography variant="subtitle2" sx={{ marginBottom: 0.5, fontFamily: "monospace" }}>
        {packKey}
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${PACK_COLUMNS}, ${SLOT_SIZE}px)`,
          gap: "1px",
        }}
      >
        {paddedSlots.map((itemInfo, index) => (
          // Pack slot index is stable and intentional for empty cells
          // eslint-disable-next-line react/no-array-index-key
          <BankPackSlot key={`${packKey}-${index}`} itemInfo={itemInfo} />
        ))}
      </Box>
    </Box>
  );
}

export function BankPacksView({ bankData }: { bankData: BankDataProps }) {
  const packKeys = getPackKeys(bankData);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start" }}>
      {packKeys.map((packKey) => (
        <BankPack
          key={packKey}
          packKey={packKey}
          slots={(bankData[packKey] as (ItemInfo | null)[]) ?? []}
        />
      ))}
    </Box>
  );
}
