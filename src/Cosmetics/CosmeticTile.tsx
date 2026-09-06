import { Box, Typography } from "@mui/material";
import { memo, useMemo } from "react";

import { ClassLook } from "../gameData/characterLook";
import { CosmeticEntry, cosmeticTileLook, cosmeticTilePreview } from "../gameData/cosmeticsCatalog";
import { isAnimatedCosmeticType } from "../gameData/spriteSkinLayout";
import { SkinImage } from "../ItemImage";
import { CharacterLook } from "../Shared/CharacterLook";
import { SpriteSkin } from "../Shared/SpriteSkin";

export type CosmeticTileAvailability = "free" | "pack" | "unpublished";

/** Collection tile — transmog-wardrobe chrome around the right preview kind. */
export const CosmeticTile = memo(
  ({
    entry,
    base,
    selected,
    acquireSummary,
    availability = "pack",
    previewLook,
    direction = 0,
    onSelect,
  }: {
    entry: CosmeticEntry;
    base: ClassLook;
    selected: boolean;
    acquireSummary?: string;
    /** How this appearance is obtained — unpublished = not unlockable in-game. */
    availability?: CosmeticTileAvailability;
    /** Override look (bundles). */
    previewLook?: ClassLook;
    /** AL facing row — follows the dressing-room turntable. */
    direction?: number;
    onSelect: (entry: CosmeticEntry) => void;
  }) => {
    const tileLook = useMemo(
      () => previewLook ?? cosmeticTileLook(entry, base),
      [entry, base, previewLook],
    );
    const preview = useMemo(() => cosmeticTilePreview(entry), [entry]);
    const animated = isAnimatedCosmeticType(entry.sheetType);
    const isBundle = entry.kind === "bundle" || entry.sheetType === "bundle";
    const unpublished = availability === "unpublished";

    return (
      <Box
        component="button"
        type="button"
        onClick={() => onSelect(entry)}
        aria-pressed={selected}
        aria-label={[
          entry.label ?? entry.id,
          unpublished ? "not unlockable in-game" : null,
          animated ? "animated" : null,
        ]
          .filter(Boolean)
          .join(", ")}
        title={[
          entry.label ?? entry.id,
          animated ? "animated" : null,
          isBundle ? "bundle" : null,
          acquireSummary,
        ]
          .filter(Boolean)
          .join(" · ")}
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.55,
          p: 0.75,
          m: 0,
          cursor: "pointer",
          textAlign: "center",
          color: "inherit",
          font: "inherit",
          borderRadius: "8px",
          border: "2px",
          borderStyle: unpublished && !selected ? "dashed" : "solid",
          borderColor: selected ? "warning.main" : unpublished ? "warning.dark" : "divider",
          background: (theme) =>
            selected
              ? theme.palette.action.selected
              : theme.palette.mode === "dark"
              ? unpublished
                ? "rgba(255, 167, 38, 0.06)"
                : "rgba(255,255,255,0.03)"
              : unpublished
              ? "rgba(237, 108, 2, 0.06)"
              : "rgba(0,0,0,0.03)",
          boxShadow: selected
            ? (theme) =>
                `0 0 0 1px ${theme.palette.warning.main}88, inset 0 0 0 1px rgba(255,255,255,0.06)`
            : "none",
          contentVisibility: "auto",
          containIntrinsicSize: "auto 128px",
          transition: "border-color 140ms ease, background-color 140ms ease, transform 140ms ease",
          "&:hover": {
            borderColor: selected
              ? "warning.light"
              : unpublished
              ? "warning.main"
              : "text.secondary",
            backgroundColor: "action.hover",
            transform: "translateY(-1px)",
          },
          "&:focus-visible": {
            outline: (theme) => `2px solid ${theme.palette.warning.main}`,
            outlineOffset: 2,
          },
        }}
      >
        {unpublished ? (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: 5,
              left: 5,
              zIndex: 2,
              px: 0.55,
              py: 0.15,
              borderRadius: "4px",
              bgcolor: "warning.main",
              color: "warning.contrastText",
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: 0.35,
              lineHeight: 1.25,
              textTransform: "uppercase",
              boxShadow: (theme) => `0 0 0 1px ${theme.palette.background.paper}`,
            }}
          >
            Not in game
          </Box>
        ) : null}
        {animated ? (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: 5,
              right: 5,
              zIndex: 1,
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "warning.main",
              boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
              animation: "cosmeticPulse 1.4s ease-in-out infinite",
              "@keyframes cosmeticPulse": {
                "0%, 100%": { opacity: 0.55, transform: "scale(0.92)" },
                "50%": { opacity: 1, transform: "scale(1)" },
              },
            }}
          />
        ) : null}
        <Box
          sx={{ opacity: unpublished ? 0.62 : 1, filter: unpublished ? "grayscale(0.35)" : "none" }}
        >
          {preview.mode === "icon" ? (
            <Box
              sx={{
                width: 64,
                height: 88,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SkinImage skin={preview.skin} size={52} alt={entry.label ?? entry.id} />
            </Box>
          ) : preview.mode === "sprite" ? (
            <Box
              sx={{
                width: 64,
                height: 88,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SpriteSkin
                skin={preview.skin}
                alt={entry.id}
                scale={2.1}
                direction={direction}
                animate={false}
              />
            </Box>
          ) : (
            <CharacterLook
              look={tileLook}
              alt={entry.id}
              scale={2.4}
              width={62}
              height={86}
              direction={direction}
              animate={animated}
            />
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            fontSize: 11.5,
            lineHeight: 1.2,
            fontWeight: 600,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            px: 0.25,
            color: unpublished ? "warning.light" : "text.primary",
            opacity: unpublished ? 0.95 : 0.92,
          }}
        >
          {entry.id}
        </Typography>
      </Box>
    );
  },
);
