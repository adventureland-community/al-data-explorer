/**
 * Merchant-stand sales tax helpers.
 *
 * Buyer pays the listed price; seller receives `list * (1 - character.tax)`.
 * `character.tax` is the Stats "tax" fraction (e.g. 0.025 = 2.5%).
 */

/** Common mid-level combat-class tax from Stats (see notes.md). Merchants are often lower. */
export const DEFAULT_MERCHANT_TAX = 0.025;

/**
 * Minimum list price so net after tax covers `cost` (gold is integer → ceil).
 * Returns null when inputs are unusable (tax ≥ 100%, non-finite, etc.).
 */
export function breakEvenListPrice(
  cost: number,
  taxRate: number = DEFAULT_MERCHANT_TAX,
): number | null {
  if (!Number.isFinite(cost) || cost < 0) return null;
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate >= 1) return null;
  if (cost === 0) return 0;
  return Math.ceil(cost / (1 - taxRate));
}

/** Gold the seller keeps after tax when a buyer pays `listPrice`. */
export function netAfterTax(
  listPrice: number,
  taxRate: number = DEFAULT_MERCHANT_TAX,
): number | null {
  if (!Number.isFinite(listPrice) || listPrice < 0) return null;
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate >= 1) return null;
  return listPrice * (1 - taxRate);
}
