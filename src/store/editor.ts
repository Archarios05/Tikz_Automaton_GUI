import { create } from 'zustand'
import {
  DEFAULT_SETTINGS, Diagram, DiagramSettings, Direction, StateNode, Transition, isLoop,
} from '../model/types'
import { roundCm } from '../model/units'

export type Tool = 'select' | 'state' | 'transition'

export interface Selection { nodes: string[]; edges: string[] }

export interface GridPrefs {
  /** Snap node positions to the grid. */
  snap: boolean
  show: boolean
  /** Grid step in cm. */
  step: number
}

export interface View { panX: number; panY: number; zoom: number /* screen px per TeX pt */ }

interface State {
  diagram: Diagram
  past: Diagram[]
  future: Diagram[]
  selection: Selection
  tool: Tool
  grid: GridPrefs
  view: View
  toast: { id: number; text: string } | null
  /** Snapshot taken at the start of a drag; committed to history at the end. */
  dragBase: Diagram | null
}

interface Actions {
  /** Change the diagram and record an undo step. */
  update: (fn: (d: Diagram) => Diagram) => void
  /** Change the diagram during a drag (one undo step for the whole drag). */
  beginDrag: () => void
  dragUpdate: (fn: (d: Diagram) => Diagram) => void
  endDrag: () => void
  undo: () => void
  redo: () => void
  load: (d: Diagram) => void
  setSelection: (s: Selection) => void
  setTool: (t: Tool) => void
  setGrid: (g: Partial<GridPrefs>) => void
  setView: (v: Partial<View>) => void
  notify: (text: string) => void
}

const HISTORY_LIMIT = 200
const STORAGE_KEY = 'tikz-automaton-editor/v2'

export const emptySelection: Selection = { nodes: [], edges: [] }

/* ------------------------------------------------------------------------ */
/* Factories                                                                */
/* ------------------------------------------------------------------------ */

