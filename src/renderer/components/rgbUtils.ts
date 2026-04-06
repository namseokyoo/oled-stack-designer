import type { ChannelCode, Layer } from '../types'

export const CHANNELS: ChannelCode[] = ['r', 'g', 'b']

export const CHANNEL_META: Record<ChannelCode, { label: string; color: string }> = {
  r: { label: 'R', color: 'var(--layer-eml-r)' },
  g: { label: 'G', color: 'var(--layer-eml-g)' },
  b: { label: 'B', color: 'var(--layer-eml-b)' }
}

export type ChannelSectionBlock =
  | { type: 'common'; layers: Layer[] }
  | { type: 'fmm'; layers: Layer[] }

// @deprecated — use domain/geometryEngine directly. Remove after Phase 0 Step 0-8
export { isCommonLayer } from '../domain/geometryEngine'

export function splitChannelSection(channelSection: Layer[]): ChannelSectionBlock[] {
  const blocks: ChannelSectionBlock[] = []
  let index = 0

  while (index < channelSection.length) {
    const layer = channelSection[index]

    if (!layer) {
      index += 1
      continue
    }

    const isSingle = layer.appliesTo.length === 1
    const blockType = isSingle ? 'fmm' : 'common'
    const group: Layer[] = []

    while (index < channelSection.length) {
      const currentLayer = channelSection[index]

      if (!currentLayer) {
        index += 1
        continue
      }

      const currentIsSingle = currentLayer.appliesTo.length === 1
      if ((blockType === 'fmm') !== currentIsSingle) {
        break
      }

      group.push(currentLayer)
      index += 1
    }

    if (group.length > 0) {
      blocks.push({ type: blockType, layers: group })
    }
  }

  return blocks
}
