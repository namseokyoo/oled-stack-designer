import { describe, expect, it, vi } from 'vitest'
import {
  parseNaturalLanguage,
  parseNaturalLanguageAsync,
  type LlmParserConfig,
  type LlmProvider,
  type ParserContext
} from '../intentParser'

const mockContext: ParserContext = {
  structureMode: 'single',
  layers: [
    { id: 'layer-1', name: 'HTL', role: 'htl' },
    { id: 'layer-2', name: 'ETL', role: 'etl' },
    { id: 'layer-3', name: 'EML', role: 'eml' }
  ]
}

describe('intentParser', () => {
  it('P-01: "HTL 50nm NPB 추가" → add-layer', () => {
    const result = parseNaturalLanguage('HTL 50nm NPB 추가', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'add-layer',
      role: 'htl',
      thickness: 50,
      material: 'NPB',
      name: 'HTL'
    })
  })

  it('P-02: "add HTL 50nm NPB" → add-layer', () => {
    const result = parseNaturalLanguage('add HTL 50nm NPB', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'add-layer',
      role: 'htl',
      thickness: 50,
      material: 'NPB'
    })
  })

  it('P-03: "ETL 삭제" → remove-layer', () => {
    const result = parseNaturalLanguage('ETL 삭제', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'remove-layer',
      layerId: 'layer-2'
    })
  })

  it('P-04: "remove ETL" → remove-layer', () => {
    const result = parseNaturalLanguage('remove ETL', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'remove-layer',
      layerId: 'layer-2'
    })
  })

  it('P-05: "HTL 두께 60nm으로" → update-layer thickness', () => {
    const result = parseNaturalLanguage('HTL 두께 60nm으로', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'update-layer',
      layerId: 'layer-1',
      thickness: 60
    })
  })

  it('P-06: "change HTL thickness to 60" → update-layer thickness', () => {
    const result = parseNaturalLanguage('change HTL thickness to 60', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'update-layer',
      layerId: 'layer-1',
      thickness: 60
    })
  })

  it('P-07: "EML 재료 CBP로 변경" → update-layer material', () => {
    const result = parseNaturalLanguage('EML 재료 CBP로 변경', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'update-layer',
      layerId: 'layer-3',
      material: 'CBP'
    })
  })

  it('P-08: "HTL을 3번째로 이동" → reorder-layer', () => {
    const result = parseNaturalLanguage('HTL을 3번째로 이동', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'reorder-layer',
      layerId: 'layer-1',
      newIndex: 2
    })
  })

  it('P-09: "move HTL to position 3" → reorder-layer', () => {
    const result = parseNaturalLanguage('move HTL to position 3', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'reorder-layer',
      layerId: 'layer-1',
      newIndex: 2
    })
  })

  it('P-10: "EML 복제" → duplicate-layer', () => {
    const result = parseNaturalLanguage('EML 복제', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'duplicate-layer',
      layerId: 'layer-3'
    })
  })

  it('P-11: "HTL 채널 분리" → split-to-channels', () => {
    const result = parseNaturalLanguage('HTL 채널 분리', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'split-to-channels',
      layerId: 'layer-1'
    })
  })

  it('P-12: "split HTL" → split-to-channels', () => {
    const result = parseNaturalLanguage('split HTL', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'split-to-channels',
      layerId: 'layer-1'
    })
  })

  it('P-13: "RGB로 전환" → set-structure-mode rgb', () => {
    const result = parseNaturalLanguage('RGB로 전환', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'set-structure-mode',
      mode: 'rgb'
    })
  })

  it('P-14: "switch to RGB mode" → set-structure-mode rgb', () => {
    const result = parseNaturalLanguage('switch to RGB mode', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'set-structure-mode',
      mode: 'rgb'
    })
  })

  it('P-15: "기본 OLED 구조 만들어" → create intent (Phase 3)', () => {
    const result = parseNaturalLanguage('기본 OLED 구조 만들어', mockContext)

    expect(result.intent).not.toBeNull()
    expect(result.intent?.category).toBe('create')
    expect(result.intent?.ops[0]?.op).toBe('create_single_stack')
  })

  it('P-16: "invalid gibberish xyz" → null intent', () => {
    const result = parseNaturalLanguage('invalid gibberish xyz', mockContext)

    expect(result.intent).toBeNull()
  })

  it('P-17: 빈 문자열 → null intent', () => {
    const result = parseNaturalLanguage('', mockContext)

    expect(result.intent).toBeNull()
  })

  it('P-18: "htl 삭제" → lowercase fuzzy remove-layer', () => {
    const result = parseNaturalLanguage('htl 삭제', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'remove-layer',
      layerId: 'layer-1'
    })
  })

  it('P-19: "ETL 레이어 삭제" → partial name remove-layer', () => {
    const result = parseNaturalLanguage('ETL 레이어 삭제', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'remove-layer',
      layerId: 'layer-2'
    })
  })

  it('P-20: "기본 OLED 구조 만들어" → create_single_stack', () => {
    const result = parseNaturalLanguage('기본 OLED 구조 만들어', mockContext)

    expect(result.intent?.category).toBe('create')
    expect(result.intent?.ops[0]).toMatchObject({
      op: 'create_single_stack'
    })
  })

  it('P-21: "기본 oled 구조 만들어줘" → create_single_stack', () => {
    const result = parseNaturalLanguage('기본 oled 구조 만들어줘', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'create_single_stack'
    })
  })

  it('P-22: "create basic OLED" → create_single_stack', () => {
    const result = parseNaturalLanguage('create basic OLED', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'create_single_stack'
    })
  })

  it('P-23: "RGB FMM 구조 만들어" → create_rgb_stack', () => {
    const result = parseNaturalLanguage('RGB FMM 구조 만들어', mockContext)

    expect(result.intent?.category).toBe('create')
    expect(result.intent?.ops[0]).toMatchObject({
      op: 'create_rgb_stack'
    })
  })

  it('P-24: "RGB 구조 만들어" → create_rgb_stack', () => {
    const result = parseNaturalLanguage('RGB 구조 만들어', mockContext)

    expect(result.intent?.ops[0]).toMatchObject({
      op: 'create_rgb_stack'
    })
  })

  it('P-25: "ITO 150nm, NPB 40nm 구조 생성" → parsed create_single_stack specs', () => {
    const result = parseNaturalLanguage('ITO 150nm, NPB 40nm 구조 생성', mockContext)

    expect(result.intent?.category).toBe('create')
    expect(result.intent?.ops[0]).toMatchObject({
      op: 'create_single_stack'
    })

    const createOp = result.intent?.ops[0]
    expect(createOp?.op).toBe('create_single_stack')
    if (createOp?.op === 'create_single_stack') {
      expect(createOp.layers).toMatchObject([
        { role: 'anode', material: 'ITO', thickness: 150 },
        { role: 'htl', material: 'NPB', thickness: 40 }
      ])
    }
  })

  it('P-26: "tandem 구조 만들어" → create_single_stack with tandem template', () => {
    const result = parseNaturalLanguage('tandem 구조 만들어', mockContext)

    expect(result.intent?.category).toBe('create')
    expect(result.intent?.assumptions).toContain(
      'Tandem 2-유닛 구조: CGL로 연결된 직렬 발광 유닛'
    )

    const createOp = result.intent?.ops[0]
    expect(createOp?.op).toBe('create_single_stack')

    if (createOp?.op === 'create_single_stack') {
      expect(createOp.layers).toHaveLength(11)
      expect(createOp.layers.map((layer) => layer.role)).toContain('cgl')
    }
  })

  it('P-27: "구조 설명해줘" → explain intent', () => {
    const result = parseNaturalLanguage('구조 설명해줘', mockContext)

    expect(result.intent?.category).toBe('explain')
    expect(result.intent?.ops).toEqual([])
  })

  describe('parseNaturalLanguageAsync', () => {
    const mockIntent = {
      category: 'explain' as const,
      confidence: 'high' as const,
      assumptions: [],
      warnings: [],
      ops: []
    }

    it('PA-01: llmConfig 없음 → rule-based 결과와 동일', async () => {
      const syncResult = parseNaturalLanguage('구조 설명해줘', mockContext)
      const asyncResult = await parseNaturalLanguageAsync('구조 설명해줘', mockContext)

      expect(asyncResult.intent?.category).toBe(syncResult.intent?.category)
      expect(asyncResult.parseMethod).toBe('rule-based')
    })

    it('PA-02: mock LLM 성공 → llm 결과 반환', async () => {
      const mockProvider: LlmProvider = {
        name: 'mock',
        parse: vi.fn().mockResolvedValue(mockIntent)
      }
      const config: LlmParserConfig = {
        provider: mockProvider,
        fallbackToRuleBased: true,
        timeoutMs: 5000
      }

      const result = await parseNaturalLanguageAsync(
        'explain structure',
        mockContext,
        config
      )

      expect(result.parseMethod).toBe('llm')
      expect(result.intent).toEqual(mockIntent)
    })

    it('PA-03: failing LLM + fallback=true → rule-based fallback', async () => {
      const mockProvider: LlmProvider = {
        name: 'mock',
        parse: vi.fn().mockRejectedValue(new Error('api error'))
      }
      const config: LlmParserConfig = {
        provider: mockProvider,
        fallbackToRuleBased: true,
        timeoutMs: 5000
      }

      const result = await parseNaturalLanguageAsync(
        '구조 설명해줘',
        mockContext,
        config
      )

      expect(result.parseMethod).toBe('rule-based')
      expect(result.intent?.category).toBe('explain')
    })
  })
})
