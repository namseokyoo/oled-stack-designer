import type { LayerRole } from '../types'
import {
  DEFAULT_RGB_CHANNEL_LAYERS,
  DEFAULT_RGB_COMMON_LAYERS,
  DEFAULT_SINGLE_TEMPLATE
} from './structureTemplates'

export interface StructureLayerSpec {
  role: LayerRole
  name?: string
  material?: string
  thickness?: number
}

interface TemplateMetadata {
  id: string
  name: string
  description: string
  structureMode: 'single' | 'rgb'
  tags: string[]
  version: string
}

export interface SingleTemplate extends TemplateMetadata {
  structureMode: 'single'
  layers: StructureLayerSpec[]
}

export interface RgbTemplate extends TemplateMetadata {
  structureMode: 'rgb'
  commonLayers: StructureLayerSpec[]
  channelLayers: {
    r: StructureLayerSpec[]
    g: StructureLayerSpec[]
    b: StructureLayerSpec[]
  }
}

export type StructureTemplate = SingleTemplate | RgbTemplate

const registryMap = new Map<string, StructureTemplate>()

const BUILTIN_DEFAULT_SINGLE: SingleTemplate = {
  id: 'default-single',
  name: '기본 Single OLED',
  description: '표준 단일 발광 OLED 7층 구조 (phosphorescent green)',
  structureMode: 'single',
  tags: ['basic', 'phosphorescent', 'bottom-emission', 'single'],
  version: '1.0.0',
  layers: DEFAULT_SINGLE_TEMPLATE
}

const BUILTIN_DEFAULT_RGB_FMM: RgbTemplate = {
  id: 'default-rgb-fmm',
  name: '기본 RGB FMM OLED',
  description: 'RGB FMM (Fine Metal Mask) 방식 OLED: EML-R/G/B 채널별 분리',
  structureMode: 'rgb',
  tags: ['basic', 'fmm', 'rgb', 'bottom-emission'],
  version: '1.0.0',
  commonLayers: DEFAULT_RGB_COMMON_LAYERS,
  channelLayers: DEFAULT_RGB_CHANNEL_LAYERS
}

const BUILTIN_TANDEM_SINGLE: SingleTemplate = {
  id: 'tandem-single',
  name: 'Tandem Single OLED',
  description: '직렬 2-유닛 tandem OLED: CGL로 연결된 2개 발광 유닛',
  structureMode: 'single',
  tags: ['tandem', 'two-unit', 'high-efficiency', 'single'],
  version: '1.0.0',
  layers: [
    { role: 'cathode', name: 'Cathode', material: 'Al', thickness: 100 },
    { role: 'eil', name: 'EIL-2', material: 'LiF', thickness: 1 },
    { role: 'etl', name: 'ETL-2', material: 'Alq3', thickness: 30 },
    { role: 'eml', name: 'EML-2', material: 'CBP:Ir(ppy)3', thickness: 40 },
    { role: 'htl', name: 'HTL-2', material: 'NPB', thickness: 30 },
    { role: 'cgl', name: 'CGL', material: 'HAT-CN', thickness: 5 },
    { role: 'etl', name: 'ETL-1', material: 'Alq3', thickness: 30 },
    { role: 'eml', name: 'EML-1', material: 'CBP:Ir(ppy)3', thickness: 40 },
    { role: 'htl', name: 'HTL-1', material: 'NPB', thickness: 30 },
    { role: 'hil', name: 'HIL', material: 'MoO3', thickness: 10 },
    { role: 'anode', name: 'Anode', material: 'ITO', thickness: 150 }
  ]
}

const BUILTIN_WOLED_RGB: RgbTemplate = {
  id: 'woled-rgb',
  name: 'White OLED RGB',
  description: 'White OLED 기반 RGB: 흰색 발광층 + 컬러 필터 방식',
  structureMode: 'rgb',
  tags: ['white', 'woled', 'rgb', 'color-filter'],
  version: '1.0.0',
  commonLayers: [
    { role: 'cathode', name: 'Cathode', material: 'Ag', thickness: 20 },
    { role: 'eil', name: 'EIL', material: 'LiF', thickness: 1 },
    { role: 'etl', name: 'ETL', material: 'TPBi', thickness: 35 },
    { role: 'htl', name: 'HTL', material: 'TAPC', thickness: 40 },
    { role: 'hil', name: 'HIL', material: 'PEDOT:PSS', thickness: 10 },
    { role: 'anode', name: 'Anode', material: 'ITO', thickness: 150 }
  ],
  channelLayers: {
    r: [{ role: 'eml', name: 'EML-R', material: 'CBP:Ir(piq)2(acac)', thickness: 25 }],
    g: [{ role: 'eml', name: 'EML-G', material: 'mCBP:Ir(ppy)2(acac)', thickness: 20 }],
    b: [{ role: 'eml', name: 'EML-B', material: 'mCBP:FCNIrpic', thickness: 15 }]
  }
}

