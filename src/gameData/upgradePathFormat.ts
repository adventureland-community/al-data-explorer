export function formatShrineTime(ms: number): string {
  if (!Number.isFinite(ms)) return "∞";
  if (ms < 0) return "—";
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : s.toFixed(0)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  if (m < 60) return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

export function formatChancePct(chance: number): string {
  if (!Number.isFinite(chance)) return "—";
  return `${(chance * 100).toFixed(2)}%`;
}

export function formatAttempts(chance: number): string {
  if (!chance || !Number.isFinite(chance)) return "—";
  const n = 1 / chance;
  if (n >= 100) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}
