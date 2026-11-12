/**
 * TikZ code generation. The renderer (`geometry.ts`) mirrors exactly the
 * options emitted here — keep the two in sync.
 */
import { Diagram, Direction, StateNode, Transition, isLoop } from '../model/types'
import { fmtNum } from '../model/units'

export interface ExportOptions {
  standalone: boolean
}

const math = (s: string) => (s.trim() === '' ? '{}' : `{$${s}$}`)

function pictureOptions(d: Diagram): string[] {
  const s = d.settings
  const opts = ['->']
  if (s.arrowTip !== 'to') opts.push(`>={${s.arrowTip}}`)
  opts.push('shorten >=1pt', 'auto')
  if (s.lineWidth !== 'thin') opts.push(s.lineWidth)
  if (s.initialText !== 'start') opts.push(`initial text={${s.initialText}}`)
  return opts
}

function nodeOptions(n: StateNode): string[] {
  const opts = ['state']
  if (n.initial) opts.push(n.initialWhere === 'left' ? 'initial' : `initial ${n.initialWhere}`)
  if (n.accepting) opts.push('accepting')
  if (n.draw) opts.push(`draw=${n.draw}`)
  if (n.fill) opts.push(`fill=${n.fill}`)
  return opts
}

function edgeOptions(e: Transition): string[] {
  const opts: string[] = []
  if (isLoop(e)) opts.push(`loop ${e.loop as Direction}`)
  else if (e.bend > 0) opts.push(`bend left=${fmtNum(e.bend, 0)}`)
  else if (e.bend < 0) opts.push(`bend right=${fmtNum(-e.bend, 0)}`)
  if (e.color) opts.push(`color=${e.color}`)
  if (e.style !== 'solid') opts.push(e.style)
  return opts
}

function labelPart(e: Transition): string {
  if (e.label.trim() === '') return ''
  const opts: string[] = []
  if (e.swap && !isLoop(e)) opts.push('swap')
  if (Math.abs(e.pos - 0.5) > 1e-9) opts.push(`pos=${fmtNum(e.pos, 2)}`)
  return ` node${opts.length ? ` [${opts.join(', ')}]` : ''} ${math(e.label)}`
}

export function libraries(d: Diagram): string[] {
  const libs = ['automata']
  if (d.settings.arrowTip !== 'to') libs.push('arrows.meta')
  return libs
}

export function exportTikz(d: Diagram, opt: ExportOptions = { standalone: false }): string {
  const byId = new Map(d.nodes.map((n) => [n.id, n]))
  const out: string[] = []
  const libs = libraries(d)

  if (opt.standalone) {
    out.push('\\documentclass[tikz, border=5pt]{standalone}')
    out.push(`\\usetikzlibrary{${libs.join(', ')}}`)
    out.push('\\begin{document}')
  } else {
    out.push(`% \\usepackage{tikz}  \\usetikzlibrary{${libs.join(', ')}}`)
  }

  out.push(`\\begin{tikzpicture}[${pictureOptions(d).join(', ')}]`)

  for (const n of d.nodes) {
    out.push(`  \\node[${nodeOptions(n).join(', ')}] (${n.name}) at (${fmtNum(n.x)}, ${fmtNum(n.y)}) ${math(n.label)};`)
  }

  const lines: string[] = []
  for (const e of d.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const o = edgeOptions(e)
    const target = isLoop(e) ? '()' : `(${b.name})`
    lines.push(`(${a.name}) edge${o.length ? ` [${o.join(', ')}]` : ''}${labelPart(e)} ${target}`)
  }
  if (lines.length) {
    out.push('')
    out.push(`  \\path ${lines[0]}`)
    for (const l of lines.slice(1)) out.push(`        ${l}`)
    out[out.length - 1] += ';'
  }

  out.push('\\end{tikzpicture}')
  if (opt.standalone) out.push('\\end{document}')
  return out.join('\n') + '\n'
}
