import { useEffect } from 'react'
import { useStackStore } from '../stores/useStackStore'
import type { Layer } from '../types'
import { MIN_REAL_HEIGHT } from './LayerBlock'

export const CANVAS_LAYER_AREA_HEIGHT = 480

export function computeScaleFactor(layers: Layer[], canvasHeight: number): number {
  if (layers.length === 0) {
    return 1
  }

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0)
  const availableHeight = canvasHeight - layers.length * 22
  const naiveScale = availableHeight / totalThickness
  const minThickness = Math.min(...layers.map((layer) => layer.thickness))
  const minScaleForMin = MIN_REAL_HEIGHT / minThickness

  return Math.max(naiveScale, minScaleForMin)
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
