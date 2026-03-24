import { useEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent
} from 'react'
import { GripVertical, Lock, Trash2 } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'
import type { Layer, ThicknessMode } from '../types'

interface LayerBlockProps {
  layer: Layer
  onDeleteRequest: (id: string) => void
  thicknessMode?: ThicknessMode
  scaleFactor?: number
  dragListeners?: HTMLAttributes<HTMLElement> & { draggable?: boolean }
  isDragging?: boolean
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void
}

export const UNIFORM_HEIGHT = 52
export const MIN_REAL_HEIGHT = 36

export function getLayerColor(layer: Layer): string {
  if (layer.customColor) {
    return layer.customColor
  }

  const tokenMap: Record<Layer['colorToken'], string> = {
    cathode: 'var(--layer-cathode)',
    eil: 'var(--layer-eil)',
    etl: 'var(--layer-etl)',
    'eml-b': 'var(--layer-eml-b)',
    'eml-g': 'var(--layer-eml-g)',
    'eml-r': 'var(--layer-eml-r)',
    cgl: 'var(--layer-cgl)',
    htl: 'var(--layer-htl)',
    hil: 'var(--layer-hil)',
    anode: 'var(--layer-anode)',
    custom: 'var(--bg-overlay)'
  }

  return tokenMap[layer.colorToken]
}

export function getBlockHeight(
  layer: Layer,
  thicknessMode: ThicknessMode,
  scaleFactor: number
): number {
  if (thicknessMode === 'real') {
    return Math.max(MIN_REAL_HEIGHT, layer.thickness * scaleFactor)
  }

  return UNIFORM_HEIGHT
}

export function LayerBlock({
  layer,
  onDeleteRequest,
  thicknessMode = 'uniform',
  scaleFactor = 1,
  dragListeners,
  isDragging = false,
  onContextMenu
}: LayerBlockProps) {
  const selectedLayerId = useStackStore((state) => state.selectedLayerId)
  const selectLayer = useStackStore((state) => state.selectLayer)
  const updateLayer = useStackStore((state) => state.updateLayer)

  const isSelected = selectedLayerId === layer.id
  const [hovered, setHovered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(layer.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const blockHeight = getBlockHeight(layer, thicknessMode, scaleFactor)
  const isCompact = thicknessMode === 'real' && blockHeight < 44
  const isLocked = layer.locked === true
  const showDeleteAction = !isLocked && (hovered || isSelected) && !isEditing && !isDragging

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) {
      setDraftName(layer.name)
    }
  }, [isEditing, layer.name])

  useEffect(() => {
    if (isLocked && isEditing) {
      setIsEditing(false)
    }
  }, [isEditing, isLocked])

  const commitEdit = () => {
    if (isLocked) {
      setIsEditing(false)
      return
    }

    const nextName = draftName.trim()
    if (nextName) {
      updateLayer(layer.id, { name: nextName })
    }
    setIsEditing(false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitEdit()
    }

    if (event.key === 'Escape') {
      setDraftName(layer.name)
      setIsEditing(false)
    }
  }

  const layerColor = getLayerColor(layer)
  const blockStyle: CSSProperties = {
    minHeight: blockHeight,
    height: blockHeight,
    borderRadius: 'var(--radius-lg)',
    background: layerColor,
    border: `1px solid ${isSelected ? 'var(--border-active)' : 'var(--surface-line-faint)'}`,
    boxShadow: isDragging
      ? 'var(--shadow-lg)'
      : isSelected
        ? 'var(--shadow-glow), var(--shadow-sm)'
        : hovered
          ? 'var(--shadow-md)'
          : 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 14px',
    cursor: isDragging ? 'grabbing' : 'pointer',
    position: 'relative',
    transition:
      'height var(--duration-slow) var(--ease-smooth), box-shadow var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth), transform var(--duration-fast) var(--ease-smooth)',
    userSelect: 'none',
    overflow: 'hidden',
    opacity: isDragging ? 0.9 : 1
  }

  return (
    <div
      onClick={() => selectLayer(layer.id)}
      onDoubleClick={() => {
        if (!isLocked) {
          setIsEditing(true)
        }
      }}
      onContextMenu={onContextMenu}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={blockStyle}
      title={isCompact ? layer.material || 'Material not set' : undefined}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, color-mix(in oklab, white 8%, transparent), color-mix(in oklab, black 8%, transparent))',
          pointerEvents: 'none'
        }}
      />

      {dragListeners && !isLocked ? (
        <div
          {...dragListeners}
          onClick={(event) => event.stopPropagation()}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            padding: '0 4px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
            touchAction: 'none'
          }}
          title="드래그하여 순서 변경"
        >
          <GripVertical size={14} />
        </div>
      ) : null}

      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            onClick={(event) => event.stopPropagation()}
            style={{
              border: 'none',
              padding: 0,
              background: 'transparent',
              color: 'var(--layer-text-primary)',
              fontSize: isCompact ? 12 : 14,
              fontWeight: isCompact ? 600 : 700,
              boxShadow: 'none'
            }}
          />
        ) : isCompact ? (
          <span
            style={{
              display: 'block',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--layer-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 2px var(--layer-action-bg)'
            }}
          >
            {layer.name} · {layer.thickness}nm
          </span>
        ) : (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--layer-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              textShadow: '0 1px 2px var(--layer-action-bg)'
            }}
          >
            {layer.name}
          </span>
        )}
      </div>

      {!isCompact ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 3,
            marginRight: showDeleteAction ? 36 : isLocked ? 24 : 0,
            position: 'relative',
            zIndex: 1,
            transition: 'margin-right var(--duration-fast) var(--ease-smooth)'
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--layer-text-primary)',
              textShadow: '0 1px 2px var(--layer-action-bg)'
            }}
          >
            {layer.thickness} nm
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--layer-text-secondary)',
              maxWidth: 140,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            title={layer.material || 'Material not set'}
          >
            {layer.material || 'No material'}
          </span>
        </div>
      ) : null}

      {isLocked ? (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: 12,
            transform: 'translateY(-50%)',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--button-primary-text)',
            zIndex: 2
          }}
          title="잠긴 레이어"
        >
          <Lock size={12} />
        </div>
      ) : null}

      {showDeleteAction ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDeleteRequest(layer.id)
          }}
          style={{
            position: 'absolute',
            top: '50%',
            right: 10,
            transform: 'translateY(-50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--layer-action-bg)',
            color: 'var(--button-primary-text)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 2
          }}
          title="레이어 삭제"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  )
}
