import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import ViewComfyIcon from "@mui/icons-material/ViewComfy";
import TableChartIcon from "@mui/icons-material/TableChart";
import {
  Box,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useState } from "react";
import { ItemKey } from "typed-adventureland";

import { getAllTrades } from "../Bank/getTrades";
import { GDataContext } from "../GDataContext";
import { TradeCompactTile } from "./TradeCompactTile";
import { TradeItemCard } from "./TradeItemCard";
import { TradesOverview } from "./TradesOverview";
import { TradesTableView } from "./TradesTableView";
import { OwnerTrades } from "./tradeTypes";
import {
  GroupSortKey,
  TableSortKey,
  TradeFilters,
  TradeOverviewItem,
  TradesViewMode,
  computeOverviewStats,
  filterTradeRows,
  flattenTrades,
  groupTradesByItem,
  loadTradesViewMode,
  saveTradesViewMode,
  sortGroupedItems,
  sortTradeRows,
} from "./tradeViewModel";

type SideFilter = TradeFilters["sideFilter"];

export function Trades() {
  const G = useContext(GDataContext);
  const [owners, setOwners] = useState<OwnerTrades[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<TradesViewMode>(loadTradesViewMode);
  const [sideFilter, setSideFilter] = useState<SideFilter>("all");
  const [itemFilter, setItemFilter] = useState("");
  const [hasGoldPrice, setHasGoldPrice] = useState(false);
  const [hasItemTrades, setHasItemTrades] = useState(false);
  const [groupSort, setGroupSort] = useState<GroupSortKey>("activity");
  const [tableSort, setTableSort] = useState<TableSortKey>("updated");

  useEffect(() => {
    getAllTrades().then((data) => {
      setOwners(data);
      setLoaded(true);
    });
  }, []);

  const itemDisplayName = useMemo(() => {
    if (!G) return undefined;
    return (name: string) => {
      const gItem = G.items[name as ItemKey];
      return gItem?.name;
    };
  }, [G]);

  const filters: TradeFilters = useMemo(
    () => ({
      sideFilter,
      itemFilter,
      hasGoldPrice,
      hasItemTrades,
    }),
    [sideFilter, itemFilter, hasGoldPrice, hasItemTrades],
  );

  const allRows = useMemo(() => flattenTrades(owners), [owners]);
  const filteredRows = useMemo(
    () => filterTradeRows(allRows, filters, itemDisplayName),
    [allRows, filters, itemDisplayName],
  );
  // Keep overview stable when filtering by item so top tiles remain clickable.
  const overviewRows = useMemo(
    () =>
      filterTradeRows(
        allRows,
        { sideFilter, itemFilter: "", hasGoldPrice, hasItemTrades },
        itemDisplayName,
      ),
    [allRows, sideFilter, hasGoldPrice, hasItemTrades, itemDisplayName],
  );
  const overviewStats = useMemo(() => computeOverviewStats(overviewRows), [overviewRows]);
  const groupedItems = useMemo(() => {
    const groups = groupTradesByItem(filteredRows);
    return sortGroupedItems(groups, groupSort);
  }, [filteredRows, groupSort]);
  const sortedTableRows = useMemo(
    () => sortTradeRows(filteredRows, tableSort, itemDisplayName),
    [filteredRows, tableSort, itemDisplayName],
  );

  const onViewModeChange = (_: React.MouseEvent<HTMLElement>, value: TradesViewMode | null) => {
    if (!value) return;
    setViewMode(value);
    saveTradesViewMode(value);
  };

  const onOverviewItemSelect = (item: TradeOverviewItem) => {
    const { name } = item.listing;
    setItemFilter((current) => (current.trim().toLowerCase() === name.toLowerCase() ? "" : name));
  };

  if (!G) {
    return <>WAITING!</>;
  }

  const resultCount = viewMode === "table" ? sortedTableRows.length : groupedItems.length;
  const resultLabel =
    viewMode === "table"
      ? `${sortedTableRows.length} listing${sortedTableRows.length === 1 ? "" : "s"}`
      : `${groupedItems.length} item${groupedItems.length === 1 ? "" : "s"} (${
          filteredRows.length
        } offers)`;

  return (
    <>
      <TradesOverview
        stats={overviewStats}
        selectedItemName={itemFilter}
        onItemSelect={onOverviewItemSelect}
      />
      {!loaded && <Typography>Loading trades…</Typography>}
      {loaded && owners.length === 0 && (
        <Typography color="text.secondary">
          No trade listings returned (endpoint may be empty or unavailable).
        </Typography>
      )}
      <Box display="flex" flexWrap="wrap" gap={2} mb={2} alignItems="flex-start">
        <TextField
          label="Search items"
          variant="outlined"
          size="small"
          value={itemFilter}
          onChange={(e) => setItemFilter(e.target.value)}
          sx={{ width: 280 }}
        />
        <FormControl>
          <FormLabel>Side</FormLabel>
          <RadioGroup
            row
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value as SideFilter)}
          >
            <FormControlLabel value="all" control={<Radio />} label="All" />
            <FormControlLabel value="wts" control={<Radio />} label="WTS" />
            <FormControlLabel value="wtb" control={<Radio />} label="WTB" />
          </RadioGroup>
        </FormControl>
        <FormGroup row>
          <FormControlLabel
            control={
              <Checkbox
                checked={hasGoldPrice}
                onChange={(e) => setHasGoldPrice(e.target.checked)}
              />
            }
            label="Has gold price"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hasItemTrades}
                onChange={(e) => setHasItemTrades(e.target.checked)}
              />
            }
            label="Has item trades"
          />
        </FormGroup>
        {viewMode !== "table" ? (
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <FormLabel>Sort</FormLabel>
            <Select
              value={groupSort}
              onChange={(e) => setGroupSort(e.target.value as GroupSortKey)}
            >
              <MenuItem value="activity">Most active</MenuItem>
              <MenuItem value="updated">Recently updated</MenuItem>
              <MenuItem value="name">Item name</MenuItem>
            </Select>
          </FormControl>
        ) : null}
        <Box sx={{ ml: "auto" }}>
          <FormLabel sx={{ display: "block", mb: 0.5 }}>View</FormLabel>
          <ToggleButtonGroup value={viewMode} exclusive onChange={onViewModeChange} size="small">
            <ToggleButton value="cards" aria-label="cards view">
              <ViewComfyIcon fontSize="small" sx={{ mr: 0.5 }} />
              Cards
            </ToggleButton>
            <ToggleButton value="compact" aria-label="compact view">
              <ViewAgendaIcon fontSize="small" sx={{ mr: 0.5 }} />
              Compact
            </ToggleButton>
            <ToggleButton value="table" aria-label="table view">
              <TableChartIcon fontSize="small" sx={{ mr: 0.5 }} />
              Table
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Divider sx={{ marginBottom: 2 }} />
      <Typography variant="body2" sx={{ marginBottom: 1 }}>
        {resultLabel}
      </Typography>
      {viewMode === "cards" ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
            gap: 2,
          }}
        >
          {groupedItems.map((group) => (
            <TradeItemCard key={group.key} group={group} />
          ))}
        </Box>
      ) : null}
      {viewMode === "compact" ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 1.5,
          }}
        >
          {groupedItems.map((group) => (
            <TradeCompactTile key={group.key} group={group} />
          ))}
        </Box>
      ) : null}
      {viewMode === "table" ? (
        <TradesTableView rows={sortedTableRows} sortKey={tableSort} onSortChange={setTableSort} />
      ) : null}
      {loaded && resultCount === 0 && owners.length > 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          No listings match the current filters.
        </Typography>
      ) : null}
    </>
  );
}
