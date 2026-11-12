/**
 * Geometry engine that reproduces what TikZ (pgf 3.1, automata + topaths +
 * arrows.meta libraries) computes for the code produced by `export.ts`.
 *
 * All numbers are TeX points in TikZ orientation (y axis up). The
 * implementation follows the pgf sources closely; references are given as
 * `file: macro`.
 */
import {
  ArrowTip, Diagram, Direction, LINE_WIDTH_PT, StateNode, Transition, isLoop,
} from '../model/types'
import { EM_PT, EX_PT, cmToPt } from '../model/units'
import type { TexBox } from '../tex/measure'

export interface Vec { x: number; y: number }

const v = (x: number, y: number): Vec => ({ x, y })
const add = (a: Vec, b: Vec) => v(a.x + b.x, a.y + b.y)
const sub = (a: Vec, b: Vec) => v(a.x - b.x, a.y - b.y)
const mul = (a: Vec, k: number) => v(a.x * k, a.y * k)
const len = (a: Vec) => Math.hypot(a.x, a.y)
const norm = (a: Vec) => { const l = len(a); return l === 0 ? v(1, 0) : mul(a, 1 / l) }
const polar = (deg: number, r = 1) => v(r * Math.cos(deg * Math.PI / 180), r * Math.sin(deg * Math.PI / 180))
const angleOf = (a: Vec) => Math.atan2(a.y, a.x) * 180 / Math.PI
/** Rotate `p` by the direction of unit vector `u`. */
const rotBy = (p: Vec, u: Vec) => v(u.x * p.x - u.y * p.y, u.y * p.x + u.x * p.y)

export interface Bezier { p0: Vec; c1: Vec; c2: Vec; p3: Vec }

export function bezierAt(b: Bezier, t: number): Vec {
  const s = 1 - t
  return v(
    s * s * s * b.p0.x + 3 * s * s * t * b.c1.x + 3 * s * t * t * b.c2.x + t * t * t * b.p3.x,
    s * s * s * b.p0.y + 3 * s * s * t * b.c1.y + 3 * s * t * t * b.c2.y + t * t * t * b.p3.y,
  )
}

export function bezierTangent(b: Bezier, t: number): Vec {
  const s = 1 - t
  return v(
    3 * s * s * (b.c1.x - b.p0.x) + 6 * s * t * (b.c2.x - b.c1.x) + 3 * t * t * (b.p3.x - b.c2.x),
    3 * s * s * (b.c1.y - b.p0.y) + 6 * s * t * (b.c2.y - b.c1.y) + 3 * t * t * (b.p3.y - b.c2.y),
  )
}

/* ------------------------------------------------------------------------ */
/* Text boxes                                                               */
/* ------------------------------------------------------------------------ */

/** `inner sep` default: .3333em */
const INNER_SEP = 0.3333 * EM_PT

export type Anchor =
  | 'center' | 'north' | 'south' | 'east' | 'west'
  | 'north east' | 'north west' | 'south east' | 'south west'

/** A placed TeX box: `x` = left edge, `y` = baseline (TikZ coordinates). */
export interface PlacedText { box: TexBox; x: number; y: number }

/**
 * Place a rectangle node (inner sep .3333em, outer sep 0 since it is not
 * drawn) so that `anchor` lies on `p`.
 */
function placeRectNode(box: TexBox, p: Vec, anchor: Anchor): PlacedText {
  const hw = box.width / 2 + INNER_SEP
  const hh = (box.height + box.depth) / 2 + INNER_SEP
  let dx = 0
  let dy = 0
  if (anchor.includes('east')) dx = hw
  if (anchor.includes('west')) dx = -hw
  if (anchor.includes('north')) dy = hh
  if (anchor.includes('south')) dy = -hh
  const c = v(p.x - dx, p.y - dy)
  return textAtCenter(box, c)
}

/** Text whose box centre is at `c` (node text is centred on the node centre). */
function textAtCenter(box: TexBox, c: Vec): PlacedText {
  return { box, x: c.x - box.width / 2, y: c.y - (box.height - box.depth) / 2 }
}

/* ------------------------------------------------------------------------ */
/* Arrow tips (pgfcorearrows / pgflibraryarrows.meta)                        */
/* ------------------------------------------------------------------------ */

