import React from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { useEditorStore } from '../store/editorStore'
import { 
  Undo2, 
  Redo2, 
  MousePointer, 
  Circle, 
  ArrowRight, 
  Grid3X3,
  Download
} from 'lucide-react'

const Toolbar: React.FC = () => {
  const { mode, showGrid, setMode, toggleGrid, exportToTikz } = useEditorStore()
  // Undo/Redo functionality would need to be implemented separately
  // const { undo, redo, pastStates, futureStates } = useTemporalStore(useEditorStore)

  const handleExport = () => {
    const tikzCode = exportToTikz()
    navigator.clipboard.writeText(tikzCode)
    // You could also show a notification here
    alert('TikZコードがクリップボードにコピーされました！')
  }
  const tools = [
    {
      id: 'undo',
      icon: Undo2,
      label: 'Undo',
      shortcut: 'Ctrl+Z',
      onClick: () => console.log('Undo clicked'), // Placeholder
      disabled: true, // Temporarily disabled
    },
    {
      id: 'redo',
      icon: Redo2,
      label: 'Redo',
      shortcut: 'Ctrl+Y',
      onClick: () => console.log('Redo clicked'), // Placeholder
      disabled: true, // Temporarily disabled
    },
    { id: 'separator1' },
    {
      id: 'select',
      icon: MousePointer,
      label: '選択モード',
      shortcut: 'V',
      onClick: () => setMode('select'),
      active: mode === 'select',
    },
    {
      id: 'addNode',
      icon: Circle,
      label: 'ノード追加モード',
      shortcut: 'N',
      onClick: () => setMode('addNode'),
      active: mode === 'addNode',
    },
    {
      id: 'addEdge',
      icon: ArrowRight,
      label: 'エッジ追加モード',
      shortcut: 'E',
      onClick: () => setMode('addEdge'),
      active: mode === 'addEdge',
    },
    { id: 'separator2' },
    {
      id: 'grid',
      icon: Grid3X3,
      label: 'グリッド表示',
      shortcut: 'Ctrl+G',
      onClick: toggleGrid,
      active: showGrid,
    },
    { id: 'separator3' },
    {
      id: 'export',
      icon: Download,
      label: 'TikZエクスポート',
      shortcut: '',
      onClick: handleExport,
    },
  ]

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-white border-b border-gray-200">
        {tools.map((tool) => {
          if (tool.id.startsWith('separator')) {
            return <div key={tool.id} className="w-px h-6 bg-gray-300 mx-1" />
          }

          const Icon = tool.icon!
          return (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={tool.active ? "default" : "ghost"}
                  size="icon"
                  onClick={tool.onClick}
                  disabled={tool.disabled}
                  className="h-8 w-8"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-center">
                  <div>{tool.label}</div>
                  {tool.shortcut && (
                    <div className="text-xs text-gray-500">{tool.shortcut}</div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

export default Toolbar
