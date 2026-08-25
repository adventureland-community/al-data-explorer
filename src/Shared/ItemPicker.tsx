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
import { useContext, useMemo, useState } from "react";
import { GItem, ItemKey } from "typed-adventureland";

import { ItemSortKey, queryItems } from "../gameData/itemFilters";
import { GDataContext, GItems } from "../GDataContext";
import { calculateItemStatsByLevel, getMaxLevel } from "../Utils";
import { ItemInstance } from "./ItemInstance";
import { LoadingState } from "./LoadingState";
import { Search } from "./Search";

export type ItemPickerRow = { itemName: ItemKey; level?: number } & GItem;

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
}) {
  const G = useContext(GDataContext);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ItemSortKey>(defaultSort);
  const [internalLevel, setInternalLevel] = useState(0);
  const level = controlledLevel ?? internalLevel;

  const setLevel = (value: number) => {
    if (onLevelChange) onLevelChange(value);
    else setInternalLevel(value);
  };

  const rows = useMemo(() => {
    if (!items) return [];
    return queryItems(items, {
      search,
      sort,
      matchAttributes: searchAttributes,
      sets: searchAttributes
        ? (G?.sets as Record<string, Record<string, unknown>> | undefined)
        : undefined,
      filterItem,
    }).map(([itemName, gItem]) => {
      const maxLevel = getMaxLevel(gItem);
      const itemLevel = maxLevel ? Math.min(level, maxLevel) : level;
      const stats = calculateItemStatsByLevel(gItem, itemLevel);
      return {
        itemName,
        level: itemLevel,
        ...gItem,
        ...stats,
      } as ItemPickerRow;
    });
  }, [G?.sets, filterItem, items, level, search, searchAttributes, sort]);

  if (!G) {
    return <LoadingState />;
  }

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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        alignItems={{ xs: "stretch", sm: "center" }}
        sx={{ mt: showLevelSlider ? 0 : 1 }}
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
                <TableCell align="right">Attack</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const maxLevel = getMaxLevel(row);
                const itemLevel = maxLevel ? Math.min(level, maxLevel) : level;
                return (
                  <TableRow
                    key={row.itemName}
                    hover
                    selected={selectedKey === row.itemName}
                    onClick={() => onSelect?.({ ...row, level: itemLevel })}
                    onMouseEnter={() => onFocusItem?.(row.itemName)}
                    sx={{ cursor: onSelect ? "pointer" : "default" }}
                  >
                    <TableCell width={50}>
                      <ItemInstance itemInfo={{ name: row.itemName, level: itemLevel }} />
                    </TableCell>
                    <TableCell>{row.name}</TableCell>
                    <TableCell align="right">
                      {row.type}
                      {row.wtype ? ` ${row.wtype}` : ""}
                    </TableCell>
                    <TableCell align="right">{row.tier ?? "—"}</TableCell>
                    <TableCell align="right">{row.attack ?? "—"}</TableCell>
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
