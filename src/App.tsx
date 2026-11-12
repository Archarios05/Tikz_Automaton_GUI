import { useState } from 'react'
import { Canvas } from './canvas/Canvas'
import { useEditor } from './store/editor'
import { CodePanel } from './ui/CodePanel'
import { HelpDialog } from './ui/HelpDialog'
import { PropertiesPanel } from './ui/PropertiesPanel'
import { Toolbar } from './ui/Toolbar'
import { useShortcuts } from './ui/shortcuts'

const TOOL_HINT = {
  select: 'クリックで選択・ドラッグで移動 / 遷移をドラッグで曲げる / 空白をダブルクリックで状態を追加',
  state: 'クリックした位置に状態を追加',
  transition: '状態から状態へドラッグ（またはクリック→クリック）で遷移を追加。同じ状態ならループ',
}

function Toast() {
  const toast = useEditor((s) => s.toast)
  if (!toast) return null
  return (
    <div role="status" className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-gray-900/90 px-3 py-2 text-sm text-white shadow-lg">
      {toast.text}
    </div>
  )
}

function StatusBar() {
  const tool = useEditor((s) => s.tool)
  const grid = useEditor((s) => s.grid)
  return (
    <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex items-center gap-3 border-t border-gray-200 bg-white/90 px-3 py-1 text-xs text-gray-500">
      <span className="truncate">{TOOL_HINT[tool]}</span>
      <span className="ml-auto whitespace-nowrap">
        スナップ: {grid.snap ? `ON (${grid.step} cm)` : 'OFF (0.01 cm 単位)'}
      </span>
    </div>
  )
}

export default function App() {
  useShortcuts()
  const [help, setHelp] = useState(false)
  return (
    <div className="flex h-full flex-col">
      <Toolbar onHelp={() => setHelp(true)} />
      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 overflow-hidden" data-canvas-host>
          <Canvas />
          <StatusBar />
          <Toast />
        </main>
        <aside className="flex w-[340px] shrink-0 flex-col border-l border-gray-200 bg-white">
          <div className="max-h-[60%] shrink-0 overflow-y-auto border-b border-gray-200">
            <PropertiesPanel />
          </div>
          <CodePanel />
        </aside>
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </div>
  )
}
