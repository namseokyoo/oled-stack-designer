/**
 * geometryEngine.ts — OLED 스택 기하 계산 순수 함수 모음
 *
 * 모든 함수는 순수 함수. React/Zustand 의존 없음.
 * LayoutContext 파라미터화로 화면/SVG 렌더 공통 사용.
 */

import type { ChannelCode, Layer, ThicknessMode } from '../types'
import type { LayoutContext } from './layoutContext'

const CHANNELS: ChannelCode[] = ['r', 'g', 'b']

/**
 * Single mode scale factor 계산.
 * 출처: canvasShared.ts computeScaleFactor (gap = gapPx × (n-1))
 */
export function computeScaleFactor(layers: Layer[], ctx: LayoutContext): number {
  if (layers.length === 0) {
    return 1
  }

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0)
  const gapTotal = (layers.length - 1) * ctx.gapPx
  const availableHeight = ctx.canvasHeight - gapTotal
  const naiveScale = availableHeight / totalThickness

  return Math.max(naiveScale, 0.1)
}

/**
 * RGB mode scale factor 계산.
 * 출처: svgGenerator.ts computeRgbScaleFactor (gap = 22 × totalRectCount)
 */
export function computeRgbScaleFactor(layers: Layer[], ctx: LayoutContext): number {
  if (layers.length === 0) {
    return 1
  }

  const lastEmlIndex = getLastEmlIndex(layers)
  const channelSection = lastEmlIndex >= 0 ? layers.slice(0, lastEmlIndex + 1) : []
  const lowerSection = lastEmlIndex >= 0 ? layers.slice(lastEmlIndex + 1) : layers

  const lowerThickness = lowerSection.reduce((sum, layer) => sum + layer.thickness, 0)
  const maxChannelThickness = Math.max(
    0,
    ...CHANNELS.map((channel) =>
      channelSection.reduce((sum, layer) => {
        if (!layer.appliesTo.includes(channel)) {
          return sum
        }

        return sum + resolveChannelThickness(layer, channel)
      }, 0)
    )
  )
  const totalThickness = lowerThickness + maxChannelThickness
  const lowerRectCount = lowerSection.length
  const maxChannelRectCount = Math.max(
    0,
    ...CHANNELS.map(
      (channel) => channelSection.filter((layer) => layer.appliesTo.includes(channel)).length
    )
  )
  const totalRectCount = lowerRectCount + maxChannelRectCount
  const availableHeight = ctx.canvasHeight - totalRectCount * 22
  const naiveScale = totalThickness > 0 ? availableHeight / totalThickness : 1

  const allThicknesses = [
    ...lowerSection.map((layer) => layer.thickness),
    ...channelSection.flatMap((layer) =>
      layer.appliesTo.map((channel) => resolveChannelThickness(layer, channel))
    )
  ]
  const minThickness = allThicknesses.length > 0 ? Math.min(...allThicknesses) : 0
  const minScaleForMin = minThickness > 0 ? ctx.minBlockPx / minThickness : 1

  return Math.max(naiveScale, minScaleForMin)
}

/**
 * 레이어 블록 높이 계산.
 * 출처: LayerBlock.tsx getBlockHeight + svgGenerator.ts resolveBlockHeightForThickness
 */
export function resolveBlockHeight(
  layer: Layer,
  thicknessMode: ThicknessMode,
  scaleFactor: number,
  ctx: LayoutContext
): number {
  if (thicknessMode === 'real') {
    return Math.max(ctx.minBlockPx, layer.thickness * scaleFactor)
  }

  return ctx.uniformBlockPx
}

/**
 * EML 마지막 인덱스 탐색.
 * 출처: svgGenerator.ts, RGBCanvas.tsx, CompareCanvas.tsx 3곳 중복 단일화
 */
export function getLastEmlIndex(layers: Layer[]): number {
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    if (layers[i]?.role === 'eml') {
      return i
    }
  }

  return -1
}

/**
 * EML 기준 상하 분리.
 * 출처: svgGenerator.ts, RGBCanvas.tsx, CompareCanvas.tsx 3곳 중복 단일화
 */
export function partitionLayersByEml(layers: Layer[]): { upper: Layer[]; lower: Layer[] } {
  const lastEmlIndex = getLastEmlIndex(layers)

  if (lastEmlIndex < 0) {
    return { upper: [], lower: layers }
  }

  return {
    upper: layers.slice(0, lastEmlIndex + 1),
    lower: layers.slice(lastEmlIndex + 1)
  }
}

/**
 * 공통 레이어 여부 (모든 채널에 적용).
 * useStackStore.ts isCommonLayer (CHANNELS.every 방식 — 가장 엄격한 구현) 기반.
 */
export function isCommonLayer(layer: Layer): boolean {
  return (
    layer.appliesTo.length === CHANNELS.length &&
    CHANNELS.every((channel) => layer.appliesTo.includes(channel))
  )
}

/**
 * 채널 두께 반환 (channelOverrides 반영).
 * 출처: svgGenerator.ts resolveChannelThickness
 */
export function resolveChannelThickness(layer: Layer, channel: ChannelCode): number {
  return layer.channelOverrides?.[channel]?.thickness ?? layer.thickness
}
