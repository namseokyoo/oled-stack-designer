import { describe, expect, it } from 'vitest'
import { cloneLayers } from '../../domain/layerOps'
import { cloneProject, INITIAL_PROJECT, INITIAL_LAYERS } from '../../domain/projectMutations'
import type { Proposal } from '../intentExecutor'
import { buildDiffSummary } from '../proposalDiff'

function makeProp(overrides?: Partial<Proposal>): Proposal {
  return {
    description: 'test',
    changes: [],
    nextProject: cloneProject(INITIAL_PROJECT),
    nextLayers: cloneLayers(INITIAL_LAYERS),
    assumptions: [],
    warnings: [],
    ...overrides
  }
}

describe('proposalDiff', () => {
  it('PD-01: empty changes -> empty DiffSummary', () => {
    const summary = buildDiffSummary(makeProp(), [])

    expect(summary.entries).toEqual([])
    expect(summary.isDangerous).toBe(false)
    expect(summary.totalChanges).toBe(0)
  })

  it('PD-02: add-layer change -> type added, isDangerous false', () => {
    const summary = buildDiffSummary(
      makeProp({
        changes: [
          {
            index: 0,
            op: 'add-layer',
            summary: 'Added HTL layer (50nm)',
            targetLayerIds: [],
            createdLayerIds: ['new-id']
          }
        ]
      }),
      cloneLayers(INITIAL_LAYERS)
    )

    expect(summary.entries[0]?.type).toBe('added')
    expect(summary.isDangerous).toBe(false)
  })

  it('PD-03: remove-layer -> isDangerous true', () => {
    const previousLayers = cloneLayers(INITIAL_LAYERS)
    const removedLayer = previousLayers[0]!
    const summary = buildDiffSummary(
      makeProp({
        changes: [
          {
            index: 0,
            op: 'remove-layer',
            summary: `Removed ${removedLayer.name}`,
            targetLayerIds: [removedLayer.id],
            removedLayerIds: [removedLayer.id]
          }
        ]
      }),
      previousLayers
    )

    expect(summary.isDangerous).toBe(true)
    expect(summary.dangerousReasons).toContain('Layer removal detected')
  })

  it('PD-04: single thickness update -> isDangerous false', () => {
    const previousLayers = cloneLayers(INITIAL_LAYERS)
    const targetLayer = previousLayers[0]!
    const summary = buildDiffSummary(
      makeProp({
        changes: [
          {
            index: 0,
            op: 'update-layer',
            summary: `Updated ${targetLayer.name} (thickness)`,
            targetLayerIds: [targetLayer.id]
          }
        ]
      }),
      previousLayers
    )

    expect(summary.isDangerous).toBe(false)
  })

  it('PD-05: 3+ simultaneous changes -> isDangerous true', () => {
    const previousLayers = cloneLayers(INITIAL_LAYERS)
    const summary = buildDiffSummary(
      makeProp({
        changes: previousLayers.slice(0, 3).map((layer, index) => ({
          index,
          op: 'update-layer',
          summary: `Updated ${layer.name} (thickness)`,
          targetLayerIds: [layer.id]
        }))
      }),
      previousLayers
    )

    expect(summary.isDangerous).toBe(true)
    expect(summary.dangerousReasons).toContain('3 or more simultaneous changes')
  })

  it('PD-06: reorder only -> isDangerous false', () => {
    const previousLayers = cloneLayers(INITIAL_LAYERS)
    const targetLayer = previousLayers[0]!
    const summary = buildDiffSummary(
      makeProp({
        changes: [
          {
            index: 0,
            op: 'reorder-layer',
            summary: `Reordered ${targetLayer.name} to index 2`,
            targetLayerIds: [targetLayer.id]
          }
        ]
      }),
      previousLayers
    )

    expect(summary.isDangerous).toBe(false)
  })
})
