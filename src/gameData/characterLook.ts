import { GClass } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { asRecord } from "./gRecord";
import { findSpriteSheet } from "./spriteSkinLayout";

/** Cosmetic slots on a class look (`looks[i][1]` / `character.cx`). */
export type CharacterCx = Record<string, string>;

export type ClassLook = {
  skin: string;
  cx: CharacterCx;
};

/** Shared dressing-room / tile preview defaults (html.js class select baselines). */
export const DEFAULT_PREVIEW_HEAD = "makeup117";
export const DEFAULT_PREVIEW_BODY = "marmor6d";

export type LookLayer = {
  key: string;
  skin: string;
  /** Unscaled `bottom` offset, matching html.js `sprite_image` `p`. */
  bottom: number;
};

type SpriteSheet = {
  type?: string;
  size?: string;
  skip?: boolean;
  matrix?: unknown[][];
};

type CosmeticsG = {
  default_head_place: number;
  default_hair_place: number;
  default_hat_place: number;
  default_face_position: number;
  default_makeup_position: number;
  default_beard_position: number;
  head?: Record<string, unknown>;
  hair?: Record<string, unknown>;
  hat?: Record<string, unknown>;
  prop?: Record<string, unknown>;
};

const HEAD_DY: Record<string, number> = {
  large: 2,
  tall: 1,
  normal: 0,
  small: -1,
  xsmall: -3,
  xxsmall: -4,
};

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const item of value) {
    if (typeof item === "string") items.push(item);
  }
  return items;
}

function parseCosmetics(value: unknown): CosmeticsG | undefined {
  const rec = asRecord(value);
  if (!rec) return undefined;
  return {
    default_head_place: readNumber(rec.default_head_place) ?? 7,
    default_hair_place: readNumber(rec.default_hair_place) ?? 7,
    default_hat_place: readNumber(rec.default_hat_place) ?? 7,
    default_face_position: readNumber(rec.default_face_position) ?? 8,
    default_makeup_position: readNumber(rec.default_makeup_position) ?? 0,
    default_beard_position: readNumber(rec.default_beard_position) ?? 0,
    head: asRecord(rec.head),
    hair: asRecord(rec.hair),
    hat: asRecord(rec.hat),
    prop: asRecord(rec.prop),
  };
}

function parseCx(value: unknown): CharacterCx {
  const rec = asRecord(value);
  const cx: CharacterCx = {};
  if (!rec) return cx;
  for (const [slot, raw] of Object.entries(rec)) {
    const id = readString(raw);
    if (id) cx[slot] = id;
  }
  return cx;
}

function hasProp(cosmetics: CosmeticsG, id: string, flag: string): boolean {
  const listed = cosmetics.prop?.[id];
  return readStringList(listed).includes(flag);
}

function headSkinTuple(cosmetics: CosmeticsG, headId: string): unknown[] {
  const row = cosmetics.head?.[headId];
  return Array.isArray(row) ? row : [];
}

function bodySkinForHead(cosmetics: CosmeticsG, headId: string, size: string): string {
  const row = headSkinTuple(cosmetics, headId);
  if (size === "small") return readString(row[0]) ?? "sskin1a";
  if (size === "large") return readString(row[2]) ?? "lskin1a";
  return readString(row[1]) ?? "mskin1a";
}

function hairOffsets(cosmetics: CosmeticsG, hairId: string | undefined): [number, number] {
  if (!hairId) return [0, 0];
  const row = cosmetics.hair?.[hairId];
  if (!Array.isArray(row)) return [0, 0];
  return [readNumber(row[0]) ?? 0, readNumber(row[1]) ?? 0];
}

/** Parse `G.classes[c].looks` into armor skin + cosmetic slots. */
export function classLooks(gClass: GClass): ClassLook[] {
  const looks: ClassLook[] = [];
  if (!gClass.looks) return looks;
  for (const look of gClass.looks) {
    const skin = look?.[0];
    if (!skin) continue;
    looks.push({ skin, cx: parseCx(look[1]) });
  }
  return looks;
}

