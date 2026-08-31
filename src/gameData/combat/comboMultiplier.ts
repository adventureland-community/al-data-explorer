/** Server combo_m lookup when combo > 1 (complete_attack). */
const COMBO_TABLE = [1, 1.6, 1.62, 1.64, 1.7, 1.72, 1.75, 1.8, 1.9, 2, 2, 2, 2];

/**
 * Mobbing combo damage multiplier.
 * @param comboStack Server combo counter (1 = no bonus, 2+ = ramping mult).
 * @param attack Raw attack before combo (for cap: min(combo_m, max(300/attack, 1.2))).
 */
export function comboDamageMultiplier(comboStack: number, attack: number): number {
  if (comboStack <= 1) return 1;

  let comboM = comboStack > 10 ? comboStack / 4 : COMBO_TABLE[comboStack] ?? 2;
  const cap = Math.max(300 / Math.max(attack, 1), 1.2);
  comboM = Math.min(comboM, cap);
  return comboM;
}
