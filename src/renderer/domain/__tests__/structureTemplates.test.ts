import { describe, expect, it } from 'vitest'
import {
  buildRgbStack,
  buildSingleStack,
  DEFAULT_RGB_CHANNEL_LAYERS,
  DEFAULT_RGB_COMMON_LAYERS,
  DEFAULT_SINGLE_TEMPLATE,
  ROLE_DEFAULTS,
  specToLayer
} from '../structureTemplates'

describe('structureTemplates', () => {
  it('S-01: buildSingleStack with default template returns 7 layers', () => {
    const layers = buildSingleStack(DEFAULT_SINGLE_TEMPLATE)

    expect(layers).toHaveLength(7)
  })

  it('S-02: buildSingleStack default roles follow single OLED order', () => {
    const layers = buildSingleStack(DEFAULT_SINGLE_TEMPLATE)

    expect(layers.map((layer) => layer.role)).toEqual([
      'cathode',
      'eil',
      'etl',
      'eml',
      'htl',
      'hil',
      'anode'
    ])
  })

  it('S-03: buildSingleStack creates common layers for all channels', () => {
    const layers = buildSingleStack(DEFAULT_SINGLE_TEMPLATE)

    expect(layers.every((layer) => layer.appliesTo.join(',') === 'r,g,b')).toBe(true)
  })

  it('S-04: buildSingleStack with empty specs returns empty array', () => {
    expect(buildSingleStack([])).toEqual([])
  })

  it('S-05: specToLayer fills missing fields from ROLE_DEFAULTS', () => {
    const layer = specToLayer({ role: 'htl' }, ['r', 'g', 'b'])

    expect(layer.name).toBe(ROLE_DEFAULTS.htl.name)
    expect(layer.material).toBe(ROLE_DEFAULTS.htl.material)
    expect(layer.thickness).toBe(ROLE_DEFAULTS.htl.thickness)
    expect(layer.colorToken).toBe('htl')
  })

  it('S-06: buildRgbStack returns 9 layers total', () => {
    const layers = buildRgbStack({
      commonLayers: DEFAULT_RGB_COMMON_LAYERS,
      channelLayers: DEFAULT_RGB_CHANNEL_LAYERS
    })

    expect(layers).toHaveLength(9)
  })

  it('S-07: buildRgbStack channel EML layers have per-channel appliesTo', () => {
    const layers = buildRgbStack({
      commonLayers: DEFAULT_RGB_COMMON_LAYERS,
      channelLayers: DEFAULT_RGB_CHANNEL_LAYERS
    })

    expect(layers.find((layer) => layer.name === 'EML-R')?.appliesTo).toEqual(['r'])
    expect(layers.find((layer) => layer.name === 'EML-G')?.appliesTo).toEqual(['g'])
    expect(layers.find((layer) => layer.name === 'EML-B')?.appliesTo).toEqual(['b'])
  })

  it('S-08: buildRgbStack common layers apply to all channels', () => {
    const layers = buildRgbStack({
      commonLayers: DEFAULT_RGB_COMMON_LAYERS,
      channelLayers: DEFAULT_RGB_CHANNEL_LAYERS
    })
    const commonLayers = layers.filter((layer) => layer.appliesTo.length === 3)

    expect(commonLayers).toHaveLength(6)
    expect(commonLayers.every((layer) => layer.appliesTo.join(',') === 'r,g,b')).toBe(true)
  })
})
