/**
 * The editing canvas. The diagram itself is drawn by <DiagramLayer> exactly as
 * TikZ draws it; everything else here (grid, selection halos, hit areas,
 * previews) is editor chrome layered around it.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isLoop } from '../model/types'
import { PT_PER_CM, cmToPt, ptToCm, roundCm } from '../model/units'
import { Selection, emptySelection, makeState, ops, useEditor } from '../store/editor'
import { Vec, bendFromPoint, len, loopFromPoint, sub } from '../tikz/geometry'
import { DiagramLayer, Geometry, bezierD, fy, useGeometry } from './DiagramLayer'

type Drag =
  | { kind: 'pan'; sx: number; sy: number; panX: number; panY: number }
  | { kind: 'move'; sx: number; sy: number; start: Vec; orig: Map<string, { x: number; y: number }>; primary: string; moved: boolean }
  | { kind: 'band'; sx: number; sy: number; start: Vec; base: Selection; additive: boolean }
  | { kind: 'bend'; sx: number; sy: number; id: string; moved: boolean }
  | { kind: 'connect'; sx: number; sy: number; from: string; moved: boolean }

const CLICK_SLOP = 4 // px
export const focusLabel = () => window.dispatchEvent(new CustomEvent('focus-label'))

export function Canvas() {
  const diagram = useEditor((s) => s.diagram)
  const selection = useEditor((s) => s.selection)
  const tool = useEditor((s) => s.tool)
  const grid = useEditor((s) => s.grid)
  const view = useEditor((s) => s.view)
  const geo = useGeometry(diagram)

  const svgRef = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const drag = useRef<Drag | null>(null)
  const space = useRef(false)
  const [pointer, setPointer] = useState<Vec | null>(null) // world, pt
  const [band, setBand] = useState<{ a: Vec; b: Vec } | null>(null)
  const [pending, setPending] = useState<string | null>(null) // click-click transition source
  const [connecting, setConnecting] = useState<string | null>(null)
  const [hoverNode, setHoverNode] = useState<string | null>(null)
  const [panning, setPanning] = useState(false)

  /* ---------------- coordinates ---------------- */

  const toWorld = useCallback((clientX: number, clientY: number): Vec => {
    const r = svgRef.current!.getBoundingClientRect()
    const { panX, panY, zoom } = useEditor.getState().view
    return { x: (clientX - r.left - panX) / zoom, y: -(clientY - r.top - panY) / zoom }
  }, [])

  const snapCm = useCallback((v: number, invert: boolean) => {
    const g = useEditor.getState().grid
    return g.snap !== invert ? Math.round(v / g.step) * g.step : roundCm(v)
  }, [])

  const nodeAt = useCallback((p: Vec, g: Geometry): string | null => {
    let best: string | null = null
    let bestD = Infinity
    const slop = 3 / useEditor.getState().view.zoom
    g.nodes.forEach((n, id) => {
      const dd = len(sub(p, n.center))
      if (dd <= n.anchorR + slop && dd < bestD) { best = id; bestD = dd }
    })
    return best
  }, [])

  /* ---------------- sizing & initial fit ---------------- */

  useLayoutEffect(() => {
    const el = svgRef.current!.parentElement!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current || size.w < 50) return
    fitted.current = true
    fitView(geo, size)
  }, [geo, size])

  useEffect(() => {
    const onFit = () => fitView(geo, size)
    window.addEventListener('fit-view', onFit)
    return () => window.removeEventListener('fit-view', onFit)
  }, [geo, size])

  /* ---------------- wheel: pan / zoom ---------------- */

  useEffect(() => {
    const svg = svgRef.current!
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const { view: v, setView } = useEditor.getState()
      if (e.ctrlKey || e.metaKey) {
        const r = svg.getBoundingClientRect()
        const mx = e.clientX - r.left
        const my = e.clientY - r.top
        const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.002))
        const zoom = clampZoom(v.zoom * factor)
        const k = zoom / v.zoom
        setView({ zoom, panX: mx - (mx - v.panX) * k, panY: my - (my - v.panY) * k })
      } else {
        const m = e.deltaMode === 1 ? 20 : 1
        setView({ panX: v.panX - (e.shiftKey ? e.deltaY : e.deltaX) * m, panY: v.panY - (e.shiftKey ? 0 : e.deltaY) * m })
      }
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  /* ---------------- space-to-pan, Esc ---------------- */

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return
      if (e.code === 'Space') { space.current = true; setPanning(true); e.preventDefault() }
      if (e.key === 'Escape') { setPending(null); setConnecting(null) }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') { space.current = false; setPanning(!!drag.current && drag.current.kind === 'pan') }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => { if (tool !== 'transition') { setPending(null); setConnecting(null) } }, [tool])

  /* ---------------- pointer handling ---------------- */

  const createTransition = (from: string, to: string) => {
    const st = useEditor.getState()
    const res = ops.addTransition(st.diagram, from, to)
    if (res.existed) {
      st.notify(from === to ? 'このノードの4方向すべてにループがあります' : 'この向きの遷移は既にあります（ラベルを編集してください）')
    } else {
      st.update(() => res.diagram)
    }
    st.setSelection({ nodes: [], edges: [res.id] })
    if (!res.existed) setTimeout(focusLabel, 50)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    const st = useEditor.getState()
    const target = e.target as Element
    const nodeEl = target.closest('[data-node]')
    const edgeEl = target.closest('[data-edge]')
    const p = toWorld(e.clientX, e.clientY)
    svgRef.current!.setPointerCapture(e.pointerId)

    if (e.button === 1 || (e.button === 0 && space.current)) {
      drag.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, panX: st.view.panX, panY: st.view.panY }
      setPanning(true)
      e.preventDefault()
      return
    }
    if (e.button !== 0) return

    const base = { sx: e.clientX, sy: e.clientY }

    if (st.tool === 'transition') {
      const id = nodeEl?.getAttribute('data-node') ?? null
      if (pending) {
        if (id) createTransition(pending, id)
        setPending(null)
        return
      }
      if (id) {
        drag.current = { kind: 'connect', ...base, from: id, moved: false }
        setConnecting(id)
        setPointer(p)
      }
      return
    }

    if (st.tool === 'state' && !nodeEl && !edgeEl) {
      const n = makeState(st.diagram, snapCm(ptToCm(p.x), e.altKey), snapCm(ptToCm(p.y), e.altKey))
      st.update((d) => ({ ...d, nodes: [...d.nodes, n] }))
      st.setSelection({ nodes: [n.id], edges: [] })
      return
    }

    if (nodeEl) {
      const id = nodeEl.getAttribute('data-node')!
      let sel = st.selection
      if (e.shiftKey) {
        sel = sel.nodes.includes(id)
          ? { ...sel, nodes: sel.nodes.filter((x) => x !== id) }
          : { ...sel, nodes: [...sel.nodes, id] }
      } else if (!sel.nodes.includes(id)) {
        sel = { nodes: [id], edges: [] }
      }
      st.setSelection(sel)
      if (!sel.nodes.includes(id)) return
      const orig = new Map(st.diagram.nodes.filter((n) => sel.nodes.includes(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]))
      drag.current = { kind: 'move', ...base, start: p, orig, primary: id, moved: false }
      return
    }

    if (edgeEl) {
      const id = edgeEl.getAttribute('data-edge')!
      if (e.shiftKey) {
        const sel = st.selection
        st.setSelection(sel.edges.includes(id) ? { ...sel, edges: sel.edges.filter((x) => x !== id) } : { ...sel, edges: [...sel.edges, id] })
        return
      }
      st.setSelection({ nodes: [], edges: [id] })
      drag.current = { kind: 'bend', ...base, id, moved: false }
      return
    }

    // empty canvas → rubber band
    drag.current = { kind: 'band', ...base, start: p, base: e.shiftKey ? st.selection : emptySelection, additive: e.shiftKey }
    if (!e.shiftKey) st.setSelection(emptySelection)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const st = useEditor.getState()
    const p = toWorld(e.clientX, e.clientY)
    const dr = drag.current
    if (st.tool === 'transition' || dr?.kind === 'connect') {
      setPointer(p)
      setHoverNode(nodeAt(p, geo))
    }
    if (!dr) return
    const far = Math.hypot(e.clientX - dr.sx, e.clientY - dr.sy) > CLICK_SLOP

    switch (dr.kind) {
      case 'pan':
        st.setView({ panX: dr.panX + e.clientX - dr.sx, panY: dr.panY + e.clientY - dr.sy })
        break
      case 'move': {
        if (!dr.moved && !far) return
        if (!dr.moved) { dr.moved = true; st.beginDrag() }
        const o = dr.orig.get(dr.primary)!
        const nx = snapCm(o.x + ptToCm(p.x - dr.start.x), e.altKey)
        const ny = snapCm(o.y + ptToCm(p.y - dr.start.y), e.altKey)
        const dx = nx - o.x
        const dy = ny - o.y
        st.dragUpdate((d) => ops.updateNodes(d, [...dr.orig.keys()], (n) => {
          const q = dr.orig.get(n.id)!
          return { x: roundCm(q.x + dx), y: roundCm(q.y + dy) }
        }))
        break
      }
      case 'bend': {
        if (!dr.moved && !far) return
        if (!dr.moved) { dr.moved = true; st.beginDrag() }
        const edge = st.diagram.edges.find((x) => x.id === dr.id)
        if (!edge) return
        const a = geo.nodes.get(edge.from)
        const b = geo.nodes.get(edge.to)
        if (!a || !b) return
        if (isLoop(edge)) {
          const loop = loopFromPoint(a, p)
          if (loop !== edge.loop) st.dragUpdate((d) => ops.updateEdge(d, edge.id, { loop }))
        } else {
          const step = st.grid.snap !== e.altKey ? 5 : 1
          const bend = bendFromPoint(a, b, p, step)
          if (bend !== edge.bend) st.dragUpdate((d) => ops.updateEdge(d, edge.id, { bend }))
        }
        break
      }
      case 'band': {
        if (!far) return
        setBand({ a: dr.start, b: p })
        const x0 = Math.min(dr.start.x, p.x); const x1 = Math.max(dr.start.x, p.x)
        const y0 = Math.min(dr.start.y, p.y); const y1 = Math.max(dr.start.y, p.y)
        const inside = (q: Vec) => q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1
        const nodes = [...geo.nodes.values()].filter((n) => inside(n.center)).map((n) => n.node.id)
        const edges = geo.edges.filter((g) => inside(g.mid)).map((g) => g.edge.id)
        st.setSelection({
          nodes: [...new Set([...dr.base.nodes, ...nodes])],
          edges: [...new Set([...dr.base.edges, ...edges])],
        })
        break
      }
      case 'connect':
        if (far) dr.moved = true
        break
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const dr = drag.current
    drag.current = null
    setPanning(space.current)
    setBand(null)
    if (!dr) return
    const st = useEditor.getState()
    if (dr.kind === 'move' || dr.kind === 'bend') {
      if (dr.moved) st.endDrag()
    } else if (dr.kind === 'connect') {
      setConnecting(null)
      const target = nodeAt(toWorld(e.clientX, e.clientY), geo)
      if (!dr.moved) {
        setPending(dr.from) // click-click mode: wait for the target click
      } else if (target) {
        createTransition(dr.from, target)
      }
    }
  }

  const onDoubleClick = (e: React.MouseEvent) => {
    const st = useEditor.getState()
    const target = e.target as Element
    if (target.closest('[data-node]') || target.closest('[data-edge]')) {
      focusLabel()
      return
    }
    if (st.tool === 'select') {
      const p = toWorld(e.clientX, e.clientY)
      const n = makeState(st.diagram, snapCm(ptToCm(p.x), e.altKey), snapCm(ptToCm(p.y), e.altKey))
      st.update((d) => ({ ...d, nodes: [...d.nodes, n] }))
      st.setSelection({ nodes: [n.id], edges: [] })
    }
  }

  /* ---------------- render ---------------- */

  const { panX, panY, zoom } = view
  const selNodes = new Set(selection.nodes)
  const selEdges = new Set(selection.edges)
  const source = connecting ?? pending
  const cursor = panning ? 'grabbing' : tool === 'select' ? 'default' : 'crosshair'

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 block select-none touch-none"
      width="100%"
      height="100%"
      style={{ cursor, background: '#fff' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => { setPointer(null); setHoverNode(null) }}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {grid.show && <GridLayer size={size} panX={panX} panY={panY} zoom={zoom} step={grid.step} />}
      <g transform={`translate(${panX} ${panY}) scale(${zoom})`}>
        {/* selection halos (below the drawing so the drawing stays untouched) */}
        <g pointerEvents="none">
          {geo.edges.filter((g) => selEdges.has(g.edge.id)).map((g) => (
            <path key={g.edge.id} d={edgePathD(g)} fill="none" stroke="#3b82f6" strokeOpacity={0.35}
              strokeWidth={7} vectorEffect="non-scaling-stroke" strokeLinecap="round" />
          ))}
          {[...geo.nodes.values()].filter((g) => selNodes.has(g.node.id) || g.node.id === hoverNode && !!source).map((g) => (
            <circle key={g.node.id} cx={g.center.x} cy={fy(g.center.y)} r={g.r}
              fill="none" stroke="#3b82f6" strokeOpacity={selNodes.has(g.node.id) ? 0.4 : 0.25}
              strokeWidth={9} vectorEffect="non-scaling-stroke" />
          ))}
        </g>

        <DiagramLayer d={diagram} geo={geo} />

        {/* hit areas */}
        <g>
          {geo.edges.map((g) => (
            <g key={g.edge.id} data-edge={g.edge.id} style={{ cursor: tool === 'select' ? 'pointer' : undefined }}>
              <path d={edgePathD(g)} fill="none" stroke="transparent" strokeWidth={12}
                vectorEffect="non-scaling-stroke" pointerEvents="stroke" />
              {g.text && (
                <rect x={g.text.x - 1} y={fy(g.text.y) - g.text.box.height - 1}
                  width={g.text.box.width + 2} height={g.text.box.height + g.text.box.depth + 2}
                  fill="transparent" pointerEvents="all" />
              )}
            </g>
          ))}
          {[...geo.nodes.values()].map((g) => (
            <circle key={g.node.id} data-node={g.node.id} cx={g.center.x} cy={fy(g.center.y)} r={g.anchorR}
              fill="transparent" pointerEvents="all"
              style={{ cursor: tool === 'select' ? 'move' : tool === 'transition' ? 'crosshair' : undefined }} />
          ))}
        </g>

        {/* bend handle of the selected edge */}
        {tool === 'select' && selection.edges.length === 1 && selection.nodes.length === 0 && (() => {
          const g = geo.edges.find((x) => x.edge.id === selection.edges[0])
          if (!g) return null
          return (
            <circle data-edge={g.edge.id} cx={g.mid.x} cy={fy(g.mid.y)} r={4.5 / zoom}
              fill="#fff" stroke="#3b82f6" strokeWidth={1.5 / zoom} style={{ cursor: 'grab' }}>
              <title>{isLoop(g.edge) ? 'ドラッグでループの向きを変更' : 'ドラッグで曲げ角度を変更'}</title>
            </circle>
          )
        })()}

        {/* transition preview */}
        {source && pointer && (() => {
          const a = geo.nodes.get(source)
          if (!a) return null
          const target = hoverNode ? geo.nodes.get(hoverNode) : null
          const end = target && target.node.id !== source ? target.center : pointer
          return (
            <line x1={a.center.x} y1={fy(a.center.y)} x2={end.x} y2={fy(end.y)}
              stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 4" vectorEffect="non-scaling-stroke"
              pointerEvents="none" markerEnd="url(#preview-arrow)" />
          )
        })()}

        {band && (
          <rect
            x={Math.min(band.a.x, band.b.x)} y={fy(Math.max(band.a.y, band.b.y))}
            width={Math.abs(band.a.x - band.b.x)} height={Math.abs(band.a.y - band.b.y)}
            fill="#3b82f6" fillOpacity={0.08} stroke="#3b82f6" strokeWidth={1}
            vectorEffect="non-scaling-stroke" pointerEvents="none"
          />
        )}
      </g>
      <defs>
        <marker id="preview-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#3b82f6" />
        </marker>
      </defs>
    </svg>
  )
}

