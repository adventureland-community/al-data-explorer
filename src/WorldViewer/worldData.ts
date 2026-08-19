import {
  GDimension,
  GGeometry,
  GImage,
  GMap,
  GMonster,
  GNpc,
  GSprite,
  GTileset,
} from "typed-adventureland";
import { CustomGData, GItems } from "../GDataContext";
import { MapSpriteContext } from "./createWorldScene";
import { MapSource } from "./types";

export interface WorldGameData {
  source: MapSource;
  npcDefs: Record<string, GNpc>;
  spriteContext: MapSpriteContext;
  tilesets: Record<string, GTileset>;
  monsters: Record<string, GMonster>;
  drops: Record<string, unknown[]>;
  items: GItems;
  npcs: Record<string, GNpc>;
}

/** Single GData → World Viewer boundary. Downstream code should not recast G. */
export function toWorldSource(G: CustomGData): WorldGameData {
  return {
    source: {
      maps: G.maps as unknown as Record<string, GMap>,
      geometry: G.geometry as unknown as Record<string, GGeometry | undefined>,
    },
    npcDefs: G.npcs as unknown as Record<string, GNpc>,
    spriteContext: {
      sprites: G.sprites as unknown as Record<string, GSprite>,
      images: G.images as unknown as Record<string, GImage>,
      dimensions: G.dimensions as unknown as Record<string, GDimension>,
      monsters: G.monsters as unknown as Record<string, GMonster>,
      sheets: {},
    },
    tilesets: G.tilesets as unknown as Record<string, GTileset>,
    monsters: G.monsters as unknown as Record<string, GMonster>,
    drops: (G.drops ?? {}) as Record<string, unknown[]>,
    items: G.items as unknown as GItems,
    npcs: G.npcs as unknown as Record<string, GNpc>,
  };
}
