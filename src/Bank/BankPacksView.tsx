import { Box, Typography } from "@mui/material";
import { GData, ItemInfo, ItemKey } from "typed-adventureland";
import { useContext, useMemo } from "react";
import { bankItemMatchesSearch } from "./bankItems";
import { computePackUtilization, PackUtilization } from "./bankAnalysis";
import { BankDataProps } from "./getBankData";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";

const SLOTS_PER_PACK = 42;
const PACK_COLUMNS = 7;
const SLOT_SIZE = 48;

export type PackFocus = {
  packKey: string;
  slotIndex: number;
};

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

function packFillColor(fillRatio: number) {
  if (fillRatio >= 1) return "error.main";
  if (fillRatio >= 0.85) return "warning.main";
  return "text.secondary";
}

function packItemMatchesSearch(
  itemInfo: ItemInfo | null,
  G: GData | undefined,
  searchTerm: string,
) {
  if (!itemInfo || !searchTerm.trim()) return true;
  return bankItemMatchesSearch(
    {
      p: itemInfo.p,
      level: itemInfo.level ?? 0,
      name: itemInfo.name,
      q: itemInfo.q ?? 1,
      stack: 1,
      category: "",
    },
    G ?? undefined,
    searchTerm,
  );
}

function BankPackSlot({
  itemInfo,
  dimmed,
  highlighted,
}: {
  itemInfo: ItemInfo | null;
  dimmed?: boolean;
  highlighted?: boolean;
}) {
  const G = useContext(GDataContext);
  const gItem = itemInfo && G ? G.items[itemInfo.name as ItemKey] : undefined;

  return (
    <Box
      sx={{
        width: SLOT_SIZE,
        height: SLOT_SIZE,
        border: highlighted ? 2 : 1,
        borderColor: highlighted ? "primary.main" : "divider",
        boxShadow: highlighted ? (theme) => `0 0 0 2px ${theme.palette.primary.main}33` : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        bgcolor: highlighted ? "action.selected" : "action.hover",
        overflow: "hidden",
        opacity: dimmed ? 0.25 : 1,
      }}
    >
      {itemInfo && gItem ? <ItemInstance showQuantity itemInfo={itemInfo} linkToDetail /> : null}
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

function BankPack({
  packKey,
  slots,
  search,
  utilization,
  focus,
}: {
  packKey: string;
  slots: (ItemInfo | null)[];
  search: string;
  utilization?: PackUtilization;
  focus?: PackFocus | null;
}) {
  const G = useContext(GDataContext);
  const paddedSlots = Array.from({ length: SLOTS_PER_PACK }, (_, index) => slots[index] ?? null);
  const hasVisibleSlot = paddedSlots.some((itemInfo) => packItemMatchesSearch(itemInfo, G, search));

  if (search.trim() && !hasVisibleSlot) {
    return null;
  }

  const usedSlots = utilization?.usedSlots ?? paddedSlots.filter(Boolean).length;
  const totalSlots = utilization?.totalSlots ?? SLOTS_PER_PACK;
  const fillRatio = utilization?.fillRatio ?? usedSlots / totalSlots;

  return (
    <Box sx={{ display: "inline-block", verticalAlign: "top", margin: 1 }}>
      <Typography
        variant="subtitle2"
        sx={{ marginBottom: 0.5, fontFamily: "monospace", color: packFillColor(fillRatio) }}
      >
        {packKey} ({usedSlots}/{totalSlots})
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${PACK_COLUMNS}, ${SLOT_SIZE}px)`,
          gap: "1px",
        }}
      >
        {paddedSlots.map((itemInfo, index) => (
          <BankPackSlot
            // Pack slot index is stable and intentional for empty cells
            // eslint-disable-next-line react/no-array-index-key
            key={`${packKey}-${index}`}
            itemInfo={itemInfo}
            dimmed={Boolean(
              search.trim() && itemInfo && !packItemMatchesSearch(itemInfo, G, search),
            )}
            highlighted={focus?.packKey === packKey && focus.slotIndex === index}
          />
        ))}
      </Box>
    </Box>
  );
}

export function BankPacksView({
  bankData,
  search = "",
  focus = null,
}: {
  bankData: BankDataProps;
  search?: string;
  focus?: PackFocus | null;
}) {
  const packKeys = useMemo(() => getPackKeys(bankData), [bankData]);
  const utilizationByPack = useMemo(() => {
    const map = new Map<string, PackUtilization>();
    for (const pack of computePackUtilization(bankData)) {
      map.set(pack.packKey, pack);
    }
    return map;
  }, [bankData]);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start" }}>
      {packKeys.map((packKey) => (
        <BankPack
          key={packKey}
          packKey={packKey}
          search={search}
          focus={focus}
          utilization={utilizationByPack.get(packKey)}
          slots={(bankData[packKey] as (ItemInfo | null)[]) ?? []}
        />
      ))}
    </Box>
  );
}
