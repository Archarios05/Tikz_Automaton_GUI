import React from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuCheckboxItem,
} from './ui/context-menu'
import { useEditorStore } from '../store/editorStore'
import { Settings, Trash2 } from 'lucide-react'

interface NodeContextMenuProps {
  children: React.ReactNode
  nodeId: string
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({ children, nodeId }) => {
  const { nodes, updateNode, deleteNode, setStartNode, openPropertyInspector, selectNode } = useEditorStore()
  const node = nodes.find(n => n.id === nodeId)

  if (!node) return <>{children}</>

  const handlePropertyClick = () => {
    selectNode(nodeId)
    openPropertyInspector()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuCheckboxItem
          checked={node.data.isAccepting}
          onCheckedChange={(checked) => updateNode(nodeId, { isAccepting: checked })}
        >
          受理状態
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={node.data.isInitial}
          onCheckedChange={(checked) => updateNode(nodeId, { isInitial: checked })}
        >
          初期状態
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={node.data.isStart}
          onCheckedChange={(checked) => {
            if (checked) {
              setStartNode(nodeId)
            } else {
              updateNode(nodeId, { isStart: false })
            }
          }}
        >
          開始点
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handlePropertyClick}>
          <Settings className="w-4 h-4 mr-2" />
          プロパティ...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => deleteNode(nodeId)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          削除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

interface EdgeContextMenuProps {
  children: React.ReactNode
  edgeId: string
}

export const EdgeContextMenu: React.FC<EdgeContextMenuProps> = ({ children, edgeId }) => {
  const { deleteEdge, openPropertyInspector, selectEdge } = useEditorStore()

  const handlePropertyClick = () => {
    selectEdge(edgeId)
    openPropertyInspector()
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={handlePropertyClick}>
          <Settings className="w-4 h-4 mr-2" />
          プロパティ...
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={() => deleteEdge(edgeId)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          削除
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
