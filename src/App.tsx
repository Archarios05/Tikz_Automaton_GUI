import React, { useCallback, useRef } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  Edge,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'

import Toolbar from './components/Toolbar'
import AutomatonStateNode from './components/nodes/AutomatonStateNodeNew'
import AutomatonEdgeNew from './components/edges/AutomatonEdgeNew'
import PropertyInspector from './components/PropertyInspector'
import Toast from './components/ui/Toast'
import { useEditorStore } from './store/editorStore'

const nodeTypes = {
  automatonState: AutomatonStateNode,
}

const edgeTypes = {
  straight: AutomatonEdgeNew,
}

const AutomatonEditor: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()
  const {
    nodes,
    edges,
    mode,
    showGrid,
    onNodesChange,
    onEdgesChange,    addNode,
    selectNode,
    selectEdge,
    pendingEdgeStart,
    cancelPendingEdge,
    toasts,
    hideToast,
  } = useEditorStore()

  // エッジドラッグによる作成を無効化
  const onConnect = useCallback(() => {
    // エッジ編集モードでは何もしない
  }, [])
  const onCanvasClick = useCallback((event: React.MouseEvent) => {
    if (mode === 'addNode' && reactFlowWrapper.current) {
      // ReactFlowの座標変換を使用してクリック位置を正確に計算
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const clientPosition = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      }
      
      // ReactFlowのproject関数でズーム・パンを考慮した座標に変換
      const position = project(clientPosition)
      
      // ノードの中心がクリック位置になるように調整
      const adjustedPosition = {
        x: position.x - 30, // ノード幅の半分
        y: position.y - 30, // ノード高さの半分
      }
      
      addNode(adjustedPosition)
    } else if (mode === 'addEdge' && pendingEdgeStart) {
      // エッジ編集モード中にキャンバスをクリックしたらキャンセル
      cancelPendingEdge()
    }  }, [mode, addNode, pendingEdgeStart, cancelPendingEdge, project])
  
  // const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
  //   if (mode === 'addEdge') {
  //     handleNodeClickForEdge(node.id)
  //   } else {
  //     selectNode(node.id)
  //   }
  // }, [mode, handleNodeClickForEdge, selectNode])

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
          edges={edges}          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          // onNodeClick={onNodeClick} // ノードコンポーネント内で直接処理
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onClick={onCanvasClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}          connectionMode={ConnectionMode.Loose}
          fitView
          snapToGrid={true}
          snapGrid={[15, 15]}
          selectNodesOnDrag={false}
          nodeDragThreshold={1}
          className={mode === 'addNode' ? 'cursor-crosshair' : 'cursor-default'}>
          <svg>
            <defs>
              <marker
                id="arrow-forward"
                markerWidth="12"
                markerHeight="12"
                refX="10"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="#333333" />
              </marker>
              <marker
                id="arrow-backward"
                markerWidth="12"
                markerHeight="12"
                refX="2"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M9,0 L9,6 L0,3 z" fill="#333333" />
              </marker>
            </defs>
          </svg>
          {showGrid && <Background />}
          <Controls />
          <MiniMap 
            nodeColor={(node) => {
              const nodeData = node.data as any
              return nodeData?.isStart ? '#10b981' : '#6b7280'
            }}
            className="!bg-white !border !border-gray-300"
          />        </ReactFlow>
        <PropertyInspector />
        {/* トースト通知 */}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
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
