import { describe, expect, it } from 'vitest'
import {
  cloneLayers,
  duplicateLayerInArray,
  generateId,
  insertLayerAfter,
  removeLayerById,
  reorderLayerInArray
} from '../layerOps'
import { INITIAL_LAYERS } from '../projectMutations'

describe('cloneLayers', () => {
  it('T-01: deep equal 보장', () => {
    const cloned = cloneLayers(INITIAL_LAYERS)
    expect(cloned).toEqual(INITIAL_LAYERS)
  })

  it('T-01: 원본과 독립 (reference 다름)', () => {
    const cloned = cloneLayers(INITIAL_LAYERS)
    expect(cloned).not.toBe(INITIAL_LAYERS)
    expect(cloned[0]).not.toBe(INITIAL_LAYERS[0])
  })

  it('T-01: appliesTo 배열 독립', () => {
    const cloned = cloneLayers(INITIAL_LAYERS)
    cloned[0]!.appliesTo.push('r' as never)
    expect(INITIAL_LAYERS[0]!.appliesTo).toHaveLength(3)
  })
})

describe('insertLayerAfter', () => {
  it('T-02: afterId 있을 때 해당 레이어 다음에 삽입', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const afterId = layers[2]!.id
    const newLayer = { ...layers[0]!, id: 'new-1' }
    const result = insertLayerAfter(layers, afterId, newLayer)

    const insertedIndex = result.findIndex((layer) => layer.id === 'new-1')
    const afterIndex = result.findIndex((layer) => layer.id === afterId)
    expect(insertedIndex).toBe(afterIndex + 1)
  })

  it('T-02: afterId 없으면 끝에 추가', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const newLayer = { ...layers[0]!, id: 'new-2' }
    const result = insertLayerAfter(layers, undefined, newLayer)

    expect(result[result.length - 1]?.id).toBe('new-2')
    expect(result).toHaveLength(layers.length + 1)
  })
})

describe('removeLayerById', () => {
  it('대상 레이어 제거', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const targetId = layers[2]!.id
    const result = removeLayerById(layers, targetId)

    expect(result.find((layer) => layer.id === targetId)).toBeUndefined()
    expect(result).toHaveLength(layers.length - 1)
  })
})

describe('reorderLayerInArray', () => {
  it('T-03: 정상 이동', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const targetId = layers[0]!.id
    const result = reorderLayerInArray(layers, targetId, 3)

    expect(result[3]?.id).toBe(targetId)
    expect(result).toHaveLength(layers.length)
  })

  it('T-03: locked 레이어는 이동 안 함', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    layers[0] = { ...layers[0]!, locked: true }
    const lockedId = layers[0].id
    const result = reorderLayerInArray(layers, lockedId, 3)

    expect(result[0]?.id).toBe(lockedId)
  })

  it('T-03: 현재 위치와 동일 newIndex → 변경 없음', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const result = reorderLayerInArray(layers, layers[2]!.id, 2)
    expect(result).toEqual(layers)
  })
})

describe('duplicateLayerInArray', () => {
  it('원본 다음에 copy 삽입', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const targetId = layers[2]!.id
    const result = duplicateLayerInArray(layers, targetId)

    const originalIndex = result.findIndex((layer) => layer.id === targetId)
    expect(result[originalIndex + 1]?.name).toMatch(/\(copy\)/)
    expect(result).toHaveLength(layers.length + 1)
  })

  it('존재하지 않는 ID → 변경 없음', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const result = duplicateLayerInArray(layers, 'nonexistent')
    expect(result).toEqual(layers)
  })
})

describe('generateId', () => {
  it('layer- 접두사', () => {
    expect(generateId()).toMatch(/^layer-/)
  })

  it('연속 호출 시 다른 값', () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateId()))
    expect(ids.size).toBe(10)
  })
})
