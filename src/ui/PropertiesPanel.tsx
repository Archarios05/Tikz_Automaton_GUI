import { ReactNode, useEffect, useRef, useState } from 'react'
import { ArrowTip, Diagram, Direction, LineStyle, LineWidth, StateNode, Transition, isLoop } from '../model/types'
import { fmtNum, roundCm } from '../model/units'
import { isValidName, ops, useEditor } from '../store/editor'
import { PALETTE, isValidXColor, xcolorToCss } from '../tikz/colors'
import { deleteSelection } from './actions'
import { Icon } from './Icon'

/* ------------------------------------------------------------------------ */
/* Live editing: every keystroke updates the canvas, one undo step per edit */
/* ------------------------------------------------------------------------ */

function useLive() {
  const s = useEditor.getState
  return {
    onFocus: () => s().beginDrag(),
    onBlur: () => s().endDrag(),
    change: (fn: (d: Diagram) => Diagram) => {
      if (s().dragBase) s().dragUpdate(fn)
      else s().update(fn)
    },
  }
}

const inputCls = 'h-8 w-full rounded-md border border-gray-300 bg-white px-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between text-xs font-medium text-gray-600">
        <span>{label}</span>
        {hint && <span className="font-normal text-gray-400">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-gray-200 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  )
}

function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-md border border-gray-300 bg-gray-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded px-1.5 py-1 text-xs ${value === o.value ? 'bg-white font-medium text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
      <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
      {hint && <span className="ml-auto text-xs text-gray-400">{hint}</span>}
    </label>
  )
}

