import { Box, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { GCraft, ItemKey } from "typed-adventureland";

import { AcquisitionDropView, AcquisitionShopView } from "../gameData/itemAcquisition";
import { craftRowKey, formatCraftCost, parseCraftRow } from "../gameData/craftRecipe";
import { AcquisitionDropIcon } from "./AcquisitionDropIcon";
import { RECIPE_ITEM_SIZE, RecipeItemTile } from "./RecipeItemTile";
import { NpcImage } from "./SpriteSkin";

/**
 * Uniform tiles keep odds on one baseline; size stays large enough to read
 * monster/NPC sprites (same ballpark as the old 72px monster cells).
 */
const BROWSE_TILE = 72;
const BROWSE_TILE_WIDTH = 72;
const BROWSE_MONSTER_SCALE = 1.75;
const BROWSE_NPC_SCALE = 1.5;
const BROWSE_ITEM_SIZE = RECIPE_ITEM_SIZE;

const tileSlotSx = {
  width: BROWSE_TILE,
  height: BROWSE_TILE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
} as const;

const tileColumnSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: BROWSE_TILE_WIDTH,
  gap: 0.25,
  textDecoration: "none",
  color: "inherit",
} as const;

const oddsSx = {
  fontSize: 10,
  lineHeight: 1.1,
  opacity: 0.75,
  textAlign: "center",
  width: "100%",
  fontVariantNumeric: "tabular-nums",
} as const;

function SlotText({ children }: { children: ReactNode }) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontSize: 11,
        lineHeight: 1.15,
        textAlign: "center",
        px: 0.25,
        maxWidth: BROWSE_TILE,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        wordBreak: "break-word",
      }}
    >
      {children}
    </Typography>
  );
}

function DropTileIcon({ drop }: { drop: AcquisitionDropView }) {
  return (
    <AcquisitionDropIcon
      drop={drop}
      monsterScale={BROWSE_MONSTER_SCALE}
      itemSize={BROWSE_ITEM_SIZE}
      mapText={<SlotText>{drop.label}</SlotText>}
    />
  );
}

/** Drop icons — full list, no +N truncation. */
export function BrowseDropsCell({ drops }: { drops: AcquisitionDropView[] }) {
  if (drops.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "flex-start" }}>
      {drops.map((drop) => {
        const title = `${drop.label} · ${drop.oddsLabel}`;
        const content = (
          <Box sx={tileColumnSx}>
            <Box sx={tileSlotSx}>
              <DropTileIcon drop={drop} />
            </Box>
            <Typography variant="caption" sx={oddsSx}>
              {drop.oddsLabel}
            </Typography>
          </Box>
        );

        return (
          <Tooltip key={drop.id} title={title}>
            {drop.linkTo ? (
              <Box
                component={RouterLink}
                to={drop.linkTo}
                onClick={(e) => e.stopPropagation()}
                sx={{ textDecoration: "none", color: "inherit" }}
              >
                {content}
              </Box>
            ) : (
              content
            )}
          </Tooltip>
        );
      })}
    </Box>
  );
}

