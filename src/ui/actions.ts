/** Editor commands shared by the toolbar and the keyboard shortcuts. */
import { Diagram, StateNode, Transition } from '../model/types'
import { roundCm } from '../model/units'
import { emptySelection, newId, nextStateName, ops, sampleDiagram, sanitizeDiagram, useEditor } from '../store/editor'
import { exportTikz } from '../tikz/export'
import { clampZoom } from '../canvas/Canvas'

const st = () => useEditor.getState()

export function deleteSelection() {
  const { selection, update, setSelection } = st()
  if (!selection.nodes.length && !selection.edges.length) return
  update((d) => ops.remove(d, selection))
  setSelection(emptySelection)
}

export function selectAll() {
  const { diagram, setSelection } = st()
  setSelection({ nodes: diagram.nodes.map((n) => n.id), edges: diagram.edges.map((e) => e.id) })
}

export function nudge(dx: number, dy: number) {
  const { selection, update, grid } = st()
  if (!selection.nodes.length) return
  const s = grid.snap ? grid.step : 0.1
  update((d) => ops.updateNodes(d, selection.nodes, (n) => ({ x: roundCm(n.x + dx * s), y: roundCm(n.y + dy * s) })))
}

export function toggleNodeFlag(flag: 'accepting' | 'initial') {
  const { selection, update, diagram } = st()
  if (!selection.nodes.length) return
  const sel = diagram.nodes.filter((n) => selection.nodes.includes(n.id))
  const value = !sel.every((n) => n[flag])
  update((d) => ops.updateNodes(d, selection.nodes, () => ({ [flag]: value })))
}

/* ---------------- clipboard ---------------- */

let clipboard: { nodes: StateNode[]; edges: Transition[] } | null = null

export function copySelection() {
  const { selection, diagram } = st()
  const ids = new Set(selection.nodes)
  if (!ids.size) return false
  clipboard = {
    nodes: diagram.nodes.filter((n) => ids.has(n.id)),
    edges: diagram.edges.filter((e) => ids.has(e.from) && ids.has(e.to)),
  }
  return true
}

export function paste() {
  if (!clipboard) return
  const { update, setSelection, grid } = st()
  const off = grid.snap ? Math.max(grid.step, 0.5) : 0.5
  const map = new Map<string, string>()
  let created: string[] = []
  update((d) => {
    let cur: Diagram = d
    const nodes: StateNode[] = []
    for (const n of clipboard!.nodes) {
      const { name } = nextStateName({ ...cur, nodes: [...cur.nodes, ...nodes] })
      const id = newId('n')
      map.set(n.id, id)
      nodes.push({ ...n, id, name, x: roundCm(n.x + off), y: roundCm(n.y - off) })
    }
    const edges = clipboard!.edges.map((e) => ({ ...e, id: newId('e'), from: map.get(e.from)!, to: map.get(e.to)! }))
    created = nodes.map((n) => n.id)
    cur = { ...cur, nodes: [...cur.nodes, ...nodes], edges: [...cur.edges, ...edges] }
    return cur
  })
  setSelection({ nodes: created, edges: [] })
  // paste again → further offset
  clipboard = { nodes: clipboard.nodes.map((n) => ({ ...n, x: n.x + off, y: n.y - off })), edges: clipboard.edges }
}

export function duplicate() {
  if (copySelection()) paste()
}

/* ---------------- view ---------------- */

export function zoomBy(factor: number) {
  const { view, setView } = st()
  const el = document.querySelector('[data-canvas-host]') as HTMLElement | null
  const cx = (el?.clientWidth ?? 800) / 2
  const cy = (el?.clientHeight ?? 600) / 2
  const zoom = clampZoom(view.zoom * factor)
  const k = zoom / view.zoom
  setView({ zoom, panX: cx - (cx - view.panX) * k, panY: cy - (cy - view.panY) * k })
}

export const fitView = () => window.dispatchEvent(new CustomEvent('fit-view'))

/* ---------------- files ---------------- */

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function newDiagram() {
  const { diagram, load } = st()
  if (diagram.nodes.length && !confirm('現在の図を破棄して新規作成しますか？（元に戻すで復元できます）')) return
  load({ ...sampleDiagram(), nodes: [], edges: [], settings: diagram.settings })
}

export function saveJson() {
  download('automaton.json', JSON.stringify({ format: 'tikz-automaton', version: 2, ...st().diagram }, null, 2), 'application/json')
}

export function saveTex(standalone: boolean) {
  download('automaton.tex', exportTikz(st().diagram, { standalone }), 'application/x-tex')
}

export function openJson() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = async () => {
    const f = input.files?.[0]
    if (!f) return
    try {
      const d = sanitizeDiagram(JSON.parse(await f.text()))
      if (!d) throw new Error('invalid')
      st().load(d)
      setTimeout(fitView, 0)
      st().notify(`${f.name} を読み込みました`)
    } catch {
      st().notify('読み込めませんでした：このエディタで保存した JSON ファイルを選んでください')
    }
  }
  input.click()
}
