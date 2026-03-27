import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { Device, Layer } from '../types'
import { EmptyState } from './EmptyState'
import { getLayerColor } from './LayerBlock'
import { useCanvasKeyboardShortcuts } from './canvasShared'

const DEVICE_ACCENTS = [
  'oklch(65% 0.20 265)',
  'oklch(68% 0.18 145)',
  'oklch(65% 0.20 30)',
  'oklch(65% 0.20 310)'
]

const DEVICE_LABELS = ['A', 'B', 'C', 'D']
const CHANGED_ACCENT = 'oklch(85% 0.16 80)'
const ADDED_ACCENT = 'oklch(74% 0.18 145)'

interface CompareCanvasProps {
  onOpenExamples: () => void
}

type LayerKey = {
  role: string
  name: string
}

type DiffStatus = 'same' | 'changed' | 'added' | 'missing'

function buildUnifiedLayerList(devices: Device[]): LayerKey[] {
  const seen = new Set<string>()
  const result: LayerKey[] = []

  for (const device of devices) {
    for (const layer of device.layers) {
      const key = `${layer.role}::${layer.name}`

      if (!seen.has(key)) {
        seen.add(key)
        result.push({ role: layer.role, name: layer.name })
      }
    }
  }

  return result
}

function findLayer(device: Device, role: string, name: string): Layer | undefined {
  return device.layers.find((layer) => layer.role === role && layer.name === name)
}

function getDiffStatus(
  layer: Layer | undefined,
  baseLayer: Layer | undefined,
  isBaseDevice: boolean
): DiffStatus {
  if (isBaseDevice) {
    return layer ? 'same' : 'missing'
  }

  if (!layer) {
    return 'missing'
  }

  if (!baseLayer) {
    return 'added'
  }

  if (layer.thickness !== baseLayer.thickness || layer.material !== baseLayer.material) {
    return 'changed'
  }

  return 'same'
}

function getTotalThickness(layers: Layer[]): number {
  return layers.reduce((sum, layer) => sum + layer.thickness, 0)
}

function DiffBadge({ status }: { status: DiffStatus }) {
  if (status === 'changed') {
    return (
      <span
        style={{
          padding: '3px 7px',
          borderRadius: 'var(--radius-pill)',
          background: 'oklch(80% 0.16 80 / 0.2)',
          color: 'oklch(85% 0.16 80)',
          border: '1px solid oklch(80% 0.16 80 / 0.3)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.04em'
        }}
      >
        Δ
      </span>
    )
  }

  if (status === 'added') {
    return (
      <span
        style={{
          padding: '3px 7px',
          borderRadius: 'var(--radius-pill)',
          background: 'oklch(68% 0.18 145 / 0.2)',
          color: 'oklch(74% 0.18 145)',
          border: '1px solid oklch(68% 0.18 145 / 0.3)',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.04em'
        }}
      >
        +
      </span>
    )
  }

  return null
}

function EmptyLayerBlock() {
  return (
    <div
      style={{
        height: 52,
        borderRadius: 'var(--radius-lg)',
        background: 'oklch(16% 0.01 250)',
        border: '1px dashed var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 16,
        fontWeight: 700
      }}
    >
      —
    </div>
  )
}

function CompareLegend() {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '8px 20px',
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        flexShrink: 0
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em'
        }}
      >
        범례
      </span>
      <LegendItem accent={CHANGED_ACCENT} label="Δ Changed" />
      <LegendItem accent={ADDED_ACCENT} label="+ Added" />
      <LegendItem accent="var(--text-muted)" label="— Not present" />
    </div>
  )
}

function LegendItem({ accent, label }: { accent: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: accent,
          display: 'block'
        }}
      />
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

function AddDeviceCard({ onAdd }: { onAdd: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={onAdd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 300,
        minWidth: 300,
        minHeight: 220,
        padding: 0,
        borderRadius: 'var(--radius-xl)',
        border: '1px dashed var(--border-subtle)',
        background: hovered ? 'oklch(65% 0.20 265 / 0.04)' : 'var(--bg-surface)',
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        transition:
          'border-color var(--duration-fast) var(--ease-smooth), background var(--duration-fast) var(--ease-smooth)'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1px solid var(--surface-line-faint)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--accent-blue)'
        }}
      >
        <Plus size={18} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>Device 추가</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>최대 4개까지 비교할 수 있습니다.</div>
    </button>
  )
}

interface DeviceCardProps {
  device: Device
  accent: string
  label: string
  isActive: boolean
  unifiedLayers: LayerKey[]
  baseDevice: Device
  isBaseDevice: boolean
  selectedLayerId: string | null
  onSelectDevice: () => void
  onSelectLayer: (layerId: string) => void
  canRemove: boolean
  onRemove: () => void
}

