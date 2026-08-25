import { Box, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";
import { Link as RouterLink } from "react-router-dom";
import { GCraft, ItemKey } from "typed-adventureland";

import { AcquisitionDropView, AcquisitionShopView } from "../gameData/itemAcquisition";
import { CustomGData } from "../GDataContext";
import { AcquisitionDropIcon } from "./AcquisitionDropIcon";
import { ItemInstance } from "./ItemInstance";
import { NpcImage } from "./SpriteSkin";

/**
 * Uniform tiles keep odds on one baseline; size stays large enough to read
 * monster/NPC sprites (same ballpark as the old 72px monster cells).
 */
const BROWSE_TILE = 72;
const BROWSE_TILE_WIDTH = 72;
const BROWSE_MONSTER_SCALE = 1.75;
const BROWSE_NPC_SCALE = 1.5;
const BROWSE_ITEM_SIZE = 48;

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
          <Box sx={tileColumnSx}>
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

/** Match drop-tile item icons so craft / used-for read at the same scale. */
const RECIPE_ICON_SIZE = BROWSE_ITEM_SIZE;

function RecipeItemIcon({
  itemKey,
  level,
  quantity,
  title,
}: {
  itemKey: ItemKey;
  level?: number;
  quantity?: number;
  title: string;
}) {
  return (
    <Tooltip title={title}>
      <Box
        component={RouterLink}
        to={`/items/${itemKey}${level != null ? `?level=${level}` : ""}`}
        onClick={(e) => e.stopPropagation()}
        sx={{ textDecoration: "none", color: "inherit", lineHeight: 0 }}
      >
        <ItemInstance
          itemInfo={{
            name: itemKey,
            level,
            q: quantity != null && quantity > 1 ? quantity : undefined,
          }}
          showQuantity={quantity != null && quantity > 1}
          size={RECIPE_ICON_SIZE}
        />
      </Box>
    </Tooltip>
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
      {craft.items.map(([qty, key, lvl]) => {
        const itemKey = key as ItemKey;
        const level = typeof lvl === "number" ? lvl : undefined;
        return (
          <RecipeItemIcon
            key={`${itemKey}-${level ?? 0}-${qty}`}
            itemKey={itemKey}
            level={level}
            quantity={qty}
            title={`${itemKey}${level != null ? ` +${level}` : ""} ×${qty}${
              craft.cost != null ? ` · recipe ${craft.cost.toLocaleString()}g` : ""
            }`}
          />
        );
      })}
    </Box>
  );
}

/** Used-for outputs — full list at drop-item scale. */
export function BrowseUsedForCell({ outputs, G }: { outputs: ItemKey[]; G: CustomGData }) {
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
        <RecipeItemIcon key={outKey} itemKey={outKey} title={G.items[outKey]?.name ?? outKey} />
      ))}
    </Box>
  );
}
