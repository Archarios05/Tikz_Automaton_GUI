/**
 * Diagrams used to check the renderer against real TikZ output
 * (see scripts/verify.mjs and verify.html).
 */
import { DEFAULT_SETTINGS, Diagram, DiagramSettings, StateNode, Transition } from '../model/types'

const N = (name: string, x: number, y: number, extra: Partial<StateNode> = {}): StateNode => ({
  id: name, name, label: name.replace(/^q(\d+)$/, 'q_{$1}'), x, y,
  accepting: false, initial: false, initialWhere: 'left', draw: '', fill: '', ...extra,
})

let k = 0
const E = (from: string, to: string, label: string, extra: Partial<Transition> = {}): Transition => ({
  id: `e${k++}`, from, to, label, bend: 0, loop: 'above', swap: false, pos: 0.5,
  color: '', style: 'solid', ...extra,
})

function base(settings: Partial<DiagramSettings>): Diagram {
  return {
    settings: { ...DEFAULT_SETTINGS, ...settings },
    nodes: [
      N('q0', 0, 0, { initial: true }),
      N('q1', 3, 0, { accepting: true }),
      N('q2', 3, -2.5, { draw: 'blue', fill: 'blue!20' }),
      N('q3', 0, -2.5, { label: 'q_{\\mathrm{long}}', initial: true, initialWhere: 'below' }),
      N('q4', 6, 1, { accepting: true, initial: true, initialWhere: 'above' }),
      N('q5', 6.6, -2.2, { label: '' }),
    ],
    edges: [
      E('q0', 'q1', 'a'),
      E('q1', 'q0', 'b', { bend: 30 }),
      E('q1', 'q2', 'a,b', { style: 'dashed' }),
      E('q2', 'q3', '\\varepsilon', { bend: -40, color: 'red' }),
      E('q3', 'q0', 'c', { swap: true }),
      E('q0', 'q2', 'x', { pos: 0.3 }),
      E('q1', 'q4', 'y', { bend: 60 }),
      E('q4', 'q5', '0', { style: 'dotted' }),
      E('q5', 'q2', '1'),
      E('q0', 'q0', 'a', { loop: 'above' }),
      E('q1', 'q1', 'b', { loop: 'right' }),
      E('q2', 'q2', 'c', { loop: 'below' }),
      E('q3', 'q3', 'd', { loop: 'left' }),
    ],
  }
}

export const SAMPLES: Record<string, Diagram> = {
  stealth: base({ arrowTip: 'Stealth', lineWidth: 'semithick' }),
  latex: base({ arrowTip: 'Latex', lineWidth: 'thin', initialText: '$\\mathit{in}$' }),
  to: base({ arrowTip: 'to', lineWidth: 'thick', initialText: '' }),
}

/** Bounding box used for both renderings, in cm. */
export const BOX = { x0: -2.5, y0: -4.5, x1: 9, y1: 3 }
