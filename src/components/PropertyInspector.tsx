import React from 'react'
import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Slider } from './ui/slider'
import { useEditorStore } from '../store/editorStore'

const PropertyInspector: React.FC = () => {
  const {
    selectedNodeId,
    selectedEdgeId,
    nodes,
    edges,
    updateNode,
    updateEdge,
    isPropertyInspectorOpen,
    closePropertyInspector,
  } = useEditorStore()

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null
  const selectedEdge = selectedEdgeId ? edges.find(e => e.id === selectedEdgeId) : null

  if (!isPropertyInspectorOpen || (!selectedNode && !selectedEdge)) {
    return null
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-80 bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">プロパティ</h3>
          <Button variant="ghost" size="icon" onClick={closePropertyInspector}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {selectedNode && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">ノード設定</h4>
            
            <div className="space-y-2">
              <Label htmlFor="label">ラベル</Label>
              <Input
                id="label"
                value={selectedNode.data.label}
                onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fillColor">塗りつぶし色</Label>
              <Input
                id="fillColor"
                type="color"
                value={selectedNode.data.fillColor}
                onChange={(e) => updateNode(selectedNode.id, { fillColor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="drawColor">枠線色</Label>
              <Input
                id="drawColor"
                type="color"
                value={selectedNode.data.drawColor}
                onChange={(e) => updateNode(selectedNode.id, { drawColor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="width">幅: {selectedNode.data.width}px</Label>
              <Slider
                id="width"
                min={40}
                max={120}
                step={5}
                value={[selectedNode.data.width]}
                onValueChange={([value]) => updateNode(selectedNode.id, { width: value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">高さ: {selectedNode.data.height}px</Label>
              <Slider
                id="height"
                min={40}
                max={120}
                step={5}
                value={[selectedNode.data.height]}
                onValueChange={([value]) => updateNode(selectedNode.id, { height: value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="accepting"
                checked={selectedNode.data.isAccepting}
                onCheckedChange={(checked) => updateNode(selectedNode.id, { isAccepting: checked })}
              />
              <Label htmlFor="accepting">受理状態</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="initial"
                checked={selectedNode.data.isInitial}
                onCheckedChange={(checked) => updateNode(selectedNode.id, { isInitial: checked })}
              />
              <Label htmlFor="initial">初期状態</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="start"
                checked={selectedNode.data.isStart}
                onCheckedChange={(checked) => updateNode(selectedNode.id, { isStart: checked })}
              />
              <Label htmlFor="start">開始点</Label>
            </div>
          </div>
        )}

        {selectedEdge && selectedEdge.data && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700">エッジ設定</h4>
            
            <div className="space-y-2">
              <Label htmlFor="edgeLabel">ラベル</Label>
              <Input
                id="edgeLabel"
                value={selectedEdge.data.label}
                onChange={(e) => updateEdge(selectedEdge.id, { label: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineColor">線の色</Label>
              <Input
                id="lineColor"
                type="color"
                value={selectedEdge.data.lineColor}
                onChange={(e) => updateEdge(selectedEdge.id, { lineColor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bendDirection">曲がり方向</Label>
              <select
                id="bendDirection"
                value={selectedEdge.data.bendDirection}
                onChange={(e) => updateEdge(selectedEdge.id, { bendDirection: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="none">直線</option>
                <option value="left">左に曲げる</option>
                <option value="right">右に曲げる</option>
                <option value="loop">ループ</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lineStyle">線のスタイル</Label>
              <select
                id="lineStyle"
                value={selectedEdge.data.lineStyle}
                onChange={(e) => updateEdge(selectedEdge.id, { lineStyle: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="solid">実線</option>
                <option value="dashed">破線</option>
                <option value="dotted">点線</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="labelPosition">ラベル位置</Label>
              <select
                id="labelPosition"
                value={selectedEdge.data.labelPosition}
                onChange={(e) => updateEdge(selectedEdge.id, { labelPosition: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="auto">自動</option>
                <option value="above">上</option>
                <option value="below">下</option>
                <option value="on">線上</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction">矢印の方向</Label>
              <select
                id="direction"
                value={selectedEdge.data.direction}
                onChange={(e) => updateEdge(selectedEdge.id, { direction: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="forward">→ (順方向)</option>
                <option value="backward">← (逆方向)</option>
                <option value="bidirectional">↔ (双方向)</option>
              </select>
            </div>

            {selectedEdge.data.direction === 'bidirectional' && (
              <div className="space-y-2">
                <Label htmlFor="reverseLabel">逆方向ラベル</Label>
                <Input
                  id="reverseLabel"
                  value={selectedEdge.data.reverseLabel || ''}
                  onChange={(e) => updateEdge(selectedEdge.id, { reverseLabel: e.target.value })}
                  placeholder="逆方向のラベル（空の場合は同じラベル）"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default PropertyInspector
