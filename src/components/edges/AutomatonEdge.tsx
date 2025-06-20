import React from 'react'
import { EdgeProps, getStraightPath } from 'reactflow'
import { EdgeContextMenu } from '../ContextMenus'
import { AutomatonEdgeData } from '../../store/editorStore'

const AutomatonEdge: React.FC<EdgeProps<AutomatonEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}) => {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  const renderBidirectionalEdge = () => {
    // 双方向エッジを二本の線として描画
    const offsetDistance = 8 // 線の間隔
    
    // ベクトルを計算
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const length = Math.sqrt(dx * dx + dy * dy)
    
    if (length === 0) return null
    
    // 正規化された垂直ベクトル
    const perpX = -dy / length * offsetDistance
    const perpY = dx / length * offsetDistance
    
    // 二本の線の座標
    const [forwardPath] = getStraightPath({
      sourceX: sourceX + perpX,
      sourceY: sourceY + perpY,
      targetX: targetX + perpX,
      targetY: targetY + perpY,
    })
    
    const [backwardPath] = getStraightPath({
      sourceX: sourceX - perpX,
      sourceY: sourceY - perpY,
      targetX: targetX - perpX,
      targetY: targetY - perpY,
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
        
        {/* 順方向の線 */}
        <path
          style={{
            stroke: data?.lineColor || '#333333',
            strokeWidth: 2,
            fill: 'none',
            strokeDasharray: data?.lineStyle === 'dashed' ? '5,5' : data?.lineStyle === 'dotted' ? '2,2' : 'none',
          }}
          className="react-flow__edge-path"
          d={forwardPath}
          markerEnd="url(#arrow-forward)"
        />
        
        {/* 逆方向の線 */}
        <path
          style={{
            stroke: data?.lineColor || '#333333',
            strokeWidth: 2,
            fill: 'none',
            strokeDasharray: data?.lineStyle === 'dashed' ? '5,5' : data?.lineStyle === 'dotted' ? '2,2' : 'none',
          }}
          className="react-flow__edge-path"
          d={backwardPath}
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
              startOffset="30%"
              textAnchor="middle"
            >
              {data.label}
            </textPath>
          </text>
        )}
        
        {/* 逆方向ラベル */}
        {data?.reverseLabel && (
          <text>
            <textPath
              href={`#${id}`}
              style={{
                fontSize: '12px',
                fill: data?.lineColor || '#333333',
                fontFamily: 'system-ui, sans-serif',
              }}
              startOffset="70%"
              textAnchor="middle"
            >
              {data.reverseLabel}
            </textPath>
          </text>
        )}
      </>
    )
  }
  const getMarkers = () => {
    if (!data?.direction) return {}
    
    switch (data.direction) {
      case 'forward':
        return { markerEnd: 'url(#arrow-forward)' }
      case 'backward':
        return { markerStart: 'url(#arrow-backward)' }
      default:
        return { markerEnd: 'url(#arrow-forward)' }
    }
  }

  if (data?.direction === 'bidirectional') {
    return (
      <EdgeContextMenu edgeId={id}>
        <g>
          {renderBidirectionalEdge()}
        </g>
      </EdgeContextMenu>
    )
  }

  return (
    <EdgeContextMenu edgeId={id}>
      <g>
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
          {...getMarkers()}
        />
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
      </g>
    </EdgeContextMenu>
  )
}

export default AutomatonEdge
