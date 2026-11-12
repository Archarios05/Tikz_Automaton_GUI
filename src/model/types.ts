/**
 * Document model.
 *
 * Everything is stored in TikZ terms so that what is exported is exactly
 * what is drawn:  positions are TikZ coordinates in cm (y axis pointing up),
 * labels are TeX math-mode source, colours are xcolor expressions.
 */

export type Direction = 'above' | 'below' | 'left' | 'right'

export interface StateNode {
  id: string
  /** TikZ node name, e.g. `q0` (must be unique and TikZ-safe). */
  name: string
  /** Label in TeX math mode (without the surrounding `$`). */
  label: string
  /** Position of the node centre in cm, TikZ orientation (y up). */
  x: number
  y: number
  accepting: boolean
  initial: boolean
  initialWhere: Direction
  /** xcolor expression for the border, or '' for the default (black). */
  draw: string
  /** xcolor expression for the fill, or '' for no fill. */
  fill: string
}

export type LineStyle = 'solid' | 'dashed' | 'dotted'

export interface Transition {
  id: string
  from: string
  to: string
  /** Label in TeX math mode (without `$`). Empty = no label node. */
  label: string
  /** Signed bend angle in degrees: >0 = `bend left`, <0 = `bend right`, 0 = straight. */
  bend: number
  /** Only used for self loops. */
  loop: Direction
  /** Put the label on the other side (`swap`). */
  swap: boolean
  /** Label position along the edge (`pos`), 0..1. */
  pos: number
  /** xcolor expression for the edge (and its label), '' = default. */
  color: string
  style: LineStyle
}

export type ArrowTip = 'Stealth' | 'Latex' | 'to'
export type LineWidth = 'thin' | 'semithick' | 'thick'

export interface DiagramSettings {
  arrowTip: ArrowTip
  lineWidth: LineWidth
  /** Text placed at initial arrows (TikZ text mode). TikZ default: `start`. */
  initialText: string
}

export interface Diagram {
  nodes: StateNode[]
  edges: Transition[]
  settings: DiagramSettings
}

export const DEFAULT_SETTINGS: DiagramSettings = {
  arrowTip: 'Stealth',
  lineWidth: 'semithick',
  initialText: 'start',
}

export const LINE_WIDTH_PT: Record<LineWidth, number> = {
  thin: 0.4,
  semithick: 0.6,
  thick: 0.8,
}

export function isLoop(e: Transition): boolean {
  return e.from === e.to
}
