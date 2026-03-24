import { useEffect, useMemo, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useStackStore } from '../stores/useStackStore'

export interface ContextMenuState {
  x: number
  y: number
  layerId: string
}

interface ContextMenuProps {
  x: number
  y: number
  layerId: string
  onClose: () => void
  onDeleteRequest: (id: string) => void
  onSplitRequest: (id: string) => void
}

interface SplitConfirmDialogProps {
  layerName: string
  onConfirm: () => void
  onCancel: () => void
}

const menuItemStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontSize: 13,
  fontWeight: 600,
  textAlign: 'left',
  transition: 'background var(--duration-fast) var(--ease-smooth), opacity var(--duration-fast) var(--ease-smooth)'
}

function isCommonLayer(appliesTo: string[]): boolean {
  return appliesTo.length === 3
}

export function ContextMenu({
  x,
  y,
  layerId,
  onClose,
  onDeleteRequest,
  onSplitRequest
}: ContextMenuProps) {
  const layers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const structureMode = useStackStore((state) => state.project.structureMode)
  const duplicateLayer = useStackStore((state) => state.duplicateLayer)
  const lockLayer = useStackStore((state) => state.lockLayer)
  const mergeToCommon = useStackStore((state) => state.mergeToCommon)
  const menuRef = useRef<HTMLDivElement>(null)

  const layer = layers.find((entry) => entry.id === layerId)

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const position = useMemo(() => {
    const width = 220
    const height = 260

    return {
      left: Math.max(12, Math.min(x, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(y, window.innerHeight - height - 12))
    }
  }, [x, y])

  if (!layer) {
    return null
  }

  const isCommon = isCommonLayer(layer.appliesTo)
  const isIndividual = layer.appliesTo.length === 1
  const showSplit = structureMode === 'rgb' && isCommon
  const showMerge = structureMode === 'rgb' && isIndividual
  const sameRoleLayers = layers.filter((entry) => entry.role === layer.role && entry.appliesTo.length === 1)
  const hasR = sameRoleLayers.some((entry) => entry.appliesTo[0] === 'r')
  const hasG = sameRoleLayers.some((entry) => entry.appliesTo[0] === 'g')
  const hasB = sameRoleLayers.some((entry) => entry.appliesTo[0] === 'b')
  const canMerge = hasR && hasG && hasB
  const splitDisabled = layer.locked === true
  const deleteDisabled = layer.locked === true

  const handleMerge = () => {
    const rId = sameRoleLayers.find((entry) => entry.appliesTo[0] === 'r')?.id
    const gId = sameRoleLayers.find((entry) => entry.appliesTo[0] === 'g')?.id
    const bId = sameRoleLayers.find((entry) => entry.appliesTo[0] === 'b')?.id

    if (!rId || !gId || !bId) {
      return
    }

    mergeToCommon([rId, gId, bId])
    onClose()
  }

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        background: 'var(--bg-surface)',
        border: '1px solid var(--surface-line-faint)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--sp-2)',
        boxShadow: 'var(--shadow-lg)',
        minWidth: 200,
        zIndex: 1000
      }}
    >
      <MenuItem
        label="복제 (Ctrl+D)"
        onClick={() => {
          duplicateLayer(layer.id)
          onClose()
        }}
      />

      {showSplit ? (
        <MenuItem
          label="FMM 개별층으로 분리"
          disabled={splitDisabled}
          onClick={() => {
            onSplitRequest(layer.id)
            onClose()
          }}
        />
      ) : null}

      {showMerge ? (
        <MenuItem label="공통층으로 병합" disabled={!canMerge} onClick={handleMerge} />
      ) : null}

      <MenuItem
        label={layer.locked ? '잠금 해제' : '잠금'}
        onClick={() => {
          lockLayer(layer.id, !layer.locked)
          onClose()
        }}
      />

      <div
        style={{
          height: 1,
          margin: 'var(--sp-2) 4px',
          background: 'var(--surface-line-faint)'
        }}
      />

      <MenuItem
        label="삭제"
        disabled={deleteDisabled}
        danger
        onClick={() => {
          onDeleteRequest(layer.id)
          onClose()
        }}
      />
    </div>
  )
}

function MenuItem({
  label,
  onClick,
  disabled = false,
  danger = false
}: {
  label: string
  onClick?: () => void
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{
        ...menuItemStyle,
        color: danger ? 'var(--danger)' : menuItemStyle.color,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: 'transparent'
      }}
      onMouseEnter={(event) => {
        if (!disabled) {
          event.currentTarget.style.background = 'var(--bg-elevated)'
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
    >
      {label}
    </button>
  )
}

export function SplitConfirmDialog({
  layerName,
  onConfirm,
  onCancel
}: SplitConfirmDialogProps) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-backdrop)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        zIndex: 1001
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(420px, 100%)',
          padding: 24,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--surface-line-faint)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>FMM 개별층 분리</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{layerName}</strong> 공통층을
            R/G/B 개별층 3개로 분리합니다. 계속하시겠습니까?
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--surface-line-faint)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-blue)',
              color: 'var(--button-primary-text)',
              fontSize: 13,
              fontWeight: 700
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
