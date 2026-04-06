import type { Layer, Project } from '../types'
import type { SanitizedIntent } from '../agent/intentSchema'
import {
  insertLayerAfter,
  removeLayerById,
  reorderLayerInArray,
  duplicateLayerInArray,
  cloneLayers,
  generateId,
  cloneLayer
} from '../domain/layerOps'
import {
  cloneProject,
  touch,
  roleToColorToken,
  INITIAL_LAYERS,
  INITIAL_RGB_LAYERS
} from '../domain/projectMutations'
import { buildRgbStack, buildSingleStack } from '../domain/structureTemplates'
import {
  splitLayerToChannels,
  mergeLayersToCommon,
  CHANNELS,
  getSplitColorToken,
  trimChannelSuffix
} from '../domain/channelOps'
import { isCommonLayer } from '../domain/geometryEngine'

export interface BatchMutationInput {
  currentProject: Project
  currentLayers: Layer[]
  operations: SanitizedIntent[]
  structureMode: 'single' | 'rgb'
}

export interface ChangeEntry {
  index: number
  op: SanitizedIntent['op']
  summary: string
  targetLayerIds: string[]
  createdLayerIds?: string[]
  removedLayerIds?: string[]
}

export type BatchMutationResult =
  | {
      success: true
      nextProject: Project
      nextLayers: Layer[]
      description: string
      changes: ChangeEntry[]
    }
  | {
      success: false
      reason: string
      failedAtIndex: number
    }

type ApplyOpResult =
  | { success: true; nextProject: Project; nextLayers: Layer[]; change: ChangeEntry }
  | { success: false; reason: string; failedAtIndex: number }

export function executeBatch(input: BatchMutationInput): BatchMutationResult {
  const { currentProject, currentLayers, operations, structureMode } = input

  let workingProject = cloneProject(currentProject)
  let workingLayers = cloneLayers(currentLayers)

  const changes: ChangeEntry[] = []

  if (operations.length === 0) {
    return {
      success: true,
      nextProject: touch(workingProject),
      nextLayers: workingLayers,
      description: '변경 없음',
      changes: []
    }
  }

  for (let i = 0; i < operations.length; i += 1) {
    const op = operations[i]
    const result = applyOp(workingProject, workingLayers, op, structureMode, i)

    if (!result.success) {
      return { success: false, reason: result.reason, failedAtIndex: i }
    }

    workingProject = result.nextProject
    workingLayers = result.nextLayers
    changes.push(result.change)
  }

  const finalProject = touch(workingProject)
  const description =
    changes.length === 1 ? changes[0].summary : `${changes.length}개 변경 적용`

  return {
    success: true,
    nextProject: finalProject,
    nextLayers: workingLayers,
    description,
    changes
  }
}

