import { Box, Link, Typography } from "@mui/material";
import { useContext } from "react";
import { Link as RouterLink } from "react-router-dom";
import { ItemInfo } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { getFullItemName, getItemName, getTitleName } from "./iteminfo-util";
import { ItemInstance } from "./ItemInstance";

/**
 * Icon + titled display name + item key — same layout as Market / Bank tables
 * (`getTitleName` + `getItemName`, or `getFullItemName` when `includeLevel`).
 */
export function ItemInstanceLabel({
  itemInfo,
  size = 40,
  linkToDetail = true,
  caption,
  includeLevel = false,
}: {
  itemInfo: ItemInfo;
  size?: number;
  linkToDetail?: boolean;
  /** Extra line under the key (e.g. slot name). */
  caption?: string;
  /** Prefix +level like Gear Planner / tooltips (`getFullItemName`). */
  includeLevel?: boolean;
}) {
  const G = useContext(GDataContext);
  const itemKey = itemInfo.name;
  const gItem = G?.items[itemKey];

  let displayName: string;
  if (includeLevel && G) {
    displayName = getFullItemName(itemInfo, G);
  } else {
    let titleName = G ? getTitleName(itemInfo, G) : "";
    if (titleName) titleName += " ";
    const itemName = gItem && G ? getItemName(itemKey, gItem) : itemKey;
    displayName = `${titleName}${itemName}`;
  }

  const nameBlock = (
    <Box sx={{ minWidth: 0 }}>
      {linkToDetail ? (
        <Link
          component={RouterLink}
          to={`/items/${encodeURIComponent(itemKey)}`}
          underline="hover"
          variant="body2"
          display="block"
          noWrap
        >
          {displayName}
        </Link>
      ) : (
        <Typography variant="body2" noWrap>
          {displayName}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" display="block" noWrap>
        {itemKey}
      </Typography>
      {caption ? (
        <Typography variant="caption" color="text.secondary" display="block" noWrap>
          {caption}
        </Typography>
      ) : null}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
      {/* Name link owns navigation; icon stays tooltip-only (Market / Bank pattern). */}
      <ItemInstance itemInfo={itemInfo} size={size} linkToDetail={false} />
      {nameBlock}
    </Box>
  );
}
