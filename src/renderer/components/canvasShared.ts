import { useEffect } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { Layer } from '../types'

export const INSERT_ZONE_HEIGHT = 4
export const CANVAS_LAYER_AREA_HEIGHT = 480

export function computeScaleFactor(layers: Layer[], canvasHeight: number): number {
  if (layers.length === 0) {
    return 1
  }

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0)
  const gapTotal = (layers.length - 1) * INSERT_ZONE_HEIGHT
  const availableHeight = canvasHeight - gapTotal

  // naiveScale만 사용: 개별 레이어 최소 높이(36px)는 LayerBlock의 getBlockHeight에서 Math.max로 처리
  // scaleFactor를 전역으로 올리면 큰 레이어(150nm)가 캔버스를 넘어버림
  const naiveScale = availableHeight / totalThickness

  return Math.max(naiveScale, 0.1)
}

export function isInputFocused(): boolean {
  const activeElement = document.activeElement

  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  )
}

interface UseCanvasKeyboardShortcutsOptions {
  layers: Layer[]
  onDeleteRequest: (id: string) => void
}

export function useCanvasKeyboardShortcuts({
  layers,
  onDeleteRequest
}: UseCanvasKeyboardShortcutsOptions): void {
  const selectedLayerId = useStackStore((state) => state.selectedLayerId)
  const reorderLayer = useStackStore((state) => state.reorderLayer)
  const duplicateLayer = useStackStore((state) => state.duplicateLayer)
  const undo = useStackStore((state) => state.undo)
  const redo = useStackStore((state) => state.redo)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const modifierPressed = event.ctrlKey || event.metaKey

      if (modifierPressed && !event.shiftKey && key === 'z') {
        event.preventDefault()
        undo()
        return
      }

      if (modifierPressed && (key === 'y' || (event.shiftKey && key === 'z'))) {
        event.preventDefault()
        redo()
        return
      }

      if (isInputFocused() || !selectedLayerId) {
        return
      }

      if (modifierPressed && key === 'd') {
        event.preventDefault()
        duplicateLayer(selectedLayerId)
        return
      }

      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        const currentIndex = layers.findIndex((layer) => layer.id === selectedLayerId)

        if (event.key === 'ArrowUp' && currentIndex > 0) {
          reorderLayer(selectedLayerId, currentIndex - 1)
        }

        if (event.key === 'ArrowDown' && currentIndex < layers.length - 1) {
          reorderLayer(selectedLayerId, currentIndex + 1)
        }

        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        onDeleteRequest(selectedLayerId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [duplicateLayer, layers, onDeleteRequest, redo, reorderLayer, selectedLayerId, undo])
}
