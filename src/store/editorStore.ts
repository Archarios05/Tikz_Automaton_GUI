import { create } from 'zustand'
import { temporal } from 'zundo'
import { Node, Edge, Connection, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow'

// ノード間の向きと距離に基づいて双方向エッジの最適な角度を計算
const calculateBidirectionalAngles = (sourceNode: AutomatonNode, targetNode: AutomatonNode) => {
  const dx = targetNode.position.x - sourceNode.position.x
  const dy = sourceNode.position.y - targetNode.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  // ノード間ベクトルの角度（TikZ基準: 東0°、反時計回り）
  const baseAngle = Math.atan2(dy, dx) * 180 / Math.PI
  
  // 距離に応じた分離角度とlooseness
  let separationAngle: number
  let looseness: number
  
  if (distance < 150) {
    separationAngle = 30  // 近距離：適度に分離（回り込まない）
    looseness = 1.2
  } else if (distance < 300) {
    separationAngle = 25  // 中距離：適度に分離
    looseness = 1.0
  } else {
    separationAngle = 20  // 長距離：緩やかに分離
    looseness = 0.8
  }
  
  // 正規化関数：角度を-180〜180度の範囲に調整
  const normalizeAngle = (angle: number) => {
    while (angle > 180) angle -= 360
    while (angle < -180) angle += 360
    return angle
  }
    // 第1エッジ（上側曲線）- ベクトルに対して+分離角度
  const edge1Out = normalizeAngle(baseAngle + separationAngle)
  const edge1In = normalizeAngle(baseAngle + 180 + separationAngle)  // 対称にするため同じ符号
  
  // 第2エッジ（下側曲線）- ベクトルに対して-分離角度（完全対称）
  const edge2Out = normalizeAngle(baseAngle - separationAngle)
  const edge2In = normalizeAngle(baseAngle + 180 - separationAngle)  // 対称にするため同じ符号
  
  return {
    baseAngle,
    edge1: { out: edge1Out, in: edge1In },
    edge2: { out: edge2Out, in: edge2In },
    separationAngle,
    looseness,
    distance
  }
}

// 制御点オフセット計算（cm単位）
const calculateControlOffset = (sourceNode: AutomatonNode, targetNode: AutomatonNode, separationCm = 0.5) => {
  // ReactFlow coords to TikZ coords (invert Y)
  const dx = (targetNode.position.x - sourceNode.position.x) / 80
  const dy = (sourceNode.position.y - targetNode.position.y) / 80
  const dist = Math.sqrt(dx*dx + dy*dy)
  if (dist === 0) return { x: 0, y: 0 }
  // 単位法線ベクトル
  const ux = dx / dist
  const uy = dy / dist
  // 法線ベクトル（90°回転）
  const px = -uy * separationCm
  const py = ux * separationCm
  return { x: px, y: py }
}

export interface AutomatonNodeData {
  label: string
  isAccepting: boolean
  isInitial: boolean
  isStart: boolean
  fillColor: string
  drawColor: string
  width: number
  height: number
}

export interface AutomatonEdgeData {
  label: string
  bendDirection: 'none' | 'left' | 'right'
  loopDirection: 'above' | 'below' | 'left' | 'right' // 自己ループの方向
  labelPosition: 'auto' | 'above' | 'below' | 'on'
  lineColor: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  transition?: string // Optional transition property for edges
}

export type AutomatonNode = Node<AutomatonNodeData>
export type AutomatonEdge = Edge<AutomatonEdgeData>

export type EditorMode = 'select' | 'addNode' | 'addEdge'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'warning' | 'error' | 'info'
  duration?: number
}

interface EditorState {
  nodes: AutomatonNode[]
  edges: AutomatonEdge[]
  mode: EditorMode
  showGrid: boolean
  selectedNodeId: string | null
  selectedEdgeId: string | null
  isPropertyInspectorOpen: boolean
  // エッジ編集用の一時状態
  pendingEdgeStart: string | null
  // トースト通知
  toasts: ToastMessage[]
}

