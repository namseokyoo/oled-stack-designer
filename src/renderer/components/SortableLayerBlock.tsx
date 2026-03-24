import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { LayerBlock } from './LayerBlock'
import type { Layer, ThicknessMode } from '../types'

interface Props {
  layer: Layer
  thicknessMode: ThicknessMode
  scaleFactor: number
  onDeleteRequest: (id: string) => void
  isDragging?: boolean
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void
}

export function SortableLayerBlock({
  layer,
  thicknessMode,
  scaleFactor,
  onDeleteRequest,
  isDragging = false,
  onContextMenu
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } =
    useSortable({ id: layer.id, disabled: layer.locked === true })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <LayerBlock
        layer={layer}
        thicknessMode={thicknessMode}
        scaleFactor={scaleFactor}
        onDeleteRequest={onDeleteRequest}
        dragListeners={listeners}
        isDragging={isDragging}
        onContextMenu={onContextMenu}
      />
    </div>
  )
}
