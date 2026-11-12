/** TeX point per centimetre (1in = 72.27pt = 2.54cm). */
export const PT_PER_CM = 72.27 / 2.54

/** CSS pixel per TeX point at 100% zoom (CSS: 96px per inch). */
export const PX_PER_PT = 96 / 72.27

/** Font metrics of Computer Modern at 10pt (the LaTeX default). */
export const FONT_SIZE_PT = 10
export const EM_PT = 10
export const EX_PT = 4.30554

export const cmToPt = (cm: number) => cm * PT_PER_CM
export const ptToCm = (pt: number) => pt / PT_PER_CM

/** Round to 0.01 cm — the precision used in the exported TikZ code. */
export const roundCm = (v: number) => Math.round(v * 100) / 100

export function fmtNum(v: number, digits = 2): string {
  const r = Number(v.toFixed(digits))
  return Object.is(r, -0) ? '0' : String(r)
}
