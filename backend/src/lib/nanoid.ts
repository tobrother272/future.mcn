/** Simple collision-resistant ID generator (no external dep) */
export function nanoid(prefix = ""): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return prefix ? `${prefix}_${ts}${rand}` : `${ts}${rand}`;
}
