import React, { useCallback, useRef } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Node,
  Edge,
} from 'reactflow'
import 'reactflow/dist/style.css'

import Toolbar from './components/Toolbar'
import AutomatonStateNode from './components/nodes/AutomatonStateNode'
import PropertyInspector from './components/PropertyInspector'
import { useEditorStore } from './store/editorStore'

const nodeTypes = {
  automatonState: AutomatonStateNode,
}

const AutomatonEditor: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const {
    nodes,
    edges,
    mode,
    showGrid,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdgeConnection,
    selectNode,
    selectEdge,
  } = useEditorStore()

  const onConnect = useCallback((connection: any) => {
    if (mode === 'addEdge') {
      addEdgeConnection(connection)
    }
  }, [mode, addEdgeConnection])

  const onCanvasClick = useCallback((event: React.MouseEvent) => {
    if (mode === 'addNode' && reactFlowWrapper.current) {
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: event.clientX - reactFlowBounds.left - 30, // Offset for node center
        y: event.clientY - reactFlowBounds.top - 30,
      }
      addNode(position)
    }
  }, [mode, addNode])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectNode(node.id)
  }, [selectNode])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    selectEdge(edge.id)
  }, [selectEdge])

  const onPaneClick = useCallback(() => {
    selectNode(null)
    selectEdge(null)
  }, [selectNode, selectEdge])

  return (
    <div className="h-screen flex flex-col">
      <Toolbar />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onClick={onCanvasClick}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          snapToGrid={true}
          snapGrid={[15, 15]}
          className={mode === 'addNode' ? 'cursor-crosshair' : 'cursor-default'}
        >
          {showGrid && <Background />}
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              const nodeData = node.data as any
              return nodeData?.isStart ? '#10b981' : '#6b7280'
            }}
            className="!bg-white !border !border-gray-300"
          />
        </ReactFlow>
        <PropertyInspector />
      </div>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <AutomatonEditor />
    </ReactFlowProvider>
  )
}

export default App
