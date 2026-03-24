import { FileStack, FolderOpen, Plus } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'

interface EmptyStateProps {
  onOpenExamples: () => void
}

export function EmptyState({ onOpenExamples }: EmptyStateProps) {
  const addLayer = useStackStore((state) => state.addLayer)

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          padding: 28,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--chrome-panel-bg)',
          border: '1px solid var(--surface-line-faint)',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 18
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '24px',
            background: 'linear-gradient(180deg, var(--bg-overlay), transparent)',
            border: '1px solid var(--surface-line-faint)',
            display: 'grid',
            placeItems: 'center',
            position: 'relative'
          }}
        >
          <FileStack size={30} color="var(--text-secondary)" />
          <div
            style={{
              position: 'absolute',
              inset: 10,
              borderRadius: 18,
              border: '1px dashed var(--surface-line-faint)'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 18, fontWeight: 700 }}>OLED 스택을 시작해보세요</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
            첫 레이어를 추가하면 중앙 캔버스에서 순서를 조정하고, 우측 패널에서 재료와 두께를
            편집할 수 있습니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => addLayer()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-active), var(--accent-blue))',
              color: 'var(--button-primary-text)',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={14} />
            새 레이어 추가
          </button>

          <button
            type="button"
            onClick={onOpenExamples}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--surface-line-faint)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <FolderOpen size={14} />
            예제 파일 열기
          </button>
        </div>
      </div>
    </div>
  )
}
