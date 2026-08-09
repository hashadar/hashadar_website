/** Shared nice tick generation for WMW SVG charts. */

export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) || 1;
    return [min - pad, min, min + pad];
  }
  const span = max - min;
  const step = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(Math.abs(step) || 1));
  const niceStep = Math.ceil(step / magnitude) * magnitude;
  const niceMin = Math.floor(min / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let value = niceMin; value <= max + niceStep * 0.01; value += niceStep) {
    ticks.push(value);
  }
  if (!ticks.includes(0) && min < 0 && max > 0) {
    ticks.push(0);
    ticks.sort((a, b) => a - b);
  }
  return ticks.length ? ticks : [min, max];
}