let idCounter = 0
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(idCounter++).toString(36)}`

export function nextStateName(d: Diagram): { name: string; label: string } {
  const used = new Set(d.nodes.map((n) => n.name))
  let i = 0
  while (used.has(`q${i}`)) i++
  return { name: `q${i}`, label: `q_{${i}}` }
}

export function makeState(d: Diagram, x: number, y: number): StateNode {
  const { name, label } = nextStateName(d)
  return {
    id: newId('n'), name, label, x: roundCm(x), y: roundCm(y),
    accepting: false, initial: false, initialWhere: 'left', draw: '', fill: '',
  }
}

export function makeTransition(from: string, to: string, extra: Partial<Transition> = {}): Transition {
  return {
    id: newId('e'), from, to, label: '', bend: 0, loop: 'above', swap: false, pos: 0.5,
    color: '', style: 'solid', ...extra,
  }
}

export function sampleDiagram(): Diagram {
  const q0: StateNode = {
    id: 'n0', name: 'q0', label: 'q_{0}', x: 0, y: 0, accepting: false, initial: true,
    initialWhere: 'left', draw: '', fill: '',
  }
  const q1: StateNode = { ...q0, id: 'n1', name: 'q1', label: 'q_{1}', x: 3, initial: false }
  const q2: StateNode = { ...q0, id: 'n2', name: 'q2', label: 'q_{2}', x: 6, initial: false, accepting: true }
  return {
    settings: { ...DEFAULT_SETTINGS },
    nodes: [q0, q1, q2],
    edges: [
      makeTransition('n0', 'n1', { id: 'e0', label: 'a' }),
      makeTransition('n1', 'n2', { id: 'e1', label: 'b', bend: 30 }),
      makeTransition('n2', 'n1', { id: 'e2', label: 'a', bend: 30 }),
      makeTransition('n0', 'n0', { id: 'e3', label: 'b' }),
      makeTransition('n2', 'n2', { id: 'e4', label: 'a,b', loop: 'above' }),
    ],
  }
}

/* ------------------------------------------------------------------------ */
/* Validation of loaded data                                                */
/* ------------------------------------------------------------------------ */

const DIRS: Direction[] = ['above', 'below', 'left', 'right']

export function sanitizeDiagram(raw: unknown): Diagram | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<Diagram>
  if (!Array.isArray(r.nodes) || !Array.isArray(r.edges)) return null
  const settings: DiagramSettings = { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) }
  const nodes: StateNode[] = r.nodes.filter((n) => n && typeof n.id === 'string').map((n) => ({
    id: n.id,
    name: String(n.name ?? n.id),
    label: String(n.label ?? ''),
    x: Number(n.x) || 0,
    y: Number(n.y) || 0,
    accepting: !!n.accepting,
    initial: !!n.initial,
    initialWhere: DIRS.includes(n.initialWhere) ? n.initialWhere : 'left',
    draw: String(n.draw ?? ''),
    fill: String(n.fill ?? ''),
  }))
  const ids = new Set(nodes.map((n) => n.id))
  const edges: Transition[] = r.edges
    .filter((e) => e && ids.has(e.from) && ids.has(e.to))
    .map((e) => ({
      ...makeTransition(e.from, e.to),
      id: String(e.id),
      label: String(e.label ?? ''),
      bend: Number(e.bend) || 0,
      loop: DIRS.includes(e.loop) ? e.loop : 'above',
      swap: !!e.swap,
      pos: Number.isFinite(Number(e.pos)) ? Math.min(1, Math.max(0, Number(e.pos))) : 0.5,
      color: String(e.color ?? ''),
      style: e.style === 'dashed' || e.style === 'dotted' ? e.style : 'solid',
    }))
  return { settings, nodes, edges }
}

/* ------------------------------------------------------------------------ */
/* Persistence                                                              */
/* ------------------------------------------------------------------------ */

interface Saved { diagram: Diagram; grid: GridPrefs }

function loadSaved(): Partial<Saved> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const s = JSON.parse(raw)
    return { diagram: sanitizeDiagram(s.diagram) ?? undefined, grid: s.grid }
  } catch {
    return {}
  }
}

const saved = loadSaved()

/* ------------------------------------------------------------------------ */
/* Store                                                                    */
/* ------------------------------------------------------------------------ */

function pushPast(past: Diagram[], d: Diagram) {
  const p = [...past, d]
  return p.length > HISTORY_LIMIT ? p.slice(p.length - HISTORY_LIMIT) : p
}

/** Drop selection entries that no longer exist. */
function pruneSelection(sel: Selection, d: Diagram): Selection {
  const n = new Set(d.nodes.map((x) => x.id))
  const e = new Set(d.edges.map((x) => x.id))
  return { nodes: sel.nodes.filter((id) => n.has(id)), edges: sel.edges.filter((id) => e.has(id)) }
}

let toastId = 0

export const useEditor = create<State & Actions>()((set, get) => ({
  diagram: saved.diagram ?? sampleDiagram(),
  past: [],
  future: [],
  selection: emptySelection,
  tool: 'select',
  grid: { snap: true, show: true, step: 0.5, ...(saved.grid ?? {}) },
  view: { panX: 0, panY: 0, zoom: 2.5 },
  toast: null,
  dragBase: null,

  update: (fn) => {
    const { diagram, past } = get()
    const next = fn(diagram)
    if (next === diagram) return
    set({ diagram: next, past: pushPast(past, diagram), future: [], selection: pruneSelection(get().selection, next) })
  },

  beginDrag: () => set({ dragBase: get().diagram }),
  dragUpdate: (fn) => set({ diagram: fn(get().diagram) }),
  endDrag: () => {
    const { dragBase, diagram, past } = get()
    if (dragBase && dragBase !== diagram) set({ past: pushPast(past, dragBase), future: [] })
    set({ dragBase: null })
  },

  undo: () => {
    const { past, future, diagram, selection } = get()
    if (!past.length) return
    const prev = past[past.length - 1]
    set({ diagram: prev, past: past.slice(0, -1), future: [diagram, ...future], selection: pruneSelection(selection, prev) })
  },
  redo: () => {
    const { past, future, diagram, selection } = get()
    if (!future.length) return
    const next = future[0]
    set({ diagram: next, past: pushPast(past, diagram), future: future.slice(1), selection: pruneSelection(selection, next) })
  },

  load: (d) => {
    const { diagram, past } = get()
    set({ diagram: d, past: pushPast(past, diagram), future: [], selection: emptySelection })
  },

  setSelection: (s) => set({ selection: s }),
  setTool: (t) => set({ tool: t }),
  setGrid: (g) => set({ grid: { ...get().grid, ...g } }),
  setView: (v) => set({ view: { ...get().view, ...v } }),
  notify: (text) => {
    const id = ++toastId
    set({ toast: { id, text } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, 2600)
  },
}))

// Autosave (debounced)
let saveTimer: number | undefined
useEditor.subscribe((s, prev) => {
  if (s.diagram === prev.diagram && s.grid === prev.grid) return
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ diagram: s.diagram, grid: s.grid } satisfies Saved))
    } catch { /* storage full or unavailable */ }
  }, 300)
})

/* ------------------------------------------------------------------------ */
/* Diagram operations                                                       */
/* ------------------------------------------------------------------------ */

export const ops = {
  updateNode(d: Diagram, id: string, patch: Partial<StateNode>): Diagram {
    return { ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }
  },
  updateNodes(d: Diagram, ids: string[], patch: (n: StateNode) => Partial<StateNode>): Diagram {
    const s = new Set(ids)
    return { ...d, nodes: d.nodes.map((n) => (s.has(n.id) ? { ...n, ...patch(n) } : n)) }
  },
  updateEdge(d: Diagram, id: string, patch: Partial<Transition>): Diagram {
    return { ...d, edges: d.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)) }
  },
  remove(d: Diagram, sel: Selection): Diagram {
    const nodes = new Set(sel.nodes)
    const edges = new Set(sel.edges)
    return {
      ...d,
      nodes: d.nodes.filter((n) => !nodes.has(n.id)),
      edges: d.edges.filter((e) => !edges.has(e.id) && !nodes.has(e.from) && !nodes.has(e.to)),
    }
  },

  /**
   * Add a transition with sensible defaults: opposite pairs are bent apart,
   * loops go to the free side of the state.
   */
  addTransition(d: Diagram, from: string, to: string): { diagram: Diagram; id: string; existed: boolean } {
    const existing = d.edges.find((e) => e.from === from && e.to === to)
    if (existing && from !== to) return { diagram: d, id: existing.id, existed: true }
    if (from === to) {
      const loop = freeLoopSide(d, from)
      if (!loop) return { diagram: d, id: d.edges.find((e) => e.from === from && e.to === from)!.id, existed: true }
      const e = makeTransition(from, to, { loop })
      return { diagram: { ...d, edges: [...d.edges, e] }, id: e.id, existed: false }
    }
    let edges = d.edges
    const reverse = edges.find((e) => e.from === to && e.to === from)
    let bend = 0
    if (reverse) {
      bend = 30
      if (reverse.bend === 0) edges = edges.map((e) => (e === reverse ? { ...e, bend: 30 } : e))
    }
    const e = makeTransition(from, to, { bend })
    return { diagram: { ...d, edges: [...edges, e] }, id: e.id, existed: false }
  },

  reverseEdge(d: Diagram, id: string): Diagram {
    const e = d.edges.find((x) => x.id === id)
    if (!e || isLoop(e)) return d
    if (d.edges.some((x) => x.from === e.to && x.to === e.from)) return d
    return ops.updateEdge(d, id, { from: e.to, to: e.from })
  },

  rename(d: Diagram, id: string, name: string): Diagram {
    return ops.updateNode(d, id, { name })
  },
}

const DIR_DEG: Record<Direction, number> = { right: 0, above: 90, left: 180, below: 270 }

/** Side of a state that is farthest from its other edges, loops and initial arrow. */
export function freeLoopSide(d: Diagram, nodeId: string): Direction | null {
  const node = d.nodes.find((n) => n.id === nodeId)!
  const usedLoops = new Set(d.edges.filter((e) => e.from === nodeId && e.to === nodeId).map((e) => e.loop))
  const blocked: number[] = []
  for (const e of d.edges) {
    if (e.from === e.to) continue
    const other = e.from === nodeId ? e.to : e.to === nodeId ? e.from : null
    if (!other) continue
    const o = d.nodes.find((n) => n.id === other)
    if (o) blocked.push(Math.atan2(o.y - node.y, o.x - node.x) * 180 / Math.PI)
  }
  if (node.initial) blocked.push(DIR_DEG[node.initialWhere])
  const order: Direction[] = ['above', 'below', 'right', 'left']
  let best: Direction | null = null
  let bestScore = -1
  for (const dir of order) {
    if (usedLoops.has(dir)) continue
    const a = DIR_DEG[dir]
    const score = blocked.length
      ? Math.min(...blocked.map((b) => { const x = Math.abs(((a - b) % 360 + 540) % 360 - 180); return x }))
      : 180
    if (score > bestScore + 1e-9) { best = dir; bestScore = score }
  }
  return best
}

export function isValidName(name: string): boolean {
  return /^[A-Za-z0-9_\-]+$/.test(name)
}
