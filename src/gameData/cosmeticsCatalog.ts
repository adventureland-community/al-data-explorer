import { CustomGData } from "../GDataContext";
import {
  CharacterCx,
  ClassLook,
  classLooks,
  DEFAULT_PREVIEW_BODY,
  DEFAULT_PREVIEW_HEAD,
} from "./characterLook";
import { applyCosmeticCompatibility, CompatibilityNote } from "./cosmeticProps";
import { isAnimatedCosmeticType } from "./spriteSkinLayout";

/** Sprite sheet type → `character.cx` / body slot (`old_common_functions.js` `cxtype_to_slot`). */
export const CX_TYPE_TO_SLOT: Record<string, CosmeticSlot> = {
  armor: "skin",
  body: "skin",
  character: "skin",
  skin: "skin",
  face: "face",
  makeup: "makeup",
  a_makeup: "makeup",
  beard: "chin",
  mask: "chin",
  tail: "tail",
  s_wings: "back",
  wings: "back",
  hat: "hat",
  a_hat: "hat",
  head: "head",
  hair: "hair",
  gravestone: "gravestone",
};

export type CosmeticSlot =
  | "skin"
  | "head"
  | "hair"
  | "hat"
  | "face"
  | "makeup"
  | "chin"
  | "back"
  | "tail"
  | "gravestone"
  | "misc";

export const COSMETIC_SLOT_ORDER: CosmeticSlot[] = [
  "skin",
  "head",
  "hair",
  "hat",
  "face",
  "makeup",
  "chin",
  "back",
  "tail",
  "gravestone",
  "misc",
];

export const COSMETIC_SLOT_LABEL: Record<CosmeticSlot, string> = {
  skin: "Body",
  head: "Head",
  hair: "Hair",
  hat: "Hat",
  face: "Face",
  makeup: "Makeup",
  chin: "Chin",
  back: "Back",
  tail: "Tail",
  gravestone: "Stone",
  misc: "Misc",
};

export type CosmeticEntry = {
  id: string;
  slot: CosmeticSlot;
  /** Sprite sheet `type` (armor, head, a_hat, …) or `emote` / `bundle`. */
  sheetType: string;
  size?: string;
  /** Non-sprite misc (emotes) — no CharacterLook preview. */
  kind?: "sprite" | "emote" | "bundle";
  /** Icon skin for emotes (`G.skills[id].skin` → `G.positions`). */
  previewSkin?: string;
  /** Display name when different from id (skill name). */
  label?: string;
};

/** How a wardrobe tile should render — stones/emotes are not character layers. */
export type CosmeticTilePreview =
  | { mode: "character" }
  | { mode: "sprite"; skin: string }
  | { mode: "icon"; skin: string };

export function cosmeticTilePreview(entry: CosmeticEntry): CosmeticTilePreview {
  if (entry.kind === "emote" || entry.sheetType === "emote" || entry.slot === "misc") {
    return { mode: "icon", skin: entry.previewSkin ?? entry.id };
  }
  if (entry.slot === "gravestone" || entry.sheetType === "gravestone") {
    return { mode: "sprite", skin: entry.id };
  }
  return { mode: "character" };
}

type SpriteSheet = {
  type?: string;
  size?: string;
  skip?: boolean;
  matrix?: unknown[][];
};

/** Every equippable cosmetic id from `G.sprites`, keyed by slot. */
export function listCosmetics(
  G: Pick<CustomGData, "sprites" | "drops" | "skills">,
): CosmeticEntry[] {
  const sprites = G.sprites as Record<string, SpriteSheet | undefined>;
  const byId = new Map<string, CosmeticEntry>();

  for (const sheet of Object.values(sprites)) {
    if (!sheet?.matrix || sheet.skip) continue;
    const sheetType = sheet.type ?? "full";
    const slot = CX_TYPE_TO_SLOT[sheetType];
    if (!slot) continue;
    for (const row of sheet.matrix) {
      if (!Array.isArray(row)) continue;
      for (const cell of row) {
        if (typeof cell !== "string" || !cell) continue;
        if (byId.has(cell)) continue;
        byId.set(cell, {
          id: cell,
          slot,
          sheetType,
          size: typeof sheet.size === "string" ? sheet.size : undefined,
          kind: "sprite",
        });
      }
    }
  }

  // Emotes from cosmo5 / skills — icons live in G.positions, not sprite sheets.
  const drops = (G.drops ?? {}) as Record<string, unknown>;
  const { cosmo5 } = drops;
  const skills = G.skills as
    | Record<string, { emote?: boolean | string; name?: string; skin?: string } | undefined>
    | undefined;

  const pushEmote = (id: string) => {
    const skill = skills?.[id];
    const existing = byId.get(id);
    if (existing?.kind === "emote" || existing?.slot === "misc") {
      if (!existing.previewSkin && skill?.skin) existing.previewSkin = skill.skin;
      if (!existing.label && skill?.name) existing.label = skill.name;
      return;
    }
    if (existing) return; // already a real sprite (e.g. gravestone)
    byId.set(id, {
      id,
      slot: "misc",
      sheetType: "emote",
      kind: "emote",
      previewSkin: skill?.skin,
      label: skill?.name,
    });
  };

  if (Array.isArray(cosmo5)) {
    for (const row of cosmo5) {
      if (!Array.isArray(row) || row[1] !== "cx" || typeof row[2] !== "string") continue;
      const id = row[2];
      if (byId.has(id)) continue; // gravestones already listed from sheets
      pushEmote(id);
    }
  }
  if (skills) {
    for (const [id, skill] of Object.entries(skills)) {
      if (!skill?.emote) continue;
      pushEmote(id);
    }
  }

  const items = [...byId.values()];
  items.sort((a, b) => {
    const slotCmp = COSMETIC_SLOT_ORDER.indexOf(a.slot) - COSMETIC_SLOT_ORDER.indexOf(b.slot);
    if (slotCmp !== 0) return slotCmp;
    if (a.sheetType !== b.sheetType) return a.sheetType.localeCompare(b.sheetType);
    return a.id.localeCompare(b.id);
  });
  return items;
}

