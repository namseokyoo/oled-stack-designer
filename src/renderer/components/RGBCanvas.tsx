import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Lock, Plus } from 'lucide-react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { Layer } from '../types'
import { ContextMenu, SplitConfirmDialog, type ContextMenuState } from './ContextMenu'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { EmptyState } from './EmptyState'
import { InsertZoneWrapper } from './InsertZone'
import { getBlockHeight, getLayerColor, LayerBlock } from './LayerBlock'
import { CHANNELS, CHANNEL_META, isCommonLayer, splitChannelSection } from './rgbUtils'
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

function getLastEmlIndex(layers: Layer[]): number {
  for (let index = layers.length - 1; index >= 0; index -= 1) {
    if (layers[index]?.role === 'eml') {
      return index
    }
  }

  return -1
}

function getSortableId(layerId: string, location: string): string {
  return `${layerId}::${location}`
}

function getLayerIdFromSortableId(sortableId: string): string {
  return sortableId.split('::')[0] ?? sortableId
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
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 2,
              minWidth: 0,
              position: 'relative',
              zIndex: 1,
              flex: 1
            }}
          >
            <span
              style={{
                fontSize: 12,
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
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: isCompact ? 0 : 2,
              minWidth: 0,
              position: 'relative',
              zIndex: 1,
              flexShrink: 1
            }}
          >
            {isCompact ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--layer-text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 140,
                  textShadow: '0 1px 2px var(--layer-action-bg)'
                }}
                title={layer.material || 'Material not set'}
              >
                {layer.thickness}nm · {layer.material || 'No material'}
              </span>
            ) : (
              <>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--layer-text-primary)',
                    whiteSpace: 'nowrap',
                    textShadow: '0 1px 2px var(--layer-action-bg)'
                  }}
                >
                  {layer.thickness} nm
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--layer-text-secondary)',
                    maxWidth: 100,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={layer.material || 'Material not set'}
                >
                  {layer.material || 'No material'}
                </span>
              </>
            )}
          </div>
        </>
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

interface SortableRGBLayerCellProps extends RGBLayerCellProps {
  sortableId: string
}

function SortableRGBLayerCell(props: SortableRGBLayerCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: props.sortableId, disabled: props.layer.locked === true })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <RGBLayerCell {...props} />
    </div>
  )
}

