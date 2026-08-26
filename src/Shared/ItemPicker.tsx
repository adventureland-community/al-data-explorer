import {
  Box,
  Button,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import { GItem, ItemInfo, ItemKey, SlotType, StatType } from "typed-adventureland";

import { listTitleOptions, itemAcceptsStatScroll } from "../gameData/itemAffixes";
import { ItemSortKey, queryItems } from "../gameData/itemFilters";
import { itemTitleDefsFromG, resolveItemInstanceStats } from "../gameData/itemProperties";
import { GDataContext, GItems } from "../GDataContext";
import { getMaxLevel } from "../Utils";
import { ItemAffixControls } from "./ItemAffixControls";
import { ItemInstance } from "./ItemInstance";
import { LoadingState } from "./LoadingState";
import { Search } from "./Search";

export type ItemPickerRow = {
  itemName: ItemKey;
  level?: number;
  /** Title key (item.p). Wider than typed ItemInfoPValues — G.titles is the source of truth. */
  p?: string;
  stat_type?: StatType;
} & GItem;

/** Build equip ItemInfo from a picker row (name, level, title, stat scroll). */
export function itemInfoFromPickerRow(row: ItemPickerRow): ItemInfo {
  const info: ItemInfo = { name: row.itemName };
  if (row.level != null) info.level = row.level;
  if (row.p) info.p = row.p as ItemInfo["p"];
  if (row.stat_type) info.stat_type = row.stat_type;
  return info;
}

export function ItemPicker({
  items,
  filterItem,
  onSelect,
  onAddAll,
  onFocusItem,
  selectedKey,
  showLevelSlider = true,
  level: controlledLevel,
  onLevelChange,
  searchAttributes = false,
  searchPlaceholder = "Search by name, key, type, or wtype",
  /** Default list order — matrix uses tier so “Add all” lands in tier order. */
  defaultSort = "name",
  statColumn = "attack",
  /** Class for Item Stats Context — titles load from G. */
  classKey,
  /** When true, show Title + Stat scroll controls applied on click. */
  showAffixes = false,
  /** Equipment slot — narrows which titles apply. */
  slot,
  /** Prefill when re-editing an equipped piece. */
  initialItem,
}: {
  items?: GItems;
  filterItem?: (itemKey: ItemKey, gItem: GItem) => boolean;
  onSelect?: (row: ItemPickerRow) => void;
  /** When set, shows “Add all matching” for the current filtered list. */
  onAddAll?: (rows: ItemPickerRow[]) => void;
  /** Fires when a row is hovered so hosts can show acquisition / preview. */
  onFocusItem?: (itemKey: ItemKey | null) => void;
  selectedKey?: ItemKey;
  showLevelSlider?: boolean;
  level?: number;
  onLevelChange?: (level: number) => void;
  /** When true, also match upgrade/compound/set attribute names (gear planner parity). */
  searchAttributes?: boolean;
  searchPlaceholder?: string;
  defaultSort?: ItemSortKey;
  /** Last column: attack (default) or luck (gear planner / drop sim luck picker). */
  statColumn?: "attack" | "luck";
  classKey?: string;
  showAffixes?: boolean;
  slot?: SlotType | false;
  initialItem?: ItemInfo;
}) {
  const G = useContext(GDataContext);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ItemSortKey>(defaultSort);
  const [internalLevel, setInternalLevel] = useState(0);
  const [focusKey, setFocusKey] = useState<ItemKey | null>(null);
  const [titleKey, setTitleKey] = useState("");
  const [statType, setStatType] = useState("");
  const level = controlledLevel ?? internalLevel;

  const setLevel = (value: number) => {
    if (onLevelChange) onLevelChange(value);
    else setInternalLevel(value);
  };

  const titles = useMemo(() => (G ? itemTitleDefsFromG(G) : undefined), [G]);

  useEffect(() => {
    if (!initialItem) return;
    if (initialItem.level != null) setLevel(initialItem.level);
    setTitleKey(initialItem.p ? String(initialItem.p) : "");
    setStatType(initialItem.stat_type ? String(initialItem.stat_type) : "");
    setFocusKey(initialItem.name);
    onFocusItem?.(initialItem.name);
    // Prefill once when the dialog opens for this piece.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional seed from initialItem
  }, [initialItem?.name, initialItem?.level, initialItem?.p, initialItem?.stat_type]);

  const focusItem = focusKey && items ? items[focusKey] : undefined;

  useEffect(() => {
    if (!showAffixes || !titleKey) return;
    const options = listTitleOptions(titles, focusItem, slot);
    if (!options.some((o) => o.key === titleKey)) setTitleKey("");
  }, [focusItem, showAffixes, slot, titleKey, titles]);

  useEffect(() => {
    if (!showAffixes || !statType || !focusKey) return;
    if (!itemAcceptsStatScroll(focusItem)) {
      setFocusKey(null);
      onFocusItem?.(null);
    }
    // Only clear focus when scroll filter makes the hovered item invalid.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onFocusItem identity not load-bearing
  }, [focusItem, focusKey, showAffixes, statType]);

  const rowsFilter = useMemo(() => {
    if (!showAffixes || !statType) return filterItem;
    return (itemKey: ItemKey, gItem: GItem) => {
      if (!itemAcceptsStatScroll(gItem)) return false;
      return filterItem ? filterItem(itemKey, gItem) : true;
    };
  }, [filterItem, showAffixes, statType]);

  const rows = useMemo(() => {
    if (!items) return [];
    return queryItems(items, {
      search,
      sort,
      matchAttributes: searchAttributes,
      sets: searchAttributes
        ? (G?.sets as Record<string, Record<string, unknown>> | undefined)
        : undefined,
      filterItem: rowsFilter,
    }).map(([itemName, gItem]) => {
      const maxLevel = getMaxLevel(gItem);
      const itemLevel = maxLevel ? Math.min(level, maxLevel) : level;
      const stats = resolveItemInstanceStats({
        def: gItem,
        itemInfo: {
          level: itemLevel,
          p: titleKey || undefined,
          stat_type: itemAcceptsStatScroll(gItem) ? (statType as StatType) || undefined : undefined,
        },
        G: G ?? undefined,
        classKey,
      });
      return {
        itemName,
        level: itemLevel,
        ...gItem,
        ...stats,
      } as ItemPickerRow;
    });
  }, [G, classKey, items, level, rowsFilter, search, searchAttributes, sort, statType, titleKey]);

  if (!G) {
    return <LoadingState />;
  }

  const handleFocus = (key: ItemKey | null) => {
    setFocusKey(key);
    onFocusItem?.(key);
  };

  const handleSelect = (row: ItemPickerRow, itemLevel: number) => {
    const gItem = items?.[row.itemName];
    onSelect?.({
      ...row,
      level: itemLevel,
      ...(titleKey ? { p: titleKey } : {}),
      ...(itemAcceptsStatScroll(gItem) && statType ? { stat_type: statType as StatType } : {}),
    });
  };

  return (
    <>
      {showLevelSlider && (
        <>
          <Typography gutterBottom>Level</Typography>
          <Slider
            aria-label="Level"
            value={level}
            valueLabelDisplay="on"
            step={1}
            marks
            min={0}
            max={13}
            onChange={(_, value) => {
              if (typeof value === "number") setLevel(value);
            }}
            sx={{ mt: 3 }}
          />
        </>
      )}
      {showAffixes ? (
        <ItemAffixControls
          titles={titles}
          gItem={focusItem}
          slot={slot}
          titleKey={titleKey}
          onTitleChange={setTitleKey}
          statType={statType}
          onStatTypeChange={setStatType}
        />
      ) : null}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mt: showLevelSlider || showAffixes ? 0 : 1 }}
      >
        <Search doSearch={setSearch} placeholder={searchPlaceholder} />
        {onAddAll && (
          <Button
            variant="outlined"
            size="small"
            disabled={rows.length === 0 || !search.trim()}
            onClick={() => onAddAll(rows)}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
            title={!search.trim() ? "Search by type or wtype first" : undefined}
          >
            Add all {rows.length} matching
          </Button>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        Search a type or wtype (e.g. staff, weapon, amulet), add all matching, then remove extras.
        Click column headers to sort.
      </Typography>
      <Paper sx={{ width: "100%", overflow: "hidden", mt: 1 }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>
                  <TableSortLabel
                    active={sort === "name"}
                    direction="asc"
                    onClick={() => setSort("name")}
                  >
                    Name
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sort === "type"}
                    direction="asc"
                    onClick={() => setSort("type")}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sort === "tier"}
                    direction="asc"
                    onClick={() => setSort("tier")}
                  >
                    Tier
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">{statColumn === "luck" ? "Luck" : "Attack"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const maxLevel = getMaxLevel(row);
                const itemLevel = maxLevel ? Math.min(level, maxLevel) : level;
                const previewInfo: ItemInfo = {
                  name: row.itemName,
                  level: itemLevel,
                  ...(titleKey ? { p: titleKey as ItemInfo["p"] } : {}),
                  ...(itemAcceptsStatScroll(row) && statType
                    ? { stat_type: statType as StatType }
                    : {}),
                };
                return (
                  <TableRow
                    key={row.itemName}
                    hover
                    selected={selectedKey === row.itemName || focusKey === row.itemName}
                    onClick={() => handleSelect(row, itemLevel)}
                    onMouseEnter={() => handleFocus(row.itemName)}
                    sx={{ cursor: onSelect ? "pointer" : "default" }}
                  >
                    <TableCell width={50}>
                      <ItemInstance itemInfo={previewInfo} />
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">
                      {row.type}
                      {row.wtype ? ` ${row.wtype}` : ""}
                    </TableCell>
                    <TableCell align="right">{row.tier ?? "—"}</TableCell>
                    <TableCell align="right">
                      {statColumn === "luck"
                        ? row.luck != null
                          ? row.luck
                          : "—"
                        : row.attack ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {rows.length === 0 && (
        <Box sx={{ py: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No items match this search.
          </Typography>
        </Box>
      )}
    </>
  );
}
