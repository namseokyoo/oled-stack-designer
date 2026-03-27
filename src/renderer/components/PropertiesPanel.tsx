import { Settings2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { ColorToken, LayerRole } from '../types'

const ROLE_OPTIONS: { value: LayerRole; label: string }[] = [
  { value: 'cathode', label: 'Cathode' },
  { value: 'eil', label: 'EIL' },
  { value: 'etl', label: 'ETL' },
  { value: 'eml', label: 'EML' },
  { value: 'htl', label: 'HTL' },
  { value: 'hil', label: 'HIL' },
  { value: 'anode', label: 'Anode' },
  { value: 'cgl', label: 'CGL' },
  { value: 'custom', label: 'Custom' }
]

const COLOR_TOKEN_OPTIONS: { value: ColorToken; label: string }[] = [
  { value: 'cathode', label: 'Cathode' },
  { value: 'eil', label: 'EIL' },
  { value: 'etl', label: 'ETL' },
  { value: 'eml-r', label: 'EML Red' },
  { value: 'eml-g', label: 'EML Green' },
  { value: 'eml-b', label: 'EML Blue' },
  { value: 'cgl', label: 'CGL' },
  { value: 'htl', label: 'HTL' },
  { value: 'hil', label: 'HIL' },
  { value: 'anode', label: 'Anode' },
  { value: 'custom', label: 'Custom' }
]

const sectionTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: 10
}

const fieldLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6
}

export function PropertiesPanel() {
  const structureMode = useStackStore((state) => state.project.structureMode)
  const projectLayers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const devices = useStackStore((state) => state.devices)
  const activeDeviceId = useStackStore((state) => state.activeDeviceId)
  const selectedLayerId = useStackStore((state) => state.selectedLayerId)
  const updateLayer = useStackStore((state) => state.updateLayer)

  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? devices[0]
  const layers = structureMode === 'compare' ? activeDevice?.layers ?? [] : projectLayers
  const layer = layers.find((entry) => entry.id === selectedLayerId)
  const isCommon = structureMode === 'rgb' && layer?.appliesTo.length === 3
  const isLocked = layer?.locked === true

  return (
    <aside
      style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--surface-line-faint)',
        background: 'var(--chrome-panel-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        overflowY: 'auto'
      }}
    >
      {!layer ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 12,
            padding: 28,
            color: 'var(--text-muted)'
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: 'var(--bg-overlay)',
              display: 'grid',
              placeItems: 'center'
            }}
          >
            <Settings2 size={22} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              레이어를 선택하세요
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.6 }}>
              중앙 캔버스에서 블록을 선택하면 이름, 재료, 두께, 색상을 편집할 수 있습니다.
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: 18 }}>
          <div>
            <p style={sectionTitle}>Layer Properties</p>
            <p style={{ fontSize: 13, fontWeight: 700 }}>{layer.name}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {structureMode === 'compare' && activeDevice ? (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'color-mix(in oklab, var(--accent-blue) 18%, transparent)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  비교 모드 — {activeDevice.name}
                </span>
              ) : null}
              {isCommon ? (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--surface-accent-soft)',
                    color: 'var(--text-primary)',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  공통층
                </span>
              ) : null}
              {isLocked ? (
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                >
                  잠금됨
                </span>
              ) : null}
            </div>
            <p
              style={{
                marginTop: 4,
                color: 'var(--text-muted)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)'
              }}
            >
              ID: {layer.id}
            </p>
          </div>

          <div>
            <p style={fieldLabel}>이름</p>
            <input
              value={layer.name}
              disabled={isLocked}
              onChange={(event) => updateLayer(layer.id, { name: event.target.value })}
              placeholder="레이어 이름"
            />
          </div>

          <div>
            <p style={fieldLabel}>역할</p>
            <select
              value={layer.role}
              disabled={isLocked}
              onChange={(event) =>
                updateLayer(layer.id, { role: event.target.value as LayerRole })
              }
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p style={fieldLabel}>재료</p>
            <input
              value={layer.material}
              disabled={isLocked}
              onChange={(event) => updateLayer(layer.id, { material: event.target.value })}
              placeholder="예: NPB, Alq3, ITO"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          <div>
            <p style={fieldLabel}>두께</p>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                min={1}
                max={10000}
                value={layer.thickness}
                disabled={isLocked}
                onChange={(event) => {
                  const rawValue = Number(event.target.value)
                  if (Number.isNaN(rawValue)) {
                    return
                  }

                  const clampedValue = Math.max(1, Math.min(10000, rawValue))
                  updateLayer(layer.id, { thickness: clampedValue })
                }}
                style={{ paddingRight: 42, fontFamily: 'var(--font-mono)' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: 12,
                  transform: 'translateY(-50%)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  pointerEvents: 'none'
                }}
              >
                nm
              </span>
            </div>
          </div>

          <div>
            <p style={fieldLabel}>색상 토큰</p>
            <select
              value={layer.colorToken}
              disabled={isLocked}
              onChange={(event) =>
                updateLayer(layer.id, {
                  colorToken: event.target.value as ColorToken,
                  customColor: undefined
                })
              }
            >
              {COLOR_TOKEN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p style={fieldLabel}>커스텀 색상</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={layer.customColor ?? '#7b7b7b'}
                disabled={isLocked}
                onChange={(event) => updateLayer(layer.id, { customColor: event.target.value })}
                style={{
                  width: 40,
                  height: 40,
                  padding: 3,
                  flexShrink: 0
                }}
              />
              {layer.customColor ? (
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => updateLayer(layer.id, { customColor: undefined })}
                  style={{
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--surface-line-faint)',
                    background: 'var(--bg-elevated)',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                  }}
                >
                  오버라이드 해제
                </button>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  현재 팔레트 색상을 사용 중입니다.
                </span>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--surface-line-faint)' }} />

          <div>
            <p style={sectionTitle}>Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Thickness</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{layer.thickness} nm</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'var(--text-secondary)'
                }}
              >
                <span>Applies To</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{layer.appliesTo.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