export function cosmeticsForSlot(items: CosmeticEntry[], slot: CosmeticSlot): CosmeticEntry[] {
  const out: CosmeticEntry[] = [];
  for (const item of items) {
    if (item.slot === slot) out.push(item);
  }
  return out;
}

export type AcquireFilter = "all" | "free" | "pack" | "unpublished";
export type CosmeticSort = "name" | "shells" | "odds";

export function filterCosmetics(
  items: CosmeticEntry[],
  opts: {
    slot?: CosmeticSlot;
    query?: string;
    sheetType?: string;
    acquire?: AcquireFilter;
    /** Same map as tile badges — from `buildAcquireBrowseMeta`. */
    availabilityById?: Map<string, "free" | "pack" | "unpublished">;
  },
): CosmeticEntry[] {
  const q = (opts.query ?? "").trim().toLowerCase();
  const out: CosmeticEntry[] = [];
  for (const item of items) {
    if (opts.slot && item.slot !== opts.slot) continue;
    if (opts.sheetType && item.sheetType !== opts.sheetType) continue;
    if (q && !item.id.toLowerCase().includes(q) && !item.sheetType.toLowerCase().includes(q)) {
      continue;
    }
    if (opts.acquire && opts.acquire !== "all") {
      const avail = opts.availabilityById?.get(item.id) ?? "unpublished";
      if (avail !== opts.acquire) continue;
    }
    out.push(item);
  }
  return out;
}

export function sortCosmetics(
  items: CosmeticEntry[],
  sort: CosmeticSort,
  meta: {
    shellsById?: Map<string, number>;
    chanceById?: Map<string, number>;
  } = {},
): CosmeticEntry[] {
  const rows = [...items];
  rows.sort((a, b) => {
    if (sort === "shells") {
      const as = meta.shellsById?.get(a.id);
      const bs = meta.shellsById?.get(b.id);
      if (as == null && bs == null) return a.id.localeCompare(b.id);
      if (as == null) return 1;
      if (bs == null) return -1;
      if (as !== bs) return as - bs;
      return a.id.localeCompare(b.id);
    }
    if (sort === "odds") {
      // rarer first (lower chance)
      const ac = meta.chanceById?.get(a.id);
      const bc = meta.chanceById?.get(b.id);
      if (ac == null && bc == null) return a.id.localeCompare(b.id);
      if (ac == null) return 1;
      if (bc == null) return -1;
      if (ac !== bc) return ac - bc;
      return a.id.localeCompare(b.id);
    }
    return a.id.localeCompare(b.id);
  });
  return rows;
}

export function defaultDressingLook(G: Pick<CustomGData, "classes">): ClassLook {
  const warrior = G.classes?.warrior;
  if (warrior) {
    const looks = classLooks(warrior);
    if (looks[0]) return { skin: looks[0].skin, cx: { ...looks[0].cx } };
  }
  return { skin: DEFAULT_PREVIEW_BODY, cx: { head: DEFAULT_PREVIEW_HEAD } };
}

/** Equip or toggle a cosmetic onto a look (body → `skin`, else → `cx`). */
export function equipCosmetic(
  look: ClassLook,
  entry: CosmeticEntry,
  G?: Pick<CustomGData, "cosmetics">,
): { look: ClassLook; notes: CompatibilityNote[] } {
  let next: ClassLook;
  if (entry.slot === "skin") {
    next = { skin: entry.id, cx: { ...look.cx } };
  } else if (entry.kind === "emote" || entry.slot === "misc") {
    // Emotes aren't worn on the paperdoll; keep look for stage preview.
    next = look;
  } else if (entry.slot === "gravestone") {
    const cx: CharacterCx = { ...look.cx };
    if (cx.gravestone === entry.id) delete cx.gravestone;
    else cx.gravestone = entry.id;
    next = { skin: look.skin, cx };
  } else {
    const cx: CharacterCx = { ...look.cx };
    if (cx[entry.slot] === entry.id) {
      delete cx[entry.slot];
    } else {
      cx[entry.slot] = entry.id;
    }
    if (entry.slot === "head" && !cx.head) {
      cx.head = DEFAULT_PREVIEW_HEAD;
    }
    next = { skin: look.skin, cx };
  }
  if (!G) return { look: next, notes: [] };
  return applyCosmeticCompatibility(G, next);
}

