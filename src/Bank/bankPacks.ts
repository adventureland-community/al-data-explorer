import { BankDataProps } from "./getBankData";

/** Slots per official bank pack (`items0`, `items1`, …) in Adventure Land. */
export const SLOTS_PER_BANK_PACK = 42;

const OFFICIAL_BANK_PACK = /^items\d+$/;

/** True for real bank packs synced from `character.bank` (not user-added inventory tabs). */
export function isOfficialBankPack(packKey: string): boolean {
  return OFFICIAL_BANK_PACK.test(packKey);
}

export function isCustomBankPack(packKey: string): boolean {
  return !isOfficialBankPack(packKey);
}

export function isBankItemPack(bankData: BankDataProps, key: string): boolean {
  return Array.isArray(bankData[key]);
}

/** Official bank packs first (`itemsN`), then custom tabs alphabetically. */
export function compareBankPackKeys(a: string, b: string): number {
  const aOfficial = isOfficialBankPack(a);
  const bOfficial = isOfficialBankPack(b);
  if (aOfficial && !bOfficial) return -1;
  if (!aOfficial && bOfficial) return 1;

  const itemsA = /^items(\d+)$/.exec(a);
  const itemsB = /^items(\d+)$/.exec(b);
  if (itemsA && itemsB) return Number(itemsA[1]) - Number(itemsB[1]);
  return a.localeCompare(b);
}

export function getBankItemPackKeys(bankData: BankDataProps): string[] {
  return Object.keys(bankData)
    .filter((key) => isBankItemPack(bankData, key))
    .sort(compareBankPackKeys);
}

export function countOfficialBankPacks(bankData: BankDataProps): number {
  return getBankItemPackKeys(bankData).filter(isOfficialBankPack).length;
}
