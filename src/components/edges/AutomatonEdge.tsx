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
  source,
  target,
}) => {  const getBidirectionalEdgePairs = useEditorStore(state => state.getBidirectionalEdgePairs)
  
  // 自己ループかどうかを判定
  const isSelfLoop = source === target
  
  // 同じノード間の逆向きエッジの存在を確認（オフセット描画のため）
  const bidirectionalPairs = getBidirectionalEdgePairs()
  const hasBidirectionalPair = bidirectionalPairs.some(pair => 
    pair.forward.id === id || pair.backward.id === id
  )  // オフセット付きエッジのレンダリング（双方向ペアの場合）
  const renderOffsetEdge = () => {
    const nodeRadius = 30
    const offsetDistance = 8
    
    // 双方向ペアを見つける
    const bidirectionalPair = bidirectionalPairs.find(pair => 
      pair.forward.id === id || pair.backward.id === id
    )
    
    if (!bidirectionalPair) return null
    
    const isForward = bidirectionalPair.forward.id === id
    
    // ベクトルを計算
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return null
    
    // 正規化されたベクトル
    const unitX = dx / length
    const unitY = dy / length    // 垂直ベクトル（90度回転）
    const perpX = -unitY * offsetDistance
    const perpY = unitX * offsetDistance
    
    // 座標系を統一：ピクセル座標（sourceX/sourceY, targetX/targetY）で方向判定
    // 左から右、または上から下への方向を「正方向」とする
    const deltaX = targetX - sourceX
    const deltaY = targetY - sourceY
      let isPositiveDirection: boolean
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平方向の移動が主 - 左から右が正方向
      isPositiveDirection = deltaX > 0
    } else {
      // 垂直方向の移動が主 - 上から下が正方向
      isPositiveDirection = deltaY > 0
    }
    
    // forward エッジと backward エッジで異なる側にオフセット
    let finalOffsetX, finalOffsetY
    if ((isForward && isPositiveDirection) || (!isForward && !isPositiveDirection)) {
      // 正方向のforwardエッジまたは負方向のbackwardエッジは右側（または時計回り）
      finalOffsetX = perpX
      finalOffsetY = perpY
    } else {
      // 負方向のforwardエッジまたは正方向のbackwardエッジは左側（または反時計回り）
      finalOffsetX = -perpX
      finalOffsetY = -perpY
    }
    
    // オフセットされた座標
    const offsetSourceX = sourceX + finalOffsetX
    const offsetSourceY = sourceY + finalOffsetY
    const offsetTargetX = targetX + finalOffsetX
    const offsetTargetY = targetY + finalOffsetY
    
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
      targetY: endY,    })

    const getMarker = () => {
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
          </text>        )}
      </>
    )
  }
  const renderSelfLoopEdge = () => {
    const nodeRadius = 30
    const loopSize = 40
    const direction = data?.loopDirection || 'above'
    
    let startX, startY, endX, endY, controlX, controlY, labelX, labelY
    
    switch (direction) {
      case 'above':
        startX = sourceX + nodeRadius * 0.7
        startY = sourceY - nodeRadius * 0.7
        endX = sourceX - nodeRadius * 0.7
        endY = sourceY - nodeRadius * 0.7
        controlX = sourceX
        controlY = sourceY - nodeRadius - loopSize
        labelX = sourceX
        labelY = sourceY - nodeRadius - loopSize * 0.7
        break
      case 'below':
        startX = sourceX - nodeRadius * 0.7
        startY = sourceY + nodeRadius * 0.7
        endX = sourceX + nodeRadius * 0.7
        endY = sourceY + nodeRadius * 0.7
        controlX = sourceX
        controlY = sourceY + nodeRadius + loopSize
        labelX = sourceX
        labelY = sourceY + nodeRadius + loopSize * 0.7
        break
      case 'left':
        startX = sourceX - nodeRadius * 0.7
        startY = sourceY - nodeRadius * 0.7
        endX = sourceX - nodeRadius * 0.7
        endY = sourceY + nodeRadius * 0.7
        controlX = sourceX - nodeRadius - loopSize
        controlY = sourceY
        labelX = sourceX - nodeRadius - loopSize * 0.7
        labelY = sourceY
        break
      case 'right':
        startX = sourceX + nodeRadius * 0.7
        startY = sourceY + nodeRadius * 0.7
        endX = sourceX + nodeRadius * 0.7
        endY = sourceY - nodeRadius * 0.7
        controlX = sourceX + nodeRadius + loopSize
        controlY = sourceY
        labelX = sourceX + nodeRadius + loopSize * 0.7
        labelY = sourceY
        break
      default:
        startX = sourceX + nodeRadius * 0.7
        startY = sourceY - nodeRadius * 0.7
        endX = sourceX - nodeRadius * 0.7
        endY = sourceY - nodeRadius * 0.7
        controlX = sourceX
        controlY = sourceY - nodeRadius - loopSize
        labelX = sourceX
        labelY = sourceY - nodeRadius - loopSize * 0.7
    }
    
    // ベジェ曲線パス
    const loopPath = `M ${startX},${startY} Q ${controlX},${controlY} ${endX},${endY}`

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
          d={loopPath}
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
          d={loopPath}
          markerEnd="url(#arrow-forward)"
        />
        
        {/* ラベル */}
        {data?.label && (
          <text
            x={labelX}
            y={labelY}
            style={{
              fontSize: '12px',
              fill: data?.lineColor || '#333333',
              fontFamily: 'system-ui, sans-serif',
              textAnchor: 'middle',
              dominantBaseline: 'middle',
            }}
          >
            {data.label}
          </text>
        )}
      </>
    )
  }

  return (
    <EdgeContextMenu edgeId={id}>
      <g>
        {isSelfLoop ? renderSelfLoopEdge() : hasBidirectionalPair ? renderOffsetEdge() : renderSingleEdge()}
      </g>
    </EdgeContextMenu>
  )
}

export default AutomatonEdge
