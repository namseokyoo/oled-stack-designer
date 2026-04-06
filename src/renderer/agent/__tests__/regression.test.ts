import { describe, expect, it } from 'vitest'
import { executeBatch } from '../../application/batchMutation'
import { cloneLayers } from '../../domain/layerOps'
import { cloneProject, INITIAL_LAYERS, INITIAL_PROJECT } from '../../domain/projectMutations'
import type { SanitizedIntent } from '../intentSchema'
import type { CurrentState } from '../intentExecutor'
import { applyAgentIntent } from '../intentExecutor'
import { parseNaturalLanguage, type ParserContext } from '../intentParser'

function makeSingleState(): CurrentState {
  const project = cloneProject(INITIAL_PROJECT)
  const currentLayers = cloneLayers(INITIAL_LAYERS)
  project.stacks[0].layers = cloneLayers(currentLayers)

  return {
    project,
    currentLayers,
    structureMode: 'single'
  }
}

function makeSingleContext(): ParserContext {
  const layers = cloneLayers(INITIAL_LAYERS)

  return {
    structureMode: 'single',
    layers: layers.map((layer) => ({ id: layer.id, name: layer.name, role: layer.role }))
  }
}

function makeSingleProject() {
  const layers = cloneLayers(INITIAL_LAYERS)
  const project = cloneProject(INITIAL_PROJECT)
  project.stacks[0].layers = cloneLayers(layers)

  return { project, layers }
}

describe('regression tests', () => {
  it('REG-01: batch 3 ops = 1 description', () => {
    const { project, layers } = makeSingleProject()
    const operations: SanitizedIntent[] = [
      { op: 'update-layer', layerId: 'cathode-1', patch: { thickness: 110 } },
      { op: 'update-layer', layerId: 'eil-1', patch: { thickness: 2 } },
      { op: 'update-layer', layerId: 'etl-1', patch: { thickness: 35 } }
    ]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error(`Expected success but failed: ${result.reason}`)
    }

    expect(result.changes).toHaveLength(3)
    expect(result.description).toContain('3개 변경 적용')
  })

  it('REG-02: proposal apply changes nextProject', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('HTL 50nm NPB 추가', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.nextProject).not.toBeNull()
      expect(result.proposal.nextLayers.length).toBeGreaterThan(0)
    }
  })

  it('REG-03: undo scenario - verify history atomicity', () => {
    const { project, layers } = makeSingleProject()
    const operations: SanitizedIntent[] = [
      {
        op: 'add-layer',
        role: 'custom',
        afterId: null,
        appliesTo: ['r', 'g', 'b'],
        name: 'Spacer-A',
        material: 'Org-A',
        thickness: 5
      },
      {
        op: 'add-layer',
        role: 'custom',
        afterId: null,
        appliesTo: ['r', 'g', 'b'],
        name: 'Spacer-B',
        material: 'Org-B',
        thickness: 6
      }
    ]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      throw new Error(`Expected success but failed: ${result.reason}`)
    }

    expect(result.changes).toHaveLength(2)
    expect(result.description).toBe('2개 변경 적용')
  })
})