/** Text input with a local draft so invalid values can be shown without being applied. */
function DraftInput({ value, onCommit, validate, placeholder, inputRef, mono, live }: {
  value: string
  onCommit: (v: string) => void
  validate?: (v: string) => string | null
  placeholder?: string
  inputRef?: React.Ref<HTMLInputElement>
  mono?: boolean
  live: ReturnType<typeof useLive>
}) {
  const [draft, setDraft] = useState(value)
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setDraft(value) }, [value, focused])
  const err = validate?.(draft) ?? null
  return (
    <div>
      <input
        ref={inputRef}
        className={`${inputCls} ${mono ? 'font-mono' : ''} ${err ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
        value={draft}
        placeholder={placeholder}
        spellCheck={false}
        onFocus={() => { setFocused(true); live.onFocus() }}
        onBlur={() => { setFocused(false); live.onBlur(); setDraft(value) }}
        onChange={(e) => {
          setDraft(e.target.value)
          if (!validate?.(e.target.value)) onCommit(e.target.value)
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur() }}
      />
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  )
}

function NumberInput({ value, onCommit, step = 0.1, min, max, suffix, live }: {
  value: number; onCommit: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string
  live: ReturnType<typeof useLive>
}) {
  const [draft, setDraft] = useState(fmtNum(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setDraft(fmtNum(value)) }, [value, focused])
  return (
    <div className="relative">
      <input
        type="number"
        className={`${inputCls} pr-8 tabular-nums`}
        value={draft}
        step={step}
        min={min}
        max={max}
        onFocus={() => { setFocused(true); live.onFocus() }}
        onBlur={() => { setFocused(false); live.onBlur() }}
        onChange={(e) => {
          setDraft(e.target.value)
          const v = Number(e.target.value)
          if (e.target.value !== '' && Number.isFinite(v)) {
            onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)))
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      />
      {suffix && <span className="pointer-events-none absolute right-2 top-1.5 text-xs text-gray-400">{suffix}</span>}
    </div>
  )
}

function ColorField({ label, value, onChange, allowNone, noneLabel, mix, live }: {
  label: string; value: string; onChange: (v: string) => void; allowNone?: boolean; noneLabel: string; mix?: number
  live: ReturnType<typeof useLive>
}) {
  const swatches = PALETTE.map((c) => (mix ? `${c.split('!')[0]}!${mix}` : c))
  return (
    <Row label={label} hint="xcolor 式">
      <div className="mb-1.5 flex flex-wrap gap-1">
        <button type="button" title={noneLabel} onClick={() => onChange('')}
          className={`h-5 rounded border px-1 text-[10px] leading-none ${value === '' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'} text-gray-500`}>
          {allowNone ? 'なし' : '既定'}
        </button>
        {swatches.map((c) => (
          <button key={c} type="button" title={c} onClick={() => onChange(c)}
            className={`h-5 w-5 rounded border ${value === c ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
            style={{ background: xcolorToCss(c) }} />
        ))}
      </div>
      <DraftInput value={value} mono live={live} placeholder={allowNone ? '例: blue!20' : '例: red!70!black'}
        validate={(v) => (v === '' || isValidXColor(v) ? null : '使える色: xcolor の基本色名と "色!割合!色"')}
        onCommit={onChange} />
    </Row>
  )
}

/* ------------------------------------------------------------------------ */

const DIRS: { value: Direction; label: string }[] = [
  { value: 'left', label: '左' }, { value: 'above', label: '上' }, { value: 'below', label: '下' }, { value: 'right', label: '右' },
]

function useFocusLabel() {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const f = () => { ref.current?.focus(); ref.current?.select() }
    window.addEventListener('focus-label', f)
    return () => window.removeEventListener('focus-label', f)
  }, [])
  return ref
}

function NodeProps({ n, d }: { n: StateNode; d: Diagram }) {
  const live = useLive()
  const labelRef = useFocusLabel()
  const set = (patch: Partial<StateNode>) => live.change((x) => ops.updateNode(x, n.id, patch))
  const setNow = (patch: Partial<StateNode>) => useEditor.getState().update((x) => ops.updateNode(x, n.id, patch))
  return (
    <>
      <Section title="状態">
        <Row label="ラベル" hint="TeX 数式モード">
          <DraftInput inputRef={labelRef} value={n.label} mono live={live} onCommit={(v) => set({ label: v })} placeholder="q_0" />
        </Row>
        <Row label="ノード名" hint="TikZ 内での名前">
          <DraftInput value={n.name} mono live={live}
            validate={(v) => !isValidName(v) ? '英数字・_・- のみ使えます'
              : d.nodes.some((o) => o.id !== n.id && o.name === v) ? 'この名前は既に使われています' : null}
            onCommit={(v) => set({ name: v })} />
        </Row>
        <div className="grid grid-cols-2 gap-2">
          <Row label="x"><NumberInput value={n.x} suffix="cm" live={live} onCommit={(v) => set({ x: roundCm(v) })} /></Row>
          <Row label="y"><NumberInput value={n.y} suffix="cm" live={live} onCommit={(v) => set({ y: roundCm(v) })} /></Row>
        </div>
        <Check label="受理状態 (accepting)" hint="A" checked={n.accepting} onChange={(v) => setNow({ accepting: v })} />
        <Check label="初期状態 (initial)" hint="I" checked={n.initial} onChange={(v) => setNow({ initial: v })} />
        {n.initial && (
          <Row label="初期矢印の向き">
            <Segmented value={n.initialWhere} options={DIRS} onChange={(v) => setNow({ initialWhere: v })} />
          </Row>
        )}
      </Section>
      <Section title="色">
        <ColorField label="線" value={n.draw} noneLabel="既定 (黒)" live={live} onChange={(v) => setNow({ draw: v })} />
        <ColorField label="塗り" value={n.fill} allowNone noneLabel="塗りなし" mix={20} live={live} onChange={(v) => setNow({ fill: v })} />
      </Section>
      <DeleteSection />
    </>
  )
}

function EdgeProps({ e, d }: { e: Transition; d: Diagram }) {
  const live = useLive()
  const labelRef = useFocusLabel()
  const set = (patch: Partial<Transition>) => live.change((x) => ops.updateEdge(x, e.id, patch))
  const setNow = (patch: Partial<Transition>) => useEditor.getState().update((x) => ops.updateEdge(x, e.id, patch))
  const from = d.nodes.find((n) => n.id === e.from)
  const to = d.nodes.find((n) => n.id === e.to)
  const loop = isLoop(e)
  const hasReverse = d.edges.some((x) => x.from === e.to && x.to === e.from)
  return (
    <>
      <Section title={loop ? `遷移 (ループ) — ${from?.name}` : `遷移 — ${from?.name} → ${to?.name}`}>
        <Row label="ラベル" hint="TeX 数式モード">
          <DraftInput inputRef={labelRef} value={e.label} mono live={live} onCommit={(v) => set({ label: v })} placeholder="a, b" />
        </Row>
        {loop ? (
          <Row label="ループの向き">
            <Segmented value={e.loop} options={DIRS} onChange={(v) => setNow({ loop: v })} />
          </Row>
        ) : (
          <>
            <Row label="曲げ" hint={e.bend === 0 ? '直線' : e.bend > 0 ? `bend left=${e.bend}` : `bend right=${-e.bend}`}>
              <div className="flex items-center gap-2">
                <input type="range" min={-90} max={90} step={5} value={Math.max(-90, Math.min(90, e.bend))}
                  className="flex-1 accent-blue-600"
                  onPointerDown={live.onFocus} onPointerUp={live.onBlur}
                  onChange={(ev) => set({ bend: Number(ev.target.value) })} />
                <div className="w-20"><NumberInput value={e.bend} step={5} min={-170} max={170} suffix="°" live={live} onCommit={(v) => set({ bend: Math.round(v) })} /></div>
              </div>
            </Row>
            <Check label="ラベルを反対側に (swap)" checked={e.swap} onChange={(v) => setNow({ swap: v })} />
          </>
        )}
        <Row label="ラベル位置 (pos)" hint={fmtNum(e.pos)}>
          <input type="range" min={0} max={1} step={0.05} value={e.pos} className="w-full accent-blue-600"
            onPointerDown={live.onFocus} onPointerUp={live.onBlur}
            onChange={(ev) => set({ pos: Number(ev.target.value) })} />
        </Row>
        <Row label="線種">
          <Segmented<LineStyle> value={e.style} onChange={(v) => setNow({ style: v })}
            options={[{ value: 'solid', label: '実線' }, { value: 'dashed', label: '破線' }, { value: 'dotted', label: '点線' }]} />
        </Row>
        <ColorField label="色" value={e.color} noneLabel="既定 (黒)" live={live} onChange={(v) => setNow({ color: v })} />
        {!loop && (
          <button type="button" disabled={hasReverse}
            title={hasReverse ? '逆向きの遷移が既にあります' : undefined}
            onClick={() => useEditor.getState().update((x) => ops.reverseEdge(x, e.id))}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40">
            <Icon name="swap" size={16} /> 向きを反転
          </button>
        )}
      </Section>
      <DeleteSection />
    </>
  )
}

function DeleteSection() {
  return (
    <div className="p-4">
      <button type="button" onClick={deleteSelection}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50">
        <Icon name="trash" size={16} /> 削除
      </button>
    </div>
  )
}

function DiagramProps({ d }: { d: Diagram }) {
  const live = useLive()
  const setSettings = (patch: Partial<Diagram['settings']>) =>
    useEditor.getState().update((x) => ({ ...x, settings: { ...x.settings, ...patch } }))
  return (
    <>
      <Section title="図全体の設定">
        <Row label="矢印の形">
          <Segmented<ArrowTip> value={d.settings.arrowTip} onChange={(v) => setSettings({ arrowTip: v })}
            options={[{ value: 'Stealth', label: 'Stealth' }, { value: 'Latex', label: 'Latex' }, { value: 'to', label: 'to (既定)' }]} />
        </Row>
        <Row label="線の太さ">
          <Segmented<LineWidth> value={d.settings.lineWidth} onChange={(v) => setSettings({ lineWidth: v })}
            options={[{ value: 'thin', label: 'thin' }, { value: 'semithick', label: 'semithick' }, { value: 'thick', label: 'thick' }]} />
        </Row>
        <Row label="初期矢印のテキスト" hint="テキストモード">
          <DraftInput value={d.settings.initialText} mono live={live} placeholder="(空欄で矢印のみ)"
            onCommit={(v) => live.change((x) => ({ ...x, settings: { ...x.settings, initialText: v } }))} />
        </Row>
      </Section>
      <Section title="操作のヒント">
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-gray-600">
          <li>空白をダブルクリック、または <b>S</b> ツールでクリックすると状態を追加</li>
          <li><b>T</b> ツールで状態から状態へドラッグ（またはクリック→クリック）で遷移を追加。同じ状態に戻すとループ</li>
          <li>遷移をドラッグすると曲がり具合（ループは向き）を変更</li>
          <li><b>Alt</b> を押しながらドラッグでスナップを一時的に反転</li>
          <li>ダブルクリックでラベル編集</li>
        </ul>
        <p className="text-xs text-gray-500">{d.nodes.length} 状態・{d.edges.length} 遷移</p>
      </Section>
    </>
  )
}

export function PropertiesPanel() {
  const d = useEditor((s) => s.diagram)
  const sel = useEditor((s) => s.selection)
  const total = sel.nodes.length + sel.edges.length

  if (total === 0) return <DiagramProps d={d} />
  if (sel.nodes.length === 1 && sel.edges.length === 0) {
    const n = d.nodes.find((x) => x.id === sel.nodes[0])
    if (n) return <NodeProps key={n.id} n={n} d={d} />
  }
  if (sel.edges.length === 1 && sel.nodes.length === 0) {
    const e = d.edges.find((x) => x.id === sel.edges[0])
    if (e) return <EdgeProps key={e.id} e={e} d={d} />
  }
  return <MultiProps />
}

function MultiProps() {
  const sel = useEditor((s) => s.selection)
  const d = useEditor((s) => s.diagram)
  const nodes = d.nodes.filter((n) => sel.nodes.includes(n.id))
  const setAll = (patch: Partial<StateNode>) => useEditor.getState().update((x) => ops.updateNodes(x, sel.nodes, () => patch))
  const all = (k: 'accepting' | 'initial') => nodes.length > 0 && nodes.every((n) => n[k])
  return (
    <>
      <Section title="複数選択">
        <p className="text-sm text-gray-700">{sel.nodes.length} 状態・{sel.edges.length} 遷移を選択中</p>
        {nodes.length > 0 && (
          <>
            <Check label="受理状態 (accepting)" checked={all('accepting')} onChange={(v) => setAll({ accepting: v })} />
            <Check label="初期状態 (initial)" checked={all('initial')} onChange={(v) => setAll({ initial: v })} />
          </>
        )}
        <p className="text-xs text-gray-500">ドラッグでまとめて移動、矢印キーで微調整、Ctrl+D で複製</p>
      </Section>
      <DeleteSection />
    </>
  )
}
