import { useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
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
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'
import type { Layer } from '../types'
import { ContextMenu, SplitConfirmDialog, type ContextMenuState } from './ContextMenu'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { EmptyState } from './EmptyState'
import { InsertZoneWrapper } from './InsertZone'
import { LayerBlock } from './LayerBlock'
import { RGBCanvas } from './RGBCanvas'
import { SortableLayerBlock } from './SortableLayerBlock'
import {
  CANVAS_LAYER_AREA_HEIGHT,
  computeScaleFactor,
  useCanvasKeyboardShortcuts
} from './canvasShared'

interface DeleteTarget {
  id: string
  name: string
}

interface CanvasProps {
  onOpenExamples: () => void
}

export function Canvas({ onOpenExamples }: CanvasProps) {
  const structureMode = useStackStore((state) => state.project.structureMode)

  if (structureMode === 'rgb') {
    return <RGBCanvas onOpenExamples={onOpenExamples} />
  }

  return <SingleCanvas onOpenExamples={onOpenExamples} />
}

function SingleCanvas({ onOpenExamples }: CanvasProps) {
  const layers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])
  const thicknessMode = useStackStore((state) => state.thicknessMode)
  const palette = useStackStore((state) => state.project.palette)
  const removeLayer = useStackStore((state) => state.removeLayer)
  const reorderLayer = useStackStore((state) => state.reorderLayer)
  const selectLayer = useStackStore((state) => state.selectLayer)
  const addLayer = useStackStore((state) => state.addLayer)
  const splitToChannels = useStackStore((state) => state.splitToChannels)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [splitTarget, setSplitTarget] = useState<Layer | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const scaleFactor =
    thicknessMode === 'real' ? computeScaleFactor(layers, CANVAS_LAYER_AREA_HEIGHT) : 1
  const activeLayer = layers.find((layer) => layer.id === activeId) ?? null

  const handleDeleteRequest = (id: string) => {
    const target = layers.find((entry) => entry.id === id)

    if (!target || target.locked) {
      return
    }

    setDeleteTarget({ id: target.id, name: target.name })
  }

  useCanvasKeyboardShortcuts({ layers, onDeleteRequest: handleDeleteRequest })

  const handleDeleteConfirm = () => {
    if (!deleteTarget) {
      return
    }

    removeLayer(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setContextMenu(null)
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id) {
      return
    }

    const newIndex = layers.findIndex((layer) => layer.id === over.id)

    if (newIndex >= 0) {
      reorderLayer(active.id as string, newIndex)
    }
  }

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>, layerId: string) => {
    event.preventDefault()
    event.stopPropagation()
    selectLayer(layerId)
    setContextMenu({ x: event.clientX, y: event.clientY, layerId })
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
          <DndContext
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
                paddingBottom: 48
              }}
            >
              <SortableContext
                items={layers.map((layer) => layer.id)}
                strategy={verticalListSortingStrategy}
              >
                {layers.map((layer) => (
                  <div key={layer.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <SortableLayerBlock
                      layer={layer}
                      thicknessMode={thicknessMode}
                      scaleFactor={scaleFactor}
                      onDeleteRequest={handleDeleteRequest}
                      onContextMenu={(event) => handleContextMenu(event, layer.id)}
                    />
                    <InsertZoneWrapper afterId={layer.id} />
                  </div>
                ))}
              </SortableContext>

              <button
                type="button"
                onClick={() => addLayer(layers[layers.length - 1]?.id)}
                style={{
                  marginTop: 8,
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
                  data-palette={palette}
                  style={{
                    width: 540,
                    opacity: 0.9,
                    boxShadow: 'var(--shadow-lg)',
                    borderRadius: 'var(--radius-lg)',
                    pointerEvents: 'none'
                  }}
                >
                  <LayerBlock
                    layer={activeLayer}
                    thicknessMode={thicknessMode}
                    scaleFactor={scaleFactor}
                    onDeleteRequest={() => undefined}
                    isDragging
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
            setSplitTarget(null)
          }}
          onCancel={() => setSplitTarget(null)}
        />
      ) : null}
    </main>
  )
}
