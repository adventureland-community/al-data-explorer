import {
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GCraft, GItem, ItemKey } from "typed-adventureland";

import { getItemAcquisitionCached } from "../gameData/itemAcquisition";
import type { AcquisitionDropView, AcquisitionShopView } from "../gameData/itemAcquisition";
import { isEquippable } from "../gameData/compareStats";
import {
  getItemTypes,
  getItemWtypes,
  ItemSortKey,
  queryItems,
  sortItemKeysByTier,
} from "../gameData/itemFilters";
import { getItemAbilityKey, getItemBadges, getItemClasses } from "../gameData/itemMeta";
import { abilityBlurb } from "../gameData/itemEffects";
import { GDataContext } from "../GDataContext";
import {
  BrowseCraftCell,
  BrowseDropsCell,
  BrowseShopsCell,
  BrowseUsedForCell,
} from "../Shared/ItemBrowseCells";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { QuerySearchBar } from "../Shared/QuerySearchBar";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { EMPTY_ITEM_CATALOG_ADVANCED, ItemsAdvancedSearchPanel } from "./ItemsAdvancedSearchPanel";
import {
  itemCatalogAdvancedFromSearch,
  itemCatalogAdvancedHasValues,
  serializeItemCatalogAdvancedForm,
  type ItemCatalogAdvancedForm,
} from "./itemCatalogAdvancedForm";
import { buildItemCatalogSuggestions, itemCatalogMatchesSearch } from "./itemCatalogSearchQuery";
import { useItemsBrowseParams, writeCsvParam } from "./useItemsUrlParams";

const EMPTY_ITEM_KEYS: ItemKey[] = [];

type ItemBrowseRowProps = {
  itemKey: ItemKey;
  gItem: GItem;
  drops: AcquisitionDropView[];
  shops: AcquisitionShopView[];
  craft: GCraft | undefined;
  usedIn: ItemKey[];
  to: string;
};

