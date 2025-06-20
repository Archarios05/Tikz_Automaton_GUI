import { create } from 'zustand'
import { temporal } from 'zundo'
import { Node, Edge, Connection, addEdge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange } from 'reactflow'

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
  bendDirection: 'none' | 'left' | 'right' | 'loop'
  labelPosition: 'auto' | 'above' | 'below' | 'on'
  lineColor: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  direction: 'forward' | 'backward' | 'bidirectional'
  // 双方向エッジの場合の逆方向ラベル
  reverseLabel?: string
  transition?: string // Optional transition property for edges
}

export type AutomatonNode = Node<AutomatonNodeData>
export type AutomatonEdge = Edge<AutomatonEdgeData>

export type EditorMode = 'select' | 'addNode' | 'addEdge'

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
      type: 'straight',      data: {
        label: 'a',
        bendDirection: 'none',
        labelPosition: 'auto',
        lineColor: '#333333',
        lineStyle: 'solid',
        direction: 'forward',
      },
    },
  ],  mode: 'select',
  showGrid: true,
  selectedNodeId: null,
  selectedEdgeId: null,
  isPropertyInspectorOpen: false,
  pendingEdgeStart: null,
}

export const useEditorStore = create<EditorState & EditorActions>()(
  temporal(
    (set, get) => ({
      ...initialState,

      setMode: (mode) => set({ mode, pendingEdgeStart: null }),

      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

      addNode: (position) => {
        const newNode: AutomatonNode = {
          id: `node-${Date.now()}`,
          type: 'automatonState',
          position,
          data: {
            label: `q${get().nodes.length}`,
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
            target: connection.target,
            type: isLoop ? 'selfLoop' : 'straight',            data: {
              label: '',
              bendDirection: isLoop ? 'loop' : 'none',
              labelPosition: 'auto',
              lineColor: '#333333',
              lineStyle: 'solid',
              direction: 'forward',
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
      },

      handleNodeClickForEdge: (nodeId) => {
        const { pendingEdgeStart, edges } = get()

        if (pendingEdgeStart) {
          // 既に始点が設定されている場合、エッジを追加
          const newEdge: AutomatonEdge = {
            id: `edge-${Date.now()}`,
            source: pendingEdgeStart,
            target: nodeId,
            type: 'straight',
            data: {
              label: '',
              bendDirection: 'none',
              labelPosition: 'auto',
              lineColor: '#333333',
              lineStyle: 'solid',
              direction: 'forward',
            },
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

      exportToTikz: () => {
        const { nodes, edges } = get()
        
        let tikzCode = '\\begin{tikzpicture}[shorten >=1pt,node distance=2cm,on grid,auto]\n'
          // Add nodes
        nodes.forEach((node) => {
          const { label, isAccepting, isInitial, isStart } = node.data
          const position = `(${node.position.x / 50},${-node.position.y / 50})`
          
          let nodeType = 'state'
          if (isAccepting) nodeType = 'state,accepting'
          if (isInitial) nodeType = 'state,initial'
          if (isStart) nodeType = 'state,initial'
          
          tikzCode += `  \\node[${nodeType}] (${node.id}) at ${position} {${label}};\n`
        })
        
        tikzCode += '\n'        // Add edges
        edges.forEach((edge) => {
          if (!edge.data) return
          const { label, bendDirection, direction, reverseLabel } = edge.data
          const source = edge.source
          const target = edge.target
          
          let edgeOptions = ''
          if (bendDirection === 'left') edgeOptions = '[bend left]'
          else if (bendDirection === 'right') edgeOptions = '[bend right]'
          else if (bendDirection === 'loop') edgeOptions = '[loop above]'
          
          if (direction === 'bidirectional') {
            // 双方向の場合は二本の矢印として出力
            // 順方向
            const forwardOptions = bendDirection === 'left' ? '[bend left]' : 
                                 bendDirection === 'right' ? '[bend right]' : ''
            tikzCode += `  \\path[->] (${source}) edge ${forwardOptions} node {${label}} (${target});\n`
            
            // 逆方向
            const backwardOptions = bendDirection === 'left' ? '[bend right]' : 
                                  bendDirection === 'right' ? '[bend left]' : 
                                  bendDirection === 'none' ? '[bend left]' : ''
            const backwardLabel = reverseLabel || label
            tikzCode += `  \\path[->] (${target}) edge ${backwardOptions} node {${backwardLabel}} (${source});\n`
          } else {
            // 単方向の場合
            let arrowDirection = '->'
            if (direction === 'backward') arrowDirection = '<-'
            
            if (source === target) {
              tikzCode += `  \\path[${arrowDirection}] (${source}) edge ${edgeOptions} node {${label}} (${target});\n`
            } else {
              tikzCode += `  \\path[${arrowDirection}] (${source}) edge ${edgeOptions} node {${label}} (${target});\n`
            }
          }
        })
        
        tikzCode += '\\end{tikzpicture}'
        
        return tikzCode
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