interface EditorActions {
  setMode: (mode: EditorMode) => void
  toggleGrid: () => void
  addNode: (position: { x: number; y: number }) => void
  updateNode: (id: string, updates: Partial<AutomatonNodeData>) => void
  deleteNode: (id: string) => void
  addEdgeConnection: (connection: Connection) => void
  updateEdge: (id: string, updates: Partial<AutomatonEdgeData>) => void
  deleteEdge: (id: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void
  openPropertyInspector: () => void
  closePropertyInspector: () => void
  setStartNode: (id: string) => void
  handleNodeClickForEdge: (nodeId: string) => void
  cancelPendingEdge: () => void
  exportToTikz: () => string
  getBidirectionalEdgePairs: () => Array<{
    forward: AutomatonEdge
    backward: AutomatonEdge
  }>
  // トースト通知
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info', duration?: number) => void
  hideToast: (id: string) => void
}

const initialState: EditorState = {
  nodes: [
    {
      id: 'sample-node-1',
      type: 'automatonState',
      position: { x: 100, y: 100 },
      data: {
        label: 'q0',
        isAccepting: false,
        isInitial: true,
        isStart: true,
        fillColor: '#ffffff',
        drawColor: '#333333',
        width: 60,
        height: 60,
      },
    },
    {
      id: 'sample-node-2',
      type: 'automatonState',
      position: { x: 300, y: 100 },
      data: {
        label: 'q1',
        isAccepting: true,
        isInitial: false,
        isStart: false,
        fillColor: '#ffffff',
        drawColor: '#333333',
        width: 60,
        height: 60,
      },
    },
  ],  edges: [
    {
      id: 'sample-edge-1',
      source: 'sample-node-1',
      target: 'sample-node-2',
      type: 'straight',
      data: {
        label: 'a',
        bendDirection: 'none',
        loopDirection: 'above',
        labelPosition: 'auto',
        lineColor: '#333333',
        lineStyle: 'solid',
      },
    },
    {
      id: 'sample-edge-2',
      source: 'sample-node-2',
      target: 'sample-node-1',
      type: 'straight',
      data: {
        label: 'b',
        bendDirection: 'none',
        loopDirection: 'above',
        labelPosition: 'auto',
        lineColor: '#333333',
        lineStyle: 'solid',
      },
    },
  ],mode: 'select',
  showGrid: true,
  selectedNodeId: null,
  selectedEdgeId: null,
  isPropertyInspectorOpen: false,
  pendingEdgeStart: null,
  toasts: [],
}

export const useEditorStore = create<EditorState & EditorActions>()(
  temporal(
    (set, get) => ({
      ...initialState,

      setMode: (mode) => set({ mode, pendingEdgeStart: null }),

      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),      addNode: (position) => {
        const { nodes, showToast } = get()
        const newLabel = `q${nodes.length}`
        
        // 同じラベルのノードが既に存在するかチェック
        const existingNode = nodes.find(node => node.data.label === newLabel)
        if (existingNode) {
          showToast(`ラベル "${newLabel}" のノードは既に存在します。`, 'warning')
        }
        
        const newNode: AutomatonNode = {
          id: `node-${Date.now()}`,
          type: 'automatonState',
          position,
          data: {
            label: newLabel,
            isAccepting: false,
            isInitial: false,
            isStart: false,
            fillColor: '#ffffff',
            drawColor: '#333333',
            width: 60,
            height: 60,
          },
        }
        set((state) => ({ nodes: [...state.nodes, newNode] }))
      },

      updateNode: (id, updates) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
          ),
        }))
      },

      deleteNode: (id) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== id),
          edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }))
      },      addEdgeConnection: (connection) => {
        if (connection.source && connection.target) {
          const isLoop = connection.source === connection.target
          const newEdge: AutomatonEdge = {
            id: `edge-${Date.now()}`,
            source: connection.source,
            target: connection.target,            type: isLoop ? 'selfLoop' : 'straight',            data: {
              label: '',
              bendDirection: 'none',
              loopDirection: 'above',
              labelPosition: 'auto',
              lineColor: '#333333',
              lineStyle: 'solid',
            },
          }
          set((state) => ({ edges: [...state.edges, newEdge] }))
        }
      },updateEdge: (id, updates) => {
        set((state) => ({
          edges: state.edges.map((edge) =>
            edge.id === id && edge.data ? { 
              ...edge, 
              data: { ...edge.data, ...updates } 
            } : edge
          ) as AutomatonEdge[],
        }))
      },

      deleteEdge: (id) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== id),
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        }))
      },

      onNodesChange: (changes) => {
        set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) }))
      },

      onEdgesChange: (changes) => {
        set((state) => ({ edges: applyEdgeChanges(changes, state.edges) }))
      },

      selectNode: (id) => {
        set({ selectedNodeId: id, selectedEdgeId: null })
      },

      selectEdge: (id) => {
        set({ selectedEdgeId: id, selectedNodeId: null })
      },

      openPropertyInspector: () => {
        set({ isPropertyInspectorOpen: true })
      },

      closePropertyInspector: () => {
        set({ isPropertyInspectorOpen: false })
      },

      setStartNode: (id) => {
        set((state) => ({
          nodes: state.nodes.map((node) => ({
            ...node,
            data: { ...node.data, isStart: node.id === id },
          })),
        }))
      },      handleNodeClickForEdge: (nodeId) => {
        const { pendingEdgeStart, edges, showToast } = get()

        if (pendingEdgeStart) {
          // 既に同じ方向のエッジが存在するかチェック
          const existingEdge = edges.find(edge => 
            edge.source === pendingEdgeStart && edge.target === nodeId
          )

          if (existingEdge) {
            showToast('この方向のエッジは既に存在しています。', 'warning')
            set({ pendingEdgeStart: null })
            return
          }

          // 自己ループの場合は特別なタイプを設定
          const isLoop = pendingEdgeStart === nodeId
          
          // 既に始点が設定されている場合、エッジを追加
          const newEdge: AutomatonEdge = {
            id: `edge-${Date.now()}`,
            source: pendingEdgeStart,
            target: nodeId,
            type: isLoop ? 'selfLoop' : 'straight',            data: {
              label: '',
              bendDirection: 'none',
              loopDirection: 'above',
              labelPosition: 'auto',
              lineColor: '#333333',
              lineStyle: 'solid',
            },
          }
          
          if (isLoop) {
            showToast('自己ループ遷移が追加されました。', 'success')
          }
          
          set((state) => ({
            edges: [...state.edges, newEdge],
            pendingEdgeStart: null, // エッジ追加後は始点をクリア
          }))
        } else {
          // 始点が未設定の場合、ノードIDを始点として設定
          set({ pendingEdgeStart: nodeId })
        }
      },

      cancelPendingEdge: () => {
        set({ pendingEdgeStart: null })
      },

      getBidirectionalEdgePairs: () => {
        const { edges } = get()
        const pairs: Array<{ forward: AutomatonEdge; backward: AutomatonEdge }> = []
        const processedEdges = new Set<string>()

        edges.forEach(edge => {
          if (processedEdges.has(edge.id)) return

          // 逆方向のエッジを探す
          const reverseEdge = edges.find(e => 
            e.source === edge.target && 
            e.target === edge.source &&
            !processedEdges.has(e.id)
          )

          if (reverseEdge) {
            pairs.push({ forward: edge, backward: reverseEdge })
            processedEdges.add(edge.id)
            processedEdges.add(reverseEdge.id)
          }
        })

        return pairs
      },

      exportToTikz: () => {
        const { nodes, edges } = get()
        
        // TikZ automataライブラリの公式記法に準拠
        let tikzCode = '\\usetikzlibrary{automata,positioning}\n'
        // shorten でノード境界上からエッジを開始・終了
        tikzCode += '\\begin{tikzpicture}[shorten >=0.4cm,shorten <=0.4cm,node distance=2cm,on grid,auto]\n'
        
        // ノードを配置
        const sortedNodes = [...nodes].sort((a, b) => a.position.x + a.position.y - b.position.x - b.position.y)
        
        sortedNodes.forEach((node) => {
          const { label, isAccepting, isInitial, isStart } = node.data
          
          // ノードタイプの決定（公式記法）
          let nodeOptions = ['state']
          if (isAccepting) nodeOptions.push('accepting')
          if (isInitial || isStart) nodeOptions.push('initial')
          
          // 座標を適切なスケールに変換（グリッドに合わせる）
          const position = `(${(node.position.x / 80).toFixed(1)},${(-node.position.y / 80).toFixed(1)})`
          const nodeLabel = label || node.id
          
          tikzCode += `  \\node[${nodeOptions.join(',')}] (${node.id}) at ${position} {$${nodeLabel}$};\n`
        })
        
        tikzCode += '\n'
        
        // 双方向エッジペアを検出してbend設定を自動調整
        const bidirectionalPairs = get().getBidirectionalEdgePairs()
        const processedEdges = new Set<string>()
          // エッジを追加（公式記法）
        if (edges.length > 0) {
          // ノード境界から少しオフセットして開始・終了、線を実際に描画
          tikzCode += '  \\draw[->,shorten >=0.25cm,shorten <=0.25cm]\n'
          
          const edgeLines: string[] = []
          
          edges.forEach((edge) => {
            if (!edge.data || processedEdges.has(edge.id)) return
            
            const { label, bendDirection, loopDirection } = edge.data
            const source = edge.source
            const target = edge.target
            
            // 自己ループの場合
            if (source === target) {
              const loopDir = loopDirection || 'above'
              const edgeLabel = label || ''
              edgeLines.push(`    (${source}) edge [loop ${loopDir}] node {${edgeLabel}} ()`)
              processedEdges.add(edge.id)
              return
            }
            
            // 双方向エッジペアかチェック
            const bidirectionalPair = bidirectionalPairs.find(pair => 
              pair.forward.id === edge.id || pair.backward.id === edge.id
            )
            
            if (bidirectionalPair) {
              const forwardEdge = bidirectionalPair.forward
              const backwardEdge = bidirectionalPair.backward
              const forwardLabel = forwardEdge.data?.label || ''
              const backwardLabel = backwardEdge.data?.label || ''
              const sourceNode = nodes.find(n => n.id === forwardEdge.source)
              const targetNode = nodes.find(n => n.id === forwardEdge.target)
              if (sourceNode && targetNode) {
                // ノード間直線を中心線として法線方向にオフセット制御点を設定
                const offset = calculateControlOffset(sourceNode, targetNode)
                // 第1エッジ（+法線方向）
                edgeLines.push(
                  `    (${forwardEdge.source}) .. controls +(${offset.x.toFixed(2)},${offset.y.toFixed(2)}) and +(${offset.x.toFixed(2)},${offset.y.toFixed(2)}) .. node {${forwardLabel}} (${forwardEdge.target})`
                )
                // 第2エッジ（-法線方向）
                edgeLines.push(
                  `    (${backwardEdge.source}) .. controls +(${-offset.x.toFixed(2)},${-offset.y.toFixed(2)}) and +(${-offset.x.toFixed(2)},${-offset.y.toFixed(2)}) .. node [swap] {${backwardLabel}} (${backwardEdge.target})`
                )
              } else {
                // Fallback: 距離と角度ベース
                const angles = calculateBidirectionalAngles(sourceNode!, targetNode!)
                const sep = angles.separationAngle
                const loose = angles.looseness
                edgeLines.push(
                  `    (${forwardEdge.source}) edge [bend left=${sep},looseness=${loose}] node {${forwardLabel}} (${forwardEdge.target})`
                )
                edgeLines.push(
                  `    (${backwardEdge.source}) edge [bend right=${sep},looseness=${loose}] node [swap] {${backwardLabel}} (${backwardEdge.target})`
                )
              }
              processedEdges.add(forwardEdge.id)
              processedEdges.add(backwardEdge.id)
              return
            } else {
              // 単方向エッジの場合
              let edgeOptions = ''
              let nodeOptions = ''
              
              if (bendDirection === 'left') {
                edgeOptions = ' [bend left]'
              } else if (bendDirection === 'right') {
                edgeOptions = ' [bend right]'
                nodeOptions = ' [swap]'
              }
              
              const edgeLabel = label || ''
              edgeLines.push(`    (${source}) edge${edgeOptions} node${nodeOptions} {${edgeLabel}} (${target})`)
              processedEdges.add(edge.id)
            }
          })
          
          // エッジラインを結合
          tikzCode += edgeLines.join('\n')
          if (edgeLines.length > 0) {
            tikzCode += ';\n'
          }
        }
        
        tikzCode += '\\end{tikzpicture}'
        return tikzCode
      },

      showToast: (message, type = 'info', duration = 3000) => {
        const id = `toast-${Date.now()}-${Math.random()}`
        set((state) => ({
          toasts: [...state.toasts, { id, message, type, duration }]
        }))
      },

      hideToast: (id) => {
        set((state) => ({
          toasts: state.toasts.filter(toast => toast.id !== id)
        }))
      },
    }),
    {
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        showGrid: state.showGrid,
      }),
    }
  )
)