const ItemBrowseRow = memo(
  ({ itemKey, gItem, drops, shops, craft, usedIn, to }: ItemBrowseRowProps) => {
    const ability = getItemAbilityKey(gItem);
    const abilityLine = ability
      ? abilityBlurb(
          ability,
          (gItem as { attr0?: number }).attr0,
          (gItem as { attr1?: number }).attr1,
        )
      : null;
    const flagBadges = getItemBadges(gItem).filter((b) =>
      ["event", "exclusive", "exchange", "quest", "special"].includes(b.key),
    );

    return (
      <TableRow
        hover
        component={RouterLink}
        to={to}
        sx={{
          cursor: "pointer",
          textDecoration: "none",
          color: "inherit",
          contentVisibility: "auto",
          containIntrinsicSize: "auto 88px",
          "&:hover": { backgroundColor: "action.hover" },
        }}
      >
        <TableCell>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ItemInstance itemInfo={{ name: itemKey }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {gItem.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {itemKey}
              </Typography>
              {abilityLine && (
                <Typography
                  variant="caption"
                  color="warning.light"
                  noWrap
                  display="block"
                  title={abilityLine}
                >
                  {abilityLine}
                </Typography>
              )}
              {flagBadges.length > 0 && (
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.25, flexWrap: "wrap", gap: 0.5 }}>
                  {flagBadges.map((badge) => (
                    <Chip
                      key={badge.key}
                      size="small"
                      label={badge.label}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 10 }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{gItem.type ?? "—"}</Typography>
          {gItem.wtype ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {gItem.wtype}
            </Typography>
          ) : null}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{gItem.tier ?? "—"}</Typography>
        </TableCell>
        <TableCell>
          <BrowseDropsCell drops={drops} />
        </TableCell>
        <TableCell>
          <BrowseShopsCell shops={shops} />
        </TableCell>
        <TableCell>
          <BrowseCraftCell craft={craft} />
        </TableCell>
        <TableCell>
          <BrowseUsedForCell outputs={usedIn} />
        </TableCell>
      </TableRow>
    );
  },
);
ItemBrowseRow.displayName = "ItemBrowseRow";

export function ItemsBrowse() {
  const G = useContext(GDataContext);
  const { params, setParam, clearFilters, hasActiveFilters, browseQuery } = useItemsBrowseParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ItemCatalogAdvancedForm>(EMPTY_ITEM_CATALOG_ADVANCED);

  const commitSearch = useCallback(
    (next: string) => {
      setParam("search", next, { replace: true });
    },
    [setParam],
  );

  useEffect(() => {
    if (!open) return;
    setForm(itemCatalogAdvancedFromSearch(params.search));
  }, [open, params.search]);

  const types = useMemo(() => (G ? getItemTypes(G.items) : []), [G]);
  const wtypes = useMemo(() => (G ? getItemWtypes(G.items) : []), [G]);
  const classes = useMemo(() => (G ? getItemClasses(G.items) : []), [G]);

  const suggestions = useMemo(
    () => (draft: string) => buildItemCatalogSuggestions(draft, "catalog", { types, wtypes }),
    [types, wtypes],
  );

  const rows = useMemo(() => {
    if (!G) return [];
    const base = queryItems(G.items, {
      search: undefined,
      sort: params.sort,
      matchAttributes: false,
    });
    if (!params.search.trim()) return base;
    return base.filter(([itemKey, gItem]) =>
      itemCatalogMatchesSearch(itemKey as ItemKey, gItem, G, params.search),
    );
  }, [G, params.search, params.sort]);

  const tableRows = useMemo(() => {
    if (!G) return [];
    const craftMap = G.craft as Record<string, GCraft> | undefined;
    return rows.map(([itemKey, gItem]) => {
      const key = itemKey as ItemKey;
      const acquisition = getItemAcquisitionCached(key, G);
      return {
        key,
        gItem,
        drops: acquisition.drops,
        shops: acquisition.shops,
        craft: craftMap?.[key],
        usedIn: G.indexes.craftsByIngredient.get(key) ?? EMPTY_ITEM_KEYS,
        to: browseQuery ? `/items/${key}?from=${encodeURIComponent(browseQuery)}` : `/items/${key}`,
      };
    });
  }, [G, browseQuery, rows]);

  const matrixHref = useMemo(() => {
    if (!G || tableRows.length === 0 || !hasActiveFilters) return "/items/compare";
    const keys = sortItemKeysByTier(
      tableRows.filter((row) => isEquippable(row.gItem)).map((row) => row.key),
      G.items,
    );
    if (keys.length === 0) return "/items/compare";
    return `/items/compare?show=${encodeURIComponent(writeCsvParam(keys))}`;
  }, [G, hasActiveFilters, tableRows]);

  const matrixAddCount = useMemo(() => {
    if (!hasActiveFilters || !G) return 0;
    return tableRows.filter((row) => isEquippable(row.gItem)).length;
  }, [G, hasActiveFilters, tableRows]);

  if (!G) {
    return <LoadingState />;
  }

  const toggleSort = (key: ItemSortKey) => {
    setParam("sort", key);
  };

  const applyAdvanced = () => {
    commitSearch(serializeItemCatalogAdvancedForm(form));
    setOpen(false);
  };

  const clearAdvanced = () => {
    setForm(EMPTY_ITEM_CATALOG_ADVANCED);
    clearFilters();
    setOpen(false);
  };

  return (
    <StickyListLayout
      toolbar={
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5">Items</Typography>
            <Typography variant="body2" color="text.secondary">
              Browse drops, shops, crafts, and what each item is used for
            </Typography>
          </Box>
          <Button component={RouterLink} to={matrixHref} variant="outlined">
            {matrixAddCount > 0 ? `Balance matrix (${matrixAddCount})` : "Balance matrix"}
          </Button>
        </Stack>
      }
      filters={
        <Paper sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <QuerySearchBar
              context="catalog"
              value={params.search}
              onChange={commitSearch}
              suggestions={suggestions}
              debounceMs={250}
              onClear={() => setForm(EMPTY_ITEM_CATALOG_ADVANCED)}
              advanced={{
                open,
                onToggle: () => setOpen((was) => !was),
                onClose: () => setOpen(false),
                content: (
                  <ItemsAdvancedSearchPanel
                    form={form}
                    onChange={setForm}
                    typeOptions={types}
                    wtypeOptions={wtypes}
                    classOptions={classes}
                    search={params.search}
                    onApply={applyAdvanced}
                    onClear={clearAdvanced}
                  />
                ),
                active: hasActiveFilters || itemCatalogAdvancedHasValues(form),
              }}
            />
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
              <Chip label={`${tableRows.length} items`} size="small" />
              {hasActiveFilters && (
                <Button size="small" onClick={clearFilters}>
                  Clear
                </Button>
              )}
              <Link component={RouterLink} to={matrixHref} variant="body2" sx={{ ml: "auto" }}>
                {matrixAddCount > 0 ? `Open matrix with ${matrixAddCount} items` : "Open matrix"}
              </Link>
            </Stack>
          </Stack>
        </Paper>
      }
    >
      {tableRows.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", flex: 1 }}>
          <Typography color="text.secondary" gutterBottom>
            No items match your filters.
          </Typography>
          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Paper>
      ) : (
        <StickyTableShell>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 200 }}>
                  <TableSortLabel
                    active={params.sort === "name"}
                    direction="asc"
                    onClick={() => toggleSort("name")}
                  >
                    Item
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={params.sort === "type"}
                    direction="asc"
                    onClick={() => toggleSort("type")}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={params.sort === "tier"}
                    direction="asc"
                    onClick={() => toggleSort("tier")}
                  >
                    Tier
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ minWidth: 140 }}>Drops</TableCell>
                <TableCell sx={{ minWidth: 100 }}>Buy</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Craft</TableCell>
                <TableCell sx={{ minWidth: 120 }}>Used for</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <ItemBrowseRow
                  key={row.key}
                  itemKey={row.key}
                  gItem={row.gItem}
                  drops={row.drops}
                  shops={row.shops}
                  craft={row.craft}
                  usedIn={row.usedIn}
                  to={row.to}
                />
              ))}
            </TableBody>
          </Table>
        </StickyTableShell>
      )}
    </StickyListLayout>
  );
}
