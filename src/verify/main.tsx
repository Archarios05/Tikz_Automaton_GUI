/**
 * Dev-only page: the editor's rendering next to (and overlaid on) the
 * TikZ output produced by `node scripts/verify.mjs`.
 * Open http://localhost:5173/verify.html?s=stealth&mode=diff  (modes: diff, overlay, mine, ref, metrics)
 */
import { createRoot } from 'react-dom/client'
import 'katex/dist/katex.min.css'
import '../index.css'
import { DiagramLayer, useGeometry } from '../canvas/DiagramLayer'
import { initFonts, measureTex } from '../tex/measure'
import { cmToPt } from '../model/units'
import { BOX, SAMPLES } from './samples'

initFonts()
const params = new URLSearchParams(location.search)
const name = params.get('s') ?? 'stealth'
const W = Number(params.get('w') ?? 900)
const d = SAMPLES[name]

const vb = {
  x: cmToPt(BOX.x0), y: -cmToPt(BOX.y1),
  w: cmToPt(BOX.x1 - BOX.x0), h: cmToPt(BOX.y1 - BOX.y0),
}
const H = (W * vb.h) / vb.w

function Mine() {
  const geo = useGeometry(d)
  return (
    <svg width={W} height={H} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} style={{ display: 'block', background: '#fff' }}>
      <DiagramLayer d={d} geo={geo} />
    </svg>
  )
}

const Ref = () => <img src={`/verify-out/${name}.svg`} width={W} height={H} style={{ display: 'block', background: '#fff' }} />

const mode = params.get('mode') ?? 'diff'

function Metrics() {
  const geo = useGeometry(d) // also re-renders when fonts are loaded
  const items: [string, 'math' | 'text'][] = [
    ['q_{0}', 'math'], ['q_{\\mathrm{long}}', 'math'], ['a', 'math'], ['a,b', 'math'],
    ['\\varepsilon', 'math'], ['start', 'text'], ['0', 'math'], ['y', 'math'],
  ]
  return (
    <pre id="metrics">
      {items.map(([t, m]) => {
        const b = measureTex(t, m)
        return `${t}: w=${b.width.toFixed(4)} h=${b.height.toFixed(4)} d=${b.depth.toFixed(4)} base=${b.baselineOffset.toFixed(3)}\n`
      })}
      {(() => {
        return geo.edges.map((g) => g.text
          ? `edge ${g.edge.label}: left=${g.text.x.toFixed(4)} baseline=${g.text.y.toFixed(4)}\n` : '')
          .concat([...geo.nodes.values()].map((n) => `node ${n.node.name}: r=${n.r.toFixed(4)}\n`))
      })()}
    </pre>
  )
}

function App() {
  if (mode === 'metrics') return <Metrics />
  if (mode === 'mine') return <Mine />
  if (mode === 'ref') return <Ref />
  if (mode === 'overlay') {
    // TikZ in red, editor in blue: matching strokes look dark purple
    return (
      <div style={{ position: 'relative', width: W, height: H, background: '#fff' }}>
        <div style={{ position: 'absolute', inset: 0, filter: 'opacity(0.5) drop-shadow(0 0 0 red)' }}><Ref /></div>
        <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.6 }}><Mine /></div>
      </div>
    )
  }
  // diff: white where identical, dark where they differ
  return (
    <div style={{ position: 'relative', width: W, height: H, filter: 'invert(1)', isolation: 'isolate' }}>
      <div style={{ position: 'absolute', inset: 0 }}><Ref /></div>
      <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'difference' }}><Mine /></div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
