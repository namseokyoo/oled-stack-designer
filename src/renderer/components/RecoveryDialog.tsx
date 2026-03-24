import type { CSSProperties } from 'react'

interface RecoveryDialogProps {
  minutesAgo: number
  onRecover: () => void
  onDismiss: () => void
}

const buttonStyle: CSSProperties = {
  padding: '8px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 13,
  fontWeight: 600
}

export function RecoveryDialog({
  minutesAgo,
  onRecover,
  onDismiss
}: RecoveryDialogProps) {
  return (
    <div
      onClick={onDismiss}
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
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>복구 가능한 백업 발견</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            저장되지 않은 작업이 {minutesAgo}분 전에 백업되었습니다. 복구하시겠습니까?
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              ...buttonStyle,
              border: '1px solid var(--surface-line-faint)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)'
            }}
          >
            무시
          </button>
          <button
            type="button"
            onClick={onRecover}
            style={{
              ...buttonStyle,
              border: '1px solid transparent',
              background: 'var(--accent-blue)',
              color: 'var(--button-primary-text)',
              fontWeight: 700
            }}
          >
            복구
          </button>
        </div>
      </div>
    </div>
  )
}
