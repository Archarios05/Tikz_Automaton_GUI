/**
 * Minimal xcolor support: base colours plus the `a!p!b` / `a!p` mixing syntax,
 * so the canvas shows exactly the colour LaTeX will produce.
 */

type RGB = [number, number, number]

// xcolor base colours (always available without options)
const BASE: Record<string, RGB> = {
  black: [0, 0, 0],
  white: [1, 1, 1],
  red: [1, 0, 0],
  green: [0, 1, 0],
  blue: [0, 0, 1],
  cyan: [0, 1, 1],
  magenta: [1, 0, 1],
  yellow: [1, 1, 0],
  gray: [0.5, 0.5, 0.5],
  darkgray: [0.25, 0.25, 0.25],
  lightgray: [0.75, 0.75, 0.75],
  brown: [0.75, 0.5, 0.25],
  lime: [0.75, 1, 0],
  olive: [0.5, 0.5, 0],
  orange: [1, 0.5, 0],
  pink: [1, 0.75, 0.75],
  purple: [0.75, 0, 0.25],
  teal: [0, 0.5, 0.5],
  violet: [0.5, 0, 0.5],
}

/** Colours offered in the UI. */
export const PALETTE = [
  'black', 'darkgray', 'gray', 'red', 'orange', 'brown', 'olive',
  'green!50!black', 'teal', 'cyan', 'blue', 'violet', 'purple', 'magenta',
]

export function parseXColor(expr: string): RGB | null {
  const parts = expr.replace(/\s+/g, '').split('!')
  if (parts.length === 0 || !parts[0]) return null
  let cur = BASE[parts[0]]
  if (!cur) return null
  let i = 1
  while (i < parts.length) {
    const p = Number(parts[i])
    if (!Number.isFinite(p) || p < 0 || p > 100) return null
    const otherName = parts[i + 1]
    const other = otherName === undefined ? BASE.white : BASE[otherName]
    if (!other) return null
    const t = p / 100
    cur = [0, 1, 2].map((k) => cur[k] * t + other[k] * (1 - t)) as RGB
    i += 2
  }
  return cur
}

export function isValidXColor(expr: string): boolean {
  return parseXColor(expr) !== null
}

export function xcolorToCss(expr: string, fallback = '#000'): string {
  const c = parseXColor(expr)
  if (!c) return fallback
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`
}
