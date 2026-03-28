import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { Layer, Project } from '../types'
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

interface CompareSlot {
  id: string
  filePath: string
  fileName: string
  project: Project
}

type LayerKey = {
  role: string
  name: string
}

type DiffStatus = 'same' | 'changed' | 'added' | 'missing'

function createCompareSlotId(): string {
  return `compare-slot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath
}

function getProjectLayers(project: Project): Layer[] {
  return project.stacks[0]?.layers ?? []
}

function validateProject(data: unknown): data is Project {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const project = data as Record<string, unknown>

  return (
    typeof project.schemaVersion === 'string' &&
    typeof project.metadata === 'object' &&
    project.metadata !== null &&
    Array.isArray(project.stacks)
  )
}

function buildUnifiedLayerList(slots: CompareSlot[]): LayerKey[] {
  const seen = new Set<string>()
  const result: LayerKey[] = []

  for (const slot of slots) {
    for (const layer of getProjectLayers(slot.project)) {
      const key = `${layer.role}::${layer.name}`

      if (!seen.has(key)) {
        seen.add(key)
        result.push({ role: layer.role, name: layer.name })
      }
    }
  }

  return result
}

function findLayer(project: Project, role: string, name: string): Layer | undefined {
  return getProjectLayers(project).find((layer) => layer.role === role && layer.name === name)
}

function getDiffStatus(
  layer: Layer | undefined,
  baseLayer: Layer | undefined,
  isBaseSlot: boolean
): DiffStatus {
  if (isBaseSlot) {
    return layer ? 'same' : 'missing'
  }

  if (!layer) {
    return 'missing'
  }

  if (!baseLayer) {
    return 'added'
  }

  if (
    layer.thickness !== baseLayer.thickness ||
    layer.material !== baseLayer.material ||
    layer.customColor !== baseLayer.customColor
  ) {
    return 'changed'
  }

  return 'same'
}

function getTotalThickness(layers: Layer[]): number {
  return layers.reduce((sum, layer) => sum + layer.thickness, 0)
}

function getCompareSelectionId(slotId: string, layerId: string): string {
  return `${slotId}::${layerId}`
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
        flex: 1,
        minWidth: 240,
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
      <div style={{ fontSize: 14, fontWeight: 700 }}>파일 불러오기</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>최대 4개까지 비교할 수 있습니다.</div>
    </button>
  )
}

interface SlotCardProps {
  slot: CompareSlot
  accent: string
  label: string
  unifiedLayers: LayerKey[]
  baseProject: Project
  isBaseSlot: boolean
  selectedCompareId: string | null
  onSelectLayer: (compareId: string) => void
  onReplace: () => void
  onRemove: () => void
}

function SlotCard({
  slot,
  accent,
  label,
  unifiedLayers,
  baseProject,
  isBaseSlot,
  selectedCompareId,
  onSelectLayer,
  onReplace,
  onRemove
}: SlotCardProps) {
  const slotLayers = getProjectLayers(slot.project)

  return (
    <div
      style={{
        flex: 1,
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }}
    >
      <div
        style={{
          padding: 16,
          borderRadius: 'var(--radius-xl)',
          border: `1px solid ${accent}`,
          background: 'var(--bg-surface)',
          boxShadow: '0 0 0 1px color-mix(in oklab, transparent 70%, white)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
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
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={slot.fileName}
              >
                {slot.fileName}
              </div>
              <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                {slotLayers.length}층 · {getTotalThickness(slotLayers)} nm
                {isBaseSlot ? ' · Base' : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={onReplace}
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid var(--surface-line-faint)',
                background: 'transparent',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--text-secondary)'
              }}
            >
              교체
            </button>
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
                color: 'var(--text-muted)'
              }}
              title={`${slot.fileName} 제거`}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {unifiedLayers.map((entry) => {
          const layer = findLayer(slot.project, entry.role, entry.name)
          const baseLayer = findLayer(baseProject, entry.role, entry.name)
          const diffStatus = getDiffStatus(layer, baseLayer, isBaseSlot)
          const leftBarColor =
            diffStatus === 'changed'
              ? CHANGED_ACCENT
              : diffStatus === 'added'
                ? ADDED_ACCENT
                : 'transparent'

          if (!layer) {
            return <EmptyLayerBlock key={`${slot.id}-${entry.role}-${entry.name}`} />
          }

          const compareId = getCompareSelectionId(slot.id, layer.id)
          const isSelected = selectedCompareId === compareId

          return (
            <button
              key={`${slot.id}-${entry.role}-${entry.name}`}
              type="button"
              onClick={() => onSelectLayer(compareId)}
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

export function CompareCanvas({ onOpenExamples: _onOpenExamples }: CompareCanvasProps) {
  const selectedCompareId = useStackStore((state) => state.selectedLayerId)
  const selectLayer = useStackStore((state) => state.selectLayer)
  const [slots, setSlots] = useState<CompareSlot[]>([])

  const loadProjectFile = async (): Promise<CompareSlot | null> => {
    try {
      const filePath = await window.oledApi.showOpenDialog()

      if (!filePath) {
        return null
      }

      const content = await window.oledApi.readFile(filePath)
      const parsed: unknown = JSON.parse(content)

      if (!validateProject(parsed)) {
        throw new Error('Invalid project')
      }

      return {
        id: createCompareSlotId(),
        filePath,
        fileName: getFileName(filePath),
        project: parsed
      }
    } catch {
      alert('파일을 불러올 수 없습니다.')
      return null
    }
  }

  const handleAddSlot = async () => {
    if (slots.length >= 4) {
      return
    }

    const nextSlot = await loadProjectFile()

    if (!nextSlot) {
      return
    }

    setSlots((current) => (current.length >= 4 ? current : [...current, nextSlot]))
  }

  const handleReplaceSlot = async (slotId: string) => {
    const replacement = await loadProjectFile()

    if (!replacement) {
      return
    }

    setSlots((current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...replacement,
              id: slot.id
            }
          : slot
      )
    )

    if (selectedCompareId?.startsWith(`${slotId}::`)) {
      selectLayer(null)
    }
  }

  const handleRemoveSlot = (slotId: string) => {
    const nextSlots = slots.filter((slot) => slot.id !== slotId)
    setSlots(nextSlots)

    if (selectedCompareId?.startsWith(`${slotId}::`)) {
      selectLayer(null)
    }
  }

  const baseLayers = slots[0] ? getProjectLayers(slots[0].project) : []

  useCanvasKeyboardShortcuts({
    layers: baseLayers,
    onDeleteRequest: () => selectLayer(null)
  })

  if (slots.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: 28,
          background: 'var(--bg-base)'
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
          비교할 프로젝트 파일을 불러오세요
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          최대 4개의 `.json` 또는 `.oledstack` 파일을 동시에 비교할 수 있습니다.
        </div>
        <button
          type="button"
          onClick={() => {
            void handleAddSlot()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 18px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid transparent',
            background: 'var(--accent-blue)',
            color: 'var(--button-primary-text)',
            fontSize: 13,
            fontWeight: 700
          }}
        >
          <Plus size={16} />
          파일 불러오기
        </button>
      </div>
    )
  }

  const unifiedLayers = buildUnifiedLayerList(slots)
  const baseSlot = slots[0]

  if (!baseSlot) {
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
        {slots.map((slot, index) => {
          const accent = DEVICE_ACCENTS[index] ?? DEVICE_ACCENTS[0]
          const label = DEVICE_LABELS[index] ?? String(index + 1)

          return (
            <div key={slot.id} style={{ display: 'flex', gap: 0, flex: 1, minWidth: 0 }}>
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

              <SlotCard
                slot={slot}
                accent={accent}
                label={label}
                unifiedLayers={unifiedLayers}
                baseProject={baseSlot.project}
                isBaseSlot={index === 0}
                selectedCompareId={selectedCompareId}
                onSelectLayer={selectLayer}
                onReplace={() => {
                  void handleReplaceSlot(slot.id)
                }}
                onRemove={() => handleRemoveSlot(slot.id)}
              />
            </div>
          )
        })}

        {slots.length < 4 ? (
          <div style={{ display: 'flex', gap: 0, flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'var(--border-subtle)',
                margin: '0 16px',
                opacity: 0.5
              }}
            />
            <AddDeviceCard
              onAdd={() => {
                void handleAddSlot()
              }}
            />
          </div>
        ) : null}
      </div>

      <CompareLegend />
    </div>
  )
}
