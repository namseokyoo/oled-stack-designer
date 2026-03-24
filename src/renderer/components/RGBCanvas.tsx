import { useState } from 'react'
import { Lock, Plus } from 'lucide-react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { ChannelCode, Layer } from '../types'
import { ContextMenu, SplitConfirmDialog, type ContextMenuState } from './ContextMenu'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { EmptyState } from './EmptyState'
import { getBlockHeight, getLayerColor, LayerBlock } from './LayerBlock'
import {
  CANVAS_LAYER_AREA_HEIGHT,
  computeScaleFactor,
  useCanvasKeyboardShortcuts
} from './canvasShared'

interface DeleteTarget {
  id: string
  name: string
}

interface RGBCanvasProps {
  onOpenExamples: () => void
}

const CHANNELS: ChannelCode[] = ['r', 'g', 'b']

const CHANNEL_META: Record<ChannelCode, { label: string; color: string }> = {
  r: { label: 'R', color: 'var(--layer-eml-r)' },
  g: { label: 'G', color: 'var(--layer-eml-g)' },
  b: { label: 'B', color: 'var(--layer-eml-b)' }
}

function isCommonLayer(layer: Layer): boolean {
  return layer.appliesTo.length === CHANNELS.length
}

function getLastEmlIndex(layers: Layer[]): number {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    if (layers[index]?.role === 'eml') {
      return index
    }
  }

  return -1
}

interface RGBLayerCellProps {
  layer: Layer
  thicknessMode: 'uniform' | 'real'
  scaleFactor: number
  isSelected: boolean
  onSelect: (id: string) => void
  showLabel: boolean
  onContextMenu?: (event: ReactMouseEvent<HTMLButtonElement>) => void
}

function RGBLayerCell({
  layer,
  thicknessMode,
  scaleFactor,
  isSelected,
  onSelect,
  showLabel,
  onContextMenu
}: RGBLayerCellProps) {
  const height = getBlockHeight(layer, thicknessMode, scaleFactor)
  const isCompact = thicknessMode === 'real' && height < 44
  const showLock = layer.locked === true
  const cellStyle: CSSProperties = {
    minHeight: height,
    height,
    width: '100%',
    borderRadius: 'var(--radius-lg)',
    border: `${isSelected ? 2 : 1}px solid ${isSelected ? 'var(--accent-blue)' : 'var(--surface-line-faint)'}`,
    background: getLayerColor(layer),
    boxShadow: isSelected ? 'var(--shadow-glow), var(--shadow-sm)' : 'var(--shadow-sm)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: showLabel ? 'space-between' : 'flex-end',
    gap: 8,
    padding: showLabel ? '0 12px' : '0 10px',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    transition:
      'height var(--duration-slow) var(--ease-smooth), box-shadow var(--duration-fast) var(--ease-smooth), border-color var(--duration-fast) var(--ease-smooth)'
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(layer.id)}
      onContextMenu={onContextMenu}
      style={cellStyle}
      title={!showLabel ? layer.name : undefined}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, color-mix(in oklab, white 8%, transparent), color-mix(in oklab, black 8%, transparent))',
          pointerEvents: 'none'
        }}
      />

      {showLabel ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 2,
            minWidth: 0,
            position: 'relative',
            zIndex: 1
          }}
        >
          <span
            style={{
              fontSize: isCompact ? 11 : 12,
              fontWeight: 700,
              color: 'var(--layer-text-primary)',
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
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--layer-text-secondary)'
            }}
          >
            {layer.thickness} nm
          </span>
        </div>
      ) : null}

      {showLock ? (
        <Lock
          size={12}
          style={{ position: 'relative', zIndex: 1, color: 'var(--layer-text-primary)' }}
        />
      ) : null}
    </button>
  )
}

