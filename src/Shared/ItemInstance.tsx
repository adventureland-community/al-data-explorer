import { Box, Link, SxProps } from "@mui/material";
import { ItemInfo } from "typed-adventureland";
import React, { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { GDataContext } from "../GDataContext";
import { ItemTooltip } from "./EntityTooltip";
import type { EntityTooltipLine } from "../gameData/entityTooltip";
import { ItemImage } from "../ItemImage";
import { getLevelString } from "../Utils";
import { abbreviateNumber } from "./utils";

export function ItemInstance({
  itemInfo,
  showQuantity,
  showTitleBorder,
  size = 40,
  tooltip = true,
  linkToDetail = false,
  quantityColor,
  forceShowQuantity,
  tooltipExtraLines,
}: {
  itemInfo: ItemInfo;
  showQuantity?: boolean;
  showTitleBorder?: boolean;
  /** Pixel size of the item sprite (default 40). */
  size?: number;
  /** Rich hover tooltip (al-market style). Default on. */
  tooltip?: boolean;
  /** Navigate to item detail page on click. */
  linkToDetail?: boolean;
  /** Override quantity badge text color. */
  quantityColor?: string;
  /** Show quantity badge even when q is 1. */
  forceShowQuantity?: boolean;
  /** Extra stat lines appended to the hover tooltip. */
  tooltipExtraLines?: EntityTooltipLine[];
}) {
  if (showTitleBorder === undefined) showTitleBorder = !!itemInfo.p;

  const G = useContext(GDataContext);
  if (!G) {
    return <></>;
  }
  const itemName = itemInfo.name;
  const gItem = G.items[itemName];
  if (!gItem) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.65rem",
          color: "text.secondary",
          border: 1,
          borderColor: "divider",
        }}
        title={itemName}
      >
        ?
      </Box>
    );
  }

  const levelStyle: SxProps = {
    position: "absolute",
    bottom: 0,
    left: 0,
    border: 0.5,
    borderColor: (theme: any) => (theme.palette.mode === "dark" ? "grey.800" : "grey.300"),
    minWidth: 14,
    height: 16,
    px: "3px",
    boxSizing: "border-box",
    bgcolor: "#000000ca",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    color: () => {
      if (gItem.compound) {
        if (itemInfo.level === 4) {
          return "#FFC949";
        }

        if (itemInfo.level === 5) {
          return "#B753C7";
        }
      } else if (gItem.upgrade) {
        if (itemInfo.level === 8) {
          return "#FFC949";
        }

        if (itemInfo.level === 9) {
          return "#E64D31";
        }

        if ((itemInfo.level ?? 0) >= 10) {
          return "#B753C7";
        }
      }
      return "#fff";
    },
  };

  const quantityStyle = {
    position: "absolute",
    bottom: 0,
    right: 0,
    border: 0.5,
    borderColor: (theme: any) => (theme.palette.mode === "dark" ? "grey.800" : "grey.300"),
    width: "fit-content",
    maxWidth: "100%",
    height: 16,
    paddingLeft: "3px",
    paddingRight: "3px",
    boxSizing: "border-box",
    bgcolor: "#00000071",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    lineHeight: 1,
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
    color: "#fff",
  };

  const levelString = getLevelString(gItem, itemInfo.level);
  const titleKey = itemInfo.p;
  let titleBorderColor;
  switch (titleKey) {
    case "festive":
      titleBorderColor = "#79ff7e";
      break;
    case "firehazard":
      titleBorderColor = "#f79b11";
      break;
    case "glitched":
      titleBorderColor = "grey";
      break;
    case "gooped":
      titleBorderColor = "#64B867";
      break;
    case "legacy":
      titleBorderColor = "white";
      break;
    case "lucky":
      titleBorderColor = "#00f3ff";
      break;
    case "shiny":
      titleBorderColor = "#99b2d8";
      break;
    case "superfast":
      titleBorderColor = "#c681dc";
      break;
    default:
      break;
  }

  const showQtyBadge =
    itemInfo.q != null && showQuantity && (forceShowQuantity ? itemInfo.q >= 1 : itemInfo.q > 1);

  const sprite = (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        verticalAlign: "middle",
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: showTitleBorder && titleBorderColor ? titleBorderColor : "transparent",
        padding: 1,
      }}
    >
      <ItemImage itemName={itemName} size={size} />
      {(gItem.upgrade || gItem.compound) && itemInfo.level ? (
        <Box sx={levelStyle}>{levelString}</Box>
      ) : (
        ""
      )}
      {showQtyBadge ? (
        <Box sx={{ ...quantityStyle, ...(quantityColor ? { color: quantityColor } : {}) }}>
          {abbreviateNumber(itemInfo.q!)}
        </Box>
      ) : (
        <></>
      )}
    </div>
  );

  if (!tooltip) {
    if (linkToDetail) {
      return (
        <Link
          component={RouterLink}
          to={`/items/${encodeURIComponent(itemName)}`}
          sx={{ display: "inline-block", color: "inherit", textDecoration: "none" }}
        >
          {sprite}
        </Link>
      );
    }
    return sprite;
  }

  const tooltipContent = (
    <ItemTooltip
      itemName={itemName}
      level={itemInfo.level}
      title={typeof itemInfo.p === "string" ? itemInfo.p : undefined}
      statType={typeof itemInfo.stat_type === "string" ? itemInfo.stat_type : undefined}
      quantity={itemInfo.q}
      extraLines={tooltipExtraLines}
    >
      {sprite}
    </ItemTooltip>
  );

  if (linkToDetail) {
    return (
      <Link
        component={RouterLink}
        to={`/items/${encodeURIComponent(itemName)}`}
        sx={{ display: "inline-block", color: "inherit", textDecoration: "none" }}
      >
        {tooltipContent}
      </Link>
    );
  }

  return tooltipContent;
}
