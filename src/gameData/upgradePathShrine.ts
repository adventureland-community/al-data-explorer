/**
 * Mass Production++ is assumed on for every click, so shrine wait is /10
 * (pastebin `shrineClickMs`, CALC_VERSION 8).
 */
export function shrineClickMs(
  mode: "upgrade" | "compound",
  levelTo: number,
  igrade: number,
): number {
  if (mode === "compound") return 1000;
  const tmult = igrade >= 2 ? 2 : igrade === 1 ? 1.5 : 1;
  return (500 * levelTo * Math.sqrt(levelTo) * tmult) / 10;
}

/**
 * Expected shrine time to hold one item at each plan step (index 0 = start).
 * Destroy restarts from the previous level; scroll4 does not.
 */
export function expectedPlanShrineMs(
  steps: { toLevel: number; chance: number; scrollGrade: number }[],
  mode: "upgrade" | "compound",
  igrade: number,
): number[] {
  const times = [0];
  for (let n = 0; n < steps.length; n++) {
    const step = steps[n];
    const click = shrineClickMs(mode, step.toLevel, igrade);
    const p = step.chance;
    const prev = times[n];
    if (!(p > 0) || !Number.isFinite(p) || !Number.isFinite(click) || !Number.isFinite(prev)) {
      times.push(Infinity);
      continue;
    }
    const clicks = 1 / p;
    times.push(step.scrollGrade === 4 ? prev + click * clicks : (prev + click) * clicks);
  }
  return times;
}
