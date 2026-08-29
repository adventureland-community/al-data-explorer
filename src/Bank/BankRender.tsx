import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import GridViewIcon from "@mui/icons-material/GridView";
import RefreshIcon from "@mui/icons-material/Refresh";
import ViewCompactIcon from "@mui/icons-material/ViewCompact";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import { ItemKey, ItemType } from "typed-adventureland";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  AggregatedBankItem,
  aggregateBankData,
  BankRefreshSummary,
  compareBankItems,
  filterAggregatedBankItems,
  filterItemsByCategory,
  formatBankItemLabel,
  getUniqueItemKey,
} from "./bankItems";
import { bankItemMatchesFilters, EMPTY_BANK_FILTERS, findItemLocations } from "./bankAnalysis";
import { BankFilters, hasActiveBankFilters } from "./BankFilters";
import { BankInsightsSidebar } from "./BankInsightsSidebar";
import { getBankData, BankDataProps } from "./getBankData";
import { BankPacksView, PackFocus } from "./BankPacksView";
import { BankRefreshSummaryView } from "./BankRefreshSummaryView";
import { downloadBankSnapshot, loadBankSnapshot, saveBankSnapshot } from "./bankSnapshot";
import { GDataContext } from "../GDataContext";
import { ItemInstance } from "../Shared/ItemInstance";
import { Search } from "../Shared/Search";
import { abbreviateNumber, msToTime } from "../Shared/utils";
import { getItemName, getTitleName } from "../Shared/iteminfo-util";

type BankRenderProps = {
  ownerId: string;
};

const types: { [key in ItemType | "exchange" | "other"]?: string } = {
  helmet: "Helmets",
  chest: "Armors",
  pants: "Pants",
  gloves: "Gloves",
  shoes: "Shoes",
  cape: "Capes",
  ring: "Rings",
  earring: "Earrings",
  amulet: "Amulets",
  belt: "Belts",
  orb: "Orbs",
  weapon: "Weapons",
  shield: "Shields",
  source: "Offhands",
  quiver: "Offhands",
  misc_offhand: "Offhands",
  elixir: "Elixirs",
  pot: "Potions",
  cscroll: "Scrolls",
  uscroll: "Scrolls",
  pscroll: "Scrolls",
  offering: "Scrolls",
  material: "Crafting and Collecting",
  exchange: "Exchangeables",
  dungeon_key: "Keys",
  token: "Tokens",
  other: "Others",
};

