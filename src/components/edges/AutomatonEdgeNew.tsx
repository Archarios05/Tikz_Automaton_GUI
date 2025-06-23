import React from 'react'
import { EdgeProps, getStraightPath } from 'reactflow'
import { EdgeContextMenu } from '../ContextMenus'
import { AutomatonEdgeData, useEditorStore } from '../../store/editorStore'

const AutomatonEdge: React.FC<EdgeProps<AutomatonEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) => {
  const getBidirectionalEdgePairs = useEditorStore(state => state.getBidirectionalEdgePairs)
  // 双方向エッジペアを取得
  const bidirectionalPairs = getBidirectionalEdgePairs()
  
  // 現在のエッジが双方向ペアの一部かチェック
  const bidirectionalPair = bidirectionalPairs.find(pair => 
    pair.forward.id === id || pair.backward.id === id
  )

  const renderBidirectionalEdge = () => {
    if (!bidirectionalPair) return null

    const isForward = bidirectionalPair.forward.id === id
    const offsetDistance = 10 // ノード中心からのオフセット距離（確実に分離するため増加）
    const nodeRadius = 30 // ノードの半径（width/height = 60px）
    
    // ベクトルを計算
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return null
    
    // 正規化されたベクトル
    const unitX = dx / length
    const unitY = dy / length
    
    // 正規化された垂直ベクトル
    const perpX = -dy / length * offsetDistance
    const perpY = dx / length * offsetDistance
      // より安定したオフセット方向の決定
    // 1. ノードペアのIDを組み合わせてハッシュ値を生成し、一貫した方向を決定
    const sourceId = bidirectionalPair.forward.source
    const targetId = bidirectionalPair.forward.target
    const pairKey = [sourceId, targetId].sort().join('-')
    const hashValue = pairKey.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const baseOffsetDirection = hashValue % 2 === 0
    
    // 2. 現在のエッジがforwardかbackwardかに基づいて最終的な方向を決定
    const isCurrentForwardOffset = isForward ? baseOffsetDirection : !baseOffsetDirection
    
    // 安定したオフセット方向を適用
    const offsetX = isCurrentForwardOffset ? perpX : -perpX
    const offsetY = isCurrentForwardOffset ? perpY : -perpY
    
    // ノード境界での終端を計算（オフセット後の座標から）
    const offsetSourceX = sourceX + offsetX
    const offsetSourceY = sourceY + offsetY
    const offsetTargetX = targetX + offsetX
    const offsetTargetY = targetY + offsetY
    
    // ノード境界での開始点と終点を計算
    const startX = offsetSourceX + unitX * nodeRadius
    const startY = offsetSourceY + unitY * nodeRadius
    const endX = offsetTargetX - unitX * nodeRadius
    const endY = offsetTargetY - unitY * nodeRadius
    
    // オフセットされた座標で直線パスを計算
    const [edgePath] = getStraightPath({
      sourceX: startX,
      sourceY: startY,
      targetX: endX,
      targetY: endY,
    })

    return (
      <>
        {/* 透明な太いパス - 当たり判定用 */}
        <path
          style={{
            stroke: 'transparent',
            strokeWidth: 20,
            fill: 'none',
          }}
          className="react-flow__edge-path"
          d={edgePath}
        />
        
        {/* 実際に表示されるエッジ */}
        <path
          id={id}
          style={{
            stroke: data?.lineColor || '#333333',
            strokeWidth: 2,
            fill: 'none',
            strokeDasharray: data?.lineStyle === 'dashed' ? '5,5' : data?.lineStyle === 'dotted' ? '2,2' : 'none',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          markerEnd="url(#arrow-forward)"
        />
        
        {/* ラベル */}
        {data?.label && (
          <text>
            <textPath
              href={`#${id}`}
              style={{
                fontSize: '12px',
                fill: data?.lineColor || '#333333',
                fontFamily: 'system-ui, sans-serif',
              }}
              startOffset="50%"
              textAnchor="middle"
            >
              {data.label}
            </textPath>
          </text>
        )}
      </>
    )
  }
  const renderSingleEdge = () => {
    const nodeRadius = 30 // ノードの半径（width/height = 60px）
    
    // ベクトルを計算
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return null
    
    // 正規化されたベクトル
    const unitX = dx / length
    const unitY = dy / length
    
    // ノード境界での開始点と終点を計算
    const startX = sourceX + unitX * nodeRadius
    const startY = sourceY + unitY * nodeRadius
    const endX = targetX - unitX * nodeRadius
    const endY = targetY - unitY * nodeRadius
    
    // ノード境界間の直線パスを計算
    const [edgePath] = getStraightPath({
      sourceX: startX,
      sourceY: startY,
      targetX: endX,
      targetY: endY,
    })

    const getMarker = () => {
      if (data?.direction === 'backward') {
        return { markerStart: 'url(#arrow-backward)' }
      }
      return { markerEnd: 'url(#arrow-forward)' }
    }

    return (
      <>
        {/* 透明な太いパス - 当たり判定用 */}
        <path
          style={{
            stroke: 'transparent',
            strokeWidth: 20,
            fill: 'none',
          }}
          className="react-flow__edge-path"
          d={edgePath}
        />
        
        {/* 実際に表示されるエッジ */}
        <path
          id={id}
          style={{
            stroke: data?.lineColor || '#333333',
            strokeWidth: 2,
            fill: 'none',
            strokeDasharray: data?.lineStyle === 'dashed' ? '5,5' : data?.lineStyle === 'dotted' ? '2,2' : 'none',
          }}
          className="react-flow__edge-path"
          d={edgePath}
          {...getMarker()}
        />
        
        {/* ラベル */}
        {data?.label && (
          <text>
            <textPath
              href={`#${id}`}
              style={{
                fontSize: '12px',
                fill: data?.lineColor || '#333333',
                fontFamily: 'system-ui, sans-serif',
              }}
              startOffset="50%"
              textAnchor="middle"
            >
              {data.label}
            </textPath>
          </text>
        )}
      </>
    )
  }

  return (
    <EdgeContextMenu edgeId={id}>
      <g>
        {bidirectionalPair ? renderBidirectionalEdge() : renderSingleEdge()}
      </g>
    </EdgeContextMenu>
  )
}

export default AutomatonEdge
