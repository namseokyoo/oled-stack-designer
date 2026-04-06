import type { AgentIntent } from './intentSchema'

export interface LlmParserContext {
  structureMode: 'single' | 'rgb' | 'compare'
  layers: Array<{ id: string; name: string; role: string }>
}

interface LlmParseResult {
  intent: AgentIntent | null
  raw: string
  parseMethod: 'rule-based' | 'llm'
}

export interface LlmProvider {
  name: string
  parse(input: string, context: LlmParserContext): Promise<AgentIntent | null>
}

export interface LlmParserConfig {
  provider: LlmProvider | null
  fallbackToRuleBased: boolean
  timeoutMs: number
}

export const DEFAULT_LLM_CONFIG: LlmParserConfig = {
  provider: null,
  fallbackToRuleBased: true,
  timeoutMs: 10000
}

function isAgentIntent(value: unknown): value is AgentIntent {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<AgentIntent>

  return (
    typeof candidate.category === 'string' &&
    typeof candidate.confidence === 'string' &&
    Array.isArray(candidate.assumptions) &&
    Array.isArray(candidate.warnings) &&
    Array.isArray(candidate.ops)
  )
}

export function createOpenAiProvider(config: {
  apiKey: string
  model?: string
  baseUrl?: string
}): LlmProvider {
  const model = config.model ?? 'gpt-4o-mini'
  const baseUrl = config.baseUrl ?? 'https://api.openai.com/v1'

  return {
    name: `openai:${model}`,
    async parse(input: string, _context: LlmParserContext): Promise<AgentIntent | null> {
      const systemPrompt = `You are an OLED stack designer assistant. Parse the user's natural language command into a JSON AgentIntent object.

AgentIntent format:
{
  "category": "create" | "edit" | "explain" | "clarify",
  "confidence": "high" | "medium" | "low",
  "assumptions": string[],
  "warnings": string[],
  "ops": IntentOpCandidate[]
}

Respond ONLY with valid JSON. No explanation.`

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input }
          ],
          temperature: 0
        })
      })

      if (!response.ok) {
        return null
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>
      }
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        return null
      }

      try {
        const parsed = JSON.parse(content) as unknown
        return isAgentIntent(parsed) ? parsed : null
      } catch {
        return null
      }
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timerId: ReturnType<typeof setTimeout> | null = null

  const timer = new Promise<null>((resolve) => {
    timerId = setTimeout(() => resolve(null), ms)

    const maybeTimer = timerId as ReturnType<typeof setTimeout> & {
      unref?: () => void
    }
    maybeTimer.unref?.()
  })

  try {
    return await Promise.race([promise, timer])
  } finally {
    if (timerId !== null) {
      clearTimeout(timerId)
    }
  }
}

export async function parseWithLlm(
  input: string,
  context: LlmParserContext,
  config: LlmParserConfig
): Promise<LlmParseResult> {
  if (!config.provider) {
    return { intent: null, raw: input, parseMethod: 'rule-based' }
  }

  try {
    const intentOrNull = await withTimeout(
      config.provider.parse(input, context),
      config.timeoutMs
    )

    if (intentOrNull === null) {
      return { intent: null, raw: input, parseMethod: 'rule-based' }
    }

    return { intent: intentOrNull, raw: input, parseMethod: 'llm' }
  } catch {
    return { intent: null, raw: input, parseMethod: 'rule-based' }
  }
}
