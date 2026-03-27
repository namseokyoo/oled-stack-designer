import { Redo2, Undo2 } from 'lucide-react'
import { useStackStore, selectTotalThickness } from '../stores/useStackStore'

export function StatusBar() {
  const layers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const totalThickness = useStackStore((state) => selectTotalThickness(state))
  const palette = useStackStore((state) => state.project.palette)
  const updatedAt = useStackStore((state) => state.project.metadata.updatedAt)
  const isDirty = useStackStore((state) => state.isDirty)
  const undo = useStackStore((state) => state.undo)
  const redo = useStackStore((state) => state.redo)
  const history = useStackStore((state) => state.history)
  const historyIndex = useStackStore((state) => state.historyIndex)
  const lastAutosaveTime = useStackStore((state) => state.lastAutosaveTime)
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <footer
      style={{
        height: 26,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '0 16px',
        borderTop: '1px solid var(--surface-line-faint)',
        background: 'var(--bg-surface)',
        color: 'var(--text-muted)',
        fontSize: 11,
        flexShrink: 0
      }}
    >
      <span>
        레이어 <strong style={{ color: 'var(--text-secondary)' }}>{layers.length}</strong>개
      </span>
      <span>Total <strong style={{ color: 'var(--text-primary)' }}>{totalThickness} nm</strong></span>
      <span>팔레트 {palette}</span>
      {isDirty ? <span style={{ color: 'var(--accent-active)' }}>● 미저장</span> : null}
      {lastAutosaveTime ? (
        <span style={{ color: 'var(--text-muted)' }}>
          자동 저장됨 {lastAutosaveTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ) : null}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)'
        }}
      >
        Updated {new Date(updatedAt).toLocaleTimeString()}
      </span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="실행 취소 (Ctrl+Z)"
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--radius-sm)',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            opacity: canUndo ? 1 : 0.35
          }}
        >
          <Undo2 size={14} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="다시 실행 (Ctrl+Y)"
          style={{
            width: 22,
            height: 22,
            borderRadius: 'var(--radius-sm)',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            opacity: canRedo ? 1 : 0.35
          }}
        >
          <Redo2 size={14} />
        </button>
      </div>
      <span>M5 · Save &amp; Export</span>
    </footer>
  )
}
