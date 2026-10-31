import { Box } from "@mui/material";
import { ItemKey } from "typed-adventureland";
import { useContext, useMemo } from "react";

import { GDataContext } from "../GDataContext";
import {
  findSpriteSheet,
  spriteFitScale,
  spriteSkinViewFromMatch,
} from "../gameData/spriteSkinLayout";
import { ItemImage, SkinImage } from "../ItemImage";
import { SpriteSkin } from "./SpriteSkin";

type SpriteSheetMap = Record<
  string,
  {
    file?: string;
    columns?: number;
    rows?: number;
    type?: string;
    skip?: unknown;
    matrix?: unknown[][];
  }
>;

/** Extra zoom after contain-fit — faces paint only a few pixels in a full body cell. */
function jarCosmeticZoom(sheetType: string | undefined): number {
  switch (sheetType) {
    case "face":
    case "makeup":
    case "a_makeup":
      return 2.35;
    case "chin":
    case "beard":
      return 1.6;
    default:
      return 1;
  }
}

/** Sealed cosmetic / emote art only (official `cx_sprite` resolution), fitted to `size`. */
export function CxJarContentSprite({ data, size }: { data: string; size: number }) {
  const G = useContext(GDataContext);
  // typed-adventureland GSkill types `emote` poorly; runtime uses string id or truthy flag.
  const skillEntry =
    G?.skills && Object.prototype.hasOwnProperty.call(G.skills, data)
      ? (G.skills as Record<string, { emote?: boolean | string; skin?: string }>)[data]
      : undefined;

  const emoteSkin =
    skillEntry && skillEntry.emote && typeof skillEntry.skin === "string" && skillEntry.skin
      ? skillEntry.skin
      : undefined;

  const packSkin = emoteSkin ?? (G?.positions?.[data] ? data : undefined);

  const sheetScale = useMemo(() => {
    if (!G || packSkin) return null;
    const match = findSpriteSheet(G.sprites as SpriteSheetMap, data);
    if (!match) return size / 48;
    const natural = spriteSkinViewFromMatch(
      match,
      G.images as never,
      G.dimensions as never,
      data,
      1,
    );
    if (!natural) return size / 48;
    // Contain into the cell, then zoom sparse face/makeup cells (same sheet cell
    // as hats, but only a few painted pixels) so they read at a similar weight.
    const fit = spriteFitScale(natural.viewWidth, natural.viewHeight, size * 0.92);
    return fit * jarCosmeticZoom(match.data.type);
  }, [G, data, packSkin, size]);

  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {packSkin ? (
        <SkinImage skin={packSkin} size={size} alt={data} />
      ) : (
        <SpriteSkin skin={data} alt={data} scale={sheetScale ?? size / 48} animate={false} />
      )}
    </Box>
  );
}

/**
 * Dense-tile icon for a sealed CX Jar: sealed look primary, jar as corner badge.
 * Mirrors official inventory (jar) vs item-info (cx) by putting the look up front
 * for market/bank scanning.
 */
export function CxJarItemSprite({ data, size }: { data: string; size: number }) {
  const badge = Math.max(14, Math.round(size * 0.45));

  return (
    <Box
      sx={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 0.5,
        overflow: "hidden",
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CxJarContentSprite data={data} size={size} />
      <Box
        sx={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: badge,
          height: badge,
          borderRadius: 0.5,
          overflow: "hidden",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          boxShadow: 1,
          lineHeight: 0,
        }}
      >
        <ItemImage itemName={"cxjar" as ItemKey} size={badge} />
      </Box>
    </Box>
  );
}
