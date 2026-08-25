import { useContext, useMemo } from "react";
import { GDimension, GImage, GMonster } from "typed-adventureland";

import { GDataContext } from "../GDataContext";
import { EntityTooltip } from "./EntityTooltip";

function matrixPosition(value: unknown, matrix: unknown[][]) {
  let col = -1;
  const row = matrix.findIndex((r) => {
    const c = (r as unknown[]).indexOf(value);
    if (c !== -1) {
      col = c;
      return true;
    }
    return false;
  });
  if (col === -1 && row === -1) return false as const;
  return { row, col };
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

  const sprite = Object.values(G.sprites)
    .filter((v) => v?.matrix && v?.file)
    .reduce((a, b) => {
      const find = matrixPosition(skin, b.matrix as unknown[][]);
      if (find) return { data: b, ...find };
      return a;
    }, {} as { data: { file: string; columns: number; rows: number }; row: number; col: number });

  if (!sprite?.data) {
    return <BoxFallback alt={alt} />;
  }

  const image = (G.images as Record<string, GImage>)[sprite.data.file.split("?")[0]];
  if (!image) return <BoxFallback alt={alt} />;

  const width = (image.width / sprite.data.columns) * scale;
  const height = (image.height / sprite.data.rows) * scale;
  const dimension = (G.dimensions as Record<string, GDimension>)[skin] || false;

  let offsetx = 0;
  let offsety = 0;
  if (dimension) {
    offsetx = width / 3 - dimension[0] * scale;
    offsety = height / 4 - (dimension[2] || 0) - dimension[1] * scale;
  }

  return (
    <div
      style={{
        overflow: "hidden",
        width: `${width / 3 - offsetx}px`,
        height: `${height / 4 - offsety}px`,
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
          marginTop: `-${sprite.row * height + offsety}px`,
          marginLeft: `-${sprite.col * width + offsetx / 2}px`,
          imageRendering: "pixelated",
        }}
        src={`http://adventure.land${sprite.data.file}`}
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
