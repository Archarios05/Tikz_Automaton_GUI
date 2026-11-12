/**
 * Draws the diagram exactly as TikZ would, from the geometry computed in
 * `tikz/geometry.ts`. SVG user units are TeX points; y is flipped (SVG y down).
 */
import { memo, useMemo, useSyncExternalStore } from 'react'
import { Diagram, LINE_WIDTH_PT, LineStyle } from '../model/types'
import { xcolorToCss } from '../tikz/colors'
import {
  ArrowShape, Bezier, EdgeGeom, NodeGeom, PlacedText, Vec, angleOf, arrowShape,
  edgeGeometry, initialArrowGeometry, nodeGeometry,
} from '../tikz/geometry'
import { fontVersion, measureTex, subscribeFonts, wrapHtml } from '../tex/measure'

export const fy = (y: number) => -y
export const pt = (p: Vec) => `${p.x} ${fy(p.y)}`
export const bezierD = (b: Bezier) => `M${pt(b.p0)} C${pt(b.c1)} ${pt(b.c2)} ${pt(b.p3)}`

export interface Geometry {
  nodes: Map<string, NodeGeom>
  edges: EdgeGeom[]
}

export function computeGeometry(d: Diagram): Geometry {
  const nodes = new Map<string, NodeGeom>()
  for (const n of d.nodes) nodes.set(n.id, nodeGeometry(n, d, measureTex))
  const edges: EdgeGeom[] = []
  for (const e of d.edges) {
    const a = nodes.get(e.from)
    const b = nodes.get(e.to)
    if (a && b) edges.push(edgeGeometry(e, a, b, d, measureTex))
  }
  return { nodes, edges }
}

/** Geometry that is recomputed when the diagram changes or fonts finish loading. */
export function useGeometry(d: Diagram): Geometry {
  const fv = useSyncExternalStore(subscribeFonts, fontVersion)
  return useMemo(() => computeGeometry(d), [d, fv])
}

function dash(style: LineStyle, lw: number): string | undefined {
  if (style === 'dashed') return '3 3'
  if (style === 'dotted') return `${lw} 2`
  return undefined
}

export function Arrow({ shape, at, dir, color }: { shape: ArrowShape; at: Vec; dir: Vec; color: string }) {
  const rot = -angleOf(dir)
  const d = shape.path
    ? shape.path.map((poly) => `M${poly.map((p) => `${p.x} ${fy(p.y)}`).join(' L')} Z`).join(' ')
    : shape.curve!.d(fy)
  return (
    <path
      transform={`translate(${at.x} ${fy(at.y)}) rotate(${rot})`}
      d={d}
      fill={shape.fill ? color : 'none'}
      stroke={shape.strokeWidth > 0 ? color : 'none'}
      strokeWidth={shape.strokeWidth}
      strokeLinecap={shape.round ? 'round' : 'butt'}
      strokeLinejoin={shape.round ? 'round' : 'miter'}
      strokeMiterlimit={10}
    />
  )
}

/**
 * HTML inside a foreignObject is laid out on a whole-CSS-pixel grid. Since one
 * local unit is one TeX point, that would round label positions by up to
 * 0.5pt. The text is therefore laid out TEXT_UPSCALE times larger and scaled
 * back down with an SVG transform, which is not snapped.
 */
const TEXT_UPSCALE = 10

export function TexText({ t, color }: { t: PlacedText; color?: string }) {
  const { box } = t
  if (!box.html) return null
  const k = TEXT_UPSCALE
  return (
    <g transform={`translate(${t.x} ${fy(t.y) - box.baselineOffset}) scale(${1 / k})`} style={{ pointerEvents: 'none' }}>
      <foreignObject
        x={0}
        y={0}
        width={(box.width + 2) * k}
        height={(box.baselineOffset + box.depth + 4) * k}
        style={{ overflow: 'visible' }}
      >
        <div
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: wrapHtml(box.html) }}
          style={{ color: color ?? '#000', lineHeight: 0, ['--tex-fs' as string]: `${10 * k}px` }}
        />
      </foreignObject>
    </g>
  )
}

const NodeShape = memo(function NodeShape({ g, d }: { g: NodeGeom; d: Diagram }) {
  const n = g.node
  const stroke = n.draw ? xcolorToCss(n.draw) : '#000'
  const fill = n.fill ? xcolorToCss(n.fill, 'none') : 'none'
  const c = { x: g.center.x, y: fy(g.center.y) }
  const lw = g.lw
  return (
    <g>
      {n.accepting ? (
        <>
          {/* `double`: outer line 2·lw+0.6pt, then a white 0.6pt inner line */}
          <circle cx={c.x} cy={c.y} r={g.r} fill={fill} stroke={stroke} strokeWidth={2 * lw + 0.6} />
          <circle cx={c.x} cy={c.y} r={g.r} fill="none" stroke="#fff" strokeWidth={0.6} />
        </>
      ) : (
        <circle cx={c.x} cy={c.y} r={g.r} fill={fill} stroke={stroke} strokeWidth={lw} />
      )}
      <TexText t={g.text} />
      {g.initial && <InitialArrow g={g} d={d} />}
    </g>
  )
})

function InitialArrow({ g, d }: { g: NodeGeom; d: Diagram }) {
  const a = initialArrowGeometry(g, d.settings.arrowTip)
  const shape = arrowShape(d.settings.arrowTip, g.lw)
  return (
    <g>
      <path d={`M${pt(a.p0)} L${pt(a.p1)}`} stroke="#000" strokeWidth={g.lw} fill="none" />
      <Arrow shape={shape} at={a.arrow.at} dir={a.arrow.dir} color="#000" />
      {g.initial!.text && <TexText t={g.initial!.text} />}
    </g>
  )
}

const EdgeShape = memo(function EdgeShape({ g, d }: { g: EdgeGeom; d: Diagram }) {
  const lw = LINE_WIDTH_PT[d.settings.lineWidth]
  const color = g.edge.color ? xcolorToCss(g.edge.color) : '#000'
  const shape = arrowShape(d.settings.arrowTip, lw)
  const s = g.stroke
  const pathD = s.kind === 'line' ? `M${pt(s.p0)} L${pt(s.p1)}` : bezierD(s.b)
  return (
    <g>
      <path d={pathD} stroke={color} strokeWidth={lw} fill="none" strokeDasharray={dash(g.edge.style, lw)} />
      <Arrow shape={shape} at={g.arrow.at} dir={g.arrow.dir} color={color} />
      {g.text && <TexText t={g.text} color={color} />}
    </g>
  )
})

export function DiagramLayer({ d, geo }: { d: Diagram; geo: Geometry }) {
  return (
    <g className="tikz-layer">
      {d.nodes.map((n) => {
        const g = geo.nodes.get(n.id)
        return g ? <NodeShape key={n.id} g={g} d={d} /> : null
      })}
      {geo.edges.map((g) => <EdgeShape key={g.edge.id} g={g} d={d} />)}
    </g>
  )
}
