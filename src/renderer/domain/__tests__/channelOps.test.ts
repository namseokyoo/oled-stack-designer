import { describe, expect, it } from 'vitest'
import {
  CHANNELS,
  getChannelSuffix,
  mergeLayersToCommon,
  splitLayerToChannels,
  trimChannelSuffix
} from '../channelOps'
import { INITIAL_LAYERS, INITIAL_RGB_LAYERS } from '../projectMutations'

describe('splitLayerToChannels', () => {
  it('T-04: EML 레이어를 3개 채널로 분리', () => {
    const emlLayer = INITIAL_LAYERS.find((layer) => layer.role === 'eml')!
    const split = splitLayerToChannels(emlLayer)

    expect(split).toHaveLength(CHANNELS.length)
    expect(split[0]?.appliesTo).toEqual(['r'])
    expect(split[1]?.appliesTo).toEqual(['g'])
    expect(split[2]?.appliesTo).toEqual(['b'])
  })

  it('T-04: 분리 후 이름에 채널 suffix 포함', () => {
    const emlLayer = INITIAL_LAYERS.find((layer) => layer.role === 'eml')!
    const split = splitLayerToChannels(emlLayer)
    const baseName = trimChannelSuffix(emlLayer.name)

    expect(split[0]?.name).toBe(`${baseName}-R`)
    expect(split[1]?.name).toBe(`${baseName}-G`)
    expect(split[2]?.name).toBe(`${baseName}-B`)
  })

  it('T-04: channelOverrides 두께 반영', () => {
    const layer = {
      ...INITIAL_LAYERS[0]!,
      thickness: 100,
      channelOverrides: { r: { thickness: 50, material: undefined, customColor: undefined } }
    }
    const split = splitLayerToChannels(layer)
    expect(split[0]?.thickness).toBe(50)
    expect(split[1]?.thickness).toBe(100)
  })
})

describe('mergeLayersToCommon', () => {
  it('T-05: R/G/B 레이어를 공통 레이어로 병합', () => {
    const rLayer = INITIAL_RGB_LAYERS.find(
      (layer) => layer.appliesTo[0] === 'r' && layer.role === 'eml'
    )!
    const gLayer = INITIAL_RGB_LAYERS.find(
      (layer) => layer.appliesTo[0] === 'g' && layer.role === 'eml'
    )!
    const bLayer = INITIAL_RGB_LAYERS.find(
      (layer) => layer.appliesTo[0] === 'b' && layer.role === 'eml'
    )!

    const merged = mergeLayersToCommon([rLayer, gLayer, bLayer])

    expect(merged.appliesTo).toEqual(['r', 'g', 'b'])
    expect(merged.role).toBe('eml')
  })

  it('T-05: 두께가 다르면 channelOverrides 생성', () => {
    const rLayer = { ...INITIAL_RGB_LAYERS[0]!, appliesTo: ['r' as const], thickness: 40 }
    const gLayer = { ...INITIAL_RGB_LAYERS[0]!, appliesTo: ['g' as const], thickness: 35 }
    const bLayer = { ...INITIAL_RGB_LAYERS[0]!, appliesTo: ['b' as const], thickness: 25 }

    const merged = mergeLayersToCommon([rLayer, gLayer, bLayer])

    expect(merged.channelOverrides?.g?.thickness).toBe(35)
    expect(merged.channelOverrides?.b?.thickness).toBe(25)
  })

  it('T-05: 두께가 동일하면 channelOverrides undefined', () => {
    const rLayer = {
      ...INITIAL_RGB_LAYERS[0]!,
      appliesTo: ['r' as const],
      thickness: 50,
      material: 'X',
      customColor: undefined
    }
    const gLayer = { ...rLayer, appliesTo: ['g' as const] }
    const bLayer = { ...rLayer, appliesTo: ['b' as const] }

    const merged = mergeLayersToCommon([rLayer, gLayer, bLayer])

    expect(merged.channelOverrides).toBeUndefined()
  })
})

describe('trimChannelSuffix', () => {
  it('EML-R → EML', () => expect(trimChannelSuffix('EML-R')).toBe('EML'))
  it('EML (copy) → EML', () => expect(trimChannelSuffix('EML (copy)')).toBe('EML'))
  it('Normal → Normal', () => expect(trimChannelSuffix('Normal')).toBe('Normal'))
})

describe('getChannelSuffix', () => {
  it('r → R', () => expect(getChannelSuffix('r')).toBe('R'))
  it('g → G', () => expect(getChannelSuffix('g')).toBe('G'))
  it('b → B', () => expect(getChannelSuffix('b')).toBe('B'))
})