function DeviceCard({
  device,
  accent,
  label,
  isActive,
  unifiedLayers,
  baseDevice,
  isBaseDevice,
  selectedLayerId,
  onSelectDevice,
  onSelectLayer,
  canRemove,
  onRemove
}: DeviceCardProps) {
  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}
    >
      <div
        style={{
          padding: 16,
          borderRadius: 'var(--radius-xl)',
          border: `1px solid ${isActive ? accent : 'var(--surface-line-faint)'}`,
          background: 'var(--bg-surface)',
          boxShadow: isActive ? '0 0 0 1px color-mix(in oklab, transparent 70%, white)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <button
            type="button"
            onClick={onSelectDevice}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 0,
              flex: 1,
              color: 'inherit',
              background: 'transparent',
              border: 'none',
              padding: 0
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: accent,
                color: 'white',
                display: 'grid',
                placeItems: 'center',
                fontSize: 12,
                fontWeight: 800,
                flexShrink: 0
              }}
            >
              {label}
            </span>
            <div style={{ minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{device.name}</div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                {device.layers.length}층 · {getTotalThickness(device.layers)} nm
              </div>
            </div>
          </button>

          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: '1px solid var(--surface-line-faint)',
                background: 'transparent',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--text-muted)',
                flexShrink: 0
              }}
              title={`${device.name} 제거`}
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {unifiedLayers.map((entry) => {
          const layer = findLayer(device, entry.role, entry.name)
          const baseLayer = findLayer(baseDevice, entry.role, entry.name)
          const diffStatus = getDiffStatus(layer, baseLayer, isBaseDevice)
          const leftBarColor =
            diffStatus === 'changed'
              ? CHANGED_ACCENT
              : diffStatus === 'added'
                ? ADDED_ACCENT
                : 'transparent'

          if (!layer) {
            return <EmptyLayerBlock key={`${device.id}-${entry.role}-${entry.name}`} />
          }

          const isSelected = isActive && selectedLayerId === layer.id

          return (
            <button
              key={`${device.id}-${entry.role}-${entry.name}`}
              type="button"
              onClick={() => {
                onSelectDevice()
                onSelectLayer(layer.id)
              }}
              style={{
                position: 'relative',
                height: 52,
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${isSelected ? accent : 'var(--surface-line-faint)'}`,
                background: getLayerColor(layer),
                boxShadow: isSelected
                  ? `0 0 0 1px ${accent}, 0 0 12px color-mix(in oklab, ${accent} 35%, transparent)`
                  : 'var(--shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 12px 0 14px',
                overflow: 'hidden',
                color: 'var(--layer-text-primary)'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3,
                  background: leftBarColor
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 24,
                  borderRadius: 999,
                  background: 'color-mix(in oklab, black 18%, transparent)',
                  border: '1px solid color-mix(in oklab, white 24%, transparent)',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textShadow: '0 1px 2px var(--layer-action-bg)'
                  }}
                >
                  {layer.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--layer-text-secondary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {layer.material || 'No material'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    textShadow: '0 1px 2px var(--layer-action-bg)'
                  }}
                >
                  {layer.thickness} nm
                </span>
                <DiffBadge status={diffStatus} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function CompareCanvas({ onOpenExamples }: CompareCanvasProps) {
  const devices = useStackStore((state) => state.devices)
  const activeDeviceId = useStackStore((state) => state.activeDeviceId)
  const selectedLayerId = useStackStore((state) => state.selectedLayerId)
  const addDevice = useStackStore((state) => state.addDevice)
  const removeDevice = useStackStore((state) => state.removeDevice)
  const setActiveDevice = useStackStore((state) => state.setActiveDevice)
  const selectLayer = useStackStore((state) => state.selectLayer)
  const removeLayer = useStackStore((state) => state.removeLayer)

  const activeDevice = devices.find((device) => device.id === activeDeviceId) ?? devices[0] ?? null

  useCanvasKeyboardShortcuts({
    layers: activeDevice?.layers ?? [],
    onDeleteRequest: removeLayer
  })

  if (devices.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmptyState onOpenExamples={onOpenExamples} />
      </div>
    )
  }

  const unifiedLayers = buildUnifiedLayerList(devices)
  const baseDevice = devices[0]

  if (!baseDevice) {
    return null
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--bg-base)'
      }}
    >
      <div
        id="canvas-compare"
        data-export-target="compare"
        style={{
          flex: 1,
          overflowX: 'auto',
          overflowY: 'auto',
          padding: 20,
          display: 'flex',
          gap: 0,
          alignItems: 'flex-start',
          minWidth: 0
        }}
      >
        {devices.map((device, index) => {
          const accent = DEVICE_ACCENTS[index] ?? DEVICE_ACCENTS[0]
          const label = DEVICE_LABELS[index] ?? String(index + 1)

          return (
            <div key={device.id} style={{ display: 'flex', gap: 0 }}>
              {index > 0 ? (
                <div
                  style={{
                    width: 1,
                    alignSelf: 'stretch',
                    background: 'var(--border-subtle)',
                    margin: '0 16px',
                    opacity: 0.5
                  }}
                />
              ) : null}

              <DeviceCard
                device={device}
                accent={accent}
                label={label}
                isActive={device.id === (activeDeviceId ?? baseDevice.id)}
                unifiedLayers={unifiedLayers}
                baseDevice={baseDevice}
                isBaseDevice={index === 0}
                selectedLayerId={selectedLayerId}
                onSelectDevice={() => setActiveDevice(device.id)}
                onSelectLayer={selectLayer}
                canRemove={devices.length > 2}
                onRemove={() => removeDevice(device.id)}
              />
            </div>
          )
        })}

        {devices.length < 4 ? (
          <div style={{ display: 'flex', gap: 0 }}>
            <div
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'var(--border-subtle)',
                margin: '0 16px',
                opacity: 0.5
              }}
            />
            <AddDeviceCard onAdd={addDevice} />
          </div>
        ) : null}
      </div>

      <CompareLegend />
    </div>
  )
}
