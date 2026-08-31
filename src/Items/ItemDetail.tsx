import {
  Box,
  Button,
  Chip,
  Grid,
  Link,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import { useContext, useMemo } from "react";
import { GCraft, ItemKey } from "typed-adventureland";

import { GDismantle } from "../gameData/dismantle";
import { craftRowKey, formatCraftCost, parseCraftRow } from "../gameData/craftRecipe";
import type { CraftRecipeRow } from "../gameData/craftRecipe";
import type { ItemEffectView } from "../gameData/itemEffects";
import {
  getItemBadges,
  getItemFacts,
  getItemNotes,
  metaLookupsFromG,
  type ItemBadge,
  type ItemFact,
} from "../gameData/itemMeta";
import {
  buildPlayerStatRows,
  gradeLabel,
  getItemGrade,
  getItemEffects,
} from "../gameData/playerItemDisplay";
import { effectLookupsFromG } from "../gameData/itemEffects";
import { CustomGData, GDataContext } from "../GDataContext";
import { ItemImage } from "../ItemImage";
import { ItemInstance } from "../Shared/ItemInstance";
import { RecipeItemTile } from "../Shared/RecipeItemTile";
import { LoadingState } from "../Shared/LoadingState";
import { SpriteSkin } from "../Shared/SpriteSkin";
import { getMaxLevel } from "../Utils";
import { ItemSetCard } from "./components/ItemSetCard";
import { ItemSourcesPanel } from "./components/ItemSourcesPanel";
import { ItemUsesPanel } from "./components/ItemUsesPanel";
import { RelatedItemsCard } from "./components/RelatedItemsCard";

function StatsTable({ rows }: { rows: ReturnType<typeof buildPlayerStatRows> }) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No combat stats on this item.
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key} hover>
              <TableCell
                sx={{ color: "text.secondary", width: "42%", py: 0.5, borderColor: "divider" }}
              >
                {row.label}
              </TableCell>
              <TableCell sx={{ py: 0.5, borderColor: "divider" }}>{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function FactsTable({ rows }: { rows: ItemFact[] }) {
  if (rows.length === 0) return null;
  return (
    <TableContainer>
      <Table size="small">
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell
                sx={{
                  color: "text.secondary",
                  width: 88,
                  py: 0.4,
                  px: 0,
                  borderColor: "transparent",
                  verticalAlign: "top",
                }}
              >
                {row.label}
              </TableCell>
              <TableCell sx={{ py: 0.4, px: 0, pl: 1.5, borderColor: "transparent" }}>
                {row.href ? (
                  <Link component={RouterLink} to={row.href} underline="hover">
                    {row.value}
                  </Link>
                ) : (
                  row.value
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function EffectIcon({ effect }: { effect: ItemEffectView }) {
  if (effect.skin) {
    return (
      <Box
        sx={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <SpriteSkin skin={effect.skin} alt={effect.title} scale={0.85} />
      </Box>
    );
  }
  if (effect.itemIcon) {
    return <ItemImage itemName={effect.itemIcon as ItemKey} size={36} />;
  }
  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 1,
        bgcolor: "action.hover",
        flexShrink: 0,
      }}
    />
  );
}

/** Ability / aura / use — shown beside combat stats, not under the title. */
function ItemEffectBlock({ effects }: { effects: ItemEffectView[] }) {
  if (effects.length === 0) return null;
  const heading = effects.length === 1 && effects[0]?.kindLabel ? effects[0].kindLabel : "Effects";
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ display: "block", mb: 0.75, lineHeight: 1.2, opacity: 0.7 }}
      >
        {heading}
      </Typography>
      <Stack spacing={1.25}>
        {effects.map((effect) => (
          <Stack key={effect.key} direction="row" spacing={1} alignItems="flex-start">
            <EffectIcon effect={effect} />
            <Box sx={{ minWidth: 0, pt: 0.25 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                {effect.title}
              </Typography>
              {effect.summary && effect.summary !== effect.title && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.35 }}
                >
                  {effect.summary}
                </Typography>
              )}
              {effect.detail && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.35, lineHeight: 1.4 }}
                >
                  {effect.detail}
                </Typography>
              )}
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function IngredientTiles({ items, rows }: { items: CustomGData["items"]; rows: CraftRecipeRow[] }) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1 }}>
      {rows.map((row) => {
        const parsed = parseCraftRow(row);
        const name = items[parsed.itemKey]?.name ?? parsed.itemKey;
        return (
          <RecipeItemTile
            key={craftRowKey(parsed)}
            itemKey={parsed.itemKey}
            level={parsed.level}
            quantity={parsed.quantity}
            showQuantity={parsed.quantity > 1}
            footer={
              <>
                <Typography
                  variant="caption"
                  display="block"
                  noWrap
                  sx={{ maxWidth: 100 }}
                  title={name}
                >
                  {name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  ×{parsed.quantity}
                </Typography>
              </>
            }
          />
        );
      })}
    </Box>
  );
}

