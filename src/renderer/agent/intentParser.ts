import type { LayerRole } from '../types'
import type {
  AgentIntent,
  CreateLayerSpec,
  IntentConfidence,
  IntentOpCandidate
} from './intentSchema'
import {
  getDefaultTemplate,
  type RgbTemplate,
  type SingleTemplate,
  type StructureTemplate
} from '../domain/templateRegistry'
import { selectTemplate } from '../domain/templateSelector'
import { DEFAULT_LLM_CONFIG, parseWithLlm, type LlmParserConfig } from './llmParser'

export interface ParserContext {
  structureMode: 'single' | 'rgb' | 'compare'
  layers: Array<{ id: string; name: string; role: string }>
}

export interface ParseResult {
  intent: AgentIntent | null
  raw: string
  parseMethod: 'rule-based' | 'llm'
}

const ROLE_MAP: Record<string, LayerRole> = {
  htl: 'htl',
  hil: 'hil',
  etl: 'etl',
  eil: 'eil',
  eml: 'eml',
  cgl: 'cgl',
  cathode: 'cathode',
  anode: 'anode'
}

const MATERIAL_TO_ROLE: Record<string, LayerRole> = {
  ito: 'anode',
  al: 'cathode',
  lif: 'eil',
  alq3: 'etl',
  bphen: 'etl',
  tpbi: 'etl',
  'tpbi:cs2co3': 'etl',
  npb: 'htl',
  npd: 'htl',
  tapc: 'htl',
  tcta: 'htl',
  moo3: 'hil',
  'hat-cn': 'hil',
  'pedot:pss': 'hil',
  cbp: 'eml',
  mcbp: 'eml'
}

const ROLE_PATTERN = Object.keys(ROLE_MAP)
  .sort((left, right) => right.length - left.length)
  .join('|')

const PARTICLE_SUFFIXES = ['으로', '로', '을', '를', '은', '는', '이', '가']

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function stripTrailingParticle(value: string): string {
  let nextValue = normalizeWhitespace(value)

  for (const suffix of PARTICLE_SUFFIXES) {
    if (nextValue.toLowerCase().endsWith(suffix)) {
      nextValue = normalizeWhitespace(nextValue.slice(0, -suffix.length))
      break
    }
  }

  return nextValue
}

function normalizeLayerLookup(value: string): string {
  return stripTrailingParticle(
    value.replace(/\b(layer|레이어)\b/gi, ' ').replace(/\s+/g, ' ')
  ).toLowerCase()
}

