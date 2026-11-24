/**
 * Display-level tag cleanup, mirroring Rust's normalize_tag so rows can show
 * the saved value without another round trip. Length is capped at input time
 * (TAG_MAX_CHARS, enforced by TagEditor); storage keeps the full value.
 */
export const TAG_MAX_CHARS = 40;

export function cleanTag(value: string): string | null {
  const collapsed = value.trim().split(/\s+/).filter(Boolean).join(' ');
  return collapsed.length > 0 ? collapsed : null;
}