/** Body skins from class looks, first occurrence order (no duplicates). */
export function classLookSkins(gClass: GClass): string[] {
  const skins: string[] = [];
  for (const look of classLooks(gClass)) {
    let seen = false;
    for (const existing of skins) {
      if (existing === look.skin) {
        seen = true;
        break;
      }
    }
    if (!seen) skins.push(look.skin);
  }
  return skins;
}

export function looksEqual(a: ClassLook, b: ClassLook): boolean {
  if (a.skin !== b.skin) return false;
  const aKeys = Object.keys(a.cx);
  const bKeys = Object.keys(b.cx);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (a.cx[key] !== b.cx[key]) return false;
  }
  return true;
}

/** Layer list for a class look, same order as html.js `sprite()`. */
export function characterLookLayers(
  G: Pick<CustomGData, "sprites"> & { cosmetics?: unknown },
  look: ClassLook,
): LookLayer[] {
  const cosmetics = parseCosmetics(G.cosmetics);
  const sprites = G.sprites as Record<string, SpriteSheet | undefined>;
  const bodySheet = findSpriteSheet(sprites, look.skin);
  const bodyType = bodySheet?.data.type ?? "full";
  const size = bodySheet?.data.size ?? "normal";
  const cx: CharacterCx = { ...look.cx };
  const layers: LookLayer[] = [];

  if (!cosmetics) {
    layers.push({ key: "body", skin: look.skin, bottom: 0 });
    return layers;
  }

  const needsHead = bodyType !== "full" && bodyType !== "character";
  if (needsHead && !cx.head) cx.head = DEFAULT_PREVIEW_HEAD;

  const noHair = hasProp(cosmetics, look.skin, "no_hair");
  const covers = hasProp(cosmetics, look.skin, "covers");
  const headDy = HEAD_DY[size] ?? 0;
  const headRow = cx.head ? headSkinTuple(cosmetics, cx.head) : [];
  const headDh = readNumber(headRow[3]) ?? 0;
  const [hairDyExtra, hairDh] = hairOffsets(cosmetics, cx.hair);
  const hatExtra = cx.hat ? readNumber(cosmetics.hat?.[cx.hat]) ?? 0 : 0;

  const headY = cosmetics.default_head_place + headDy;
  const hairY = cosmetics.default_hair_place + hairDyExtra + headDh + headDy;
  const hatY = cosmetics.default_hat_place + hairDh + headDy + hatExtra + headDh;

  const headId = cx.head;
  const hairId = cx.hair;
  const showHead = Boolean(headId) && needsHead;
  const showHair = Boolean(hairId) && needsHead && !noHair;

  if (showHead && covers && headId) {
    layers.push({ key: "head-under", skin: headId, bottom: headY });
  }
  if (cx.back) layers.push({ key: "back", skin: cx.back, bottom: 0 });
  if (showHead && headId) {
    layers.push({
      key: "skin",
      skin: bodySkinForHead(cosmetics, headId, size),
      bottom: 0,
    });
  }
  layers.push({ key: "body", skin: look.skin, bottom: 0 });
  if (cx.upper) layers.push({ key: "upper", skin: cx.upper, bottom: 0 });
  if (showHead && !covers && headId) {
    layers.push({ key: "head", skin: headId, bottom: headY });
  }
  if (showHair && hairId) layers.push({ key: "hair", skin: hairId, bottom: hairY });
  if (cx.face) {
    layers.push({
      key: "face",
      skin: cx.face,
      bottom: headY + cosmetics.default_face_position,
    });
  }
  if (cx.chin) {
    layers.push({
      key: "chin",
      skin: cx.chin,
      bottom: headY + cosmetics.default_beard_position,
    });
  }
  if (cx.tail) layers.push({ key: "tail", skin: cx.tail, bottom: 0 });
  if (cx.hat) layers.push({ key: "hat", skin: cx.hat, bottom: hatY });
  // PIXI `add_cx_sprites`: makeup / a_makeup zy (3.5) sits above hair (2) and hat (3).
  // html.js paints makeup earlier; match the in-game stack so a_makeup flames aren't buried.
  if (cx.makeup) {
    layers.push({
      key: "makeup",
      skin: cx.makeup,
      bottom: headY + cosmetics.default_makeup_position,
    });
  }
  return layers;
}
