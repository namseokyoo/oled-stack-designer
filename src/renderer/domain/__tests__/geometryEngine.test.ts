import { describe, expect, it } from 'vitest'
import {
  computeScaleFactor,
  getLastEmlIndex,
  isCommonLayer,
  partitionLayersByEml
} from '../geometryEngine'
import { SCREEN_LAYOUT } from '../layoutContext'
import { INITIAL_LAYERS, INITIAL_RGB_LAYERS } from '../projectMutations'

const makeCtx = (canvasHeight: number) => ({ ...SCREEN_LAYOUT, canvasHeight })

describe('computeScaleFactor', () => {
  it('T-06: 빈 레이어 배열 → 1 반환', () => {
    expect(computeScaleFactor([], makeCtx(480))).toBe(1)
  })

  it('단일 레이어 스케일 계산', () => {
    const layers = [{ ...INITIAL_LAYERS[0]!, thickness: 100 }]
    const result = computeScaleFactor(layers, makeCtx(480))
    expect(result).toBeGreaterThan(0)
  })

  it('최소값 0.1 보장', () => {
    const layers = INITIAL_LAYERS.map((layer) => ({ ...layer, thickness: 99999 }))
    const result = computeScaleFactor(layers, makeCtx(480))
    expect(result).toBeGreaterThanOrEqual(0.1)
  })
})

describe('getLastEmlIndex', () => {
  it('빈 배열 → -1', () => {
    expect(getLastEmlIndex([])).toBe(-1)
  })

  it('INITIAL_LAYERS에서 EML 인덱스 반환', () => {
    const idx = getLastEmlIndex(INITIAL_LAYERS)
    expect(idx).toBeGreaterThanOrEqual(0)
    expect(INITIAL_LAYERS[idx]?.role).toBe('eml')
  })

  it('INITIAL_RGB_LAYERS에서 마지막 EML 인덱스 반환', () => {
    const idx = getLastEmlIndex(INITIAL_RGB_LAYERS)
    expect(idx).toBeGreaterThanOrEqual(0)

    for (let i = idx + 1; i < INITIAL_RGB_LAYERS.length; i += 1) {
      expect(INITIAL_RGB_LAYERS[i]?.role).not.toBe('eml')
    }
  })
})

describe('isCommonLayer', () => {
  it('T-12: appliesTo=["r","g","b"] 레이어 → true', () => {
    const layer = INITIAL_LAYERS[0]!
    expect(layer.appliesTo).toEqual(['r', 'g', 'b'])
    expect(isCommonLayer(layer)).toBe(true)
  })

  it('단일 채널 레이어 → false', () => {
    const emlR = INITIAL_RGB_LAYERS.find((layer) => layer.appliesTo.length === 1)!
    expect(isCommonLayer(emlR)).toBe(false)
  })

  it('T-12: 3구현 동일성 — rgbUtils.ts와 동일 결과', () => {
    for (const layer of [...INITIAL_LAYERS, ...INITIAL_RGB_LAYERS]) {
      const rgbUtilsResult = layer.appliesTo.length === 3
      const engineResult = isCommonLayer(layer)
      expect(engineResult).toBe(rgbUtilsResult)
    }
  })
})

describe('partitionLayersByEml', () => {
  it('EML 없는 경우 upper=[], lower=전체', () => {
    const layers = INITIAL_LAYERS.filter((layer) => layer.role !== 'eml')
    const { upper, lower } = partitionLayersByEml(layers)
    expect(upper).toHaveLength(0)
    expect(lower).toHaveLength(layers.length)
  })

  it('INITIAL_RGB_LAYERS 분리 결과 검증', () => {
    const { upper, lower } = partitionLayersByEml(INITIAL_RGB_LAYERS)
    expect(upper.length).toBeGreaterThan(0)
    expect(lower.length).toBeGreaterThan(0)
    expect(upper[upper.length - 1]?.role).toBe('eml')
    expect(lower.every((layer) => layer.role !== 'eml')).toBe(true)
  })
})
