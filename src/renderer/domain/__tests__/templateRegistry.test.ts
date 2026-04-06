import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_RGB_COMMON_LAYERS,
  DEFAULT_SINGLE_TEMPLATE
} from '../structureTemplates'
import {
  findTemplates,
  getAllTemplates,
  getDefaultTemplate,
  getTemplateById,
  registerTemplate,
  resetRegistry,
  type RgbTemplate,
  type SingleTemplate,
  unregisterTemplate
} from '../templateRegistry'

describe('templateRegistry', () => {
  beforeEach(() => {
    resetRegistry()
  })

  it('R-01: getAllTemplates returns at least 4 builtin templates', () => {
    expect(getAllTemplates().length).toBeGreaterThanOrEqual(4)
  })

  it("R-02: getTemplateById('default-single') returns single template", () => {
    const template = getTemplateById('default-single')

    expect(template).toBeDefined()
    expect(template?.id).toBe('default-single')
    expect(template?.structureMode).toBe('single')
    expect(template && 'layers' in template ? template.layers : []).toHaveLength(7)
  })

  it("R-03: getTemplateById('default-rgb-fmm') returns rgb template", () => {
    const template = getTemplateById('default-rgb-fmm')

    expect(template).toBeDefined()
    expect(template?.id).toBe('default-rgb-fmm')
    expect(template?.structureMode).toBe('rgb')
    expect(template && 'commonLayers' in template ? template.commonLayers : undefined).toBeDefined()
    expect(template && 'channelLayers' in template ? template.channelLayers : undefined).toBeDefined()
  })

  it("R-04: getTemplateById('tandem-single') returns 11-layer tandem", () => {
    const template = getTemplateById('tandem-single')

    expect(template).toBeDefined()
    expect(template?.id).toBe('tandem-single')
    expect(template?.structureMode).toBe('single')
    expect(template && 'layers' in template ? template.layers : []).toHaveLength(11)
  })

  it("R-05: getTemplateById('woled-rgb') returns woled template", () => {
    const template = getTemplateById('woled-rgb')

    expect(template).toBeDefined()
    expect(template?.id).toBe('woled-rgb')
    expect(template?.structureMode).toBe('rgb')
  })

  it('R-06: getTemplateById with unknown id returns undefined', () => {
    expect(getTemplateById('nonexistent')).toBeUndefined()
  })

  it("R-07: getDefaultTemplate('single') returns default-single", () => {
    expect(getDefaultTemplate('single').id).toBe('default-single')
  })

  it("R-08: getDefaultTemplate('rgb') returns default-rgb-fmm", () => {
    expect(getDefaultTemplate('rgb').id).toBe('default-rgb-fmm')
  })

  it('R-09: findTemplates by mode', () => {
    expect(findTemplates({ mode: 'single' }).every((template) => template.structureMode === 'single')).toBe(
      true
    )
    expect(findTemplates({ mode: 'rgb' }).every((template) => template.structureMode === 'rgb')).toBe(
      true
    )
  })

  it('R-10: findTemplates by tags', () => {
    expect(findTemplates({ tags: ['tandem'] }).some((template) => template.id === 'tandem-single')).toBe(
      true
    )
  })

  it('R-11: findTemplates by keyword', () => {
    expect(findTemplates({ keyword: 'tandem' }).some((template) => template.id === 'tandem-single')).toBe(
      true
    )
    expect(findTemplates({ keyword: 'white' }).some((template) => template.id === 'woled-rgb')).toBe(
      true
    )
  })

  it('R-12: findTemplates with no match returns empty array', () => {
    expect(findTemplates({ keyword: 'xyznonexistent' })).toEqual([])
  })

  it('R-13: registerTemplate adds new template', () => {
    const newTemplate: SingleTemplate = {
      id: 'test-custom',
      name: '테스트 커스텀',
      description: '테스트용',
      structureMode: 'single',
      tags: ['test'],
      version: '1.0.0',
      layers: [{ role: 'anode' }]
    }

    registerTemplate(newTemplate)

    expect(getTemplateById('test-custom')).toBeDefined()
  })

  it('R-14: default-single layers match DEFAULT_SINGLE_TEMPLATE from structureTemplates', () => {
    const template = getTemplateById('default-single') as SingleTemplate

    expect(template.layers.map((layer) => layer.role)).toEqual(
      DEFAULT_SINGLE_TEMPLATE.map((layer) => layer.role)
    )
  })

  it('R-15: default-rgb-fmm commonLayers match DEFAULT_RGB_COMMON_LAYERS', () => {
    const template = getTemplateById('default-rgb-fmm') as RgbTemplate

    expect(template.commonLayers.map((layer) => layer.role)).toEqual(
      DEFAULT_RGB_COMMON_LAYERS.map((layer) => layer.role)
    )
  })
})

describe('resetRegistry', () => {
  it('RST-01: resetRegistry → 내장 4개만 남음', () => {
    const customTemplate: SingleTemplate = {
      id: 'rst-custom-1',
      name: '리셋 테스트용',
      description: '테스트',
      structureMode: 'single',
      tags: ['test'],
      version: '1.0.0',
      layers: [{ role: 'anode' }]
    }
    registerTemplate(customTemplate)
    expect(getAllTemplates().length).toBeGreaterThanOrEqual(5)

    resetRegistry()

    expect(getAllTemplates().length).toBe(4)
    expect(getTemplateById('rst-custom-1')).toBeUndefined()
  })

  it('RST-02: registerTemplate → resetRegistry → 커스텀 템플릿 사라짐', () => {
    const customTemplate: SingleTemplate = {
      id: 'rst-custom-2',
      name: '리셋 테스트용 2',
      description: '테스트',
      structureMode: 'single',
      tags: ['test'],
      version: '1.0.0',
      layers: [{ role: 'cathode' }]
    }
    registerTemplate(customTemplate)
    expect(getTemplateById('rst-custom-2')).toBeDefined()

    resetRegistry()

    expect(getTemplateById('rst-custom-2')).toBeUndefined()
    expect(getTemplateById('default-single')).toBeDefined()
  })

  it('RST-03: unregisterTemplate 내장 템플릿 → false (보호)', () => {
    expect(unregisterTemplate('default-single')).toBe(false)
    expect(getTemplateById('default-single')).toBeDefined()
  })

  it('RST-04: unregisterTemplate 커스텀 템플릿 → true (성공)', () => {
    const customTemplate: SingleTemplate = {
      id: 'rst-custom-3',
      name: '삭제 테스트용',
      description: '테스트',
      structureMode: 'single',
      tags: ['test'],
      version: '1.0.0',
      layers: [{ role: 'eml' }]
    }
    registerTemplate(customTemplate)
    expect(getTemplateById('rst-custom-3')).toBeDefined()

    const result = unregisterTemplate('rst-custom-3')

    expect(result).toBe(true)
    expect(getTemplateById('rst-custom-3')).toBeUndefined()
  })

  it('RST-05: 다른 테스트에서 등록한 커스텀 템플릿이 이 테스트에 영향 없음', () => {
    expect(getTemplateById('test-custom')).toBeUndefined()
    expect(getAllTemplates().length).toBe(4)
  })
})