/** Shop NPC icons — full list, no +N truncation. */
export function BrowseShopsCell({ shops }: { shops: AcquisitionShopView[] }) {
  if (shops.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, alignItems: "flex-start" }}>
      {shops.map((shop) => (
        <Tooltip key={shop.npcId} title={`${shop.label} · ${shop.priceLabel}`}>
          <Box
            component={RouterLink}
            to={shop.linkTo}
            sx={{ ...tileColumnSx, textDecoration: "none", color: "inherit" }}
          >
            <Box sx={tileSlotSx}>
              <NpcImage npcId={shop.npcId} scale={BROWSE_NPC_SCALE} />
            </Box>
            <Typography variant="caption" sx={oddsSx}>
              {shop.priceLabel}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

/** Craft recipe — full list at drop-item scale. */
export function BrowseCraftCell({ craft }: { craft: GCraft | undefined }) {
  if (!craft?.items?.length) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
      {craft.items.map((row) => {
        const parsed = parseCraftRow(row);
        return (
          <RecipeItemTile
            key={craftRowKey(parsed)}
            itemKey={parsed.itemKey}
            level={parsed.level}
            quantity={parsed.quantity}
            tooltipExtraLines={
              craft.cost != null && craft.cost > 0
                ? [
                    {
                      kind: "stat",
                      label: "Craft cost",
                      value: formatCraftCost(craft.cost),
                      labelColor: "text.secondary",
                      valueColor: "#fde047",
                    },
                  ]
                : undefined
            }
          />
        );
      })}
    </Box>
  );
}

/** Used-for outputs — full list at drop-item scale. */
export function BrowseUsedForCell({ outputs }: { outputs: ItemKey[] }) {
  if (outputs.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
      {outputs.map((outKey) => (
        <RecipeItemTile key={outKey} itemKey={outKey} />
      ))}
    </Box>
  );
}

const COMPACT_TILE = 40;
const COMPACT_MONSTER_SCALE = 1.1;
const COMPACT_NPC_SCALE = 1;
const COMPACT_ITEM_SIZE = 32;
/** Room for odds like "1 in 10,784" without colliding with the next tile. */
const COMPACT_COL_MIN = 60;

const compactSlotSx = {
  width: COMPACT_TILE,
  height: COMPACT_TILE,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  flexShrink: 0,
} as const;

const compactColumnSx = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  minWidth: COMPACT_COL_MIN,
  maxWidth: 76,
  gap: 0.25,
  textDecoration: "none",
  color: "inherit",
  flexShrink: 0,
} as const;

const compactOddsSx = {
  fontSize: 10,
  lineHeight: 1.15,
  opacity: 0.85,
  textAlign: "center",
  width: "100%",
  px: 0.25,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontVariantNumeric: "tabular-nums",
} as const;

function CompactMapTile({ label }: { label: string }) {
  return (
    <Box
      title={label}
      sx={{
        width: COMPACT_TILE,
        height: COMPACT_TILE,
        borderRadius: 1,
        bgcolor: "action.selected",
        border: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 0.4,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontSize: 9,
          lineHeight: 1.1,
          textAlign: "center",
          color: "text.secondary",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          wordBreak: "break-word",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

function CompactSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          fontSize: 10,
          lineHeight: 1.2,
          letterSpacing: 0.3,
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          alignItems: "flex-start",
          minWidth: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** Full acquisition lists for mobile item cards — every tile, no +N truncation. */
export function BrowseAcquisitionStrip({
  drops,
  shops,
  craft,
  usedIn,
}: {
  drops: AcquisitionDropView[];
  shops: AcquisitionShopView[];
  craft: GCraft | undefined;
  usedIn: ItemKey[];
}) {
  const craftItems = craft?.items ?? [];
  const hasAnything =
    drops.length > 0 || shops.length > 0 || craftItems.length > 0 || usedIn.length > 0;
  if (!hasAnything) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9, mt: 0.85 }}>
      {drops.length > 0 ? (
        <CompactSection label="Drops">
          {drops.map((drop) => {
            const title = `${drop.label} · ${drop.oddsLabel}`;
            const content = (
              <Box sx={compactColumnSx}>
                <Box sx={compactSlotSx}>
                  {drop.icon.kind === "map-text" || drop.icon.kind === "key-fallback" ? (
                    <CompactMapTile label={drop.label} />
                  ) : (
                    <AcquisitionDropIcon
                      drop={drop}
                      monsterScale={COMPACT_MONSTER_SCALE}
                      itemSize={COMPACT_ITEM_SIZE}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={compactOddsSx} title={drop.oddsLabel}>
                  {drop.oddsLabel}
                </Typography>
              </Box>
            );
            return (
              <Tooltip key={drop.id} title={title}>
                {drop.linkTo ? (
                  <Box
                    component={RouterLink}
                    to={drop.linkTo}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ textDecoration: "none", color: "inherit" }}
                  >
                    {content}
                  </Box>
                ) : (
                  content
                )}
              </Tooltip>
            );
          })}
        </CompactSection>
      ) : null}

      {shops.length > 0 ? (
        <CompactSection label="Buy">
          {shops.map((shop) => (
            <Tooltip key={shop.npcId} title={`${shop.label} · ${shop.priceLabel}`}>
              <Box
                component={RouterLink}
                to={shop.linkTo}
                onClick={(e) => e.stopPropagation()}
                sx={{ ...compactColumnSx, textDecoration: "none", color: "inherit" }}
              >
                <Box sx={compactSlotSx}>
                  <NpcImage npcId={shop.npcId} scale={COMPACT_NPC_SCALE} />
                </Box>
                <Typography variant="caption" sx={compactOddsSx} title={shop.priceLabel}>
                  {shop.priceLabel}
                </Typography>
              </Box>
            </Tooltip>
          ))}
        </CompactSection>
      ) : null}

      {craftItems.length > 0 && craft ? (
        <CompactSection label="Craft">
          {craftItems.map((row) => {
            const parsed = parseCraftRow(row);
            return (
              <Box
                key={craftRowKey(parsed)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                sx={{ flexShrink: 0 }}
              >
                <RecipeItemTile
                  itemKey={parsed.itemKey}
                  level={parsed.level}
                  quantity={parsed.quantity}
                  size={COMPACT_ITEM_SIZE}
                  tooltipExtraLines={
                    craft.cost != null && craft.cost > 0
                      ? [
                          {
                            kind: "stat",
                            label: "Craft cost",
                            value: formatCraftCost(craft.cost),
                            labelColor: "text.secondary",
                            valueColor: "#fde047",
                          },
                        ]
                      : undefined
                  }
                />
              </Box>
            );
          })}
        </CompactSection>
      ) : null}

      {usedIn.length > 0 ? (
        <CompactSection label="Used for">
          {usedIn.map((outKey) => (
            <Box
              key={outKey}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              sx={{ flexShrink: 0 }}
            >
              <RecipeItemTile itemKey={outKey} size={COMPACT_ITEM_SIZE} />
            </Box>
          ))}
        </CompactSection>
      ) : null}
    </Box>
  );
}