export interface ArrowShape {
  /** SVG path in arrow-local coordinates: tip end at origin, pointing to +x, TikZ y-up. */
  path: Vec[][] | null
  /** Raw path commands for curved tips (local coords, y-up). */
  curve?: { d: (flipY: (y: number) => number) => string }
  fill: boolean
  strokeWidth: number
  round: boolean
  /** Distance from the tip end to the line end (how far the line is pulled back). */
  shortening: number
}

export function arrowShape(tip: ArrowTip, lw: number): ArrowShape {
  if (tip === 'Stealth') {
    // arrows.meta: Stealth, length = 3pt 4.5, width' = .75, inset' = .325
    const L = 3 + 4.5 * lw
    const W = 0.75 * L
    const inset = 0.325 * L
    const alw = Math.min(lw, 0.25 * (L - inset))
    const yc = 0.5 * Math.sqrt(4 * (inset / W) ** 2 + 1) * alw // inset miter
    const lineEnd = inset + yc - 0.25 * alw
    // visual hull: tip (L,0), back (0,±W/2), inset (inset,0) — shift tip to origin
    return {
      path: [[v(0, 0), v(-L, W / 2), v(-L + inset, 0), v(-L, -W / 2)]],
      fill: true,
      strokeWidth: 0,
      round: false,
      shortening: L - lineEnd,
    }
  }
  if (tip === 'Latex') {
    // arrows.meta: Latex, length = 3pt 4.5, width' = .75
    const L = 3 + 4.5 * lw
    const W = 0.75 * L
    const alw = Math.min(lw, 0.2 * L)
    const q = L / W
    const xc = Math.sqrt(9 * q * q + 1) * alw
    const a = L - 0.5 * xc - 0.5 * alw
    const n = norm(v(0.3 * L, 0.2333333 * W))
    const b = 0.5 * W - 0.5 * ((n.y + 1) / n.x) * alw
    const tipEnd = L - 0.5 * alw
    const X = (x: number) => x - tipEnd
    const pts = (x: number, y: number, f: (y: number) => number) => `${X(x)} ${f(y)}`
    return {
      path: null,
      curve: {
        d: (f) =>
          `M${pts(a, 0, f)} C${pts(0.877192 * a, 0.077922 * b, f)} ${pts(0.337381 * a, 0.51948 * b, f)} ${pts(0, b, f)}` +
          ` L${pts(0, -b, f)} C${pts(0.337381 * a, -0.51948 * b, f)} ${pts(0.877192 * a, -0.077922 * b, f)} ${pts(a, 0, f)} Z`,
      },
      fill: true,
      strokeWidth: alw,
      round: false,
      shortening: tipEnd,
    }
  }
  // Old-style `to` (TikZ default for `->`), pgfcorearrows.code.tex
  const a = 0.28 + 0.3 * lw
  const right = 0.21 + 0.625 * lw
  const X = (x: number) => x - right
  const pts = (x: number, y: number, f: (y: number) => number) => `${X(x)} ${f(y)}`
  return {
    path: null,
    curve: {
      d: (f) =>
        `M${pts(-3 * a, 4 * a, f)} C${pts(-2.75 * a, 2.5 * a, f)} ${pts(0, 0.25 * a, f)} ${pts(0.75 * a, 0, f)}` +
        ` C${pts(0, -0.25 * a, f)} ${pts(-2.75 * a, -2.5 * a, f)} ${pts(-3 * a, -4 * a, f)}`,
    },
    fill: false,
    strokeWidth: 0.8 * lw,
    round: true,
    shortening: right,
  }
}

/** `shorten >=1pt` (set on the picture and by `every loop`). */
export const SHORTEN_END = 1

/* ------------------------------------------------------------------------ */
/* States                                                                   */
/* ------------------------------------------------------------------------ */

export interface NodeGeom {
  node: StateNode
  center: Vec
  /** Radius of the drawn circle path. */
  r: number
  /** Distance from the centre at which edges attach (radius + outer sep). */
  anchorR: number
  lw: number
  text: PlacedText
  initial?: { from: Vec; to: Vec; text: PlacedText | null }
}

const DIR_ANGLE: Record<Direction, number> = { right: 0, above: 90, left: 180, below: 270 }
const DIR_ANCHOR: Record<Direction, Anchor> = { above: 'south', below: 'north', left: 'east', right: 'west' }

export type Measure = (tex: string, mode: 'math' | 'text') => TexBox