function cloneSpec(spec: StructureLayerSpec): StructureLayerSpec {
  return { ...spec }
}

function cloneChannelLayers(channelLayers: RgbTemplate['channelLayers']): RgbTemplate['channelLayers'] {
  return {
    r: channelLayers.r.map(cloneSpec),
    g: channelLayers.g.map(cloneSpec),
    b: channelLayers.b.map(cloneSpec)
  }
}

function cloneTemplate(template: StructureTemplate): StructureTemplate {
  const metadata = {
    ...template,
    tags: [...template.tags]
  }

  if (template.structureMode === 'single') {
    return {
      ...metadata,
      structureMode: 'single',
      layers: template.layers.map(cloneSpec)
    }
  }

  return {
    ...metadata,
    structureMode: 'rgb',
    commonLayers: template.commonLayers.map(cloneSpec),
    channelLayers: cloneChannelLayers(template.channelLayers)
  }
}

export function registerTemplate(template: StructureTemplate): void {
  registryMap.set(template.id, cloneTemplate(template))
}

export function getTemplateById(id: string): StructureTemplate | undefined {
  const template = registryMap.get(id)
  return template ? cloneTemplate(template) : undefined
}

export function getAllTemplates(): StructureTemplate[] {
  return Array.from(registryMap.values(), cloneTemplate)
}

export function getDefaultTemplate(mode: 'single' | 'rgb'): StructureTemplate {
  const defaultId = mode === 'single' ? 'default-single' : 'default-rgb-fmm'
  const preferred = getTemplateById(defaultId)

  if (preferred) {
    return preferred
  }

  const fallback = getAllTemplates().find((template) => template.structureMode === mode)

  if (fallback) {
    return fallback
  }

  throw new Error(`No ${mode} template registered`)
}

export function findTemplates(query: {
  mode?: 'single' | 'rgb'
  tags?: string[]
  keyword?: string
}): StructureTemplate[] {
  const normalizedTags = query.tags?.map((tag) => tag.toLowerCase()) ?? []
  const normalizedKeyword = query.keyword?.trim().toLowerCase() ?? ''

  return getAllTemplates().filter((template) => {
    if (query.mode && template.structureMode !== query.mode) {
      return false
    }

    if (
      normalizedTags.length > 0 &&
      !normalizedTags.every((tag) => template.tags.some((templateTag) => templateTag.toLowerCase() === tag))
    ) {
      return false
    }

    if (normalizedKeyword.length > 0) {
      const haystack = [template.id, template.name, template.description]
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(normalizedKeyword)) {
        return false
      }
    }

    return true
  })
}

;[
  BUILTIN_DEFAULT_SINGLE,
  BUILTIN_DEFAULT_RGB_FMM,
  BUILTIN_TANDEM_SINGLE,
  BUILTIN_WOLED_RGB
].forEach(registerTemplate)

// 내장 템플릿 목록 (리셋 시 참조)
const BUILTIN_TEMPLATE_IDS = new Set([
  'default-single',
  'default-rgb-fmm',
  'tandem-single',
  'woled-rgb'
])

const BUILTIN_TEMPLATES_LIST = [
  BUILTIN_DEFAULT_SINGLE,
  BUILTIN_DEFAULT_RGB_FMM,
  BUILTIN_TANDEM_SINGLE,
  BUILTIN_WOLED_RGB
] as const

export function resetRegistry(): void {
  registryMap.clear()
  for (const template of BUILTIN_TEMPLATES_LIST) {
    registryMap.set(template.id, cloneTemplate(template))
  }
}

export function unregisterTemplate(id: string, force = false): boolean {
  if (!force && BUILTIN_TEMPLATE_IDS.has(id)) {
    return false
  }

  return registryMap.delete(id)
}
