import { describe, expect, it } from 'vitest'
import { cloneLayers } from '../../domain/layerOps'
import { cloneProject, INITIAL_LAYERS, INITIAL_PROJECT, INITIAL_RGB_LAYERS } from '../../domain/projectMutations'
import type { AgentIntent } from '../intentSchema'
import type { CurrentState } from '../intentExecutor'
import { applyAgentIntent } from '../intentExecutor'

function makeSingleState(): CurrentState {
  const project = cloneProject(INITIAL_PROJECT)
  const layers = cloneLayers(INITIAL_LAYERS)
  return { project, currentLayers: layers, structureMode: 'single' }
}

function makeRgbState(): CurrentState {
  const project = { ...cloneProject(INITIAL_PROJECT), structureMode: 'rgb' as const }
  const layers = cloneLayers(INITIAL_RGB_LAYERS)
  return { project, currentLayers: layers, structureMode: 'rgb' }
}

function makeCompareState(): CurrentState {
  const project = { ...cloneProject(INITIAL_PROJECT), structureMode: 'compare' as const }
  const layers = cloneLayers(INITIAL_LAYERS)
  return { project, currentLayers: layers, structureMode: 'single' }
}

describe('applyAgentIntent', () => {
  it('T-G3-01: valid add-layer intent → proposal 반환', () => {
    const state = makeSingleState()
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [{ op: 'add-layer', role: 'etl' }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes).toHaveLength(1)
      expect(result.proposal.changes[0].op).toBe('add-layer')
      const initialLayerCount = state.currentLayers.length
      expect(result.proposal.nextLayers.length).toBe(initialLayerCount + 1)
    }
  })

  it('T-G3-02: 잘못된 role → rejected 반환', () => {
    const state = makeSingleState()
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [{ op: 'add-layer', role: 'INVALID_ROLE' as never }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('rejected')
    if (result.status === 'rejected') {
      expect(result.reasons.length).toBeGreaterThan(0)
    }
  })

  it('T-G3-03: confidence: low → clarify 반환', () => {
    const state = makeSingleState()
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'low',
      assumptions: ['아마 etl을 추가하려는 것 같습니다'],
      warnings: [],
      ops: [{ op: 'add-layer', role: 'etl' }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('clarify')
    if (result.status === 'clarify') {
      expect(typeof result.question).toBe('string')
      expect(result.question.length).toBeGreaterThan(0)
    }
  })

  it('T-G3-04: 3개 op 복합 intent → proposal.changes.length === 3', () => {
    const state = makeSingleState()
    const firstLayerId = state.currentLayers[0]!.id
    const secondLayerId = state.currentLayers[1]!.id
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [
        { op: 'add-layer', role: 'etl' },
        { op: 'update-layer', layerId: firstLayerId, thickness: 120 },
        { op: 'remove-layer', layerId: secondLayerId }
      ]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes).toHaveLength(3)
    }
  })

  it('T-G3-05: single 모드에서 split-to-channels → rejected', () => {
    const state = makeSingleState()
    const firstLayerId = state.currentLayers[0]!.id
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [{ op: 'split-to-channels', layerId: firstLayerId }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('rejected')
  })

  it('T-G3-06: rgb 모드에서 공통층 split-to-channels → proposal', () => {
    const state = makeRgbState()
    const commonLayer = state.currentLayers.find((layer) => layer.appliesTo.length === 3)!
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [{ op: 'split-to-channels', layerId: commonLayer.id }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes).toHaveLength(1)
      expect(result.proposal.changes[0].op).toBe('split-to-channels')
    }
  })

  it('T-G3-07: compare 모드 프로젝트 → 모든 edit op rejected', () => {
    const state = makeCompareState()
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [{ op: 'add-layer', role: 'etl' }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('rejected')
  })

  it('T-G3-08: 존재하지 않는 layerId → batchMutation 실패 → rejected 변환', () => {
    const state = makeSingleState()
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: [{ op: 'remove-layer', layerId: 'non-existent-id-xyz' }]
    }

    const result = applyAgentIntent(intent, state)

    expect(result.status).toBe('rejected')
    if (result.status === 'rejected') {
      expect(result.reasons.length).toBeGreaterThan(0)
    }
  })
})
