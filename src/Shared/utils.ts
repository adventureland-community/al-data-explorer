// https://stackoverflow.com/a/40724354/28145
const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"] as const;
/** Finance-style suffixes for gold (avoids SI "G"/giga reading as gold). */
const CURRENCY_SYMBOL = ["", "K", "M", "B", "T"] as const;

export type AbbreviateOptions = {
  /** Shown for null, undefined, or non-finite values. Default: "". */
  empty?: string;
  /** When true, non-positive numbers also use `empty` (missing bid/ask / no cost). */
  positiveOnly?: boolean;
  /** Prefix "+" / "−" for positive / negative. */
  signed?: boolean;
  /** Appended after the abbreviated value (e.g. "g"). */
  unit?: string;
};

function formatAbbreviated(number: number, symbols: readonly string[]): string {
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  if (tier === 0) return String(number);

  const cappedTier = Math.min(tier, symbols.length - 1);
  const suffix = symbols[cappedTier] ?? "";
  const scale = 10 ** (cappedTier * 3);
  const scaled = number / scale;

  // Drop trailing .0 (e.g. 9999 → "10k", 1500 → "1.5k")
  const rounded = Math.round(scaled * 10) / 10;
  const formatted = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString(undefined, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });

  return formatted + suffix;
}

function abbreviate(
  number: number | null | undefined,
  symbols: readonly string[],
  opts?: AbbreviateOptions,
): string {
  if (number == null || !Number.isFinite(number) || (opts?.positiveOnly && !(number > 0))) {
    return opts?.empty ?? "";
  }

  const core = formatAbbreviated(Math.abs(number), symbols);
  let body = core;
  if (opts?.signed) {
    if (number > 0) body = `+${core}`;
    else if (number < 0) body = `−${core}`;
  } else if (number < 0) {
    body = `-${core}`;
  }

  if (opts?.unit) body += opts.unit;
  return body;
}

/** Compact counts / metrics with SI-style suffixes (k/M/G/…). */
export function abbreviateNumber(number?: number | null, opts?: AbbreviateOptions): string {
  return abbreviate(number, SI_SYMBOL, opts);
}

/** Compact gold amounts with K/M/B/T (not SI G for billions). */
export function abbreviateGold(number?: number | null, opts?: AbbreviateOptions): string {
  return abbreviate(number, CURRENCY_SYMBOL, opts);
}

// https://stackoverflow.com/a/32180863/28145
/**
 * Renders ms as a string "1 day, 1 hour, 1 minute, 1 second"
 * @param ms
 * @returns
 */
/** Compact duration from milliseconds (e.g. 6775s → "1h 53m"). */
export function msToTime(ms: number) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalSec = ms / 1000;
  if (totalSec < 60) {
    return `${totalSec < 10 ? totalSec.toFixed(1) : Math.round(totalSec)}s`;
  }

  const rounded = Math.round(totalSec);
  const days = Math.floor(rounded / 86400);
  const hours = Math.floor((rounded % 86400) / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}
/**
 *
 * @param duration Renders duration as a string HH:MM:SS:MS
 * @returns
 */
export function msToTime2(duration: number) {
  const milliseconds = Math.floor((duration % 1000) / 100);
  const seconds = Math.floor((duration / 1000) % 60);
  const minutes = Math.floor((duration / (1000 * 60)) % 60);
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  const hoursString = hours < 10 ? `0${hours.toString()}` : hours.toString();
  const minutesString = minutes < 10 ? `0${minutes.toString()}` : minutes.toString();
  const secondsString = seconds < 10 ? `0${seconds.toString()}` : seconds.toString();

  return `${hoursString}:${minutesString}:${secondsString}.${milliseconds.toString()}`;
}
