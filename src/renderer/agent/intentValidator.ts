import type { ChannelCode, Layer, LayerRole } from '../types'
import { CHANNELS } from '../domain/channelOps'
import { isCommonLayer } from '../domain/geometryEngine'
import { DEFAULT_NEW_LAYER } from '../domain/layerOps'
import type {
  AgentIntent,
  SanitizedIntent,
  ValidationContext,
  ValidationResult
} from './intentSchema'

const VALID_LAYER_ROLES: LayerRole[] = [
  'cathode',
  'eil',
  'etl',
  'eml',
  'htl',
  'hil',
  'anode',
  'cgl',
  'custom'
]

function isValidLayerRole(role: unknown): role is LayerRole {
  return VALID_LAYER_ROLES.includes(role as LayerRole)
}

function isValidThickness(thickness: unknown): thickness is number {
  return typeof thickness === 'number' && thickness > 0 && thickness <= 10000
}

function isValidChannelCodes(codes: unknown): codes is ChannelCode[] {
  if (!Array.isArray(codes)) {
    return false
  }

  return codes.every((code) => CHANNELS.includes(code as ChannelCode))
}

function getLayerById(layers: Layer[], layerId: string): Layer | undefined {
  return layers.find((layer) => layer.id === layerId)
}

function buildLowConfidenceQuestion(assumptions: string[]): string {
  if (assumptions.length > 0) {
    return `I assumed: ${assumptions.join(', ')}. Is this correct?`
  }

  return 'Your request is ambiguous. Could you provide more details?'
}

