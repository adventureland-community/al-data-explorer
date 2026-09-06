import { useMediaQuery } from "@mui/material";
import { CSSProperties, useContext, useMemo } from "react";
import { GDimension, GImage, GMonster } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import {
  COSMETIC_ANIM_MS,
  findSpriteSheet,
  isAnimatedCosmeticType,
  spriteGridSize,
  spriteSkinViewFromMatch,
} from "../gameData/spriteSkinLayout";
import { EntityTooltip } from "./EntityTooltip";

function BoxFallback({ alt }: { alt: string }) {
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 4,
        background: "rgba(128,128,128,0.25)",
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {alt.slice(0, 1).toUpperCase()}
    </div>
  );
}

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

/**
 * Single AdventureLand sprite-sheet cell (monster, item skin, NPC, one cosmetic layer).
 * For armor + cosmetics composed like the game, use `CharacterLook`.
 * `a_hat` / `a_makeup` strips animate their walk columns when `animate` is on.
 */
export function SpriteSkin({
  skin,
  alt,
  opacity = 1,
  scale = 1,
  walkFrame,
  direction,
  animate = true,
}: {
  skin: string;
  alt: string;
  opacity?: number;
  scale?: number;
  /** Walk column. Omit for the standing frame (`html.js` / PIXI idle). */
  walkFrame?: number;
  /** Facing row (`sprite_image` `j`). Default 0 = down. */
  direction?: number;
  /** Cycle `a_hat` / `a_makeup` columns. Default on. */
  animate?: boolean;
}) {
  const G = useContext(GDataContext);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const sprites = (G?.sprites ?? {}) as SpriteSheetMap;
  const match = skin ? findSpriteSheet(sprites, skin) : null;
  const sheetType = match?.data.type;
  const { colNum } = spriteGridSize(sheetType);
  const cssAnimate =
    Boolean(animate && walkFrame === undefined && skin) &&
    !reduceMotion &&
    isAnimatedCosmeticType(sheetType) &&
    colNum > 1;

  if (!G || !skin) return null;

  // CSS animation owns the walk column; pin the crop to column 0 as the keyframe base.
  const resolvedWalk = walkFrame ?? (cssAnimate ? 0 : undefined);

  const view = match
    ? spriteSkinViewFromMatch(
        match,
        G.images as Record<string, GImage>,
        G.dimensions as Record<string, GDimension | undefined>,
        skin,
        scale,
        { walkFrame: resolvedWalk, direction },
      )
    : null;

  if (!view) {
    return <BoxFallback alt={alt} />;
  }

  const imgStyle: CSSProperties = {
    maxWidth: "none",
    width: `${view.imageWidth}px`,
    height: `${view.imageHeight}px`,
    imageRendering: "pixelated",
  };

  if (cssAnimate) {
    const typed = imgStyle as CSSProperties & Record<string, string>;
    typed["--al-cx-x0"] = `-${view.originX}px`;
    typed["--al-cx-y"] = `-${view.originY}px`;
    typed["--al-cx-strip"] = `${view.colNum * view.animCellWidth}px`;
    imgStyle.transform = `translate(-${view.originX}px, -${view.originY}px)`;
    imgStyle.animation = `al-cosmetic-cols ${COSMETIC_ANIM_MS * view.colNum}ms steps(${
      view.colNum
    }) infinite`;
    imgStyle.willChange = "transform";
  } else {
    imgStyle.marginTop = `-${view.originY}px`;
    imgStyle.marginLeft = `-${view.originX}px`;
  }

  return (
    <div
      style={{
        overflow: "hidden",
        width: `${view.viewWidth}px`,
        height: `${view.viewHeight}px`,
        opacity,
        flexShrink: 0,
      }}
    >
      <img alt={alt} style={imgStyle} src={`http://adventure.land${view.file}`} />
    </div>
  );
}

export function MonsterImage({
  monsterName,
  opacity = 1,
  scale = 1,
  tooltip = true,
}: {
  monsterName: string;
  opacity?: number;
  scale?: number;
  tooltip?: boolean;
}) {
  const G = useContext(GDataContext);
  const entity = useMemo(() => ({ kind: "monster" as const, key: monsterName }), [monsterName]);

  if (!G) return null;
  const monster = G.monsters[monsterName as keyof typeof G.monsters] as GMonster | undefined;
  const skin = monster?.skin;
  const image = skin ? (
    <SpriteSkin
      skin={skin}
      alt={monster?.name ?? monsterName}
      opacity={opacity}
      scale={scale * (monster?.size || 1)}
    />
  ) : (
    <BoxFallback alt={monsterName} />
  );

  if (!tooltip || !monster) return image;
  return <EntityTooltip entity={entity}>{image}</EntityTooltip>;
}

export function NpcImage({
  npcId,
  opacity = 1,
  scale = 0.5,
  tooltip = true,
}: {
  npcId: string;
  opacity?: number;
  scale?: number;
  tooltip?: boolean;
}) {
  const G = useContext(GDataContext);
  const entity = useMemo(() => ({ kind: "npc" as const, key: npcId }), [npcId]);

  if (!G) return null;
  const npc = (G.npcs as Record<string, { skin?: string; name?: string } | undefined>)[npcId];
  const skin = npc?.skin;
  const image = skin ? (
    <SpriteSkin skin={skin} alt={npc?.name ?? npcId} opacity={opacity} scale={scale} />
  ) : (
    <BoxFallback alt={npc?.name ?? npcId} />
  );

  if (!tooltip || !npc) return image;
  return <EntityTooltip entity={entity}>{image}</EntityTooltip>;
}
