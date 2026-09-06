import { CharacterCx, ClassLook } from "./characterLook";
import { CustomGData } from "../GDataContext";
import { asRecord } from "./gRecord";

function propFlags(G: { cosmetics?: unknown }, id: string | undefined): string[] {
  if (!id) return [];
  const cosmetics = asRecord(G.cosmetics);
  const prop = asRecord(cosmetics?.prop);
  const listed = prop?.[id];
  if (!Array.isArray(listed)) return [];
  const flags: string[] = [];
  for (const item of listed) {
    if (typeof item === "string") flags.push(item);
  }
  return flags;
}

export function hasCosmeticFlag(
  G: { cosmetics?: unknown },
  id: string | undefined,
  flag: string,
): boolean {
  return propFlags(G, id).includes(flag);
}

export type CompatibilityNote = {
  code: "no_hair" | "no_hat" | "no_upper" | "covers";
  message: string;
};

/**
 * Apply `G.cosmetics.prop` rules when a look changes — matches html.js / PIXI
 * (`no_hair` skips hair, `covers` draws head under body, etc.).
 */
export function applyCosmeticCompatibility(
  G: Pick<CustomGData, "cosmetics">,
  look: ClassLook,
): { look: ClassLook; notes: CompatibilityNote[] } {
  const notes: CompatibilityNote[] = [];
  const cx: CharacterCx = { ...look.cx };
  const skinFlags = propFlags(G, look.skin);

  if (skinFlags.includes("no_hair") && cx.hair) {
    delete cx.hair;
    notes.push({
      code: "no_hair",
      message: `${look.skin} hides hair (no_hair)`,
    });
  }
  if (skinFlags.includes("no_hat") && cx.hat) {
    delete cx.hat;
    notes.push({
      code: "no_hat",
      message: `${look.skin} blocks hats (no_hat)`,
    });
  }
  if (skinFlags.includes("no_upper") && cx.upper) {
    delete cx.upper;
    notes.push({
      code: "no_upper",
      message: `${look.skin} blocks upper layers (no_upper)`,
    });
  }
  if (skinFlags.includes("covers")) {
    notes.push({
      code: "covers",
      message: `${look.skin} draws the head underneath (covers)`,
    });
  }

  return { look: { skin: look.skin, cx }, notes };
}

export function cosmeticPropLabels(G: { cosmetics?: unknown }, id: string): string[] {
  return propFlags(G, id);
}