function edgePathD(g: Geometry['edges'][number]): string {
  if (g.curve) return bezierD(g.curve)
  const l = g.line!
  return `M${l.p0.x} ${fy(l.p0.y)} L${l.p1.x} ${fy(l.p1.y)}`
}

export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

export const MIN_ZOOM = 0.3
export const MAX_ZOOM = 20
export const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

function fitView(geo: Geometry, size: { w: number; h: number }) {
  const { setView } = useEditor.getState()
  if (geo.nodes.size === 0) {
    setView({ zoom: 2.5, panX: size.w / 2, panY: size.h / 2 })
    return
  }
  let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity
  const grow = (x: number, y: number) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) }
  geo.nodes.forEach((n) => {
    grow(n.center.x - n.r, n.center.y - n.r); grow(n.center.x + n.r, n.center.y + n.r)
    if (n.initial) {
      const t = n.initial.text
      grow(n.initial.from.x, n.initial.from.y)
      if (t) { grow(t.x, t.y - t.box.depth); grow(t.x + t.box.width, t.y + t.box.height) }
    }
  })
  geo.edges.forEach((e) => {
    if (e.curve) { [e.curve.p0, e.curve.c1, e.curve.c2, e.curve.p3].forEach((q) => grow(q.x, q.y)) }
    const t = e.text
    if (t) { grow(t.x, t.y - t.box.depth); grow(t.x + t.box.width, t.y + t.box.height) }
  })
  const margin = 40
  const zoom = clampZoom(Math.min((size.w - 2 * margin) / Math.max(x1 - x0, 1), (size.h - 2 * margin) / Math.max(y1 - y0, 1), 4))
  setView({
    zoom,
    panX: size.w / 2 - ((x0 + x1) / 2) * zoom,
    panY: size.h / 2 + ((y0 + y1) / 2) * zoom,
  })
}

