/** Clamps a numeric field to its bounds and step without floating drift. */
export function clampStep(value: number, min: number, max: number, step = 1): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  const stepped = Math.round(value / step) * step;
  return Math.min(max, Math.max(min, stepped));
}

/** Applies one stepper click and keeps the result inside the field bounds. */
export function stepValue(value: number, delta: number, min: number, max: number): number {
  return clampStep(value + delta, min, max);
}