function parseNumericValue(value: string | undefined): number | null {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function createIntent(
  op: IntentOpCandidate,
  confidence: IntentConfidence = 'high',
  assumptions: string[] = [],
  warnings: string[] = []
): AgentIntent {
  return {
    category: 'edit',
    confidence,
    assumptions,
    warnings,
    ops: [op]
  }
}

function createClarifyIntent(message: string): AgentIntent {
  return {
    category: 'clarify',
    confidence: 'low',
    assumptions: [message],
    warnings: [],
    ops: []
  }
}

function isSingleTemplate(template: StructureTemplate): template is SingleTemplate {
  return template.structureMode === 'single'
}

function isRgbTemplate(template: StructureTemplate): template is RgbTemplate {
  return template.structureMode === 'rgb'
}

function resolveSingleTemplate(query: string): SingleTemplate {
  const template = selectTemplate(query, 'single')

  if (isSingleTemplate(template)) {
    return template
  }

  const fallback = getDefaultTemplate('single')

  if (isSingleTemplate(fallback)) {
    return fallback
  }

  throw new Error('Default single template must be a single-mode template')
}

function resolveRgbTemplate(query: string): RgbTemplate {
  const template = selectTemplate(query, 'rgb')

  if (isRgbTemplate(template)) {
    return template
  }

  const fallback = getDefaultTemplate('rgb')

  if (isRgbTemplate(fallback)) {
    return fallback
  }

  throw new Error('Default rgb template must be an rgb-mode template')
}

function findLayerByName(name: string, layers: ParserContext['layers']): string | null {
  const input = normalizeLayerLookup(name)

  if (!input) {
    return null
  }

  const exactMatch = layers.find((layer) => normalizeLayerLookup(layer.name) === input)
  if (exactMatch) {
    return exactMatch.id
  }

  const partialNameMatch = layers.find((layer) =>
    normalizeLayerLookup(layer.name).includes(input)
  )
  if (partialNameMatch) {
    return partialNameMatch.id
  }

  const partialInputMatch = layers.find((layer) =>
    input.includes(normalizeLayerLookup(layer.name))
  )

  return partialInputMatch?.id ?? null
}

function resolveRole(roleValue: string | undefined): LayerRole | null {
  if (!roleValue) {
    return null
  }

  return ROLE_MAP[roleValue.toLowerCase()] ?? null
}

function inferRoleFromMaterial(material: string): LayerRole {
  const key = material.toLowerCase().replace(/\s+/g, '')
  const exact = MATERIAL_TO_ROLE[key]

  if (exact) {
    return exact
  }

  for (const [candidateMaterial, role] of Object.entries(MATERIAL_TO_ROLE)) {
    if (key.startsWith(candidateMaterial)) {
      return role
    }
  }

  return 'eml'
}

function parseAddLayer(input: string): AgentIntent | null {
  const suffixMatch = input.match(
    new RegExp(
      `^(?<role>${ROLE_PATTERN})\\s+(?<thickness>\\d+(?:\\.\\d+)?)\\s*nm\\s+(?<material>.+?)\\s*(?:추가|add)$`,
      'i'
    )
  )
  const prefixMatch = input.match(
    new RegExp(
      `^(?:add)\\s+(?<role>${ROLE_PATTERN})\\s+(?<thickness>\\d+(?:\\.\\d+)?)\\s*nm\\s+(?<material>.+)$`,
      'i'
    )
  )
  const match = suffixMatch ?? prefixMatch

  if (!match?.groups) {
    return null
  }

  const role = resolveRole(match.groups.role)
  const thickness = parseNumericValue(match.groups.thickness)
  const material = normalizeWhitespace(match.groups.material)

  if (!role || thickness === null || material.length === 0) {
    return null
  }

  return createIntent({
    op: 'add-layer',
    role,
    name: role.toUpperCase(),
    material,
    thickness
  })
}

function resolveLayerIntent(
  layerName: string | undefined,
  context: ParserContext,
  build: (layerId: string) => AgentIntent
): AgentIntent | null {
  const query = normalizeWhitespace(layerName ?? '')

  if (!query) {
    return null
  }

  const layerId = findLayerByName(query, context.layers)

  if (!layerId) {
    return createClarifyIntent(`Could not resolve layer "${query}".`)
  }

  return build(layerId)
}

function parseRemoveLayer(input: string, context: ParserContext): AgentIntent | null {
  const englishMatch = input.match(/^(?:remove|delete)\s+(.+)$/i)
  const koreanMatch = input.match(/^(.+?)\s*(?:삭제|제거)$/i)
  const layerName = englishMatch?.[1] ?? koreanMatch?.[1]

  return resolveLayerIntent(layerName, context, (layerId) =>
    createIntent({ op: 'remove-layer', layerId })
  )
}

function parseThicknessUpdate(input: string, context: ParserContext): AgentIntent | null {
  const koreanMatch = input.match(
    /^(?<layer>.+?)\s+두께(?:를)?\s*(?<value>\d+(?:\.\d+)?)(?:\s*nm)?(?:으로|로)?$/i
  )
  const englishMatch = input.match(
    /^(?:(?:change|update|set)\s+)?(?<layer>.+?)\s+thickness\s+(?:to\s+)?(?<value>\d+(?:\.\d+)?)(?:\s*nm)?$/i
  )
  const match = koreanMatch ?? englishMatch

  if (!match?.groups) {
    return null
  }

  const thickness = parseNumericValue(match.groups.value)

  if (thickness === null) {
    return null
  }

  return resolveLayerIntent(match.groups.layer, context, (layerId) =>
    createIntent({ op: 'update-layer', layerId, thickness })
  )
}

function parseMaterialUpdate(input: string, context: ParserContext): AgentIntent | null {
  const koreanMatch = input.match(
    /^(?<layer>.+?)\s+재료(?:를)?\s+(?<material>.+?)(?:로)?\s*(?:변경|바꿔|설정)?$/i
  )
  const englishMatch = input.match(
    /^(?:(?:change|update|set)\s+)?(?<layer>.+?)\s+material\s+(?:to\s+)?(?<material>.+)$/i
  )
  const match = koreanMatch ?? englishMatch

  if (!match?.groups) {
    return null
  }

  const material = normalizeWhitespace(match.groups.material)

  if (material.length === 0) {
    return null
  }

  return resolveLayerIntent(match.groups.layer, context, (layerId) =>
    createIntent({ op: 'update-layer', layerId, material })
  )
}

function parseReorderLayer(input: string, context: ParserContext): AgentIntent | null {
  const koreanMatch = input.match(
    /^(?<layer>.+?)(?:을|를)?\s+(?<position>\d+)\s*번째(?:로)?\s*(?:이동)?$/i
  )
  const englishMatch = input.match(
    /^(?:move)\s+(?<layer>.+?)\s+(?:to\s+position\s+)?(?<position>\d+)$/i
  )
  const match = koreanMatch ?? englishMatch

  if (!match?.groups) {
    return null
  }

  const position = parseNumericValue(match.groups.position)

  if (position === null) {
    return null
  }

  return resolveLayerIntent(match.groups.layer, context, (layerId) =>
    createIntent({ op: 'reorder-layer', layerId, newIndex: position - 1 })
  )
}

function parseDuplicateLayer(input: string, context: ParserContext): AgentIntent | null {
  const englishMatch = input.match(/^(?:duplicate)\s+(.+)$/i)
  const koreanMatch = input.match(/^(.+?)\s*복제$/i)
  const layerName = englishMatch?.[1] ?? koreanMatch?.[1]

  return resolveLayerIntent(layerName, context, (layerId) =>
    createIntent({ op: 'duplicate-layer', layerId })
  )
}

function parseSplitLayer(input: string, context: ParserContext): AgentIntent | null {
  const englishPrefixMatch = input.match(/^(?:split)\s+(.+)$/i)
  const englishSuffixMatch = input.match(/^(.+?)\s+split$/i)
  const koreanMatch = input.match(/^(.+?)\s*채널\s*분리$/i)
  const layerName = englishPrefixMatch?.[1] ?? englishSuffixMatch?.[1] ?? koreanMatch?.[1]

  return resolveLayerIntent(layerName, context, (layerId) =>
    createIntent({ op: 'split-to-channels', layerId })
  )
}

function parseCreateIntent(input: string): AgentIntent | null {
  if (
    /^(?:기본\s*oled(?:\s*구조)?\s*(?:만들어(?:줘)?|생성)|create\s+basic\s+oled(?:\s+structure)?)$/i.test(
      input
    )
  ) {
    const template = resolveSingleTemplate('기본')

    return {
      category: 'create',
      confidence: 'high',
      assumptions: ['기본 재료 및 두께 사용 (Al/LiF/Alq3/CBP:Ir(ppy)3/NPB/MoO3/ITO)'],
      warnings: [],
      ops: [{ op: 'create_single_stack', layers: template.layers }]
    }
  }

  if (
    /^(?:rgb\s*(?:fmm\s*)?(?:구조)?\s*(?:만들어(?:줘)?|생성)|create\s+rgb(?:\s+fmm)?(?:\s+structure)?)$/i.test(
      input
    )
  ) {
    const template = resolveRgbTemplate('rgb')

    return {
      category: 'create',
      confidence: 'high',
      assumptions: ['RGB FMM 기본 구조: EML-R/G/B 채널별 분리, 나머지 공통층'],
      warnings: [],
      ops: [
        {
          op: 'create_rgb_stack',
          commonLayers: template.commonLayers,
          channelLayers: template.channelLayers
        }
      ]
    }
  }

  if (
    /^(?:tandem(?:\s*구조)?\s*(?:만들어(?:줘)?|생성)|create\s+tandem(?:\s+structure)?)$/i.test(
      input
    )
  ) {
    const template = resolveSingleTemplate('tandem')

    return {
      category: 'create',
      confidence: 'high',
      assumptions: ['Tandem 2-유닛 구조: CGL로 연결된 직렬 발광 유닛'],
      warnings: [],
      ops: [{ op: 'create_single_stack', layers: template.layers }]
    }
  }

  const structurePattern = /^(.+?)\s+구조\s*(?:생성|만들어(?:줘)?)$/i
  const englishStructurePattern = /^create\s+structure\s+(.+)$/i
  const structureMatch = input.match(structurePattern) ?? input.match(englishStructurePattern)

  if (!structureMatch) {
    return null
  }

  const specs = parseLayerSpecs(structureMatch[1] ?? '')

  if (specs.length === 0) {
    return null
  }

  const hasInferredRoles = specs.some((spec) => !isExplicitRole(spec))

  return {
    category: 'create',
    confidence: hasInferredRoles ? 'medium' : 'high',
    assumptions: hasInferredRoles ? ['일부 role은 재료명으로 추론됨'] : [],
    warnings: [],
    ops: [{ op: 'create_single_stack', layers: specs }]
  }
}

function parseLayerSpecs(input: string): CreateLayerSpec[] {
  const parts = input
    .split(/[,/]/)
    .map((value) => value.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return []
  }

  const specs: CreateLayerSpec[] = []

  for (const part of parts) {
    const match = part.match(
      /^(?<material>[A-Za-z][\w:()./\-*]+(?:\s*:\s*[\w:()./\-*]+)?)\s+(?<thickness>\d+(?:\.\d+)?)\s*nm$/i
    )

    if (match?.groups) {
      const material = normalizeWhitespace(match.groups.material ?? '')
      const thickness = parseNumericValue(match.groups.thickness)

      if (material && thickness !== null) {
        specs.push({
          role: inferRoleFromMaterial(material),
          material,
          thickness
        })
      }

      continue
    }

    const materialOnlyMatch = part.match(/^([A-Za-z][\w:()./\-*]+)$/i)

    if (!materialOnlyMatch) {
      continue
    }

    const material = normalizeWhitespace(materialOnlyMatch[1] ?? '')

    if (!material) {
      continue
    }

    specs.push({
      role: inferRoleFromMaterial(material),
      material
    })
  }

  return specs
}

function isExplicitRole(_spec: CreateLayerSpec): boolean {
  return false
}

function parseStructureMode(input: string): AgentIntent | null {
  if (/^(?:rgb(?:로)?\s*전환|rgb\s*모드|switch\s+to\s+rgb(?:\s+mode)?)$/i.test(input)) {
    return createIntent({ op: 'set-structure-mode', mode: 'rgb' })
  }

  if (
    /^(?:single(?:로)?\s*전환|single\s*모드|switch\s+to\s+single(?:\s+mode)?)$/i.test(input)
  ) {
    return createIntent({ op: 'set-structure-mode', mode: 'single' })
  }

  return null
}

export function parseExplainIntent(input: string): AgentIntent | null {
  const koreanPatterns = [
    /^(?:구조\s*설명해줘|설명해줘|구조\s*설명|이게\s*뭐야|뭐야|현재\s*구조)$/i
  ]
  const englishPatterns = [
    /^(?:explain(?:\s+structure)?|what\s+is\s+this|describe\s+structure)$/i
  ]

  if (![...koreanPatterns, ...englishPatterns].some((pattern) => pattern.test(input))) {
    return null
  }

  return {
    category: 'explain',
    confidence: 'high',
    assumptions: [],
    warnings: [],
    ops: []
  }
}

export function parseNaturalLanguage(
  input: string,
  context: ParserContext
): ParseResult {
  const normalizedInput = normalizeWhitespace(input)

  if (normalizedInput.length === 0) {
    return { intent: null, raw: input, parseMethod: 'rule-based' }
  }

  const intent =
    parseCreateIntent(normalizedInput) ??
    parseStructureMode(normalizedInput) ??
    parseExplainIntent(normalizedInput) ??
    parseAddLayer(normalizedInput) ??
    parseRemoveLayer(normalizedInput, context) ??
    parseThicknessUpdate(normalizedInput, context) ??
    parseMaterialUpdate(normalizedInput, context) ??
    parseReorderLayer(normalizedInput, context) ??
    parseDuplicateLayer(normalizedInput, context) ??
    parseSplitLayer(normalizedInput, context)

  return {
    intent,
    raw: input,
    parseMethod: 'rule-based'
  }
}

export { DEFAULT_LLM_CONFIG, type LlmParserConfig, type LlmProvider } from './llmParser'

export async function parseNaturalLanguageAsync(
  input: string,
  context: ParserContext,
  llmConfig?: LlmParserConfig
): Promise<ParseResult> {
  const config = llmConfig ?? DEFAULT_LLM_CONFIG

  if (config.provider !== null) {
    const llmResult = await parseWithLlm(input, context, config)

    if (llmResult.parseMethod === 'llm' && llmResult.intent !== null) {
      return llmResult
    }

    if (!config.fallbackToRuleBased) {
      return llmResult
    }
  }

  return parseNaturalLanguage(input, context)
}
