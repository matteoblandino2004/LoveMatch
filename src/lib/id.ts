/** Short, sortable-enough ids. Good enough for a device-local app. */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}${Date.now().toString(36)}${rand}`
}

/** Deterministic 32-bit hash — used to make the simulated world reproducible. */
export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A stable 0..1 value for a pair of ids. */
export function pairRandom(a: string, b: string, salt = ''): number {
  return hash(`${a}|${b}|${salt}`) / 4294967295
}
