import { describe, expect, it } from 'vitest'
import { executeBatch } from '../batchMutation'
import { cloneLayers } from '../../domain/layerOps'
import {
  INITIAL_LAYERS,
  INITIAL_RGB_LAYERS,
  cloneProject,
  INITIAL_PROJECT
} from '../../domain/projectMutations'
import type { SanitizedIntent } from '../../agent/intentSchema'

type BatchMutationResult = ReturnType<typeof executeBatch>

function makeSingleProject(layers = cloneLayers(INITIAL_LAYERS)) {
  const project = cloneProject(INITIAL_PROJECT)
  project.stacks[0].layers = layers
  project.structureMode = 'single'
  return project
}

function makeRgbProject(layers = cloneLayers(INITIAL_RGB_LAYERS)) {
  const project = cloneProject(INITIAL_PROJECT)
  project.stacks[0].layers = layers
  project.structureMode = 'rgb'
  return project
}

function expectSuccess(
  result: BatchMutationResult
): asserts result is Extract<BatchMutationResult, { success: true }> {
  expect(result.success).toBe(true)

  if (!result.success) {
    throw new Error(`Expected success but failed: ${result.reason}`)
  }
}

describe('executeBatch', () => {
  it('T-01: single add-layer 1개를 적용한다', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const project = makeSingleProject(layers)
    const operations: SanitizedIntent[] = [
      {
        op: 'add-layer',
        role: 'htl',
        afterId: null,
        appliesTo: ['r', 'g', 'b'],
        name: 'HTL-2',
        material: 'NPB',
        thickness: 40
      }
    ]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expectSuccess(result)
    expect(result.nextLayers).toHaveLength(INITIAL_LAYERS.length + 1)
    expect(result.changes).toHaveLength(1)
    expect(result.description.length).toBeGreaterThan(0)
  })

  it('T-02: add + update + reorder 복합 op를 순서대로 적용한다', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const project = makeSingleProject(layers)
    const operations: SanitizedIntent[] = [
      {
        op: 'add-layer',
        role: 'custom',
        afterId: 'htl-1',
        appliesTo: ['r', 'g', 'b'],
        name: 'Spacer',
        material: 'Org',
        thickness: 5
      },
      {
        op: 'update-layer',
        layerId: 'htl-1',
        patch: { thickness: 60 }
      },
      {
        op: 'reorder-layer',
        layerId: 'htl-1',
        newIndex: 0
      }
    ]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expectSuccess(result)
    expect(result.changes).toHaveLength(3)
    expect(result.nextLayers.find((layer) => layer.id === 'htl-1')?.thickness).toBe(60)
    expect(result.nextLayers[0]?.id).toBe('htl-1')
  })

  it('T-03: 중간 op가 실패하면 실패 인덱스를 반환하고 입력은 변하지 않는다', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const originalSnapshot = cloneLayers(layers)
    const project = makeSingleProject(layers)
    const operations: SanitizedIntent[] = [
      {
        op: 'add-layer',
        role: 'custom',
        afterId: null,
        appliesTo: ['r', 'g', 'b'],
        name: 'Temp',
        material: 'X',
        thickness: 10
      },
      {
        op: 'remove-layer',
        layerId: 'non-existent-layer-xyz'
      },
      {
        op: 'add-layer',
        role: 'custom',
        afterId: null,
        appliesTo: ['r', 'g', 'b'],
        name: 'Never Applied',
        material: 'Y',
        thickness: 20
      }
    ]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expect(result.success).toBe(false)

    if (result.success) {
      throw new Error('Expected batch failure')
    }

    expect(result.failedAtIndex).toBe(1)
    expect(layers).toEqual(originalSnapshot)
    expect(project.stacks[0].layers).toEqual(originalSnapshot)
  })

  it('T-04: 빈 ops 배열이면 변경 없이 성공한다', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const project = makeSingleProject(layers)

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations: [],
      structureMode: 'single'
    })

    expectSuccess(result)
    expect(result.changes).toEqual([])
    expect(result.nextLayers).toHaveLength(INITIAL_LAYERS.length)
    expect(result.description).toBe('변경 없음')
  })

  it('T-05: remove-layer는 대상 레이어를 제거하고 change에 removedLayerIds를 남긴다', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const project = makeSingleProject(layers)
    const operations: SanitizedIntent[] = [{ op: 'remove-layer', layerId: 'htl-1' }]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expectSuccess(result)
    expect(result.nextLayers.find((layer) => layer.id === 'htl-1')).toBeUndefined()
    expect(result.changes[0]?.removedLayerIds).toContain('htl-1')
  })

  it('T-06: split-to-channels는 RGB 공통층을 3개 채널 레이어로 분리한다', () => {
    const layers = cloneLayers(INITIAL_RGB_LAYERS)
    const project = makeRgbProject(layers)
    const operations: SanitizedIntent[] = [{ op: 'split-to-channels', layerId: 'cathode-rgb-1' }]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'rgb'
    })

    expectSuccess(result)
    expect(result.nextLayers.find((layer) => layer.id === 'cathode-rgb-1')).toBeUndefined()
    expect(result.changes[0]?.createdLayerIds).toHaveLength(3)
    expect(result.changes[0]?.removedLayerIds).toContain('cathode-rgb-1')
  })

  it('T-07: merge-to-common은 RGB 채널 레이어 3개를 공통 레이어 1개로 병합한다', () => {
    const layers = cloneLayers(INITIAL_RGB_LAYERS)
    const project = makeRgbProject(layers)
    const operations: SanitizedIntent[] = [
      { op: 'merge-to-common', layerIds: ['eml-r-1', 'eml-g-1', 'eml-b-1'] }
    ]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'rgb'
    })

    expectSuccess(result)
    expect(result.nextLayers.find((layer) => layer.id === 'eml-r-1')).toBeUndefined()
    expect(result.nextLayers.find((layer) => layer.id === 'eml-g-1')).toBeUndefined()
    expect(result.nextLayers.find((layer) => layer.id === 'eml-b-1')).toBeUndefined()
    expect(result.changes[0]?.removedLayerIds).toHaveLength(3)
    expect(result.changes[0]?.createdLayerIds).toHaveLength(1)
    expect(
      result.nextLayers.find(
        (layer) => layer.role === 'eml' && layer.appliesTo.length === 3 && layer.id !== 'eml-r-1'
      )
    ).toBeDefined()
  })

  it('T-08: set-structure-mode는 single 프로젝트를 rgb 초기 레이어로 교체한다', () => {
    const layers = cloneLayers(INITIAL_LAYERS)
    const project = makeSingleProject(layers)
    const operations: SanitizedIntent[] = [{ op: 'set-structure-mode', mode: 'rgb' }]

    const result = executeBatch({
      currentProject: project,
      currentLayers: layers,
      operations,
      structureMode: 'single'
    })

    expectSuccess(result)
    expect(result.nextProject.structureMode).toBe('rgb')
    expect(result.nextLayers.some((layer) => layer.appliesTo.length === 1)).toBe(true)
  })
})
