import { Box } from "@mui/material";
import { useContext, useMemo } from "react";

import { GDataContext } from "../GDataContext";
import { characterLookLayers, ClassLook } from "../gameData/characterLook";
import { SpriteSkin } from "./SpriteSkin";

export type { ClassLook, CharacterCx } from "../gameData/characterLook";

/**
 * Container sizes matching `html.js` `sprite()` call sites.
 * - `default` — generic sprite() (scale 1.5, 40×50)
 * - `class` — class select / class cards (`scale: 2, width: 52, height: 72`)
 * - `preview` — dressing-room side panel
 * - `stage` — dressing-room hero / turntable
 */
export const CHARACTER_LOOK_SIZE = {
  default: { scale: 1.5, width: 40, height: 50 },
  class: { scale: 2, width: 52, height: 72 },
  preview: { scale: 3, width: 78, height: 108 },
  stage: { scale: 4, width: 104, height: 144 },
} as const;

export type CharacterLookSizeName = keyof typeof CHARACTER_LOOK_SIZE;

/**
 * Shared character look renderer — armor/body + cosmetics (`html.js` `sprite()`).
 * Use this everywhere a composed look is shown. For a single sheet cell (monster,
 * item skin, NPC), use `SpriteSkin` instead.
 */
export function CharacterLook({
  look,
  alt,
  size = "default",
  scale: scaleProp,
  width: widthProp,
  height: heightProp,
  direction = 0,
  animate = true,
  overflow = "hidden",
}: {
  look: ClassLook;
  alt: string;
  /** Named size from game UI; overridden by explicit scale/width/height. */
  size?: CharacterLookSizeName;
  scale?: number;
  width?: number;
  height?: number;
  /** Facing row (`sprite_image` `j`). Default 0 = down. */
  direction?: number;
  /** Cycle `a_hat` / `a_makeup` columns on layered skins. Default on. */
  animate?: boolean;
  overflow?: "hidden" | "visible";
}) {
  const G = useContext(GDataContext);
  const preset = CHARACTER_LOOK_SIZE[size];
  const scale = scaleProp ?? preset.scale;
  const width = widthProp ?? preset.width;
  const height = heightProp ?? preset.height;
  const layers = useMemo(() => (G ? characterLookLayers(G, look) : []), [G, look]);

  if (!G) return null;

  return (
    <Box
      role="img"
      aria-label={alt}
      sx={{
        position: "relative",
        width,
        height,
        flexShrink: 0,
        overflow,
        pointerEvents: "none",
      }}
    >
      {layers.map((layer, index) => (
        <Box
          key={layer.key}
          aria-hidden
          sx={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: layer.bottom * scale,
            display: "flex",
            justifyContent: "center",
            zIndex: index,
          }}
        >
          <SpriteSkin
            skin={layer.skin}
            alt=""
            scale={scale}
            direction={direction}
            animate={animate}
          />
        </Box>
      ))}
    </Box>
  );
}
