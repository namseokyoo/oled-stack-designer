interface DeleteConfirmDialogProps {
  layerName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  layerName,
  onConfirm,
  onCancel
}: DeleteConfirmDialogProps) {
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
        zIndex: 1000
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(360px, 100%)',
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
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>레이어 삭제</h3>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{layerName}</strong> 레이어를
            삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
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
              background: 'var(--danger)',
              color: 'var(--button-primary-text)',
              fontSize: 13,
              fontWeight: 700
            }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