export function nodeGeometry(node: StateNode, d: Diagram, measure: Measure): NodeGeom {
  const lw = LINE_WIDTH_PT[d.settings.lineWidth]
  const box = measure(node.label, 'math')
  const center = v(cmToPt(node.x), cmToPt(node.y))
  // pgfmoduleshapes: circle — radius of the inner-sep-enlarged text box, but
  // at least half of `minimum size=2.5em`.
  const xa = box.width / 2 + INNER_SEP
  const ya = (box.height + box.depth) / 2 + INNER_SEP
  const r = Math.max(Math.hypot(xa, ya), 2.5 * EM_PT / 2)
  // outer sep: auto (= .5\pgflinewidth); `accepting by double` sets .5\pgflinewidth+.3pt
  const outerSep = node.accepting ? 0.5 * lw + 0.3 : 0.5 * lw
  const g: NodeGeom = { node, center, r, anchorR: r + outerSep, lw, text: textAtCenter(box, center) }

  if (node.initial) {
    // tikzlibraryautomata: initial by arrow
    const ang = DIR_ANGLE[node.initialWhere]
    const base = add(center, polar(ang, g.anchorR))
    const p = add(base, polar(ang, 3 * EX_PT)) // initial distance = 3ex
    const tbox = measure(d.settings.initialText, 'text')
    g.initial = {
      from: p,
      to: base,
      text: tbox.width > 0 || tbox.height > 0 ? placeRectNode(tbox, p, DIR_ANCHOR[node.initialWhere]) : null,
    }
  }
  return g
}

const borderAt = (g: NodeGeom, deg: number) => add(g.center, polar(deg, g.anchorR))

/* ------------------------------------------------------------------------ */
/* Transitions                                                              */
/* ------------------------------------------------------------------------ */

export interface EdgeGeom {
  edge: Transition
  /** Full (unshortened) path as computed by TikZ. */
  line?: { p0: Vec; p1: Vec }
  curve?: Bezier
  /** Visible stroke after `shorten >` and arrow line-end. */
  stroke: { kind: 'line'; p0: Vec; p1: Vec } | { kind: 'curve'; b: Bezier }
  /** Tip end position and direction of the arrow. */
  arrow: { at: Vec; dir: Vec }
  /** Label placement (if any). */
  text: PlacedText | null
  /** Point at `pos` on the path (used for the drag handle). */
  mid: Vec
}

const LOOP: Record<Direction, { out: number; in: number; anchor: Anchor }> = {
  above: { out: 105, in: 75, anchor: 'south' },
  below: { out: 285, in: 255, anchor: 'north' },
  left: { out: 195, in: 165, anchor: 'east' },
  right: { out: 15, in: -15, anchor: 'west' },
}

/** tikz.code.tex: \tikz@auto@anchor / \tikz@auto@anchor@prime */
export function autoAnchor(tangent: Vec, swap: boolean): Anchor {
  const { x, y } = norm(tangent)
  const t = 0.05
  if (!swap) {
    if (x > t) return y > t ? 'south east' : y < -t ? 'south west' : 'south'
    if (x < -t) return y > t ? 'north east' : y < -t ? 'north west' : 'north'
    return y > 0 ? 'east' : 'west'
  }
  if (x > t) return y > t ? 'north west' : y < -t ? 'north east' : 'north'
  if (x < -t) return y > t ? 'south west' : y < -t ? 'south east' : 'south'
  return y > 0 ? 'west' : 'east'
}

/** 0.3915 × distance — tikzlibrarytopaths: \tikz@to@compute@distance@main */
const CTRL_FACTOR = 0.3915

/** `bend left=θ` (θ>0) / `bend right=-θ` (θ<0): relative out/in (\tikz@to@compute@relative). */
function bendCurve(a: NodeGeom, b: NodeGeom, bend: number): Bezier {
  const out = bend
  const inn = 180 - bend
  const phi = angleOf(sub(b.center, a.center))
  // start/target are moved to the border in the rotated directions
  const s = borderAt(a, phi + out)
  const t = borderAt(b, phi + 180 - out)
  const dist = CTRL_FACTOR * len(sub(t, s))
  // control points are given in a frame where s→t is the x axis
  const u = norm(sub(t, s))
  return {
    p0: s,
    c1: add(s, rotBy(polar(out, dist), u)),
    c2: add(t, rotBy(polar(inn, dist), u)),
    p3: t,
  }
}