function BankTableView({ items }: { items: AggregatedBankItem[] }) {
  const G = useContext(GDataContext);

  return (
    <Table stickyHeader size="small">
      <TableHead>
        <TableRow>
          <TableCell component="th" width={100}>
            Category
          </TableCell>
          <TableCell component="th" width={100} align="right">
            Quantity
          </TableCell>
          <TableCell component="th">Name</TableCell>
          <TableCell component="th">Level</TableCell>
          <TableCell component="th">Stacks</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((itemInfo) => {
          const itemKey = itemInfo.name as ItemKey;
          const gItem = G?.items[itemKey];
          if (!gItem) return <></>;

          const stackSize = Number(gItem.s);
          const stackCount = itemInfo.stack;
          const optimalStackCount = Math.ceil(itemInfo.q / stackSize);
          const optimalStackCountMessage =
            stackCount > optimalStackCount ? `⚠️${optimalStackCount}` : "";

          let titleName = getTitleName(itemInfo, G);
          if (titleName) {
            titleName += " ";
          }

          const itemName = getItemName(itemKey, gItem);

          return (
            <TableRow key={getUniqueItemKey(itemInfo)} hover>
              <TableCell component="td">{itemInfo.category}</TableCell>
              <TableCell component="td" align="right" title={itemInfo.q.toLocaleString()}>
                {abbreviateNumber(itemInfo.q)}
              </TableCell>
              <TableCell component="td">
                <div style={{ display: "inline-block" }}>
                  <ItemInstance itemInfo={itemInfo} linkToDetail />
                </div>
                <div style={{ marginLeft: "10px", display: "inline-block" }}>
                  <div>
                    {titleName}
                    {itemName}
                  </div>
                  <div style={{ color: "grey" }}>{itemInfo.name}</div>
                </div>
              </TableCell>
              <TableCell component="td">{itemInfo.level}</TableCell>
              <TableCell component="td">
                {itemInfo.stack}
                {optimalStackCountMessage}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function BankGridViewItemRow({ items }: { items: AggregatedBankItem[] }) {
  const G = useContext(GDataContext);

  return (
    <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2px" }}>
      {items.map((itemInfo) => {
        const itemKey = itemInfo.name as ItemKey;
        const gItem = G?.items[itemKey];
        if (!gItem || !G) return <></>;

        return (
          <div key={getUniqueItemKey(itemInfo)}>
            <ItemInstance showQuantity itemInfo={itemInfo} linkToDetail />
          </div>
        );
      })}
    </div>
  );
}

function BankGridView({
  items,
  itemsByCategory,
  showCategory,
}: {
  items: AggregatedBankItem[];
  itemsByCategory: Record<string, AggregatedBankItem[]>;
  showCategory: boolean;
}) {
  const sortedGroupKeys = [...new Set(Object.values(types))];

  return (
    <>
      <div style={{ width: "100%" }}>
        {showCategory ? (
          sortedGroupKeys.map((category) => {
            const categoryItems = itemsByCategory[category];
            if (!categoryItems) return <></>;
            return (
              <div
                key={category}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: "2px",
                  alignItems: "center",
                }}
              >
                <h1>{category}</h1>
                <BankGridViewItemRow items={categoryItems} />
              </div>
            );
          })
        ) : (
          <BankGridViewItemRow items={items} />
        )}
      </div>
    </>
  );
}

export function BankRender(props: BankRenderProps) {
  const G = useContext(GDataContext);
  const { ownerId } = props;

  const [bankData, setBankData] = useState<BankDataProps>({});
  const [loading, setLoading] = useState(false);
  const [refreshSummary, setRefreshSummary] = useState<BankRefreshSummary | undefined>(undefined);
  const [renderMode, setRenderMode] = useState<"list" | "grid" | "gridCompact" | "packs">(
    "gridCompact",
  );
  const [sortMode, setSortMode] = useState<"category" | "quantity" | "stack">("category");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(EMPTY_BANK_FILTERS);
  const [visitSummary, setVisitSummary] = useState<BankRefreshSummary | undefined>(undefined);
  const [changeFilter, setChangeFilter] = useState<"all" | "gear" | "quantity">("all");
  const [packFocus, setPackFocus] = useState<PackFocus | null>(null);

  const loadBankData = useCallback(
    async (compareWithPrevious = false) => {
      if (!ownerId) {
        setBankData({});
        setRefreshSummary(undefined);
        return;
      }

      setLoading(true);
      const previousData = bankData;
      const previousAggregate =
        compareWithPrevious && Object.keys(previousData).length
          ? aggregateBankData(previousData, G)
          : undefined;

      const newBankData = await getBankData(ownerId);
      if (Object.keys(newBankData).length) {
        if (previousAggregate) {
          const nextAggregate = aggregateBankData(newBankData, G);
          setRefreshSummary(
            compareBankItems(previousAggregate.items, nextAggregate.items, {
              prevGold: typeof previousData.gold === "number" ? previousData.gold : undefined,
              nextGold: typeof newBankData.gold === "number" ? newBankData.gold : undefined,
              prevUsedSlots: previousAggregate.usedPackSlots,
              nextUsedSlots: nextAggregate.usedPackSlots,
            }),
          );
        }
        setBankData({ ...newBankData });
        saveBankSnapshot(ownerId, newBankData);
      }
      setLoading(false);
    },
    [bankData, G, ownerId],
  );

  const applySnapshotComparison = useCallback(
    (previousData: BankDataProps, newBankData: BankDataProps) => {
      if (!G || !Object.keys(previousData).length || !Object.keys(newBankData).length)
        return undefined;
      const previousAggregate = aggregateBankData(previousData, G);
      const nextAggregate = aggregateBankData(newBankData, G);
      return compareBankItems(previousAggregate.items, nextAggregate.items, {
        prevGold: typeof previousData.gold === "number" ? previousData.gold : undefined,
        nextGold: typeof newBankData.gold === "number" ? newBankData.gold : undefined,
        prevUsedSlots: previousAggregate.usedPackSlots,
        nextUsedSlots: nextAggregate.usedPackSlots,
      });
    },
    [G],
  );

  useEffect(() => {
    setSearch("");
    setFilters(EMPTY_BANK_FILTERS);
    setRefreshSummary(undefined);
    setVisitSummary(undefined);
    setPackFocus(null);
    setChangeFilter("all");
    if (!ownerId) {
      setBankData({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    getBankData(ownerId).then((newBankData) => {
      if (cancelled) return;
      if (Object.keys(newBankData).length) {
        const snapshot = loadBankSnapshot(ownerId);
        if (snapshot?.bankData) {
          const comparison = applySnapshotComparison(snapshot.bankData, newBankData);
          if (comparison) setVisitSummary(comparison);
        }
        setBankData({ ...newBankData });
        saveBankSnapshot(ownerId, newBankData);
      } else {
        setBankData({});
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [ownerId, applySnapshotComparison]);

  const aggregated = useMemo(() => aggregateBankData(bankData, G), [bankData, G]);
  const filteredItems = useMemo(() => {
    let result = filterAggregatedBankItems(aggregated.items, G, search);
    if (hasActiveBankFilters(filters)) {
      result = result.filter((item) => bankItemMatchesFilters(item, G, filters));
    }
    return result;
  }, [aggregated.items, G, search, filters]);
  const filteredItemsByCategory = useMemo(
    () => filterItemsByCategory(aggregated.itemsByCategory, G, search),
    [aggregated.itemsByCategory, G, search],
  );

  const items = useMemo(() => {
    const sortedGroupKeys = [...new Set(Object.values(types))];
    const nextItems = [...filteredItems];

    nextItems.sort((a, b) => {
      if (sortMode === "stack" && a.stack !== b.stack) {
        return b.stack - a.stack;
      }

      if (sortMode === "quantity" && a.q !== b.q) {
        return b.q - a.q;
      }

      if (a.category !== b.category) {
        return sortedGroupKeys.indexOf(a.category) - sortedGroupKeys.indexOf(b.category);
      }

      if (a.type && b.type && a.type !== b.type) {
        return a.type.localeCompare(b.type);
      }

      if (a.name && a.name !== b.name) {
        return a.name.localeCompare(b.name);
      }

      return b.level - a.level;
    });

    return nextItems;
  }, [filteredItems, sortMode]);

  const sortedFilteredItemsByCategory = useMemo(() => {
    const sortedGroupKeys = [...new Set(Object.values(types))];
    const sorted: Record<string, AggregatedBankItem[]> = {};
    for (const category of sortedGroupKeys) {
      const categoryItems = filteredItemsByCategory[category];
      if (categoryItems?.length) {
        sorted[category] = categoryItems;
      }
    }
    return sorted;
  }, [filteredItemsByCategory]);

  const searchLocations = useMemo(() => {
    if (!search.trim()) return [];
    const locations: { label: string; focus: PackFocus; key: string }[] = [];
    const seen = new Set<string>();
    for (const item of filteredItems.slice(0, 10)) {
      const uniqueKey = getUniqueItemKey(item);
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      for (const location of findItemLocations(bankData, uniqueKey).slice(0, 2)) {
        locations.push({
          key: `${uniqueKey}-${location.packKey}-${location.slotIndex}`,
          label: `${formatBankItemLabel(item, G)} → ${location.packKey} #${location.slotIndex + 1}`,
          focus: { packKey: location.packKey, slotIndex: location.slotIndex },
        });
      }
    }
    return locations.slice(0, 8);
  }, [search, filteredItems, bankData, G]);

  if (!ownerId) {
    return <></>;
  }

  if (loading && !Object.keys(bankData).length) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
        <CircularProgress size={20} />
        Loading bank data…
      </Box>
    );
  }

  if (!Object.keys(bankData).length) {
    return <></>;
  }

  const onSortModeChange = (_event: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (value) {
      setSortMode(value as "category" | "quantity" | "stack");
    }
  };

  const onRenderModeChange = (_event: React.MouseEvent<HTMLElement>, value: string | null) => {
    if (value) {
      setRenderMode(value as "list" | "grid" | "gridCompact" | "packs");
    }
  };

  const onRefresh = () => {
    loadBankData(true);
  };

  const { usedSlots, totalSlots } = aggregated;
  const lastUpdated = bankData.lastUpdated ? new Date(bankData.lastUpdated) : undefined;
  const lastUpdateAgo = lastUpdated ? msToTime(new Date().getTime() - lastUpdated.getTime()) : "";

  return (
    <>
      {visitSummary && (
        <BankRefreshSummaryView
          summary={visitSummary}
          title="Since last visit"
          changeFilter={changeFilter}
          onChangeFilter={setChangeFilter}
          onExport={() => downloadBankSnapshot(ownerId, bankData)}
          onDismiss={() => setVisitSummary(undefined)}
        />
      )}

      {refreshSummary && (
        <BankRefreshSummaryView
          summary={refreshSummary}
          title="Refresh complete"
          changeFilter={changeFilter}
          onChangeFilter={setChangeFilter}
          onExport={() => downloadBankSnapshot(ownerId, bankData)}
          onDismiss={() => setRefreshSummary(undefined)}
        />
      )}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ sm: "center" }}
          >
            <Search
              doSearch={setSearch}
              placeholder="Search by name, key, category, or type"
              variant="outlined"
              size="small"
              fullWidth
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={onRefresh}
              disabled={loading}
              sx={{ flexShrink: 0, alignSelf: { xs: "stretch", sm: "auto" } }}
            >
              Refresh
            </Button>
          </Stack>

          <BankFilters items={aggregated.items} filters={filters} onChange={setFilters} />

          {searchLocations.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {searchLocations.map((location) => (
                <Chip
                  key={location.key}
                  size="small"
                  label={location.label}
                  onClick={() => {
                    setRenderMode("packs");
                    setPackFocus(location.focus);
                  }}
                  variant="outlined"
                />
              ))}
            </Stack>
          )}

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Typography variant="body2" color="text.secondary" component="div">
              <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>
                {usedSlots} / {totalSlots}
              </Box>{" "}
              slots ({totalSlots - usedSlots} free)
              {(search.trim() || hasActiveBankFilters(filters)) && ` · ${items.length} shown`}
              {lastUpdated ? (
                <>
                  {" · "}
                  Updated {lastUpdated.toLocaleString()} ({lastUpdateAgo} ago)
                </>
              ) : null}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
              {renderMode !== "packs" && (
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={sortMode}
                  onChange={onSortModeChange}
                  aria-label="Bank sort mode"
                >
                  <ToggleButton value="category">Category</ToggleButton>
                  <ToggleButton value="quantity">Quantity</ToggleButton>
                  <ToggleButton value="stack">Stack</ToggleButton>
                </ToggleButtonGroup>
              )}
              <ToggleButtonGroup
                size="small"
                exclusive
                value={renderMode}
                onChange={onRenderModeChange}
                aria-label="Bank view mode"
              >
                <ToggleButton value="gridCompact" aria-label="Compact grid">
                  <ViewCompactIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="list" aria-label="List">
                  <ViewListIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="grid" aria-label="Grid">
                  <GridViewIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="packs" aria-label="Bank packs">
                  <ViewModuleIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>
        </Stack>
      </Paper>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 2,
          alignItems: "flex-start",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
          {(renderMode === "grid" || renderMode === "gridCompact") && (
            <BankGridView
              showCategory={renderMode === "grid"}
              items={items}
              itemsByCategory={sortedFilteredItemsByCategory}
            />
          )}
          {renderMode === "list" && <BankTableView items={items} />}
          {renderMode === "packs" && (
            <BankPacksView bankData={bankData} search={search} focus={packFocus} />
          )}
        </Box>

        <BankInsightsSidebar bankData={bankData} items={aggregated.items} />
      </Box>
    </>
  );
}
