import type { Layer, Project, StructureMode } from '../types'
import { executeBatch } from '../application/batchMutation'
import type { ChangeEntry } from '../application/batchMutation'
import type { AgentIntent } from './intentSchema'
import { validateIntent } from './intentValidator'

export interface CurrentState {
  project: Project
  currentLayers: Layer[]
  structureMode: StructureMode
}

export interface Proposal {
  description: string
  changes: ChangeEntry[]
  nextProject: Project
  nextLayers: Layer[]
  assumptions: string[]
  warnings: string[]
}

export type ExecutionResult =
  | { status: 'proposal'; proposal: Proposal }
  | { status: 'rejected'; reasons: string[] }
  | { status: 'clarify'; question: string; ambiguities: string[] }

export function applyAgentIntent(
  intent: AgentIntent,
  currentState: CurrentState
): ExecutionResult {
  const validationResult = validateIntent(intent, {
    currentProject: currentState.project,
    currentLayers: currentState.currentLayers
  })

  if (!validationResult.success) {
    if (validationResult.kind === 'clarify') {
      return {
        status: 'clarify',
        question: validationResult.question,
        ambiguities: validationResult.reasons
      }
    }

    return {
      status: 'rejected',
      reasons: validationResult.reasons
    }
  }

  const batchResult = executeBatch({
    currentProject: currentState.project,
    currentLayers: currentState.currentLayers,
    operations: validationResult.sanitizedOps,
    structureMode:
      currentState.structureMode === 'compare' ? 'single' : currentState.structureMode
  })

  if (!batchResult.success) {
    return {
      status: 'rejected',
      reasons: [batchResult.reason]
    }
  }

  return {
    status: 'proposal',
    proposal: {
      description: batchResult.description,
      changes: batchResult.changes,
      nextProject: batchResult.nextProject,
      nextLayers: batchResult.nextLayers,
      assumptions: validationResult.assumptions,
      warnings: validationResult.warnings
    }
  }
}