export function validateIntent(
  intent: AgentIntent,
  context: ValidationContext
): ValidationResult {
  if (intent.category === 'clarify') {
    return {
      success: false,
      kind: 'clarify',
      question: 'Please clarify your intent.',
      reasons: intent.assumptions
    }
  }

  if (intent.confidence === 'low') {
    return {
      success: false,
      kind: 'clarify',
      question: buildLowConfidenceQuestion(intent.assumptions),
      reasons: intent.assumptions
    }
  }

  if (intent.ops.length === 0 && intent.category === 'explain') {
    return {
      success: true,
      sanitizedOps: [],
      assumptions: intent.assumptions,
      warnings: intent.warnings
    }
  }

  if (context.currentProject.structureMode === 'compare' && intent.category !== 'explain') {
    return {
      success: false,
      kind: 'rejected',
      reasons: ['mutations not allowed in compare mode']
    }
  }

  if (
    intent.ops.length === 0 &&
    (intent.category === 'edit' || intent.category === 'create')
  ) {
    return {
      success: false,
      kind: 'rejected',
      reasons: ['no operations provided']
    }
  }

  const reasons: string[] = []
  const sanitizedOps: SanitizedIntent[] = []

  for (const op of intent.ops) {
    switch (op.op) {
      case 'add-layer': {
        if (op.role !== undefined && !isValidLayerRole(op.role)) {
          reasons.push('add-layer: invalid role')
          continue
        }

        if (op.thickness !== undefined && !isValidThickness(op.thickness)) {
          reasons.push('add-layer: thickness must be > 0 and <= 10000')
          continue
        }

        if (op.appliesTo !== undefined && !isValidChannelCodes(op.appliesTo)) {
          reasons.push('add-layer: invalid channel codes')
          continue
        }

        sanitizedOps.push({
          op: 'add-layer',
          role: op.role ?? DEFAULT_NEW_LAYER.role,
          afterId: op.afterId ?? null,
          appliesTo: op.appliesTo ?? [...CHANNELS],
          name: op.name ?? DEFAULT_NEW_LAYER.name,
          material: op.material ?? DEFAULT_NEW_LAYER.material,
          thickness: op.thickness ?? DEFAULT_NEW_LAYER.thickness
        })
        break
      }

      case 'remove-layer': {
        if (!op.layerId) {
          reasons.push('remove-layer: layerId is required')
          continue
        }

        const layer = getLayerById(context.currentLayers, op.layerId)

        if (!layer) {
          reasons.push(`remove-layer: layer not found (${op.layerId})`)
          continue
        }

        if (layer.locked) {
          reasons.push('remove-layer: layer is locked')
          continue
        }

        sanitizedOps.push({
          op: 'remove-layer',
          layerId: op.layerId
        })
        break
      }

      case 'update-layer': {
        if (!op.layerId) {
          reasons.push('update-layer: layerId is required')
          continue
        }

        const layer = getLayerById(context.currentLayers, op.layerId)

        if (!layer) {
          reasons.push(`update-layer: layer not found (${op.layerId})`)
          continue
        }

        if (layer.locked) {
          reasons.push('update-layer: layer is locked')
          continue
        }

        if (op.role !== undefined && !isValidLayerRole(op.role)) {
          reasons.push('update-layer: invalid role')
          continue
        }

        if (op.thickness !== undefined && !isValidThickness(op.thickness)) {
          reasons.push('update-layer: thickness must be > 0 and <= 10000')
          continue
        }

        if (op.appliesTo !== undefined && !isValidChannelCodes(op.appliesTo)) {
          reasons.push('update-layer: invalid channel codes')
          continue
        }

        const patch: Partial<
          Pick<Layer, 'name' | 'role' | 'material' | 'thickness' | 'appliesTo'>
        > = {}

        if (op.name !== undefined) {
          patch.name = op.name
        }
        if (op.role !== undefined) {
          patch.role = op.role
        }
        if (op.material !== undefined) {
          patch.material = op.material
        }
        if (op.thickness !== undefined) {
          patch.thickness = op.thickness
        }
        if (op.appliesTo !== undefined) {
          patch.appliesTo = op.appliesTo
        }

        if (Object.keys(patch).length === 0) {
          reasons.push('update-layer: patch must include at least one editable field')
          continue
        }

        sanitizedOps.push({
          op: 'update-layer',
          layerId: op.layerId,
          patch
        })
        break
      }

      case 'reorder-layer': {
        if (!op.layerId) {
          reasons.push('reorder-layer: layerId is required')
          continue
        }

        const layer = getLayerById(context.currentLayers, op.layerId)

        if (!layer) {
          reasons.push(`reorder-layer: layer not found (${op.layerId})`)
          continue
        }

        if (layer.locked) {
          reasons.push('reorder-layer: layer is locked')
          continue
        }

        if (op.newIndex === undefined) {
          reasons.push('reorder-layer: newIndex is required')
          continue
        }

        if (
          typeof op.newIndex !== 'number' ||
          op.newIndex < 0 ||
          op.newIndex >= context.currentLayers.length
        ) {
          reasons.push('reorder-layer: newIndex out of bounds')
          continue
        }

        sanitizedOps.push({
          op: 'reorder-layer',
          layerId: op.layerId,
          newIndex: op.newIndex
        })
        break
      }

      case 'duplicate-layer': {
        if (!op.layerId) {
          reasons.push('duplicate-layer: layerId is required')
          continue
        }

        const layer = getLayerById(context.currentLayers, op.layerId)

        if (!layer) {
          reasons.push(`duplicate-layer: layer not found (${op.layerId})`)
          continue
        }

        if (layer.locked) {
          reasons.push('duplicate-layer: layer is locked')
          continue
        }

        sanitizedOps.push({
          op: 'duplicate-layer',
          layerId: op.layerId
        })
        break
      }

      case 'split-to-channels': {
        if (!op.layerId) {
          reasons.push('split-to-channels: layerId is required')
          continue
        }

        const layer = getLayerById(context.currentLayers, op.layerId)

        if (!layer) {
          reasons.push(`split-to-channels: layer not found (${op.layerId})`)
          continue
        }

        if (layer.locked) {
          reasons.push('split-to-channels: layer is locked')
          continue
        }

        if (context.currentProject.structureMode !== 'rgb') {
          reasons.push('split-to-channels: only allowed in rgb mode')
          continue
        }

        if (!isCommonLayer(layer)) {
          reasons.push('split-to-channels: target must be a common layer')
          continue
        }

        sanitizedOps.push({
          op: 'split-to-channels',
          layerId: op.layerId
        })
        break
      }

      case 'merge-to-common': {
        if (!op.layerIds || op.layerIds.length !== 3) {
          reasons.push('merge-to-common: exactly 3 layerIds required')
          continue
        }

        if (context.currentProject.structureMode !== 'rgb') {
          reasons.push('merge-to-common: only allowed in rgb mode')
          continue
        }

        const [firstId, secondId, thirdId] = op.layerIds
        const targetIds: [string, string, string] = [firstId, secondId, thirdId]
        let hasInvalidLayer = false

        for (const layerId of targetIds) {
          const layer = getLayerById(context.currentLayers, layerId)

          if (!layer) {
            reasons.push(`merge-to-common: layer not found (${layerId})`)
            hasInvalidLayer = true
            continue
          }

          if (layer.locked) {
            reasons.push(`merge-to-common: layer is locked (${layerId})`)
            hasInvalidLayer = true
          }
        }

        if (hasInvalidLayer) {
          continue
        }

        sanitizedOps.push({
          op: 'merge-to-common',
          layerIds: targetIds
        })
        break
      }

      case 'set-structure-mode': {
        if (op.mode === undefined) {
          reasons.push('set-structure-mode: mode is required')
          continue
        }

        if (op.mode === 'compare') {
          reasons.push('set-structure-mode: compare mode not allowed via agent')
          continue
        }

        if (op.mode !== 'single' && op.mode !== 'rgb') {
          reasons.push('set-structure-mode: mode must be single or rgb')
          continue
        }

        sanitizedOps.push({
          op: 'set-structure-mode',
          mode: op.mode
        })
        break
      }

      case 'create_single_stack': {
        if (!op.layers || op.layers.length === 0) {
          reasons.push('create_single_stack: layers must not be empty')
          continue
        }

        const reasonCount = reasons.length

        for (const spec of op.layers) {
          if (!isValidLayerRole(spec.role)) {
            reasons.push(`create_single_stack: invalid role "${spec.role}"`)
          }

          if (spec.thickness !== undefined && !isValidThickness(spec.thickness)) {
            reasons.push(`create_single_stack: invalid thickness for role "${spec.role}"`)
          }
        }

        if (reasons.length === reasonCount) {
          sanitizedOps.push({ op: 'create_single_stack', layers: op.layers })
        }
        break
      }

      case 'create_rgb_stack': {
        if (!op.commonLayers || !op.channelLayers) {
          reasons.push('create_rgb_stack: commonLayers and channelLayers are required')
          continue
        }

        const reasonCount = reasons.length
        const allSpecs = [
          ...op.commonLayers,
          ...op.channelLayers.r,
          ...op.channelLayers.g,
          ...op.channelLayers.b
        ]

        for (const spec of allSpecs) {
          if (!isValidLayerRole(spec.role)) {
            reasons.push(`create_rgb_stack: invalid role "${spec.role}"`)
          }

          if (spec.thickness !== undefined && !isValidThickness(spec.thickness)) {
            reasons.push(`create_rgb_stack: invalid thickness for role "${spec.role}"`)
          }
        }

        if (reasons.length === reasonCount) {
          sanitizedOps.push({
            op: 'create_rgb_stack',
            commonLayers: op.commonLayers,
            channelLayers: op.channelLayers
          })
        }
        break
      }
    }
  }

  if (reasons.length > 0) {
    return {
      success: false,
      kind: 'rejected',
      reasons
    }
  }

  return {
    success: true,
    sanitizedOps,
    assumptions: intent.assumptions,
    warnings: intent.warnings
  }
}