export function RGBCanvas({ onOpenExamples }: RGBCanvasProps) {
  const layers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const structureMode = useStackStore((state) => state.project.structureMode)
  const selectedLayerId = useStackStore((state) => state.selectedLayerId)
  const thicknessMode = useStackStore((state) => state.thicknessMode)
  const selectLayer = useStackStore((state) => state.selectLayer)
  const addLayer = useStackStore((state) => state.addLayer)
  const removeLayer = useStackStore((state) => state.removeLayer)
  const reorderLayer = useStackStore((state) => state.reorderLayer)
  const splitToChannels = useStackStore((state) => state.splitToChannels)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [splitTarget, setSplitTarget] = useState<Layer | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [canvasKey, setCanvasKey] = useState(0)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const scaleFactor =
    thicknessMode === 'real' ? computeScaleFactor(layers, CANVAS_LAYER_AREA_HEIGHT) : 1
  const lastEmlIndex = getLastEmlIndex(layers)
  const channelSection = lastEmlIndex >= 0 ? layers.slice(0, lastEmlIndex + 1) : []
  const lowerSection = lastEmlIndex >= 0 ? layers.slice(lastEmlIndex + 1) : layers
  const channelBlocks = splitChannelSection(channelSection)
  const hasFmmSection = channelBlocks.some((block) => block.type === 'fmm')
  const lastFmmBlock = [...channelBlocks].reverse().find((block) => block.type === 'fmm')
  const lastFmmLayerId = lastFmmBlock?.layers[lastFmmBlock.layers.length - 1]?.id
  const sortableItems = [
    ...channelBlocks.flatMap((block) => {
      if (block.type === 'common') {
        return block.layers.map((layer) => getSortableId(layer.id, 'common'))
      }

      return CHANNELS.flatMap((channel) =>
        block.layers
          .filter((layer) => isCommonLayer(layer) || layer.appliesTo.includes(channel))
          .map((layer) => getSortableId(layer.id, `channel-${channel}`))
      )
    }),
    ...lowerSection.flatMap((layer) =>
      isCommonLayer(layer)
        ? [getSortableId(layer.id, 'common')]
        : CHANNELS.filter((channel) => layer.appliesTo.includes(channel)).map((channel) =>
            getSortableId(layer.id, `lower-${channel}`)
          )
    ),
  ]
  const activeLayer = layers.find((layer) => layer.id === activeId) ?? null

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

  const handleDragStart = (event: DragStartEvent) => {
    setContextMenu(null)
    setActiveId(getLayerIdFromSortableId(String(event.active.id)))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const activeLayerId = getLayerIdFromSortableId(String(active.id))

    setActiveId(null)

    if (!over) {
      return
    }

    const overLayerId = getLayerIdFromSortableId(String(over.id))

    if (activeLayerId === overLayerId) {
      return
    }

    const activeLayer = layers.find((layer) => layer.id === activeLayerId)
    const overLayer = layers.find((layer) => layer.id === overLayerId)

    if (!activeLayer || !overLayer) {
      return
    }

    const activeIsSingle = activeLayer.appliesTo.length === 1
    const overIsSingle = overLayer.appliesTo.length === 1
    const activeIsCommon = activeLayer.appliesTo.length === 3
    const overIsCommon = overLayer.appliesTo.length === 3

    if ((activeIsSingle && overIsCommon) || (activeIsCommon && overIsSingle)) {
      return
    }

    const newIndex = layers.findIndex((layer) => layer.id === overLayerId)

    if (newIndex >= 0) {
      reorderLayer(activeLayerId, newIndex)
    }
  }

  const renderLowerLayer = (layer: Layer) => {
    if (isCommonLayer(layer)) {
      return (
        <LayerBlock
          layer={layer}
          thicknessMode={thicknessMode}
          scaleFactor={scaleFactor}
          onDeleteRequest={handleDeleteRequest}
          onContextMenu={(event) => handleContextMenu(event, layer.id)}
        />
      )
    }

    return (
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, width: '100%' }}>
        {CHANNELS.map((channel) =>
          layer.appliesTo.includes(channel) ? (
            <SortableRGBLayerCell
              key={`${layer.id}-${channel}`}
              sortableId={getSortableId(layer.id, `lower-${channel}`)}
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

  const renderCommonSection = (sectionLayers: Layer[]) =>
    sectionLayers.map((layer) => (
      <div key={layer.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <SortableRGBLayerCell
          sortableId={getSortableId(layer.id, 'common')}
          layer={layer}
          thicknessMode={thicknessMode}
          scaleFactor={scaleFactor}
          isSelected={selectedLayerId === layer.id}
          onSelect={selectLayer}
          onContextMenu={(event) => handleContextMenu(event, layer.id)}
          showLabel
        />
        <InsertZoneWrapper afterId={layer.id} rgbMode={structureMode === 'rgb'} />
      </div>
    ))

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
          <DndContext
            key={canvasKey}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: 540,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                paddingBottom: 48
              }}
            >
              <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                {channelBlocks.map((block, blockIndex) => {
                  if (block.type === 'common') {
                    return (
                      <div key={blockIndex} style={{ display: 'contents' }}>
                        {renderCommonSection(block.layers)}
                      </div>
                    )
                  }

                  const aboveCommonLayer: Layer | undefined = (() => {
                    for (let index = blockIndex - 1; index >= 0; index -= 1) {
                      const previousBlock = channelBlocks[index]

                      if (previousBlock && previousBlock.type === 'common' && previousBlock.layers.length > 0) {
                        return previousBlock.layers[previousBlock.layers.length - 1]
                      }
                    }

                    return undefined
                  })()

                  return (
                    <div
                      key={blockIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 4,
                        width: '100%'
                      }}
                    >
                      {CHANNELS.map((channel) => {
                        const channelLayers = block.layers.filter(
                          (layer) => isCommonLayer(layer) || layer.appliesTo.includes(channel)
                        )
                        const isEmpty = channelLayers.length === 0

                        return (
                          <div
                            key={channel}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8
                            }}
                          >
                            {isEmpty && aboveCommonLayer ? (
                              <div
                                style={{
                                  height: 52,
                                  borderRadius: 'var(--radius-lg)',
                                  border: '1px dashed var(--border-subtle)',
                                  background: getLayerColor(aboveCommonLayer),
                                  opacity: 0.4,
                                  pointerEvents: 'none',
                                  cursor: 'default'
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 8
                                }}
                              >
                                {channelLayers.map((layer) => (
                                  <div
                                    key={`${layer.id}-${channel}`}
                                    style={{ display: 'flex', flexDirection: 'column' }}
                                  >
                                    <SortableRGBLayerCell
                                      sortableId={getSortableId(layer.id, `channel-${channel}`)}
                                      layer={layer}
                                      thicknessMode={thicknessMode}
                                      scaleFactor={scaleFactor}
                                      isSelected={selectedLayerId === layer.id}
                                      onSelect={selectLayer}
                                      onContextMenu={(event) => handleContextMenu(event, layer.id)}
                                      showLabel={layer.appliesTo.length === 1 || channel === 'g'}
                                    />
                                    <InsertZoneWrapper afterId={layer.id} channelMode={channel} />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}

                {hasFmmSection && lowerSection.length > 0 ? (
                  <div style={{ marginTop: -8 }}>
                    <InsertZoneWrapper
                      afterId={lastFmmLayerId}
                      rgbMode={structureMode === 'rgb'}
                    />
                  </div>
                ) : null}

                {lowerSection.map((layer) => (
                  <div key={layer.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {renderLowerLayer(layer)}
                    <InsertZoneWrapper afterId={layer.id} rgbMode={structureMode === 'rgb'} />
                  </div>
                ))}
              </SortableContext>

              {hasFmmSection && (
                <div
                  style={{
                    display: 'flex',
                    marginTop: 4,
                    marginBottom: 2
                  }}
                >
                  {(['r', 'g', 'b'] as const).map((channel) => (
                    <span
                      key={channel}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 700,
                        color: CHANNEL_META[channel].color,
                        letterSpacing: '0.08em',
                        textAlign: 'center'
                      }}
                    >
                      {CHANNEL_META[channel].label}
                    </span>
                  ))}
                </div>
              )}

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

            <DragOverlay>
              {activeLayer ? (
                <div
                  style={{
                    width: '100%',
                    opacity: 0.9,
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--radius-lg)',
                    pointerEvents: 'none'
                  }}
                >
                  <RGBLayerCell
                    layer={activeLayer}
                    thicknessMode={thicknessMode}
                    scaleFactor={scaleFactor}
                    isSelected={false}
                    onSelect={() => undefined}
                    showLabel
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
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
            setCanvasKey((current) => current + 1)
            setSplitTarget(null)
          }}
          onCancel={() => setSplitTarget(null)}
        />
      ) : null}
    </main>
  )
}
