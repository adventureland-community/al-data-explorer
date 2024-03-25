// https://stackoverflow.com/a/40724354/28145
export const SI_SYMBOL = ["", "k", "M", "G", "T", "P", "E"];

export function abbreviateNumber(number?: number) {
  if (!number) {
    return number;
  }

  // what tier? (determines SI symbol)
  const tier = (Math.log10(Math.abs(number)) / 3) | 0;

  // if zero, we don't need a suffix
  if (tier === 0) return number;

  // get suffix and determine scale
  const suffix = SI_SYMBOL[tier];
  const scale = 10 ** (tier * 3);

  // scale the number
  const scaled = number / scale;

  // format number and add suffix
  //   return scaled.toFixed(1) + suffix;
  return (
    scaled.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + suffix
  );
}

// https://stackoverflow.com/a/32180863/28145
/**
 * Renders ms as a string "1 day, 1 hour, 1 minute, 1 second"
 * @param ms
 * @returns
 */
export function msToTime(ms: number) {
  const seconds = ms / 1000;
  const minutes = ms / (1000 * 60);
  const hours = ms / (1000 * 60 * 60);
  const days = ms / (1000 * 60 * 60 * 24);
  // TODO: could render the "rest" as welll e.g. "1 day, 1 hour, 1 minute, 1 second"
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (minutes < 60) return `${minutes.toFixed(1)} m`;
  if (hours < 24) return `${hours.toFixed(1)} H`;
  return `${days.toFixed(1)} D`;
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
