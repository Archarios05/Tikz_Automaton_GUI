import React, { useState, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useEditorStore, AutomatonNodeData } from '../../store/editorStore'
import { NodeContextMenu } from '../ContextMenus'
import { cn } from '../../lib/utils'

const AutomatonStateNode: React.FC<NodeProps<AutomatonNodeData>> = ({ 
  id, 
  data, 
  selected 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(data.label)
  const updateNode = useEditorStore(state => state.updateNode)

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true)
    setEditValue(data.label)
  }, [data.label])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      updateNode(id, { label: editValue })
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setEditValue(data.label)
      setIsEditing(false)
    }
  }, [id, editValue, data.label, updateNode])

  const handleBlur = useCallback(() => {
    updateNode(id, { label: editValue })
    setIsEditing(false)
  }, [id, editValue, updateNode])

  return (
    <NodeContextMenu nodeId={id}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full border-2 bg-white text-sm font-medium transition-all",
          "hover:shadow-lg cursor-pointer",
          {
            "border-blue-500 shadow-blue-200": selected,
            "border-gray-800": !selected && !data.isStart,
            "border-green-500": data.isStart,
            "border-4 border-double": data.isAccepting,
          }
        )}
        style={{
          width: data.width,
          height: data.height,
          backgroundColor: data.fillColor,
          borderColor: selected ? '#3b82f6' : data.isStart ? '#10b981' : data.drawColor,
        }}
        onDoubleClick={handleDoubleClick}
      >
        {/* Initial state arrow */}
        {data.isInitial && (
          <div 
            className="absolute -left-6 top-1/2 -translate-y-1/2"
            style={{ 
              width: 0, 
              height: 0, 
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: `15px solid ${data.drawColor}`,
            }}
          />
        )}

        {/* Node content */}
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent text-center border-none outline-none"
            autoFocus
          />
        ) : (
          <span className="select-none">{data.label}</span>
        )}

        {/* Connection handles */}
        <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
        <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
        <Handle type="target" position={Position.Left} className="!bg-transparent !border-0" />
        <Handle type="source" position={Position.Right} className="!bg-transparent !border-0" />
      </div>
    </NodeContextMenu>
  )
}

export default AutomatonStateNode
