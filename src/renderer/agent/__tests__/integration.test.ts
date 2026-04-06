import { describe, expect, it, vi } from 'vitest'
import { cloneLayers } from '../../domain/layerOps'
import {
  cloneProject,
  INITIAL_LAYERS,
  INITIAL_PROJECT
} from '../../domain/projectMutations'
import type { CurrentState } from '../intentExecutor'
import { applyAgentIntent } from '../intentExecutor'
import { parseNaturalLanguage, type ParserContext } from '../intentParser'

function makeSingleState(): CurrentState {
  const project = cloneProject(INITIAL_PROJECT)
  const currentLayers = cloneLayers(INITIAL_LAYERS)

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

describe('intent parser + executor integration', () => {
  it('I-01: add command → proposal 반환', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('HTL 50nm NPB 추가', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes.length).toBeGreaterThanOrEqual(1)
      expect(result.proposal.nextProject).toBeTruthy()
    }
  })

  it('I-02: invalid text → executor not called', () => {
    const parseResult = parseNaturalLanguage('invalid gibberish xyz', makeSingleContext())
    const executorSpy = vi.fn(applyAgentIntent)

    if (parseResult.intent) {
      executorSpy(parseResult.intent, makeSingleState())
    }

    expect(parseResult.intent).toBeNull()
    expect(executorSpy).not.toHaveBeenCalled()
  })

  it('I-03: thickness update command → update proposal', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('ETL 두께 60으로', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes[0]?.op).toBe('update-layer')
    }
  })

  it('I-04: empty text → null intent', () => {
    const parseResult = parseNaturalLanguage('', makeSingleContext())

    expect(parseResult.intent).toBeNull()
  })

  it('I-05: single mode split command → rejected', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('HTL 채널 분리', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('rejected')
  })

  it('I-06: "기본 OLED 구조 만들어" → proposal with 7 layers', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('기본 OLED 구조 만들어', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.nextLayers).toHaveLength(7)
      expect(result.proposal.changes[0]?.op).toBe('create_single_stack')
    }
  })

  it('I-07: "RGB FMM 구조 만들어" → proposal with structureMode rgb', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('RGB FMM 구조 만들어', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.nextProject.structureMode).toBe('rgb')
      expect(result.proposal.changes[0]?.op).toBe('create_rgb_stack')
    }
  })

  it('I-08: "RGB 구조 만들어" → proposal with channel layers', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('RGB 구조 만들어', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      const channelLayers = result.proposal.nextLayers.filter(
        (layer) => layer.appliesTo.length === 1
      )
      expect(channelLayers.map((layer) => layer.appliesTo[0]).sort()).toEqual(['b', 'g', 'r'])
    }
  })

  it('I-09: create_single_stack proposal sets nextProject.structureMode to single', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('create basic OLED', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.nextProject.structureMode).toBe('single')
    }
  })
})
