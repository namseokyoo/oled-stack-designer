import { describe, expect, it } from 'vitest'
import { cloneLayer, cloneLayers } from '../../domain/layerOps'
import { INITIAL_LAYERS, INITIAL_PROJECT, INITIAL_RGB_LAYERS } from '../../domain/projectMutations'
import type { Layer, Project } from '../../types'
import type { AgentIntent, ValidationContext } from '../intentSchema'
import { validateIntent } from '../intentValidator'

function makeSingleProject(): Project {
  return {
    ...INITIAL_PROJECT,
    structureMode: 'single',
    stacks: [{ id: 'stack-1', label: 'Stack 1', layers: cloneLayers(INITIAL_LAYERS) }]
  }
}

function makeRgbProject(): Project {
  return {
    ...INITIAL_PROJECT,
    structureMode: 'rgb',
    stacks: [{ id: 'stack-1', label: 'Stack 1', layers: cloneLayers(INITIAL_RGB_LAYERS) }]
  }
}

function makeCompareProject(): Project {
  return {
    ...INITIAL_PROJECT,
    structureMode: 'compare'
  }
}

function makeContext(project: Project, layers: Layer[]): ValidationContext {
  return { currentProject: project, currentLayers: layers }
}

function makeBaseIntent(ops: AgentIntent['ops'] = []): AgentIntent {
  return {
    category: 'edit',
    confidence: 'high',
    assumptions: [],
    warnings: [],
    ops
  }
}

const SINGLE_LAYERS = cloneLayers(INITIAL_LAYERS)

