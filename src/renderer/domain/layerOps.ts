/**
 * layerOps.ts — Layer CRUD 순수 함수 모음
 *
 * 모든 함수는 순수 함수. React/Zustand 의존 없음.
 */

import type { ChannelCode, Layer } from '../types'

/**
 * 고유 ID 생성.
 * 출처: useStackStore.ts generateId
 */
export function generateId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * channelOverrides deep clone.
 * 출처: useStackStore.ts cloneChannelOverrides
 */
export function cloneChannelOverrides(
  channelOverrides?: Layer['channelOverrides']
): Layer['channelOverrides'] {
  if (!channelOverrides) {
    return undefined
  }

  return {
    r: channelOverrides.r ? { ...channelOverrides.r } : undefined,
    g: channelOverrides.g ? { ...channelOverrides.g } : undefined,
    b: channelOverrides.b ? { ...channelOverrides.b } : undefined
  }
}

/**
 * Layer deep clone.
 * 출처: useStackStore.ts cloneLayer
 */
export function cloneLayer(layer: Layer): Layer {
  return {
    ...layer,
    appliesTo: [...layer.appliesTo],
    channelOverrides: cloneChannelOverrides(layer.channelOverrides)
  }
}

/**
 * Layer 배열 deep clone.
 * 출처: useStackStore.ts cloneLayers
 */
export function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((layer) => cloneLayer(layer))
}

/**
 * 새 레이어 기본값.
 * 출처: useStackStore.ts DEFAULT_NEW_LAYER
 */
export const DEFAULT_NEW_LAYER: Omit<Layer, 'id'> = {
  name: 'New Layer',
  role: 'custom',
  material: '',
  thickness: 50,
  colorToken: 'custom',
  appliesTo: ['r', 'g', 'b'] as ChannelCode[]
}

/**
 * afterId 다음에 레이어 삽입. afterId 없으면 끝에 추가.
 * 출처: useStackStore.ts addLayer 내 newLayers 계산 로직 (single mode)
 */
export function insertLayerAfter(
  layers: Layer[],
  afterId: string | undefined,
  newLayer: Layer
): Layer[] {
  if (afterId) {
    const index = layers.findIndex((layer) => layer.id === afterId)

    if (index >= 0) {
      return [...layers.slice(0, index + 1), newLayer, ...layers.slice(index + 1)]
    }
  }

  return [...layers, newLayer]
}

/**
 * ID로 레이어 제거. locked 레이어는 제거 안 함.
 * 출처: useStackStore.ts removeLayer 내 newLayers 계산 로직
 */
export function removeLayerById(layers: Layer[], id: string): Layer[] {
  return layers.filter((layer) => layer.id !== id)
}

/**
 * 레이어 순서 변경. locked 레이어는 이동 안 함. 범위 초과 시 클램프.
 * 출처: useStackStore.ts reorderLayer 내 newLayers 계산 로직 (single mode)
 */
export function reorderLayerInArray(layers: Layer[], id: string, newIndex: number): Layer[] {
  const currentIndex = layers.findIndex((layer) => layer.id === id)

  if (currentIndex < 0 || currentIndex === newIndex) {
    return layers
  }

  const movedLayer = layers[currentIndex]

  if (!movedLayer || movedLayer.locked) {
    return layers
  }

  const boundedIndex = Math.max(0, Math.min(layers.length - 1, newIndex))
  const newLayers = [...layers]
  newLayers.splice(currentIndex, 1)
  newLayers.splice(boundedIndex, 0, movedLayer)

  return newLayers
}

/**
 * 레이어 복제 후 원본 다음에 삽입.
 * 출처: useStackStore.ts duplicateLayer 내 로직 (single mode)
 */
export function duplicateLayerInArray(layers: Layer[], id: string): Layer[] {
  const layerIndex = layers.findIndex((layer) => layer.id === id)
  const targetLayer = layers[layerIndex]

  if (!targetLayer) {
    return layers
  }

  const duplicatedLayer: Layer = {
    ...cloneLayer(targetLayer),
    id: generateId(),
    name: `${targetLayer.name} (copy)`
  }

  const newLayers = [...layers]
  newLayers.splice(layerIndex + 1, 0, duplicatedLayer)

  return newLayers
}
