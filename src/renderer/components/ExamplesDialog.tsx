import { useEffect, useState } from 'react'
import { FileStack, X } from 'lucide-react'

interface Example {
  name: string
  description: string
  filename: string
}

interface ExamplesDialogProps {
  onSelect: (filePath: string) => void | Promise<unknown>
  onClose: () => void
}

const EXAMPLES: Example[] = [
  {
    name: 'Basic OLED Stack',
    description: '기본 7층 단일 스택 (ITO/HIL/HTL/EML/ETL/EIL/Al)',
    filename: 'example-basic-oled.json'
  },
  {
    name: 'RGB FMM Structure',
    description: 'RGB 개별 EML을 가진 FMM 구조 9층',
    filename: 'example-rgb-fmm.json'
  },
  {
    name: 'Minimal Stack',
    description: '최소 구조 (Anode/EML/Cathode 3층)',
    filename: 'example-minimal.json'
  }
]

function joinExamplePath(basePath: string, filename: string): string {
  return basePath.endsWith('/') || basePath.endsWith('\\')
    ? `${basePath}${filename}`
    : `${basePath}/${filename}`
}

export function ExamplesDialog({ onSelect, onClose }: ExamplesDialogProps) {
  const [examplesPath, setExamplesPath] = useState<string | null>(null)

  useEffect(() => {
    window.oledApi.getExamplesPath().then(setExamplesPath).catch(() => undefined)
  }, [])

  const handleSelect = async (filename: string) => {
    if (!examplesPath) {
      return
    }

    await onSelect(joinExamplePath(examplesPath, filename))
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--overlay-backdrop)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        style={{
          width: 440,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--surface-line-faint)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--surface-line-faint)'
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700 }}>예제 프로젝트 열기</span>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', display: 'grid', placeItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXAMPLES.map((example) => (
            <button
              key={example.filename}
              type="button"
              onClick={() => {
                void handleSelect(example.filename)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--surface-line-faint)',
                background: 'var(--bg-elevated)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-smooth)'
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-overlay)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0
                }}
              >
                <FileStack size={18} color="var(--text-secondary)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {example.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                  {example.description}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--surface-line-faint)',
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
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
        </div>
      </div>
    </div>
  )
}