describe('intentValidator', () => {
  it('V-01: add-layer with role only → sanitized with defaults', () => {
    const intent = makeBaseIntent([{ op: 'add-layer', role: 'htl' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.sanitizedOps[0].op).toBe('add-layer')
      const addOp = result.sanitizedOps[0] as Extract<
        (typeof result.sanitizedOps)[number],
        { op: 'add-layer' }
      >
      expect(addOp.role).toBe('htl')
      expect(addOp.afterId).toBeNull()
      expect(addOp.thickness).toBe(50)
      expect(addOp.appliesTo).toEqual(['r', 'g', 'b'])
    }
  })

  it('V-02: remove-layer with existing unlocked layerId → success', () => {
    const intent = makeBaseIntent([{ op: 'remove-layer', layerId: 'htl-1' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
  })

  it('V-03: update-layer with thickness patch → success', () => {
    const intent = makeBaseIntent([{ op: 'update-layer', layerId: 'htl-1', thickness: 80 }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      const updateOp = result.sanitizedOps[0] as Extract<
        (typeof result.sanitizedOps)[number],
        { op: 'update-layer' }
      >
      expect(updateOp.patch.thickness).toBe(80)
    }
  })

  it('V-04: reorder-layer with valid index → success', () => {
    const intent = makeBaseIntent([{ op: 'reorder-layer', layerId: 'htl-1', newIndex: 2 }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
  })

  it('V-05: split-to-channels in RGB mode with common layer → success', () => {
    const rgbLayers: Layer[] = [
      {
        id: 'htl-rgb-1',
        name: 'HTL',
        role: 'htl',
        material: 'NPB',
        thickness: 50,
        colorToken: 'htl',
        appliesTo: ['r', 'g', 'b']
      }
    ]
    const intent = makeBaseIntent([{ op: 'split-to-channels', layerId: 'htl-rgb-1' }])
    const ctx = makeContext(makeRgbProject(), rgbLayers)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
  })

  it('V-06: merge-to-common with 3 existing rgb layer ids → success', () => {
    const intent = makeBaseIntent([
      { op: 'merge-to-common', layerIds: ['eml-r-1', 'eml-g-1', 'eml-b-1'] }
    ])
    const ctx = makeContext(makeRgbProject(), cloneLayers(INITIAL_RGB_LAYERS))
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      const mergeOp = result.sanitizedOps[0] as Extract<
        (typeof result.sanitizedOps)[number],
        { op: 'merge-to-common' }
      >
      expect(mergeOp.layerIds).toEqual(['eml-r-1', 'eml-g-1', 'eml-b-1'])
    }
  })

  it('V-07: set-structure-mode rgb → success', () => {
    const intent = makeBaseIntent([{ op: 'set-structure-mode', mode: 'rgb' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
  })

  it('V-08: duplicate-layer with existing unlocked layerId → success', () => {
    const intent = makeBaseIntent([{ op: 'duplicate-layer', layerId: 'etl-1' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
  })

  it('V-09: add-layer with invalid role → rejected', () => {
    const intent = makeBaseIntent([{ op: 'add-layer', role: 'invalid-role' as never }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('rejected')
    }
  })

  it('V-10: add-layer with negative thickness → rejected', () => {
    const intent = makeBaseIntent([{ op: 'add-layer', role: 'htl', thickness: -10 }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
  })

  it('V-11: remove-layer with non-existent id → rejected', () => {
    const intent = makeBaseIntent([{ op: 'remove-layer', layerId: 'non-existent-id' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
  })

  it('V-12: split-to-channels in single mode → rejected', () => {
    const intent = makeBaseIntent([{ op: 'split-to-channels', layerId: 'htl-1' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('rejected')
    }
  })

  it('V-13: compare mode project → all mutations rejected', () => {
    const intent = makeBaseIntent([{ op: 'add-layer', role: 'htl' }])
    const ctx = makeContext(makeCompareProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('rejected')
    }
  })

  it('E-14: confidence low → clarify', () => {
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'low',
      assumptions: ['I think you mean HTL'],
      warnings: [],
      ops: [{ op: 'add-layer', role: 'htl' }]
    }
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('clarify')
    }
  })

  it('E-15: empty ops array → rejected', () => {
    const intent = makeBaseIntent([])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('rejected')
    }
  })

  it('E-16: set-structure-mode compare → rejected', () => {
    const intent = makeBaseIntent([{ op: 'set-structure-mode', mode: 'compare' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
  })

  it('E-17: remove-layer locked layer → rejected', () => {
    const lockedLayers: Layer[] = [
      {
        id: 'locked-1',
        name: 'Locked HTL',
        role: 'htl',
        material: 'NPB',
        thickness: 50,
        colorToken: 'htl',
        appliesTo: ['r', 'g', 'b'],
        locked: true
      }
    ]
    const intent = makeBaseIntent([{ op: 'remove-layer', layerId: 'locked-1' }])
    const ctx = makeContext(makeSingleProject(), lockedLayers)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
  })

  it('E-18: merge-to-common with only 2 ids → rejected', () => {
    const intent = makeBaseIntent([{ op: 'merge-to-common', layerIds: ['id-r', 'id-g'] }])
    const ctx = makeContext(makeRgbProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
  })

  it('E-19: update-layer without editable fields → rejected', () => {
    const intent = makeBaseIntent([{ op: 'update-layer', layerId: 'htl-1' }])
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('rejected')
    }
  })

  it('E-20: split-to-channels requires common layer → rejected', () => {
    const nonCommonLayer = cloneLayer({
      ...INITIAL_RGB_LAYERS.find((layer) => layer.id === 'eml-r-1')!,
      appliesTo: ['r']
    })
    const intent = makeBaseIntent([{ op: 'split-to-channels', layerId: 'eml-r-1' }])
    const ctx = makeContext(makeRgbProject(), [nonCommonLayer])
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(false)
  })

  it('E-21: explain with empty ops → success', () => {
    const intent: AgentIntent = {
      category: 'explain',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: []
    }
    const ctx = makeContext(makeSingleProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.sanitizedOps).toEqual([])
    }
  })

  it('E-22: compare mode explain with empty ops → success', () => {
    const intent: AgentIntent = {
      category: 'explain',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: []
    }
    const ctx = makeContext(makeCompareProject(), SINGLE_LAYERS)
    const result = validateIntent(intent, ctx)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.sanitizedOps).toEqual([])
    }
  })
})
