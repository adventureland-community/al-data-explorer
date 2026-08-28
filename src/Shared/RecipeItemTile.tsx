import { Box, Typography } from "@mui/material";
import { ItemInfoPValues, ItemKey } from "typed-adventureland";
import { ReactNode } from "react";

import type { EntityTooltipLine } from "../gameData/entityTooltip";
import { formatCraftCost, totalCraftCost } from "../gameData/craftRecipe";
import { ItemInstance } from "./ItemInstance";

/** Standard item icon size for recipe / craft ingredient tiles. */
export const RECIPE_ITEM_SIZE = 48;

export type RecipeItemTileProps = {
  itemKey: ItemKey;
  level?: number;
  title?: ItemInfoPValues;
  quantity?: number;
  showQuantity?: boolean;
  forceShowQuantity?: boolean;
  quantityColor?: string;
  tooltipExtraLines?: EntityTooltipLine[];
  linkToDetail?: boolean;
  size?: number;
  tooltip?: boolean;
  footer?: ReactNode;
};

export function RecipeItemTile({
  itemKey,
  level,
  title,
  quantity,
  showQuantity,
  forceShowQuantity,
  quantityColor,
  tooltipExtraLines,
  linkToDetail = true,
  size = RECIPE_ITEM_SIZE,
  tooltip = true,
  footer,
}: RecipeItemTileProps) {
  const resolvedShowQuantity =
    showQuantity ?? (forceShowQuantity ? quantity != null : quantity != null && quantity > 1);

  return (
    <Box sx={{ textAlign: "center", width: size + 8 }}>
      <ItemInstance
        itemInfo={{
          name: itemKey,
          ...(level != null ? { level } : {}),
          ...(title ? { p: title } : {}),
          ...(quantity != null ? { q: quantity } : {}),
        }}
        showQuantity={resolvedShowQuantity}
        forceShowQuantity={forceShowQuantity}
        quantityColor={quantityColor}
        tooltipExtraLines={tooltipExtraLines}
        linkToDetail={linkToDetail}
        size={size}
        tooltip={tooltip}
      />
      {footer}
    </Box>
  );
}

type CraftCostLabelProps = {
  costPerCraft: number;
  batchCount: number;
};

/** Batch craft cost line for recipe cards. */
export function CraftCostLabel({ costPerCraft, batchCount }: CraftCostLabelProps) {
  if (costPerCraft <= 0 || batchCount <= 0) return null;

  const total = totalCraftCost(costPerCraft, batchCount);

  return (
    <Typography
      variant="caption"
      sx={{
        display: "block",
        textAlign: "center",
        mt: 0.75,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Box component="span" sx={{ color: "text.secondary" }}>
        Craft cost:{" "}
      </Box>
      <Box component="span" sx={{ color: "#fde047", fontWeight: 600 }}>
        {formatCraftCost(total)}
      </Box>
    </Typography>
  );
}