export function clearCosmeticSlot(look: ClassLook, slot: CosmeticSlot): ClassLook {
  if (slot === "skin") return look;
  const cx: CharacterCx = { ...look.cx };
  delete cx[slot];
  if (slot === "head") cx.head = DEFAULT_PREVIEW_HEAD;
  return { skin: look.skin, cx };
}

/** Strip optional cosmetics; keep body + a default head (WoW “undress” for transmog). */
export function undressLook(look: ClassLook): ClassLook {
  return { skin: look.skin, cx: { head: DEFAULT_PREVIEW_HEAD } };
}

/** Paperdoll columns flanking the stage (WoW character-pane style). */
export const PAPERDOLL_LEFT: CosmeticSlot[] = ["head", "hair", "hat", "face", "skin"];
export const PAPERDOLL_RIGHT: CosmeticSlot[] = [
  "back",
  "makeup",
  "chin",
  "tail",
  "gravestone",
  "misc",
];
/** Compact strip order (BetterWardrobe dressing-room item buttons). */
export const PAPERDOLL_STRIP: CosmeticSlot[] = [...PAPERDOLL_LEFT, ...PAPERDOLL_RIGHT];

/** Narcissus-style plain-text outfit list for sharing outside a URL. */
export function formatOutfitText(look: ClassLook): string {
  const lines = [`Body\t${look.skin}`];
  for (const slot of COSMETIC_SLOT_ORDER) {
    if (slot === "skin") continue;
    const id = look.cx[slot];
    if (!id) continue;
    lines.push(`${COSMETIC_SLOT_LABEL[slot]}\t${id}`);
  }
  return lines.join("\n");
}

/**
 * Compact look for a catalog tile — mirrors `html.js` `cx_sprite` bases
 * (body + head, then the cosmetic under test).
 */
export function cosmeticTileLook(entry: CosmeticEntry, base: ClassLook): ClassLook {
  const cx: CharacterCx = {
    head: base.cx.head ?? DEFAULT_PREVIEW_HEAD,
  };
  if (entry.slot === "skin") {
    return { skin: entry.id, cx };
  }
  if (entry.slot === "head") {
    return { skin: base.skin || DEFAULT_PREVIEW_BODY, cx: { head: entry.id } };
  }
  cx[entry.slot] = entry.id;
  return { skin: base.skin || DEFAULT_PREVIEW_BODY, cx };
}

export function equippedId(look: ClassLook, slot: CosmeticSlot): string | undefined {
  if (slot === "skin") return look.skin;
  return look.cx[slot];
}

/** Human label for sprite sheet types shown in filters / badges. */
export function sheetTypeLabel(sheetType: string): string {
  switch (sheetType) {
    case "a_hat":
    case "a_makeup":
      return "Animated";
    case "hat":
      return "Hats";
    case "makeup":
      return "Makeup";
    case "hair":
      return "Hair";
    case "head":
      return "Heads";
    case "face":
      return "Faces";
    case "beard":
    case "mask":
      return "Chin";
    case "s_wings":
    case "wings":
      return "Back";
    case "tail":
      return "Tails";
    case "armor":
    case "body":
    case "skin":
    case "character":
      return "Bodies";
    case "gravestone":
      return "Stones";
    case "emote":
      return "Emotes";
    case "bundle":
      return "Bundles";
    default:
      return sheetType;
  }
}

export function sheetTypesForSlot(items: CosmeticEntry[], slot: CosmeticSlot): string[] {
  const seen = new Set<string>();
  const types: string[] = [];
  for (const item of items) {
    if (item.slot !== slot) continue;
    if (seen.has(item.sheetType)) continue;
    seen.add(item.sheetType);
    types.push(item.sheetType);
  }
  // Animated variants first so the wardrobe highlights them.
  types.sort((a, b) => {
    const aAnim = isAnimatedCosmeticType(a) ? 0 : 1;
    const bAnim = isAnimatedCosmeticType(b) ? 0 : 1;
    if (aAnim !== bAnim) return aAnim - bAnim;
    return a.localeCompare(b);
  });
  return types;
}

/** Serialize a look for the dressing-room `look` URL param. */
export function encodeLook(look: ClassLook): string {
  const parts = [`skin=${look.skin}`];
  for (const slot of COSMETIC_SLOT_ORDER) {
    if (slot === "skin") continue;
    const id = look.cx[slot];
    if (id) parts.push(`${slot}=${id}`);
  }
  return parts.join(",");
}

/** Parse `look=skin=…,hair=…` from the URL (or return fallback). */
export function decodeLook(raw: string | null, fallback: ClassLook): ClassLook {
  if (!raw) return fallback;
  const cx: Record<string, string> = {};
  let { skin } = fallback;
  for (const part of raw.split(",")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    const value = part.slice(eq + 1);
    if (!key || !value) continue;
    if (key === "skin") skin = value;
    else cx[key] = value;
  }
  return { skin, cx };
}
