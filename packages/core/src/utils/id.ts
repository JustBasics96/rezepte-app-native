export function makeId(prefix = 'id'): string {
  // Small, deterministic-ish ids are fine here (not crypto-grade), used for offline list items.
  // Avoids `crypto.randomUUID` which isn't available everywhere (especially older RN/web runtimes).
  const rand = Math.random().toString(36).slice(2, 10)
  const ts = Date.now().toString(36)
  return `${prefix}_${ts}_${rand}`
}
