import type { Layer } from '../types'
import type { Proposal } from './intentExecutor'
import type { ChangeEntry } from '../application/batchMutation'

export interface DiffEntry {
  type: 'added' | 'removed' | 'modified' | 'reordered'
  layerName: string
  details: string
}

export interface DiffSummary {
  entries: DiffEntry[]
  isDangerous: boolean
  dangerousReasons: string[]
  totalChanges: number
}

function findLayerNameById(
  previousLayers: Layer[],
  layerId: string | undefined,
  fallback = 'Unknown'
): string {
  if (!layerId) {
    return fallback
  }

  return previousLayers.find((layer) => layer.id === layerId)?.name ?? fallback
}

function extractAddedLayerName(summary: string): string {
  const match = /^Added (.+?) layer\b/.exec(summary)
  return match?.[1] ?? 'New layer'
}

function extractMergedLayerName(summary: string): string {
  const match = /\binto (.+)$/.exec(summary)
  return match?.[1] ?? 'Merged layers'
}

function buildDiffEntry(change: ChangeEntry, previousLayers: Layer[]): DiffEntry {
  switch (change.op) {
    case 'add-layer':
      return {
        type: 'added',
        layerName: extractAddedLayerName(change.summary),
        details: change.summary
      }

    case 'remove-layer':
      return {
        type: 'removed',
        layerName: findLayerNameById(previousLayers, change.removedLayerIds?.[0]),
        details: 'Layer removed'
      }

    case 'update-layer':
      return {
        type: 'modified',
        layerName: findLayerNameById(previousLayers, change.targetLayerIds[0]),
        details: change.summary
      }

    case 'reorder-layer':
      return {
        type: 'reordered',
        layerName: findLayerNameById(previousLayers, change.targetLayerIds[0]),
        details: change.summary
      }

    case 'split-to-channels':
      return {
        type: 'modified',
        layerName: findLayerNameById(previousLayers, change.targetLayerIds[0]),
        details: 'Split into R/G/B channels'
      }

    case 'duplicate-layer':
      return {
        type: 'added',
        layerName: `${findLayerNameById(previousLayers, change.targetLayerIds[0])} (copy)`,
        details: change.summary
      }

    case 'create_single_stack':
    case 'create_rgb_stack':
      return {
        type: 'added',
        layerName: 'New structure',
        details: change.summary
      }

    case 'set-structure-mode':
      return {
        type: 'modified',
        layerName: 'Structure mode',
        details: change.summary
      }

    case 'merge-to-common':
      return {
        type: 'modified',
        layerName: extractMergedLayerName(change.summary),
        details: change.summary
      }
  }
}

export function buildDiffSummary(proposal: Proposal, previousLayers: Layer[]): DiffSummary {
  const entries = proposal.changes.map((change) => buildDiffEntry(change, previousLayers))

  const hasRemovedEntry = entries.some((entry) => entry.type === 'removed')
  const hasStructureModeSwitch =
    proposal.changes.some((change) => change.op === 'set-structure-mode') &&
    previousLayers.length > 0
  const hasChannelSplit = proposal.changes.some((change) => change.op === 'split-to-channels')
  const hasThreeOrMoreNonReorderChanges =
    entries.filter((entry) => entry.type !== 'reordered').length >= 3

  const dangerousReasons: string[] = []

  if (hasRemovedEntry) {
    dangerousReasons.push('Layer removal detected')
  }

  if (hasStructureModeSwitch) {
    dangerousReasons.push('Structure mode switch detected')
  }

  if (hasChannelSplit) {
    dangerousReasons.push('Channel split detected')
  }

  if (hasThreeOrMoreNonReorderChanges) {
    dangerousReasons.push('3 or more simultaneous changes')
  }

  dangerousReasons.push(...proposal.warnings)

  return {
    entries,
    isDangerous: dangerousReasons.length > 0,
    dangerousReasons,
    totalChanges: entries.length
  }
}