/** Grid in screen space (crisp 1px lines). Major lines every 1cm, axes darker. */
function GridLayer({ size, panX, panY, zoom, step }: { size: { w: number; h: number }; panX: number; panY: number; zoom: number; step: number }) {
  const pxPerCm = PT_PER_CM * zoom
  let minor = step
  while (minor * pxPerCm < 8) minor *= 2
  const lines: JSX.Element[] = []
  const x0 = Math.floor(ptToCm(-panX / zoom) / minor)
  const x1 = Math.ceil(ptToCm((size.w - panX) / zoom) / minor)
  const y0 = Math.floor(ptToCm((panY - size.h) / zoom) / minor)
  const y1 = Math.ceil(ptToCm(panY / zoom) / minor)
  const color = (v: number) => (Math.abs(v) < 1e-9 ? '#c7cbd1' : Math.abs(v - Math.round(v)) < 1e-9 ? '#e3e6ea' : '#f1f2f4')
  for (let i = x0; i <= x1; i++) {
    const cm = i * minor
    const x = Math.round(panX + cmToPt(cm) * zoom) + 0.5
    lines.push(<line key={`x${i}`} x1={x} y1={0} x2={x} y2={size.h} stroke={color(cm)} />)
  }
  for (let j = y0; j <= y1; j++) {
    const cm = j * minor
    const y = Math.round(panY - cmToPt(cm) * zoom) + 0.5
    lines.push(<line key={`y${j}`} x1={0} y1={y} x2={size.w} y2={y} stroke={color(cm)} />)
  }
  return <g pointerEvents="none" shapeRendering="crispEdges">{lines}</g>
}
