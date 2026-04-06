import type { ChannelCode, Layer, LayerRole, Project } from '../types'

export type IntentCategory = 'create' | 'edit' | 'explain' | 'clarify'
export type IntentConfidence = 'high' | 'medium' | 'low'

type LayerEditableFields = Pick<
  Layer,
  'name' | 'role' | 'material' | 'thickness' | 'appliesTo'
>

export interface CreateLayerSpec {
  role: LayerRole
  name?: string
  material?: string
  thickness?: number
}

export type IntentOpCandidate =
  | {
      op: 'add-layer'
      role?: LayerRole
      afterId?: string
      appliesTo?: ChannelCode[]
      name?: string
      material?: string
      thickness?: number
    }
  | { op: 'remove-layer'; layerId?: string }
  | {
      op: 'update-layer'
      layerId?: string
      name?: string
      role?: LayerRole
      material?: string
      thickness?: number
      appliesTo?: ChannelCode[]
    }
  | { op: 'reorder-layer'; layerId?: string; newIndex?: number }
  | { op: 'duplicate-layer'; layerId?: string }
  | { op: 'split-to-channels'; layerId?: string }
  | { op: 'merge-to-common'; layerIds?: string[] }
  | { op: 'set-structure-mode'; mode?: 'single' | 'rgb' | 'compare' }
  | { op: 'create_single_stack'; layers: CreateLayerSpec[] }
  | {
      op: 'create_rgb_stack'
      commonLayers: CreateLayerSpec[]
      channelLayers: { r: CreateLayerSpec[]; g: CreateLayerSpec[]; b: CreateLayerSpec[] }
    }

export interface AgentIntent {
  category: IntentCategory
  confidence: IntentConfidence
  assumptions: string[]
  warnings: string[]
  ops: IntentOpCandidate[]
}

export type SanitizedIntent =
  | {
      op: 'add-layer'
      role: LayerRole
      afterId: string | null
      appliesTo: ChannelCode[]
      name: string
      material: string
      thickness: number
    }
  | { op: 'remove-layer'; layerId: string }
  | { op: 'update-layer'; layerId: string; patch: Partial<LayerEditableFields> }
  | { op: 'reorder-layer'; layerId: string; newIndex: number }
  | { op: 'duplicate-layer'; layerId: string }
  | { op: 'split-to-channels'; layerId: string }
  | { op: 'merge-to-common'; layerIds: [string, string, string] }
  | { op: 'set-structure-mode'; mode: 'single' | 'rgb' }
  | { op: 'create_single_stack'; layers: CreateLayerSpec[] }
  | {
      op: 'create_rgb_stack'
      commonLayers: CreateLayerSpec[]
      channelLayers: { r: CreateLayerSpec[]; g: CreateLayerSpec[]; b: CreateLayerSpec[] }
    }

export type ValidationResult =
  | {
      success: true
      sanitizedOps: SanitizedIntent[]
      assumptions: string[]
      warnings: string[]
    }
  | { success: false; kind: 'rejected'; reasons: string[] }
  | { success: false; kind: 'clarify'; question: string; reasons: string[] }

export interface ValidationContext {
  currentProject: Project
  currentLayers: Layer[]
}
