import { describe, expect, it } from 'vitest'
import type {
  AgentIntent,
  IntentOpCandidate,
  SanitizedIntent,
  ValidationResult
} from '../intentSchema'

describe('intentSchema — type contracts', () => {
  it('AgentIntent는 올바른 구조를 가진다', () => {
    const intent: AgentIntent = {
      category: 'edit',
      confidence: 'high',
      assumptions: [],
      warnings: [],
      ops: []
    }

    expect(intent.category).toBe('edit')
    expect(Array.isArray(intent.ops)).toBe(true)
  })

  it('IntentOpCandidate add-layer는 모든 필드가 optional이다', () => {
    const op: IntentOpCandidate = { op: 'add-layer' }
    expect(op.op).toBe('add-layer')
  })

  it('IntentOpCandidate remove-layer는 layerId가 optional이다', () => {
    const op: IntentOpCandidate = { op: 'remove-layer' }
    expect(op.op).toBe('remove-layer')
  })

  it('SanitizedIntent add-layer는 모든 필수 필드가 required이다', () => {
    const op: SanitizedIntent = {
      op: 'add-layer',
      role: 'htl',
      afterId: null,
      appliesTo: ['r', 'g', 'b'],
      name: 'HTL',
      material: 'NPB',
      thickness: 50
    }

    expect(op.op).toBe('add-layer')
    expect(op.role).toBe('htl')
  })

  it('SanitizedIntent merge-to-common은 tuple [string,string,string] 타입이다', () => {
    const op: SanitizedIntent = {
      op: 'merge-to-common',
      layerIds: ['id-r', 'id-g', 'id-b']
    }

    expect(op.layerIds).toHaveLength(3)
  })

  it('ValidationResult success shape이 올바르다', () => {
    const result: ValidationResult = {
      success: true,
      sanitizedOps: [],
      assumptions: [],
      warnings: []
    }

    expect(result.success).toBe(true)
  })

  it('ValidationResult rejected shape이 올바르다', () => {
    const result: ValidationResult = {
      success: false,
      kind: 'rejected',
      reasons: ['invalid role']
    }

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('rejected')
    }
  })

  it('ValidationResult clarify shape이 올바르다', () => {
    const result: ValidationResult = {
      success: false,
      kind: 'clarify',
      question: 'Which layer?',
      reasons: []
    }

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.kind).toBe('clarify')
    }
  })
})