export function RGBCanvas({ onOpenExamples }: RGBCanvasProps) {
  const layers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const selectedLayerId = useStackStore((state) => state.selectedLayerId)
  const thicknessMode = useStackStore((state) => state.thicknessMode)
  const selectLayer = useStackStore((state) => state.selectLayer)
  const addLayer = useStackStore((state) => state.addLayer)
  const removeLayer = useStackStore((state) => state.removeLayer)
  const splitToChannels = useStackStore((state) => state.splitToChannels)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [splitTarget, setSplitTarget] = useState<Layer | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const scaleFactor =
    thicknessMode === 'real' ? computeScaleFactor(layers, CANVAS_LAYER_AREA_HEIGHT) : 1
  const lastEmlIndex = getLastEmlIndex(layers)
  const channelSection = lastEmlIndex >= 0 ? layers.slice(0, lastEmlIndex + 1) : []
  const lowerSection = lastEmlIndex >= 0 ? layers.slice(lastEmlIndex + 1) : layers

  const handleDeleteRequest = (id: string) => {
    const layer = layers.find((entry) => entry.id === id)

    if (!layer || layer.locked) {
      return
    }

    setDeleteTarget({ id: layer.id, name: layer.name })
  }

  useCanvasKeyboardShortcuts({ layers, onDeleteRequest: handleDeleteRequest })

  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>, layerId: string) => {
    event.preventDefault()
    event.stopPropagation()
    selectLayer(layerId)
    setContextMenu({ x: event.clientX, y: event.clientY, layerId })
  }

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return
    }

    removeLayer(deleteTarget.id)
    setDeleteTarget(null)
  }

  const renderLowerLayer = (layer: Layer) => {
    if (isCommonLayer(layer)) {
      return (
        <LayerBlock
          key={layer.id}
          layer={layer}
          thicknessMode={thicknessMode}
          scaleFactor={scaleFactor}
          onDeleteRequest={handleDeleteRequest}
          onContextMenu={(event) => handleContextMenu(event, layer.id)}
        />
      )
    }

    return (
      <div
        key={layer.id}
        style={{ display: 'flex', alignItems: 'stretch', gap: 4, width: '100%' }}
      >
        {CHANNELS.map((channel) =>
          layer.appliesTo.includes(channel) ? (
            <RGBLayerCell
              key={`${layer.id}-${channel}`}
              layer={layer}
              thicknessMode={thicknessMode}
              scaleFactor={scaleFactor}
              isSelected={selectedLayerId === layer.id}
              onSelect={selectLayer}
              onContextMenu={(event) => handleContextMenu(event, layer.id)}
              showLabel
            />
          ) : (
            <div key={`${layer.id}-${channel}`} style={{ flex: 1 }} />
          )
        )}
      </div>
    )
  }

  return (
    <main
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          selectLayer(null)
          setContextMenu(null)
        }
      }}
      style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        position: 'relative',
        background:
          'linear-gradient(180deg, color-mix(in oklab, var(--bg-surface) 42%, transparent), transparent 30%)'
      }}
    >
      <div
        style={{
          height: '100%',
          overflowY: 'auto',
          padding: 28,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        {layers.length === 0 ? (
          <div style={{ width: '100%', maxWidth: 680 }}>
            <EmptyState onOpenExamples={onOpenExamples} />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              maxWidth: 540,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-2)',
              paddingBottom: 48
            }}
          >
            {channelSection.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 4,
                  width: '100%'
                }}
              >
                {CHANNELS.map((channel) => {
                  const channelLayers = channelSection.filter(
                    (layer) => isCommonLayer(layer) || layer.appliesTo.includes(channel)
                  )

                  return (
                    <div
                      key={channel}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--sp-2)'
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: CHANNEL_META[channel].color,
                          letterSpacing: '0.08em',
                          textAlign: 'center'
                        }}
                      >
                        {CHANNEL_META[channel].label}
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--sp-2)'
                        }}
                      >
                        {channelLayers.map((layer) => (
                          <RGBLayerCell
                            key={`${layer.id}-${channel}`}
                            layer={layer}
                            thicknessMode={thicknessMode}
                            scaleFactor={scaleFactor}
                            isSelected={selectedLayerId === layer.id}
                            onSelect={selectLayer}
                            onContextMenu={(event) => handleContextMenu(event, layer.id)}
                            showLabel={layer.appliesTo.length === 1 || channel === 'g'}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}

            {lowerSection.map((layer) => renderLowerLayer(layer))}

            <button
              type="button"
              onClick={() => addLayer(layers[layers.length - 1]?.id)}
              style={{
                marginTop: 6,
                alignSelf: 'center',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                borderRadius: 'var(--radius-pill)',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
                fontSize: 12,
                fontWeight: 700
              }}
            >
              <Plus size={14} />
              레이어 추가
            </button>
          </div>
        )}
      </div>

      {contextMenu ? (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          layerId={contextMenu.layerId}
          onClose={() => setContextMenu(null)}
          onDeleteRequest={handleDeleteRequest}
          onSplitRequest={(layerId) => {
            const targetLayer = layers.find((entry) => entry.id === layerId)
            if (targetLayer) {
              setSplitTarget(targetLayer)
            }
          }}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteConfirmDialog
          layerName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}

      {splitTarget ? (
        <SplitConfirmDialog
          layerName={splitTarget.name}
          onConfirm={() => {
            splitToChannels(splitTarget.id)
            setSplitTarget(null)
          }}
          onCancel={() => setSplitTarget(null)}
        />
      ) : null}
    </main>
  )
}
