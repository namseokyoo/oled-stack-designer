/**
 * channelOps.ts — 채널 분리/병합 순수 함수 모음
 *
 * 모든 함수는 순수 함수. React/Zustand 의존 없음.
 */

import type { ChannelCode, ColorToken, Layer } from '../types'

export const CHANNELS: ChannelCode[] = ['r', 'g', 'b']

/**
 * 공통 레이어 여부. geometryEngine.isCommonLayer의 canonical 정의.
 * @deprecated use domain/geometryEngine.isCommonLayer for new code. Remove after Phase 0 Step 0-8
 */
export { isCommonLayer } from './geometryEngine'

/**
 * 채널 suffix 반환 ('r' → 'R').
 * 출처: useStackStore.ts getChannelSuffix
 */
export function getChannelSuffix(channel: ChannelCode): string {
  return channel.toUpperCase()
}

/**
 * 채널별 split 후 colorToken 결정.
 * 출처: useStackStore.ts getSplitColorToken
 */
export function getSplitColorToken(layer: Layer, channel: ChannelCode): ColorToken {
  if (layer.role !== 'eml') {
    return layer.colorToken
  }

  const tokenMap: Record<ChannelCode, ColorToken> = {
    r: 'eml-r',
    g: 'eml-g',
    b: 'eml-b'
  }

  return tokenMap[channel]
}

/**
 * 채널 suffix 제거 ('EML-R' → 'EML', 'EML (copy)' → 'EML').
 * 출처: useStackStore.ts trimChannelSuffix
 */
export function trimChannelSuffix(name: string): string {
  return name.replace(/\s+\(copy\)$/i, '').replace(/(?:\s*-\s*|\s+)(R|G|B)$/i, '').trim()
}

/**
 * 레이어를 R/G/B 3개 채널 레이어로 분리.
 * 출처: useStackStore.ts splitToChannels 내부 splitLayers 계산 로직
 */
export function splitLayerToChannels(layer: Layer): Layer[] {
  return CHANNELS.map((channel) => {
    const channelOverride = layer.channelOverrides?.[channel]

    return {
      ...layer,
      name: `${trimChannelSuffix(layer.name)}-${getChannelSuffix(channel)}`,
      thickness: channelOverride?.thickness ?? layer.thickness,
      material: channelOverride?.material ?? layer.material,
      customColor: channelOverride?.customColor ?? layer.customColor,
      colorToken: getSplitColorToken(layer, channel),
      appliesTo: [channel],
      channelOverrides: undefined
    }
  })
}

/**
 * R/G/B 3개 채널 레이어를 공통 레이어로 병합.
 * 출처: useStackStore.ts mergeToCommon 내부 mergedLayer 계산 로직
 * 입력: orderedLayers = [rLayer, gLayer, bLayer] 순서
 */
export function mergeLayersToCommon(orderedLayers: Layer[]): Layer {
  const [rLayer, gLayer, bLayer] = orderedLayers as [Layer, Layer, Layer]

  const hasOverrides =
    gLayer.thickness !== rLayer.thickness ||
    gLayer.material !== rLayer.material ||
    gLayer.customColor !== rLayer.customColor ||
    bLayer.thickness !== rLayer.thickness ||
    bLayer.material !== rLayer.material ||
    bLayer.customColor !== rLayer.customColor

  return {
    ...rLayer,
    appliesTo: [...CHANNELS],
    channelOverrides: hasOverrides
      ? {
          g: {
            thickness: gLayer.thickness,
            material: gLayer.material,
            customColor: gLayer.customColor
          },
          b: {
            thickness: bLayer.thickness,
            material: bLayer.material,
            customColor: bLayer.customColor
          }
        }
      : undefined
  }
}
