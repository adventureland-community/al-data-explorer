import { BankDataProps } from "./getBankData";

const STORAGE_PREFIX = "al-bank-snapshot:";

export type StoredBankSnapshot = {
  savedAt: number;
  bankData: BankDataProps;
};

function storageKey(ownerId: string) {
  return `${STORAGE_PREFIX}${ownerId}`;
}

export function loadBankSnapshot(ownerId: string): StoredBankSnapshot | null {
  if (!ownerId) return null;
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredBankSnapshot;
  } catch {
    return null;
  }
}

export function saveBankSnapshot(ownerId: string, bankData: BankDataProps) {
  if (!ownerId || !Object.keys(bankData).length) return;
  const payload: StoredBankSnapshot = { savedAt: Date.now(), bankData };
  localStorage.setItem(storageKey(ownerId), JSON.stringify(payload));
}

export function downloadBankSnapshot(ownerId: string, bankData: BankDataProps) {
  const blob = new Blob([JSON.stringify(bankData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `bank-${ownerId}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
