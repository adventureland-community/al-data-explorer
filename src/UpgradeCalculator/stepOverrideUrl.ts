import LZString from "lz-string";

import type { OfferingChoice, UpgradeStepOverride } from "../calculators";

const STEP_OVERRIDES_PARAM = "ov";

function isOfferingChoice(v: unknown): v is OfferingChoice {
  return v === null || v === 1 || v === 2 || v === 3;
}

function sanitizeOverride(raw: unknown): UpgradeStepOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const out: UpgradeStepOverride = {};
  if (typeof rec.scrollGrade === "number" && Number.isFinite(rec.scrollGrade)) {
    out.scrollGrade = Math.max(0, Math.min(4, Math.floor(rec.scrollGrade)));
  }
  if ("offering" in rec && isOfferingChoice(rec.offering)) {
    out.offering = rec.offering;
  }
  if (typeof rec.primstacking === "number" && Number.isFinite(rec.primstacking)) {
    out.primstacking = Math.max(0, Math.floor(rec.primstacking));
  }
  if (typeof rec.statScrollGrace === "number" && Number.isFinite(rec.statScrollGrace)) {
    out.statScrollGrace = Math.max(0, Math.floor(rec.statScrollGrace));
  }
  if (typeof rec.failstack === "number" && Number.isFinite(rec.failstack)) {
    out.failstack = Math.max(0, Math.floor(rec.failstack));
  }
  if (typeof rec.ograce === "number" && Number.isFinite(rec.ograce)) {
    out.ograce = Math.max(0, Math.floor(rec.ograce));
  }
  return Object.keys(out).length ? out : null;
}

/** Compact share encoding for per-step recipe edits (`?ov=`). */
export function encodeStepOverrides(overrides: Record<string, UpgradeStepOverride>): string | null {
  const keys = Object.keys(overrides).sort();
  if (!keys.length) return null;
  const clean: Record<string, UpgradeStepOverride> = {};
  for (const key of keys) {
    if (!/^\d+-\d+$/.test(key)) continue;
    const row = sanitizeOverride(overrides[key]);
    if (row) clean[key] = row;
  }
  if (!Object.keys(clean).length) return null;
  return LZString.compressToEncodedURIComponent(JSON.stringify(clean));
}

export function decodeStepOverrides(
  encoded: string | null | undefined,
): Record<string, UpgradeStepOverride> {
  if (!encoded) return {};
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, UpgradeStepOverride> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^\d+-\d+$/.test(key)) continue;
      const row = sanitizeOverride(value);
      if (row) out[key] = row;
    }
    return out;
  } catch {
    return {};
  }
}

export function parseStepOverrides(
  searchParams: URLSearchParams,
): Record<string, UpgradeStepOverride> {
  return decodeStepOverrides(searchParams.get(STEP_OVERRIDES_PARAM));
}

export function appendStepOverrides(
  sp: URLSearchParams,
  overrides: Record<string, UpgradeStepOverride>,
): void {
  const encoded = encodeStepOverrides(overrides);
  if (encoded) sp.set(STEP_OVERRIDES_PARAM, encoded);
}

export { STEP_OVERRIDES_PARAM };
