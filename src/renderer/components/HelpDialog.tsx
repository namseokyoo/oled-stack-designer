import type { CSSProperties } from 'react'
import { X } from 'lucide-react'

interface HelpDialogProps {
  onClose: () => void
}

const SHORTCUTS = [
  { action: '새 프로젝트', key: 'Ctrl+N' },
  { action: '열기', key: 'Ctrl+O' },
  { action: '저장', key: 'Ctrl+S' },
  { action: '다른 이름으로 저장', key: 'Ctrl+Shift+S' },
  { action: '내보내기', key: 'Ctrl+E' },
  { action: '실행취소', key: 'Ctrl+Z' },
  { action: '다시실행', key: 'Ctrl+Y' },
  { action: '레이어 복제', key: 'Ctrl+D' },
  { action: '레이어 삭제', key: 'Delete' },
  { action: '레이어 순서 변경', key: 'Alt+↑/↓' },
  { action: '도움말', key: 'F1' }
]

const sectionTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 10,
  color: 'var(--text-primary)'
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  return (
    <div
      onClick={onClose}
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
          width: 'min(560px, 100%)',
          maxHeight: '80vh',
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
            padding: '18px 24px',
            borderBottom: '1px solid var(--surface-line-faint)',
            flexShrink: 0
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>도움말</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            overflow: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 24
          }}
        >
          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>단축키 일람</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '6px 8px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--surface-line-faint)'
                    }}
                  >
                    동작
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '6px 8px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      borderBottom: '1px solid var(--surface-line-faint)'
                    }}
                  >
                    단축키
                  </th>
                </tr>
              </thead>
              <tbody>
                {SHORTCUTS.map(({ action, key }) => (
                  <tr key={action}>
                    <td
                      style={{
                        padding: '6px 8px',
                        color: 'var(--text-primary)',
                        borderBottom: '1px solid var(--surface-line-faint)'
                      }}
                    >
                      {action}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                      <code
                        style={{
                          background: 'var(--bg-elevated)',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--surface-line-faint)'
                        }}
                      >
                        {key}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>기본 사용법</p>
            <ol
              style={{
                margin: 0,
                paddingLeft: 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}
            >
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>레이어 추가</strong>: 우측
                패널의 [레이어 추가] 버튼으로 새 레이어를 생성합니다.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>레이어 편집</strong>: 레이어를
                클릭하면 우측 패널에서 이름, 재료, 두께, 색상을 편집할 수 있습니다.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>내보내기</strong>: Ctrl+E 또는
                툴바의 내보내기 버튼으로 PNG/SVG 이미지를 생성합니다.
              </li>
              <li>
                <strong style={{ color: 'var(--text-primary)' }}>저장/불러오기</strong>:
                .oledstack 형식으로 프로젝트를 저장하고 나중에 불러올 수 있습니다.
              </li>
            </ol>
          </div>

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>모드 설명</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Single Stack
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  단일 OLED 스택 구조를 설계합니다. 기본 모드.
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  RGB 통합
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  R, G, B 서브픽셀 스택을 나란히 비교하며 설계합니다.
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Uniform 두께 모드
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  모든 레이어를 균일한 높이로 표시합니다.
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Real 두께 모드
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  실제 나노미터(nm) 두께에 비례하여 레이어를 표시합니다.
                </p>
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <p style={sectionTitleStyle}>팔레트 설명</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Classic
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  진한 채도의 클래식한 색상 조합. 발표, 포스터에 적합합니다.
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pastel
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  부드러운 파스텔 색조. 논문, 보고서 삽입에 적합합니다.
                </p>
              </div>
              <div>
                <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Vivid
                </p>
                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  선명하고 강렬한 색상. 시각적 임팩트가 필요할 때 사용합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
