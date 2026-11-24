/**
 * Display-level tag cleanup. Rust still normalizes on write; this mirrors the
 * same rules so the row can show the saved value without another round trip.
 */
export function cleanTag(value: string): string | null {
  const collapsed = value.trim().split(/\s+/).filter(Boolean).join(' ');
  const truncated = Array.from(collapsed).slice(0, 40).join('').trimEnd();
  return truncated.length > 0 ? truncated : null;
}
