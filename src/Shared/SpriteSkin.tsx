import { useContext, useMemo } from "react";
import { GDimension, GImage, GMonster } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { EntityTooltip } from "./EntityTooltip";

type SpriteSheetEntry = {
  file: string;
  columns: number;
  rows: number;
  type?: string;
  matrix?: unknown[][];
};

function matrixPosition(value: unknown, matrix: unknown[][]): { row: number; col: number } | null {
  for (let row = 0; row < matrix.length; row += 1) {
    const col = (matrix[row] as unknown[]).indexOf(value);
    if (col !== -1) return { row, col };
  }
  return null;
}

/**
 * Sub-grid inside each matrix cell — matches WorldViewer/spriteLookup.
 * Character sheets are 3×4 walk frames; animations are 3×1, etc.
 */
function spriteGridSize(type: string | undefined): { colNum: number; rowNum: number } {
  switch (type) {
    case "animation":
      return { colNum: 3, rowNum: 1 };
    case "tail":
      return { colNum: 4, rowNum: 4 };
    case "v_animation":
    case "head":
    case "hair":
    case "hat":
    case "s_wings":
    case "face":
    case "makeup":
    case "beard":
      return { colNum: 1, rowNum: 4 };
    case "emblem":
    case "gravestone":
      return { colNum: 1, rowNum: 1 };
    case "full":
    case "wings":
    case "body":
    case "armor":
    case "skin":
    case "character":
    case "upper":
    case "a_makeup":
    case "a_hat":
    case undefined:
      return { colNum: 3, rowNum: 4 };
    default:
      return { colNum: 3, rowNum: 4 };
  }
}

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

/** Renders a cropped AdventureLand sprite sheet cell by skin id. */
export function SpriteSkin({
  skin,
  alt,
  opacity = 1,
  scale = 1,
}: {
  skin: string;
  alt: string;
  opacity?: number;
  scale?: number;
}) {
  const G = useContext(GDataContext);
  if (!G || !skin) return null;

  let match: { data: SpriteSheetEntry; row: number; col: number } | null = null;
  for (const entry of Object.values(G.sprites as Record<string, SpriteSheetEntry | undefined>)) {
    if (!entry?.matrix || !entry.file) continue;
    const position = matrixPosition(skin, entry.matrix);
    if (!position) continue;
    match = { data: entry, row: position.row, col: position.col };
    break;
  }

  if (!match) {
    return <BoxFallback alt={alt} />;
  }

  const image = (G.images as Record<string, GImage>)[match.data.file.split("?")[0]];
  if (!image?.width || !image?.height) return <BoxFallback alt={alt} />;

  const columns = match.data.columns || 1;
  const rows = match.data.rows || 1;
  const { colNum, rowNum } = spriteGridSize(match.data.type);
  const cellWidth = (image.width / (columns * colNum)) * scale;
  const cellHeight = (image.height / (rows * rowNum)) * scale;

  const dimension = (G.dimensions as Record<string, GDimension>)[skin];
  let viewWidth = cellWidth;
  let viewHeight = cellHeight;
  let offsetX = 0;
  let offsetY = 0;
  if (dimension) {
    viewWidth = dimension[0] * scale;
    viewHeight = dimension[1] * scale;
    offsetX = Math.round((cellWidth - viewWidth) / 2 + (dimension[2] || 0) * scale);
    offsetY = Math.round(cellHeight - viewHeight);
  }

  const originX = match.col * colNum * cellWidth;
  const originY = match.row * rowNum * cellHeight;

  return (
    <div
      style={{
        overflow: "hidden",
        width: `${Math.max(1, viewWidth)}px`,
        height: `${Math.max(1, viewHeight)}px`,
        opacity,
        flexShrink: 0,
      }}
    >
      <img
        alt={alt}
        style={{
          maxWidth: `${image.width * scale}px`,
          width: `${image.width * scale}px`,
          height: `${image.height * scale}px`,
          marginTop: `-${originY + offsetY}px`,
          marginLeft: `-${originX + offsetX}px`,
          imageRendering: "pixelated",
        }}
        src={`http://adventure.land${match.data.file}`}
      />
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
