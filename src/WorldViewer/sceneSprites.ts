import * as THREE from "three";
import { CSS3DSprite } from "three/examples/jsm/renderers/CSS3DRenderer";
import { GDimension, GImage, GMonster, GSprite } from "typed-adventureland";
import { createSpriteElement, lookupSkinSprite } from "./spriteLookup";
import { ParsedMap } from "./types";

export interface MapSpriteContext {
  sprites: Record<string, GSprite>;
  images: Record<string, GImage>;
  dimensions: Record<string, GDimension>;
  monsters: Record<string, GMonster>;
}

const SPRITE_LIFT = 14;
const _spriteWorldPos = new THREE.Vector3();

function makeCssSprite(
  clip: ReturnType<typeof lookupSkinSprite>,
  x: number,
  y: number,
  lift: number,
): CSS3DSprite | null {
  if (!clip) {
    return null;
  }
  const element = createSpriteElement(clip);
  const sprite = new CSS3DSprite(element);
  sprite.userData.isMapSprite = true;
  // Center sits above the floor so sprite feet rest on the map plane at `lift`.
  sprite.position.set(x, lift + clip.viewHeight / 2, y);
  sprite.onBeforeRender = (_renderer, _scene, camera) => {
    sprite.getWorldPosition(_spriteWorldPos);
    const layerKey = Math.round(_spriteWorldPos.y * 100);
    const depthKey = Math.round(_spriteWorldPos.distanceTo(camera.position) * 10);
    sprite.element.style.zIndex = String(layerKey * 100_000 - depthKey);
  };
  return sprite;
}

export function buildMapSprites(map: ParsedMap, ctx: MapSpriteContext): THREE.Group {
  const group = new THREE.Group();
  group.name = "sprites";

  for (const npc of map.npcs) {
    const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, npc.skin);
    const sprite = makeCssSprite(clip, npc.x, npc.y, SPRITE_LIFT);
    if (!sprite) {
      continue;
    }
    sprite.userData.spriteKind = "npc";
    sprite.userData.npc = npc;
    sprite.userData.mapId = map.id;
    group.add(sprite);
  }

  for (const monster of map.monsters) {
    const def = ctx.monsters[monster.type as keyof typeof ctx.monsters];
    const skin = def?.skin || monster.type;
    const size = def?.size || 1;
    const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, skin, size);
    const sprite = makeCssSprite(clip, monster.x, monster.y, SPRITE_LIFT);
    if (!sprite) {
      continue;
    }
    sprite.userData.spriteKind = "monster";
    sprite.userData.monsterType = monster.type;
    sprite.userData.mapId = map.id;
    group.add(sprite);
  }

  return group;
}
