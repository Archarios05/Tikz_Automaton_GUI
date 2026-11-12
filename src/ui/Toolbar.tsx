import { ReactNode } from 'react'
import { PX_PER_PT } from '../model/units'
import { Tool, useEditor } from '../store/editor'
import { Icon } from './Icon'
import { deleteSelection, fitView, newDiagram, openJson, saveJson, zoomBy } from './actions'

function Btn({ title, onClick, active, disabled, children }: {
  title: string; onClick: () => void; active?: boolean; disabled?: boolean; children: ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm transition-colors
        ${active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'}
        disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent`}
    >
      {children}
    </button>
  )
}

const Sep = () => <div className="mx-1 h-6 w-px bg-gray-300" />

const TOOLS: { tool: Tool; icon: string; label: string; key: string }[] = [
  { tool: 'select', icon: 'pointer', label: '選択・移動', key: 'V' },
  { tool: 'state', icon: 'circle', label: '状態を追加', key: 'S' },
  { tool: 'transition', icon: 'arrow', label: '遷移を追加', key: 'T' },
]

export function Toolbar({ onHelp }: { onHelp: () => void }) {
  const tool = useEditor((s) => s.tool)
  const setTool = useEditor((s) => s.setTool)
  const grid = useEditor((s) => s.grid)
  const setGrid = useEditor((s) => s.setGrid)
  const zoom = useEditor((s) => s.view.zoom)
  const canUndo = useEditor((s) => s.past.length > 0)
  const canRedo = useEditor((s) => s.future.length > 0)
  const hasSel = useEditor((s) => s.selection.nodes.length + s.selection.edges.length > 0)
  const undo = useEditor((s) => s.undo)
  const redo = useEditor((s) => s.redo)

  return (
    <header className="flex h-12 shrink-0 items-center gap-0.5 overflow-x-auto border-b border-gray-200 bg-white px-2">
      <div className="mr-2 whitespace-nowrap pl-1 text-sm font-semibold text-gray-800">TikZ Automaton</div>
      <Btn title="新規" onClick={newDiagram}><Icon name="file" /></Btn>
      <Btn title="開く (.json)" onClick={openJson}><Icon name="open" /></Btn>
      <Btn title="保存 (.json)" onClick={saveJson}><Icon name="save" /></Btn>
      <Sep />
      {TOOLS.map((t) => (
        <Btn key={t.tool} title={`${t.label} (${t.key})`} active={tool === t.tool} onClick={() => setTool(t.tool)}>
          <Icon name={t.icon} />
          <span className="hidden pr-1 lg:inline">{t.label}</span>
        </Btn>
      ))}
      <Sep />
      <Btn title="元に戻す (Ctrl+Z)" onClick={undo} disabled={!canUndo}><Icon name="undo" /></Btn>
      <Btn title="やり直す (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}><Icon name="redo" /></Btn>
      <Btn title="削除 (Delete)" onClick={deleteSelection} disabled={!hasSel}><Icon name="trash" /></Btn>
      <Sep />
      <Btn title="グリッドにスナップ (G) — Alt キーを押しながらで一時的に反転" active={grid.snap} onClick={() => setGrid({ snap: !grid.snap })}>
        <Icon name="magnet" />
        <span className="hidden pr-1 md:inline">スナップ</span>
      </Btn>
      <select
        title="グリッド間隔"
        aria-label="グリッド間隔"
        value={grid.step}
        onChange={(e) => setGrid({ step: Number(e.target.value) })}
        className="h-8 rounded-md border border-gray-300 bg-white px-1 text-sm text-gray-700"
      >
        {[0.1, 0.25, 0.5, 1].map((s) => <option key={s} value={s}>{s} cm</option>)}
      </select>
      <Btn title="グリッド表示 (Shift+G)" active={grid.show} onClick={() => setGrid({ show: !grid.show })}><Icon name="grid" /></Btn>
      <Sep />
      <Btn title="縮小 (-)" onClick={() => zoomBy(1 / 1.25)}><Icon name="minus" /></Btn>
      <button type="button" title="実寸 (100%) に戻す" className="w-12 text-center text-xs tabular-nums text-gray-600 hover:text-gray-900"
        onClick={() => zoomBy(PX_PER_PT / zoom)}>
        {Math.round((zoom / PX_PER_PT) * 100)}%
      </button>
      <Btn title="拡大 (+)" onClick={() => zoomBy(1.25)}><Icon name="plus" /></Btn>
      <Btn title="全体を表示 (F)" onClick={fitView}><Icon name="fit" /></Btn>
      <div className="flex-1" />
      <Btn title="操作方法" onClick={onHelp}><Icon name="help" /></Btn>
    </header>
  )
}