function CraftRecipeCard({
  itemKey,
  craft,
  items,
}: {
  itemKey: ItemKey;
  craft: GCraft;
  items: CustomGData["items"];
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Craft recipe
      </Typography>
      {craft.cost != null && craft.cost > 0 && (
        <Typography variant="body2" gutterBottom>
          Craft cost: {formatCraftCost(craft.cost)}
        </Typography>
      )}
      {craft.quest && (
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Quest NPC: {craft.quest}
        </Typography>
      )}
      <IngredientTiles items={items} rows={craft.items ?? []} />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Output: {items[itemKey]?.name ?? itemKey}
      </Typography>
    </Paper>
  );
}

function DismantleRecipeCard({
  itemKey,
  dismantle,
  items,
}: {
  itemKey: ItemKey;
  dismantle: GDismantle;
  items: CustomGData["items"];
}) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dismantle
      </Typography>
      {dismantle.cost != null && (
        <Typography variant="body2" gutterBottom>
          Gold cost: {dismantle.cost.toLocaleString()}g
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Breaks {items[itemKey]?.name ?? itemKey} into:
      </Typography>
      <IngredientTiles items={items} rows={(dismantle.items ?? []) as CraftRecipeRow[]} />
    </Paper>
  );
}

function ItemLinkTiles({
  title,
  outputs,
  G,
}: {
  title: string;
  outputs: ItemKey[];
  G: CustomGData;
}) {
  if (outputs.length === 0) return null;
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {outputs.map((outKey) => {
          const outItem = G.items[outKey];
          return (
            <Box
              key={outKey}
              component={RouterLink}
              to={`/items/${outKey}`}
              sx={{ textDecoration: "none", color: "inherit", textAlign: "center", width: 72 }}
            >
              <ItemInstance itemInfo={{ name: outKey }} />
              <Typography variant="caption" display="block" noWrap>
                {outItem?.name ?? outKey}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

export function ItemDetail() {
  const { itemKey } = useParams<{ itemKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const G = useContext(GDataContext);

  const levelParam = searchParams.get("level");
  const level = levelParam != null ? Number(levelParam) : 0;
  const backQuery = searchParams.get("from");

  const key = itemKey as ItemKey | undefined;
  const gItem = key && G ? G.items[key] : undefined;
  const maxLevel = gItem ? getMaxLevel(gItem) : undefined;
  const effectLookups = useMemo(() => (G ? effectLookupsFromG(G) : undefined), [G]);
  const metaLookups = useMemo(() => (G ? metaLookupsFromG(G) : undefined), [G]);
  const effects = useMemo(
    () => (gItem && key ? getItemEffects(gItem, level, effectLookups, key) : []),
    [effectLookups, gItem, key, level],
  );
  const statRows = useMemo(() => (gItem ? buildPlayerStatRows(gItem, level) : []), [gItem, level]);

  if (!G || !itemKey) {
    return <LoadingState />;
  }

  if (!gItem || !key) {
    return (
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="h6" gutterBottom>
          Item not found
        </Typography>
        <Typography color="text.secondary" gutterBottom>
          {itemKey}
        </Typography>
        <Button component={RouterLink} to="/items" sx={{ mt: 2 }}>
          Back to items
        </Button>
      </Box>
    );
  }

  const backTo = backQuery ? `/items?${backQuery}` : "/items";
  const craft = (G.craft as Record<string, GCraft> | undefined)?.[key];
  const dismantle = (G.dismantle as Record<string, GDismantle> | undefined)?.[key];
  const usedIn = G.indexes.craftsByIngredient.get(key) ?? [];
  const usedInDismantle = G.indexes.dismantlesByIngredient.get(key) ?? [];
  const explanation =
    typeof (gItem as { explanation?: string }).explanation === "string"
      ? (gItem as { explanation?: string }).explanation
      : undefined;
  const notes = getItemNotes(gItem);
  const gradeName = gradeLabel(getItemGrade(gItem, level));
  const setKey = gItem.set;
  const setDef = setKey && G.sets?.[setKey] ? G.sets[setKey] : undefined;
  const setName = setDef?.name ?? setKey;

  const badges: ItemBadge[] = [
    ...(gItem.type
      ? [
          {
            key: "type",
            label: gItem.wtype ? `${gItem.type} · ${gItem.wtype}` : gItem.type,
          } as ItemBadge,
        ]
      : []),
    ...getItemBadges(gItem, {
      gradeName,
      setName,
      craftable: Boolean(craft),
      dismantleable: Boolean(dismantle),
    }),
  ];

  const metaRows = getItemFacts(gItem, metaLookups);
  const hasCombatStats = statRows.length > 0 || (maxLevel != null && maxLevel > 0);
  const showAbilityColumn = effects.length > 0;
  const showSidePanel = hasCombatStats || showAbilityColumn;

  const headerColumns = (() => {
    if (!showSidePanel) return "1fr";
    if (hasCombatStats && showAbilityColumn) {
      return "minmax(0, 1fr) minmax(150px, 200px) minmax(180px, 260px)";
    }
    return "minmax(0, 1fr) minmax(180px, 260px)";
  })();

  const sidePanelSx = {
    borderLeft: { md: 1 },
    borderTop: { xs: 1, md: 0 },
    borderColor: "divider",
    pl: { md: 2.5 },
    pt: { xs: 1.5, md: 0 },
    minWidth: 0,
  } as const;

  return (
    <Box sx={{ p: 2, maxWidth: 1200, mx: "auto" }}>
      <Button component={RouterLink} to={backTo} sx={{ mb: 1.5 }}>
        ← All items
      </Button>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: headerColumns },
            columnGap: 3,
            rowGap: 2,
            alignItems: "start",
          }}
        >
          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="flex-start"
              justifyContent="space-between"
            >
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ minWidth: 0, flex: "1 1 auto" }}
              >
                <Box sx={{ flexShrink: 0, lineHeight: 0 }}>
                  <ItemInstance
                    itemInfo={{ name: key, level: maxLevel ? level : undefined }}
                    size={48}
                  />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" component="h1" sx={{ lineHeight: 1.2 }}>
                    {gItem.name}
                    {maxLevel != null && maxLevel > 0 ? ` +${level}` : ""}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                    {key}
                  </Typography>
                </Box>
              </Stack>
              {badges.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                    justifyContent: "flex-end",
                    maxWidth: { xs: "42%", sm: 260 },
                    flexShrink: 0,
                  }}
                >
                  {badges.map((badge) => (
                    <Chip
                      key={badge.key}
                      size="small"
                      label={badge.label}
                      color={badge.color === "default" ? undefined : badge.color}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </Stack>

            {metaRows.length > 0 && <FactsTable rows={metaRows} />}

            {(explanation || notes.length > 0) && (
              <Box sx={{ pt: metaRows.length > 0 ? 0.25 : 0 }}>
                {explanation && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontStyle: "italic", lineHeight: 1.45 }}
                  >
                    {explanation}
                  </Typography>
                )}
                {notes.map((note) => (
                  <Typography
                    key={note}
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: explanation ? 0.75 : 0, lineHeight: 1.45 }}
                  >
                    {note}
                  </Typography>
                ))}
              </Box>
            )}
          </Stack>

          {hasCombatStats && (
            <Box sx={sidePanelSx}>
              <Typography
                variant="overline"
                sx={{ display: "block", mb: 0.5, lineHeight: 1.2, opacity: 0.7 }}
              >
                Stats{maxLevel != null && maxLevel > 0 ? ` +${level}` : ""}
              </Typography>
              {maxLevel != null && maxLevel > 0 && (
                <Stack spacing={0.5} sx={{ mb: 1.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      Level
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}
                    >
                      +{level}/{maxLevel}
                    </Typography>
                  </Stack>
                  <Slider
                    size="small"
                    value={Math.min(level, maxLevel)}
                    min={0}
                    max={maxLevel}
                    step={1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => `+${v}`}
                    onChange={(_, value) => {
                      if (typeof value === "number") {
                        const next = new URLSearchParams(searchParams);
                        next.set("level", String(value));
                        setSearchParams(next, { replace: true });
                      }
                    }}
                  />
                </Stack>
              )}
              {statRows.length > 0 ? (
                <StatsTable rows={statRows} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No combat stats on this item.
                </Typography>
              )}
            </Box>
          )}

          {showAbilityColumn && (
            <Box sx={sidePanelSx}>
              <ItemEffectBlock effects={effects} />
            </Box>
          )}
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <ItemUsesPanel itemKey={key} G={G} />
          {craft && (
            <Box sx={{ mb: 2 }}>
              <CraftRecipeCard itemKey={key} craft={craft} items={G.items} />
            </Box>
          )}
          {dismantle && (
            <Box sx={{ mb: 2 }}>
              <DismantleRecipeCard itemKey={key} dismantle={dismantle} items={G.items} />
            </Box>
          )}
          <ItemLinkTiles title="Used in crafts" outputs={usedIn} G={G} />
          {usedInDismantle.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <ItemLinkTiles title="From dismantling" outputs={usedInDismantle} G={G} />
            </Box>
          )}
          {setKey && setDef && (
            <Box sx={{ mt: 2 }}>
              <ItemSetCard itemKey={key} setKey={setKey} set={setDef} G={G} />
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <RelatedItemsCard itemKey={key} G={G} />
          </Box>
        </Grid>
        <Grid item xs={12} md={7}>
          <ItemSourcesPanel itemKey={key} G={G} />
        </Grid>
      </Grid>
    </Box>
  );
}
