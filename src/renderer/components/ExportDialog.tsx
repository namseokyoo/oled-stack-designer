import { useState } from 'react'
import { Download, FileCode, Image, X } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'
import { generateStackSVG, svgToPng, type ExportBackground } from '../utils/svgGenerator'

interface ExportDialogProps {
  onClose: () => void
}

type ExportFormat = 'png' | 'svg'

const BACKGROUND_OPTIONS: { value: ExportBackground; label: string; desc: string }[] = [
  { value: 'dark', label: '다크 배경', desc: '발표, 포스터용' },
  { value: 'white', label: '흰 배경', desc: '논문, 보고서용' },
  { value: 'transparent', label: '투명 배경', desc: '합성, 슬라이드 삽입용' }
]

function readBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Unexpected FileReader result'))
        return
      }

      resolve(result.split(',')[1] ?? '')
    }

    reader.readAsDataURL(blob)
  })
}

export function ExportDialog({ onClose }: ExportDialogProps) {
  const layers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const palette = useStackStore((state) => state.project.palette)
  const structureMode = useStackStore((state) => state.project.structureMode)
  const thicknessMode = useStackStore((state) => state.thicknessMode)
  const projectName = useStackStore((state) => state.project.metadata.name)

  const [format, setFormat] = useState<ExportFormat>('png')
  const [background, setBackground] = useState<ExportBackground>('dark')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (isExporting || layers.length === 0) {
      return
    }

    setIsExporting(true)

    try {
      const svgString = generateStackSVG({
        layers,
        palette,
        thicknessMode,
        background,
        structureMode
      })
      const defaultName = `${projectName.replace(/\s+/g, '-').toLowerCase()}-stack`

      if (format === 'svg') {
        const filePath = await window.oledApi.showSaveDialog(`${defaultName}.svg`)
        if (!filePath) {
          return
        }

        const savePath = filePath.endsWith('.svg') ? filePath : `${filePath}.svg`
        await window.oledApi.writeFile(savePath, svgString)
        onClose()
        return
      }

      const pngBlob = await svgToPng(svgString, 2)
      const base64 = await readBlobAsBase64(pngBlob)
      const filePath = await window.oledApi.showSaveDialog(`${defaultName}.png`)
      if (!filePath) {
        return
      }

      const savePath = filePath.endsWith('.png') ? filePath : `${filePath}.png`
      await window.oledApi.writeBinaryFile(savePath, base64)
      onClose()
    } catch (error) {
      console.error('내보내기 실패:', error)
      alert('내보내기 중 오류가 발생했습니다.')
    } finally {
      setIsExporting(false)
    }
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
          width: 400,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--surface-line-faint)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
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
          <span style={{ fontSize: 15, fontWeight: 700 }}>내보내기</span>
          <button
            type="button"
            onClick={onClose}
            style={{ color: 'var(--text-muted)', display: 'grid', placeItems: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 10
              }}
            >
              파일 형식
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['png', 'svg'] as const).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => setFormat(entry)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${format === entry ? 'var(--border-active)' : 'var(--surface-line-faint)'}`,
                    background:
                      format === entry ? 'var(--surface-accent-soft)' : 'var(--bg-elevated)',
                    color: format === entry ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    transition: 'all var(--duration-fast) var(--ease-smooth)'
                  }}
                >
                  {entry === 'png' ? <Image size={14} /> : <FileCode size={14} />}
                  {entry.toUpperCase()}
                </button>
              ))}
            </div>
            <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              {format === 'png'
                ? '2× 배율 (Retina 대응) · 최소 2000px 폭'
                : '벡터 형식 · Illustrator / Inkscape 편집 가능'}
            </p>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 10
              }}
            >
              배경색
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {BACKGROUND_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${background === option.value ? 'var(--border-active)' : 'var(--surface-line-faint)'}`,
                    background:
                      background === option.value
                        ? 'var(--surface-accent-soft)'
                        : 'var(--bg-elevated)',
                    cursor: 'pointer',
                    transition: 'all var(--duration-fast) var(--ease-smooth)'
                  }}
                >
                  <input
                    type="radio"
                    name="background"
                    value={option.value}
                    checked={background === option.value}
                    onChange={() => setBackground(option.value)}
                    style={{ width: 'auto', accentColor: 'var(--accent-blue)' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{option.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {option.desc}
                    </div>
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      width: 32,
                      height: 20,
                      borderRadius: 4,
                      border: '1px solid var(--surface-line-faint)',
                      background:
                        option.value === 'white'
                          ? '#ffffff'
                          : option.value === 'dark'
                            ? '#11131a'
                            : 'repeating-conic-gradient(#cccccc 0% 25%, #eeeeee 0% 50%) 0 0 / 8px 8px',
                      flexShrink: 0
                    }}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--surface-line-faint)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8
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
          <button
            type="button"
            onClick={() => {
              void handleExport()
            }}
            disabled={isExporting || layers.length === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-active), var(--accent-blue))',
              color: 'var(--button-primary-text)',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: isExporting || layers.length === 0 ? 0.6 : 1
            }}
          >
            <Download size={14} />
            {isExporting ? '내보내는 중...' : '내보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}
