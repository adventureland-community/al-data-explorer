import * as THREE from "three";
import { GDimension, GImage, GMonster, GSprite } from "typed-adventureland";
import { packSpriteSlots, packTypeHash } from "./packSpriteSlots";
import { lookupSkinSprite, paintSpriteClip } from "./spriteLookup";
import { ParsedMap } from "./types";

export interface MapSpriteContext {
  sprites: Record<string, GSprite>;
  images: Record<string, GImage>;
  dimensions: Record<string, GDimension>;
  monsters: Record<string, GMonster>;
  sheets: Record<string, HTMLImageElement>;
}

const SPRITE_LIFT = 14;
const TOPDOWN_LOOK_Y = 0.88;
const _billboardQuat = new THREE.Quaternion();
const _lookDir = new THREE.Vector3();

export function spriteCanvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

function spriteCacheKey(clip: NonNullable<ReturnType<typeof lookupSkinSprite>>): string {
  return [
    clip.url,
    clip.row,
    clip.col,
    clip.colNum,
    clip.rowNum,
    clip.viewWidth,
    clip.viewHeight,
    clip.offsetX,
    clip.offsetY,
    clip.cellWidth,
    clip.cellHeight,
  ].join("|");
}

function faceCamera(mesh: THREE.Mesh, camera: THREE.Camera): void {
  mesh.quaternion.copy(camera.getWorldQuaternion(_billboardQuat));
}

function lookingDown(camera: THREE.Camera): boolean {
  camera.getWorldDirection(_lookDir);
  return Math.abs(_lookDir.y) >= TOPDOWN_LOOK_Y;
}

function typeLift(type: string): number {
  return (packTypeHash(type) % 8) * 0.4;
}

function makeMapSprite(
  clip: ReturnType<typeof lookupSkinSprite>,
  sheet: HTMLImageElement | undefined,
  x: number,
  y: number,
  lift: number,
  textures: Map<string, THREE.CanvasTexture>,
): THREE.Mesh | null {
  if (!clip || !sheet) {
    return null;
  }
  const key = spriteCacheKey(clip);
  let texture = textures.get(key);
  if (!texture) {
    texture = spriteCanvasTexture(paintSpriteClip(sheet, clip));
    textures.set(key, texture);
  }
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    fog: false,
    side: THREE.DoubleSide,
    alphaTest: 0.01,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.userData.isMapSprite = true;
  mesh.scale.set(clip.viewWidth, clip.viewHeight, 1);
  mesh.position.set(x, lift + clip.viewHeight / 2, y);
  mesh.renderOrder = 20;
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    faceCamera(mesh, camera);
    material.depthTest = !lookingDown(camera);
  };
  return mesh;
}

export function buildMapSprites(map: ParsedMap, ctx: MapSpriteContext): THREE.Group {
  const group = new THREE.Group();
  group.name = "sprites";
  const textures = new Map<string, THREE.CanvasTexture>();

  for (const npc of map.npcs) {
    const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, npc.skin);
    const sprite = makeMapSprite(
      clip,
      clip ? ctx.sheets[clip.url] : undefined,
      npc.x,
      npc.y,
      SPRITE_LIFT,
      textures,
    );
    if (!sprite) {
      continue;
    }
    sprite.userData.spriteKind = "npc";
    sprite.userData.npc = npc;
    sprite.userData.mapId = map.id;
    group.add(sprite);
  }

  for (const monster of map.monsters) {
    const def = ctx.monsters[monster.type];
    const skin = def?.skin || monster.type;
    const size = def?.size || 1;
    const clip = lookupSkinSprite(ctx.sprites, ctx.images, ctx.dimensions, skin, size);
    const sheet = clip ? ctx.sheets[clip.url] : undefined;
    const slots = packSpriteSlots(monster);
    for (const slot of slots) {
      const sprite = makeMapSprite(
        clip,
        sheet,
        slot.x,
        slot.y,
        SPRITE_LIFT + typeLift(monster.type),
        textures,
      );
      if (!sprite) {
        continue;
      }
      sprite.userData.spriteKind = "monster";
      sprite.userData.monsterType = monster.type;
      sprite.userData.mapId = map.id;
      group.add(sprite);
    }
  }

  return group;
}
