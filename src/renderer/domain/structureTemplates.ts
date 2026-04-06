import type { ChannelCode, ColorToken, Layer, LayerRole } from '../types'
import { generateId } from './layerOps'
import { roleToColorToken } from './projectMutations'

interface StructureLayerSpec {
  role: LayerRole
  name?: string
  material?: string
  thickness?: number
}

const ROLE_DEFAULTS: Record<
  LayerRole,
  { name: string; material: string; thickness: number }
> = {
  cathode: { name: 'Cathode', material: 'Al', thickness: 100 },
  eil: { name: 'EIL', material: 'LiF', thickness: 1 },
  etl: { name: 'ETL', material: 'Alq3', thickness: 30 },
  eml: { name: 'EML', material: 'CBP:Ir(ppy)3', thickness: 40 },
  htl: { name: 'HTL', material: 'NPB', thickness: 50 },
  hil: { name: 'HIL', material: 'MoO3', thickness: 10 },
  anode: { name: 'Anode', material: 'ITO', thickness: 150 },
  cgl: { name: 'CGL', material: 'HAT-CN', thickness: 5 },
  custom: { name: 'Custom', material: '', thickness: 20 }
}

const DEFAULT_SINGLE_TEMPLATE: StructureLayerSpec[] = [
  { role: 'cathode', name: 'Cathode', material: 'Al', thickness: 100 },
  { role: 'eil', name: 'EIL', material: 'LiF', thickness: 1 },
  { role: 'etl', name: 'ETL', material: 'Alq3', thickness: 30 },
  { role: 'eml', name: 'EML', material: 'CBP:Ir(ppy)3', thickness: 40 },
  { role: 'htl', name: 'HTL', material: 'NPB', thickness: 50 },
  { role: 'hil', name: 'HIL', material: 'MoO3', thickness: 10 },
  { role: 'anode', name: 'Anode', material: 'ITO', thickness: 150 }
]

const DEFAULT_RGB_COMMON_LAYERS: StructureLayerSpec[] = [
  { role: 'cathode', name: 'Cathode', material: 'Al', thickness: 100 },
  { role: 'eil', name: 'EIL', material: 'LiF', thickness: 1 },
  { role: 'etl', name: 'ETL', material: 'Alq3', thickness: 30 },
  { role: 'htl', name: 'HTL', material: 'NPB', thickness: 50 },
  { role: 'hil', name: 'HIL', material: 'MoO3', thickness: 10 },
  { role: 'anode', name: 'Anode', material: 'ITO', thickness: 150 }
]

const DEFAULT_RGB_CHANNEL_LAYERS: {
  r: StructureLayerSpec[]
  g: StructureLayerSpec[]
  b: StructureLayerSpec[]
} = {
  r: [{ role: 'eml', name: 'EML-R', material: 'CBP:Ir(piq)2(acac)', thickness: 40 }],
  g: [{ role: 'eml', name: 'EML-G', material: 'CBP:Ir(ppy)3', thickness: 35 }],
  b: [{ role: 'eml', name: 'EML-B', material: 'mCBP:FCNIrpic', thickness: 25 }]
}

function resolveColorToken(role: LayerRole, appliesTo: ChannelCode[]): ColorToken {
  if (role === 'eml') {
    if (appliesTo.length === 1) {
      const channel = appliesTo[0]

      if (channel === 'r') {
        return 'eml-r'
      }

      if (channel === 'g') {
        return 'eml-g'
      }

      return 'eml-b'
    }

    return 'eml-g'
  }

  return roleToColorToken[role]
}

export function specToLayer(spec: StructureLayerSpec, appliesTo: ChannelCode[]): Layer {
  const defaults = ROLE_DEFAULTS[spec.role]

  return {
    id: generateId(),
    role: spec.role,
    name: spec.name ?? defaults.name,
    material: spec.material ?? defaults.material,
    thickness: spec.thickness ?? defaults.thickness,
    colorToken: resolveColorToken(spec.role, appliesTo),
    appliesTo: [...appliesTo]
  }
}

export function buildSingleStack(specs: StructureLayerSpec[]): Layer[] {
  if (specs.length === 0) {
    return []
  }

  return specs.map((spec) => specToLayer(spec, ['r', 'g', 'b']))
}

export function buildRgbStack(template: {
  commonLayers: StructureLayerSpec[]
  channelLayers: {
    r: StructureLayerSpec[]
    g: StructureLayerSpec[]
    b: StructureLayerSpec[]
  }
}): Layer[] {
  const { commonLayers, channelLayers } = template
  const htlIndex = commonLayers.findIndex((spec) => spec.role === 'htl')
  const insertAt = htlIndex >= 0 ? htlIndex : commonLayers.length

  const result: Layer[] = []

  for (const spec of commonLayers.slice(0, insertAt)) {
    result.push(specToLayer(spec, ['r', 'g', 'b']))
  }

  for (const spec of channelLayers.r) {
    result.push(specToLayer(spec, ['r']))
  }
  for (const spec of channelLayers.g) {
    result.push(specToLayer(spec, ['g']))
  }
  for (const spec of channelLayers.b) {
    result.push(specToLayer(spec, ['b']))
  }

  for (const spec of commonLayers.slice(insertAt)) {
    result.push(specToLayer(spec, ['r', 'g', 'b']))
  }

  return result
}

export {
  DEFAULT_SINGLE_TEMPLATE,
  DEFAULT_RGB_COMMON_LAYERS,
  DEFAULT_RGB_CHANNEL_LAYERS,
  ROLE_DEFAULTS
}