export function edgeGeometry(
  e: Transition, a: NodeGeom, b: NodeGeom, d: Diagram, measure: Measure,
): EdgeGeom {
  const lw = LINE_WIDTH_PT[d.settings.lineWidth]
  const arrow = arrowShape(d.settings.arrowTip, lw)
  const box = e.label.trim() ? measure(e.label, 'math') : null
  const pos = e.pos

  let curve: Bezier | undefined
  let line: { p0: Vec; p1: Vec } | undefined
  let labelAnchor: Anchor
  let at: Vec
  let tangent: Vec

  if (isLoop(e)) {
    // loop: out/in absolute, looseness=8, min distance=5mm, distance measured
    // between the border anchors (\tikz@to@modify)
    const L = LOOP[e.loop]
    const s = borderAt(a, L.out)
    const t = borderAt(a, L.in)
    const dist = Math.max(CTRL_FACTOR * 8 * len(sub(t, s)), cmToPt(0.5))
    curve = { p0: s, c1: add(s, polar(L.out, dist)), c2: add(t, polar(L.in, dist)), p3: t }
    labelAnchor = L.anchor // `loop above` contains `above`, which switches auto off
    at = bezierAt(curve, pos)
    tangent = bezierTangent(curve, pos)
  } else if (e.bend !== 0) {
    curve = bendCurve(a, b, e.bend)
    at = bezierAt(curve, pos)
    tangent = bezierTangent(curve, pos)
    labelAnchor = autoAnchor(tangent, e.swap)
  } else {
    const phi = angleOf(sub(b.center, a.center))
    const s = borderAt(a, phi)
    const t = borderAt(b, phi + 180)
    line = { p0: s, p1: t }
    at = add(s, mul(sub(t, s), pos))
    tangent = sub(t, s)
    labelAnchor = autoAnchor(tangent, e.swap)
  }

  // End handling (pgfcorepathusage: quick mode): move the end point towards
  // the previous support point.
  const end = curve ? curve.p3 : line!.p1
  const ref = curve ? curve.c2 : line!.p0
  const dir = norm(sub(end, ref))
  const tipAt = sub(end, mul(dir, SHORTEN_END))
  const lineEnd = sub(end, mul(dir, SHORTEN_END + arrow.shortening))

  const stroke: EdgeGeom['stroke'] = curve
    ? { kind: 'curve', b: { ...curve, p3: lineEnd } }
    : { kind: 'line', p0: line!.p0, p1: lineEnd }

  return {
    edge: e,
    line,
    curve,
    stroke,
    arrow: { at: tipAt, dir },
    text: box ? placeRectNode(box, at, labelAnchor) : null,
    mid: at,
  }
}

/** Initial-arrow stroke, shortened like any other `->` path. */
export function initialArrowGeometry(g: NodeGeom, tip: ArrowTip) {
  const init = g.initial!
  const arrow = arrowShape(tip, g.lw)
  const dir = norm(sub(init.to, init.from))
  const tipAt = sub(init.to, mul(dir, SHORTEN_END))
  const lineEnd = sub(init.to, mul(dir, SHORTEN_END + arrow.shortening))
  return { p0: init.from, p1: lineEnd, arrow: { at: tipAt, dir } }
}

/* ------------------------------------------------------------------------ */
/* Helpers used by the editor                                               */
/* ------------------------------------------------------------------------ */

/**
 * Bend angle (multiple of `step` degrees) whose curve midpoint passes closest
 * to `p`. Uses the exact TikZ curve, so the edge follows the mouse.
 */
export function bendFromPoint(a: NodeGeom, b: NodeGeom, p: Vec, step = 1): number {
  if (len(sub(b.center, a.center)) < 1e-6) return 0
  let best = 0
  let bestErr = Infinity
  for (let deg = -150; deg <= 150; deg += step) {
    const m = deg === 0
      ? mul(add(a.center, b.center), 0.5)
      : bezierAt(bendCurve(a, b, deg), 0.5)
    const err = len(sub(m, p))
    if (err < bestErr) { bestErr = err; best = deg }
  }
  return best
}

export function loopFromPoint(a: NodeGeom, p: Vec): Direction {
  const ang = angleOf(sub(p, a.center))
  const n = ((ang % 360) + 360) % 360
  if (n >= 45 && n < 135) return 'above'
  if (n >= 135 && n < 225) return 'left'
  if (n >= 225 && n < 315) return 'below'
  return 'right'
}

export { add, sub, mul, len, norm, polar, angleOf }