function applyOp(
  currentProject: Project,
  currentLayers: Layer[],
  op: SanitizedIntent,
  structureMode: 'single' | 'rgb',
  opIndex: number
): ApplyOpResult {
  const activeStructureMode =
    currentProject.structureMode === 'single' || currentProject.structureMode === 'rgb'
      ? currentProject.structureMode
      : structureMode

  switch (op.op) {
    case 'add-layer': {
      const { role, afterId, appliesTo, name, material, thickness } = op
      const colorToken = roleToColorToken[role]
      const newLayer: Layer = {
        id: generateId(),
        name,
        role,
        material,
        thickness,
        colorToken,
        appliesTo: [...appliesTo]
      }
      const nextLayers = insertLayerAfter(currentLayers, afterId ?? undefined, newLayer)
      const change: ChangeEntry = {
        index: opIndex,
        op: 'add-layer',
        summary: `Added ${name} layer (${thickness}nm)`,
        targetLayerIds: [],
        createdLayerIds: [newLayer.id]
      }
      return { success: true, nextProject: currentProject, nextLayers, change }
    }

    case 'remove-layer': {
      const { layerId } = op
      const target = currentLayers.find((layer) => layer.id === layerId)
      if (!target) {
        return {
          success: false,
          reason: `Layer ${layerId} not found`,
          failedAtIndex: opIndex
        }
      }
      const nextLayers = removeLayerById(currentLayers, layerId)
      const change: ChangeEntry = {
        index: opIndex,
        op: 'remove-layer',
        summary: `Removed ${target.name}`,
        targetLayerIds: [layerId],
        removedLayerIds: [layerId]
      }
      return { success: true, nextProject: currentProject, nextLayers, change }
    }

    case 'update-layer': {
      const { layerId, patch } = op
      const target = currentLayers.find((layer) => layer.id === layerId)
      if (!target) {
        return {
          success: false,
          reason: `Layer ${layerId} not found`,
          failedAtIndex: opIndex
        }
      }
      const updatedLayer: Layer = {
        ...target,
        ...patch,
        colorToken: patch.role ? roleToColorToken[patch.role] : target.colorToken,
        appliesTo: patch.appliesTo ? [...patch.appliesTo] : [...target.appliesTo]
      }
      const nextLayers = currentLayers.map((layer) =>
        layer.id === layerId ? updatedLayer : layer
      )
      const patchKeys = Object.keys(patch).join(', ')
      const change: ChangeEntry = {
        index: opIndex,
        op: 'update-layer',
        summary: `Updated ${target.name} (${patchKeys})`,
        targetLayerIds: [layerId]
      }
      return { success: true, nextProject: currentProject, nextLayers, change }
    }

    case 'reorder-layer': {
      const { layerId, newIndex } = op
      const target = currentLayers.find((layer) => layer.id === layerId)
      if (!target) {
        return {
          success: false,
          reason: `Layer ${layerId} not found`,
          failedAtIndex: opIndex
        }
      }
      const nextLayers = reorderLayerInArray(currentLayers, layerId, newIndex)
      const change: ChangeEntry = {
        index: opIndex,
        op: 'reorder-layer',
        summary: `Reordered ${target.name} to index ${newIndex}`,
        targetLayerIds: [layerId]
      }
      return { success: true, nextProject: currentProject, nextLayers, change }
    }

    case 'duplicate-layer': {
      const { layerId } = op
      const target = currentLayers.find((layer) => layer.id === layerId)
      if (!target) {
        return {
          success: false,
          reason: `Layer ${layerId} not found`,
          failedAtIndex: opIndex
        }
      }
      const beforeIds = new Set(currentLayers.map((layer) => layer.id))
      const nextLayers = duplicateLayerInArray(currentLayers, layerId)
      const createdLayerIds = nextLayers
        .filter((layer) => !beforeIds.has(layer.id))
        .map((layer) => layer.id)
      const change: ChangeEntry = {
        index: opIndex,
        op: 'duplicate-layer',
        summary: `Duplicated ${target.name}`,
        targetLayerIds: [layerId],
        createdLayerIds
      }
      return { success: true, nextProject: currentProject, nextLayers, change }
    }

    case 'split-to-channels': {
      const { layerId } = op

      if (activeStructureMode !== 'rgb') {
        return {
          success: false,
          reason: 'split-to-channels is only allowed in rgb mode',
          failedAtIndex: opIndex
        }
      }

      const layerIndex = currentLayers.findIndex((layer) => layer.id === layerId)
      const target = currentLayers[layerIndex]
      if (!target || !isCommonLayer(target)) {
        return {
          success: false,
          reason: `Layer ${layerId} is not a valid common layer`,
          failedAtIndex: opIndex
        }
      }

      const baseSplitLayers = splitLayerToChannels(target)
      const splitLayers = CHANNELS.map((channel, index) => ({
        ...cloneLayer(baseSplitLayers[index]!),
        id: generateId(),
        name: `${trimChannelSuffix(target.name)}-${channel.toUpperCase()}`,
        colorToken: getSplitColorToken(target, channel),
        appliesTo: [channel],
        channelOverrides: undefined
      }))
      const nextLayers = [
        ...currentLayers.slice(0, layerIndex),
        ...splitLayers,
        ...currentLayers.slice(layerIndex + 1)
      ]
      const createdLayerIds = splitLayers.map((layer) => layer.id)
      const change: ChangeEntry = {
        index: opIndex,
        op: 'split-to-channels',
        summary: `Split ${target.name} into R/G/B channels`,
        targetLayerIds: [layerId],
        createdLayerIds,
        removedLayerIds: [layerId]
      }
      return { success: true, nextProject: currentProject, nextLayers, change }
    }

    case 'merge-to-common': {
      const { layerIds } = op

      if (activeStructureMode !== 'rgb') {
        return {
          success: false,
          reason: 'merge-to-common is only allowed in rgb mode',
          failedAtIndex: opIndex
        }
      }

      const selectedLayers = layerIds
        .map((id) => currentLayers.find((layer) => layer.id === id))
        .filter((layer): layer is Layer => Boolean(layer))
      if (selectedLayers.length !== 3) {
        return {
          success: false,
          reason: 'merge-to-common requires exactly 3 layers',
          failedAtIndex: opIndex
        }
      }
      if (selectedLayers.some((layer) => layer.locked)) {
        return {
          success: false,
          reason: 'Cannot merge locked layers',
          failedAtIndex: opIndex
        }
      }
      const orderedLayers = CHANNELS.map((channel) =>
        selectedLayers.find((layer) => layer.appliesTo[0] === channel)
      ).filter((layer): layer is Layer => Boolean(layer))
      if (orderedLayers.length !== 3 || new Set(orderedLayers.map((layer) => layer.role)).size !== 1) {
        return {
          success: false,
          reason: 'Layers must have same role and be R/G/B channel layers',
          failedAtIndex: opIndex
        }
      }
      const mergedLayer = mergeLayersToCommon(orderedLayers)
      const mergedLayerWithId: Layer = {
        ...mergedLayer,
        id: generateId(),
        name: trimChannelSuffix(orderedLayers[0].name)
      }
      const mergeIndexes = orderedLayers
        .map((layer) => currentLayers.findIndex((entry) => entry.id === layer.id))
        .filter((index) => index >= 0)
      const idSet = new Set(layerIds)
      const remainingLayers = currentLayers.filter((layer) => !idSet.has(layer.id))
      remainingLayers.splice(Math.min(...mergeIndexes), 0, mergedLayerWithId)
      const change: ChangeEntry = {
        index: opIndex,
        op: 'merge-to-common',
        summary: `Merged R/G/B channels into ${mergedLayerWithId.name}`,
        targetLayerIds: [...layerIds],
        createdLayerIds: [mergedLayerWithId.id],
        removedLayerIds: [...layerIds]
      }
      return { success: true, nextProject: currentProject, nextLayers: remainingLayers, change }
    }

    case 'create_single_stack': {
      const stack = currentProject.stacks[0]

      if (!stack) {
        return {
          success: false,
          reason: 'No stack found',
          failedAtIndex: opIndex
        }
      }

      const newLayers = buildSingleStack(op.layers)
      const nextProject: Project = {
        ...currentProject,
        structureMode: 'single',
        stacks: [{ ...stack, layers: newLayers }]
      }
      const change: ChangeEntry = {
        index: opIndex,
        op: 'create_single_stack',
        summary: `Single OLED 구조 생성 (${newLayers.length}층)`,
        targetLayerIds: [],
        createdLayerIds: newLayers.map((layer) => layer.id)
      }
      return { success: true, nextProject, nextLayers: newLayers, change }
    }

    case 'create_rgb_stack': {
      const stack = currentProject.stacks[0]

      if (!stack) {
        return {
          success: false,
          reason: 'No stack found',
          failedAtIndex: opIndex
        }
      }

      const newLayers = buildRgbStack({
        commonLayers: op.commonLayers,
        channelLayers: op.channelLayers
      })
      const nextProject: Project = {
        ...currentProject,
        structureMode: 'rgb',
        stacks: [{ ...stack, layers: newLayers }]
      }
      const change: ChangeEntry = {
        index: opIndex,
        op: 'create_rgb_stack',
        summary: `RGB FMM 구조 생성 (${newLayers.length}층)`,
        targetLayerIds: [],
        createdLayerIds: newLayers.map((layer) => layer.id)
      }
      return { success: true, nextProject, nextLayers: newLayers, change }
    }

    case 'set-structure-mode': {
      const { mode } = op
      if (currentProject.structureMode === mode) {
        const change: ChangeEntry = {
          index: opIndex,
          op: 'set-structure-mode',
          summary: `Structure mode unchanged (${mode})`,
          targetLayerIds: []
        }
        return { success: true, nextProject: currentProject, nextLayers: currentLayers, change }
      }
      const initialLayers = mode === 'rgb' ? cloneLayers(INITIAL_RGB_LAYERS) : cloneLayers(INITIAL_LAYERS)
      const stack = currentProject.stacks[0]
      const nextProject: Project = {
        ...currentProject,
        structureMode: mode,
        stacks: [{ ...stack, layers: initialLayers }]
      }
      const change: ChangeEntry = {
        index: opIndex,
        op: 'set-structure-mode',
        summary: `Structure mode set to ${mode}`,
        targetLayerIds: []
      }
      return { success: true, nextProject, nextLayers: initialLayers, change }
    }
  }
}
