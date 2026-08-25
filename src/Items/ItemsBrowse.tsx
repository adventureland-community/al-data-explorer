import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { memo, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GCraft, GItem, ItemKey } from "typed-adventureland";

import { getItemAcquisitionCached } from "../gameData/itemAcquisition";
import type { AcquisitionDropView, AcquisitionShopView } from "../gameData/itemAcquisition";
import { isEquippable } from "../gameData/compareStats";
import {
  getItemTiers,
  getItemTypes,
  getItemWtypes,
  ItemSortKey,
  queryItems,
  sortItemKeysByTier,
} from "../gameData/itemFilters";
import { getItemAbilityKey, getItemBadges, getItemClasses } from "../gameData/itemMeta";
import { abilityBlurb } from "../gameData/itemEffects";
import { CustomGData, GDataContext } from "../GDataContext";
import {
  BrowseCraftCell,
  BrowseDropsCell,
  BrowseShopsCell,
  BrowseUsedForCell,
} from "../Shared/ItemBrowseCells";
import { ItemInstance } from "../Shared/ItemInstance";
import { LoadingState } from "../Shared/LoadingState";
import { MultiFilterAutocomplete } from "../Shared/MultiFilterAutocomplete";
import { StickyListLayout, StickyTableShell } from "../Shared/StickyListLayout";
import { useItemsBrowseParams, writeCsvParam } from "./useItemsUrlParams";

const EMPTY_ITEM_KEYS: ItemKey[] = [];

/** Local draft + debounce so keystrokes don't re-render the item table. */
function DebouncedSearchField({
  value,
  onCommit,
  delayMs = 250,
}: {
  value: string;
  onCommit: (next: string) => void;
  delayMs?: number;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== value) onCommit(draft);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, draft, onCommit, value]);

  return (
    <TextField
      fullWidth
      label="Search"
      placeholder="Name or item key"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      size="small"
    />
  );
}

type ItemBrowseRowProps = {
  itemKey: ItemKey;
  gItem: GItem;
  drops: AcquisitionDropView[];
  shops: AcquisitionShopView[];
  craft: GCraft | undefined;
  usedIn: ItemKey[];
  G: CustomGData;
  to: string;
};

const ItemBrowseRow = memo(
  ({ itemKey, gItem, drops, shops, craft, usedIn, G, to }: ItemBrowseRowProps) => {
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
          // Skip layout/paint for off-screen rows in long catalogs.
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
          <Typography variant="body2">
            {gItem.type}
            {gItem.wtype ? ` · ${gItem.wtype}` : ""}
          </Typography>
          {(gItem as { class?: string[] }).class?.length ? (
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              {(gItem as { class?: string[] }).class!.join(", ")}
            </Typography>
          ) : null}
        </TableCell>
        <TableCell align="right">{gItem.tier ?? "—"}</TableCell>
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
          <BrowseUsedForCell outputs={usedIn} G={G} />
        </TableCell>
      </TableRow>
    );
  },
);
ItemBrowseRow.displayName = "ItemBrowseRow";

export function ItemsBrowse() {
  const G = useContext(GDataContext);
  const { params, setParam, setListParam, clearFilters, hasActiveFilters, browseQuery } =
    useItemsBrowseParams();

  const commitSearch = useCallback(
    (next: string) => {
      setParam("search", next, { replace: true });
    },
    [setParam],
  );

  const types = useMemo(() => (G ? getItemTypes(G.items) : []), [G]);
  const tiers = useMemo(() => (G ? getItemTiers(G.items).map(String) : []), [G]);
  const wtypes = useMemo(() => (G ? getItemWtypes(G.items) : []), [G]);
  const classes = useMemo(() => (G ? getItemClasses(G.items) : []), [G]);

  const rows = useMemo(() => {
    if (!G) return [];
    return queryItems(G.items, {
      search: params.search,
      types: params.types,
      wtypes: params.wtypes,
      tiers: params.tiers,
      classes: params.classes,
      sort: params.sort,
      matchAttributes: false,
    });
  }, [G, params.classes, params.search, params.sort, params.tiers, params.types, params.wtypes]);

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

  /** Equippable rows from the current filter — preloaded into the matrix via `show`. */
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
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={6} md={3}>
              <DebouncedSearchField value={params.search} onCommit={commitSearch} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MultiFilterAutocomplete
                label="Type"
                options={types}
                value={params.types}
                onChange={(next) => setListParam("type", next)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MultiFilterAutocomplete
                label="Wtype"
                options={wtypes}
                value={params.wtypes}
                onChange={(next) => setListParam("wtype", next)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MultiFilterAutocomplete
                label="Tier"
                options={tiers}
                value={params.tiers.map(String)}
                onChange={(next) => setListParam("tier", next)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <MultiFilterAutocomplete
                label="Class"
                options={classes}
                value={params.classes}
                onChange={(next) => setListParam("class", next)}
              />
            </Grid>
            <Grid item xs={12}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                flexWrap="wrap"
                sx={{ gap: 1 }}
              >
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
            </Grid>
          </Grid>
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
                  G={G}
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
