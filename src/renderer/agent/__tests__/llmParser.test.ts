import { describe, expect, it, vi } from 'vitest'
import {
  createOpenAiProvider,
  DEFAULT_LLM_CONFIG,
  parseWithLlm,
  type LlmParserConfig,
  type LlmProvider
} from '../llmParser'
import type { ParserContext } from '../intentParser'

const mockContext: ParserContext = {
  structureMode: 'single',
  layers: []
}

const mockIntent = {
  category: 'explain' as const,
  confidence: 'high' as const,
  assumptions: [],
  warnings: [],
  ops: []
}

describe('llmParser', () => {
  it('LLM-01: provider null → intent null, parseMethod rule-based', async () => {
    const result = await parseWithLlm('explain', mockContext, DEFAULT_LLM_CONFIG)

    expect(result.intent).toBeNull()
    expect(result.parseMethod).toBe('rule-based')
  })

  it('LLM-02: mock provider 성공 → parseMethod llm', async () => {
    const mockProvider: LlmProvider = {
      name: 'mock',
      parse: vi.fn().mockResolvedValue(mockIntent)
    }
    const config: LlmParserConfig = {
      provider: mockProvider,
      fallbackToRuleBased: true,
      timeoutMs: 5000
    }

    const result = await parseWithLlm('explain', mockContext, config)

    expect(result.parseMethod).toBe('llm')
    expect(result.intent).toEqual(mockIntent)
  })

  it('LLM-03: mock provider 실패(throw) → intent null, parseMethod rule-based', async () => {
    const mockProvider: LlmProvider = {
      name: 'mock',
      parse: vi.fn().mockRejectedValue(new Error('network error'))
    }
    const config: LlmParserConfig = {
      provider: mockProvider,
      fallbackToRuleBased: true,
      timeoutMs: 5000
    }

    const result = await parseWithLlm('explain', mockContext, config)

    expect(result.intent).toBeNull()
    expect(result.parseMethod).toBe('rule-based')
  })

  it('LLM-04: mock provider null 반환 → intent null, parseMethod rule-based', async () => {
    const mockProvider: LlmProvider = {
      name: 'mock',
      parse: vi.fn().mockResolvedValue(null)
    }
    const config: LlmParserConfig = {
      provider: mockProvider,
      fallbackToRuleBased: true,
      timeoutMs: 5000
    }

    const result = await parseWithLlm('explain', mockContext, config)

    expect(result.intent).toBeNull()
    expect(result.parseMethod).toBe('rule-based')
  })

  it('LLM-05: 타임아웃(매우 짧게) → intent null', async () => {
    const mockProvider: LlmProvider = {
      name: 'mock',
      parse: vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockIntent), 500))
        )
    }
    const config: LlmParserConfig = {
      provider: mockProvider,
      fallbackToRuleBased: true,
      timeoutMs: 1
    }

    const result = await parseWithLlm('explain', mockContext, config)

    expect(result.intent).toBeNull()
    expect(result.parseMethod).toBe('rule-based')
  })

  it('LLM-06: OpenAI provider 응답 JSON 파싱 성공', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockIntent) } }]
      })
    })

    vi.stubGlobal('fetch', fetchMock)

    try {
      const provider = createOpenAiProvider({ apiKey: 'test-key' })
      const result = await provider.parse('explain structure', mockContext)

      expect(result).toEqual(mockIntent)
      expect(fetchMock).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
