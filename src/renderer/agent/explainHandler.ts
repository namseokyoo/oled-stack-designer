import type { Layer, StructureMode } from '../types'

export interface CompareSlot {
  layers: Layer[]
}

function isStructureMode(value: string): value is StructureMode {
  return value === 'single' || value === 'rgb' || value === 'compare'
}

function formatLayer(layer: Layer): string {
  return `${layer.name} (${layer.material}, ${layer.thickness}nm)`
}

function formatLayerSequence(layers: Layer[]): string {
  return layers.map((layer) => formatLayer(layer)).join(' → ')
}

function resolveStructureLabel(structureMode: string): string {
  if (!isStructureMode(structureMode)) {
    return '구조'
  }

  if (structureMode === 'rgb') {
    return 'RGB FMM 구조'
  }

  if (structureMode === 'single') {
    return 'Single 구조'
  }

  return 'Compare 구조'
}

function formatChannelLayers(layers: Layer[], channel: 'r' | 'g' | 'b', label: string): string {
  const channelLayers = layers.filter(
    (layer) => layer.appliesTo.length === 1 && layer.appliesTo[0] === channel
  )

  return `${label} 채널 레이어: ${
    channelLayers.length > 0 ? formatLayerSequence(channelLayers) : '없음'
  }`
}

export function explainStructure(layers: Layer[], structureMode: string): string {
  if (layers.length === 0) {
    return '현재 구조가 비어 있습니다.'
  }

  if (structureMode === 'rgb') {
    const commonLayers = layers.filter((layer) => layer.appliesTo.length !== 1)
    const sections = [
      commonLayers.length > 0 ? `공통 레이어: ${formatLayerSequence(commonLayers)}` : null,
      formatChannelLayers(layers, 'r', 'R'),
      formatChannelLayers(layers, 'g', 'G'),
      formatChannelLayers(layers, 'b', 'B')
    ].filter((section): section is string => section !== null)

    return `현재 RGB FMM 구조는 ${layers.length}개 레이어로 구성됩니다. ${sections.join(' / ')}`
  }

  return `현재 ${resolveStructureLabel(structureMode)}는 ${layers.length}개 레이어로 구성됩니다: ${formatLayerSequence(
    layers
  )}`
}

export function explainCompareStructure(
  baseSlots: CompareSlot[],
  compareSlots: CompareSlot[],
  structureMode: string
): string {
  const modeLabel = structureMode === 'compare' ? 'Compare 모드' : resolveStructureLabel(structureMode)

  if (baseSlots.length === 0 && compareSlots.length === 0) {
    return `${modeLabel}: 비교할 구조가 없습니다.`
  }

  const parts: string[] = [
    `${modeLabel}: 기본 구조 ${baseSlots.length}개 슬롯 vs 비교 구조 ${compareSlots.length}개 슬롯.`
  ]

  for (let i = 0; i < baseSlots.length; i += 1) {
    const slot = baseSlots[i]

    if (slot && slot.layers.length > 0) {
      parts.push(`기본 구조 슬롯 ${i + 1}: ${formatLayerSequence(slot.layers)}`)
    } else {
      parts.push(`기본 구조 슬롯 ${i + 1}: 비어 있음`)
    }
  }

  for (let i = 0; i < compareSlots.length; i += 1) {
    const slot = compareSlots[i]

    if (slot && slot.layers.length > 0) {
      parts.push(`비교 구조 슬롯 ${i + 1}: ${formatLayerSequence(slot.layers)}`)
    } else {
      parts.push(`비교 구조 슬롯 ${i + 1}: 비어 있음`)
    }
  }

  return parts.join(' ')
}

export function explainProposal(proposal: {
  description: string
  changes: Array<{ op: string; summary: string }>
  assumptions: string[]
  warnings: string[]
}): string {
  const changeText =
    proposal.changes.length > 0
      ? proposal.changes.map((change, index) => `(${index + 1}) ${change.summary}`).join(' ')
      : '구체적인 변경 항목이 없습니다.'

  const parts = [
    proposal.description.trim().length > 0 ? `제안 요약: ${proposal.description}` : null,
    `이 제안은 다음 변경을 적용합니다: ${changeText}`,
    proposal.assumptions.length > 0 ? `가정: ${proposal.assumptions.join('; ')}` : null,
    proposal.warnings.length > 0 ? `주의: ${proposal.warnings.join('; ')}` : null
  ].filter((part): part is string => part !== null)

  return parts.join(' ')
}
