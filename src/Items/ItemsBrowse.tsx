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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { memo, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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
  BrowseAcquisitionStrip,
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

function ItemIdentity({
  itemKey,
  gItem,
  dense = false,
  showTypeInMeta = false,
  footer = null,
}: {
  itemKey: ItemKey;
  gItem: GItem;
  dense?: boolean;
  /** Fold type/wtype into the key line (mobile cards). */
  showTypeInMeta?: boolean;
  /** Extra content under the identity (e.g. acquisition strip on cards). */
  footer?: ReactNode;
}) {
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
  const typeBits = showTypeInMeta ? [gItem.type, gItem.wtype].filter(Boolean) : [];
  const metaLine = [itemKey, ...typeBits].join(" · ");

  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ minWidth: 0 }}>
      <Box sx={{ flexShrink: 0, pt: 0.15 }}>
        <ItemInstance itemInfo={{ name: itemKey }} size={40} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: dense ? 600 : 400, minWidth: 0 }}>
            {gItem.name}
          </Typography>
          {dense && gItem.tier != null ? (
            <Chip
              size="small"
              label={`T${gItem.tier}`}
              variant="outlined"
              sx={{ height: 20, fontSize: 10, flexShrink: 0 }}
            />
          ) : null}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {metaLine}
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
        {footer}
      </Box>
    </Stack>
  );
}

const ItemBrowseRow = memo(
  ({ itemKey, gItem, drops, shops, craft, usedIn, to }: ItemBrowseRowProps) => (
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
        <ItemIdentity itemKey={itemKey} gItem={gItem} />
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
  ),
);
ItemBrowseRow.displayName = "ItemBrowseRow";

const ItemBrowseCard = memo(
  ({
    itemKey,
    gItem,
    drops,
    shops,
    craft,
    usedIn,
    to,
    showTypeInMeta,
  }: ItemBrowseRowProps & { showTypeInMeta: boolean }) => (
    <Box
      component={RouterLink}
      to={to}
      sx={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        px: 1.25,
        py: 1.15,
        borderBottom: 1,
        borderColor: "divider",
        "&:active": { backgroundColor: "action.selected" },
        "@media (hover: hover)": {
          "&:hover": { backgroundColor: "action.hover" },
        },
      }}
    >
      <ItemIdentity
        itemKey={itemKey}
        gItem={gItem}
        dense
        showTypeInMeta={showTypeInMeta}
        footer={
          <BrowseAcquisitionStrip drops={drops} shops={shops} craft={craft} usedIn={usedIn} />
        }
      />
    </Box>
  ),
);
ItemBrowseCard.displayName = "ItemBrowseCard";

export function ItemsBrowse() {
  const G = useContext(GDataContext);
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"), { noSsr: true });
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
      itemCatalogMatchesSearch(itemKey as ItemKey, gItem, G, params.search, {
        matchAttributeNames: true,
      }),
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

  const matrixLabel = narrow
    ? matrixAddCount > 0
      ? `Matrix (${matrixAddCount})`
      : "Matrix"
    : matrixAddCount > 0
    ? `Balance matrix (${matrixAddCount})`
    : "Balance matrix";

  // When the query already pins a type, repeating it on every card is noise.
  const searchHasTypeFilter = /\btype\s*:/i.test(params.search);

  return (
    <StickyListLayout
      toolbar={
        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant={narrow ? "h6" : "h5"}>Items</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              Browse drops, shops, crafts, and what each item is used for
            </Typography>
          </Box>
          <Button
            component={RouterLink}
            to={matrixHref}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0, minHeight: 36, px: { xs: 1.25, sm: 2 } }}
          >
            {matrixLabel}
          </Button>
        </Stack>
      }
      filters={
        <Paper sx={{ p: { xs: 1, sm: 2 } }}>
          <Stack spacing={1}>
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
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ flexWrap: "wrap", gap: 0.75 }}
            >
              <Chip
                label={`${tableRows.length} items`}
                size="small"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              />
              {hasActiveFilters && (
                <Button size="small" onClick={clearFilters} sx={{ minHeight: 28, py: 0 }}>
                  Clear
                </Button>
              )}
              {narrow ? (
                (
                  [
                    ["name", "Name"],
                    ["type", "Type"],
                    ["tier", "Tier"],
                  ] as const
                ).map(([key, label]) => (
                  <Chip
                    key={key}
                    size="small"
                    clickable
                    color={params.sort === key ? "primary" : "default"}
                    variant={params.sort === key ? "filled" : "outlined"}
                    label={params.sort === key ? `${label} ↑` : label}
                    onClick={() => toggleSort(key)}
                    sx={{ height: 26, fontSize: 12 }}
                  />
                ))
              ) : (
                <Link component={RouterLink} to={matrixHref} variant="body2" sx={{ ml: "auto" }}>
                  {matrixAddCount > 0 ? `Open matrix with ${matrixAddCount} items` : "Open matrix"}
                </Link>
              )}
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
      ) : narrow ? (
        <Paper
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {tableRows.map((row) => (
            <ItemBrowseCard
              key={row.key}
              itemKey={row.key}
              gItem={row.gItem}
              drops={row.drops}
              shops={row.shops}
              craft={row.craft}
              usedIn={row.usedIn}
              to={row.to}
              showTypeInMeta={!searchHasTypeFilter}
            />
          ))}
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
