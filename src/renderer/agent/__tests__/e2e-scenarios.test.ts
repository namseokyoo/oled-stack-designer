import { describe, expect, it } from 'vitest'
import { parseNaturalLanguage, type ParserContext } from '../intentParser'
import { applyAgentIntent, type CurrentState } from '../intentExecutor'
import { buildDiffSummary } from '../proposalDiff'
import { cloneLayers } from '../../domain/layerOps'
import { cloneProject, INITIAL_PROJECT, INITIAL_LAYERS } from '../../domain/projectMutations'

function makeSingleState(): CurrentState {
  return {
    project: cloneProject(INITIAL_PROJECT),
    currentLayers: cloneLayers(INITIAL_LAYERS),
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

describe('E2E scenarios', () => {
  it('E2E-01: HTL 50nm NPB 추가 -> add-layer proposal', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('HTL 50nm NPB 추가', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      const diff = buildDiffSummary(result.proposal, state.currentLayers)

      expect(result.proposal.changes[0]?.op).toBe('add-layer')
      expect(diff.isDangerous).toBe(false)
    }
  })

  it('E2E-02: ETL 삭제 -> remove-layer proposal (dangerous)', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('ETL 삭제', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      const diff = buildDiffSummary(result.proposal, state.currentLayers)

      expect(result.proposal.changes[0]?.op).toBe('remove-layer')
      expect(diff.isDangerous).toBe(true)
    }
  })

  it('E2E-03: EML 두께 60nm -> update-layer proposal', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('EML 두께 60', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes[0]?.op).toBe('update-layer')
    }
  })

  it('E2E-04: 기본 OLED 구조 만들어 -> create_single_stack proposal', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('기본 OLED 구조 만들어', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes[0]?.op).toBe('create_single_stack')
      expect(result.proposal.nextLayers).toHaveLength(7)
    }
  })

  it('E2E-05: RGB FMM 구조 만들어 -> create_rgb_stack proposal', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('RGB FMM 구조 만들어', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes[0]?.op).toBe('create_rgb_stack')
      expect(result.proposal.nextProject.structureMode).toBe('rgb')
    }
  })

  it('E2E-06: tandem 구조 만들어 -> template registry create', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('tandem 구조 만들어', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes[0]?.op).toBe('create_single_stack')
    }
  })

  it('E2E-07: 구조 설명해줘 -> explain intent parsed', () => {
    const parseResult = parseNaturalLanguage('구조 설명해줘', makeSingleContext())

    expect(parseResult.intent?.category).toBe('explain')
  })

  it('E2E-08: RGB로 전환 -> set-structure-mode proposal', () => {
    const state = makeSingleState()
    const parseResult = parseNaturalLanguage('RGB로 전환', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('proposal')
    if (result.status === 'proposal') {
      expect(result.proposal.changes[0]?.op).toBe('set-structure-mode')
    }
  })

  it('E2E-09: 잘못된 입력 -> null intent', () => {
    const parseResult = parseNaturalLanguage(
      'xyz123abc gibberish invalid command',
      makeSingleContext()
    )

    expect(parseResult.intent).toBeNull()
  })

  it('E2E-10: compare 모드에서 편집 -> rejected', () => {
    const project = cloneProject(INITIAL_PROJECT)
    project.structureMode = 'compare'

    const state: CurrentState = {
      project,
      currentLayers: cloneLayers(INITIAL_LAYERS),
      structureMode: 'compare'
    }
    const parseResult = parseNaturalLanguage('HTL 50nm NPB 추가', makeSingleContext())

    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).toBe('rejected')
  })

  it('E2E-11: compare 모드에서 explain -> rejected 아님, explain 처리', () => {
    const project = cloneProject(INITIAL_PROJECT)
    project.structureMode = 'compare'

    const state: CurrentState = {
      project,
      currentLayers: cloneLayers(INITIAL_LAYERS),
      structureMode: 'compare'
    }
    const parseResult = parseNaturalLanguage('구조 설명해줘', makeSingleContext())

    expect(parseResult.intent?.category).toBe('explain')
    expect(parseResult.intent).not.toBeNull()

    const result = applyAgentIntent(parseResult.intent!, state)

    expect(result.status).not.toBe('rejected')
  })
})
