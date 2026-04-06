import type { StructureTemplate } from './templateRegistry'
import { findTemplates, getDefaultTemplate } from './templateRegistry'

function pickPreferredTemplate(
  templates: StructureTemplate[],
  preferredId: string,
  mode: 'single' | 'rgb'
): StructureTemplate {
  return templates.find((template) => template.id === preferredId) ?? getDefaultTemplate(mode)
}

export function selectTemplate(
  query: string,
  mode: 'single' | 'rgb'
): StructureTemplate {
  const normalizedQuery = query.toLowerCase()

  if (normalizedQuery.includes('tandem') || normalizedQuery.includes('탠덤')) {
    return pickPreferredTemplate(
      findTemplates({ mode: 'single', tags: ['tandem'] }),
      'tandem-single',
      'single'
    )
  }

  if (
    normalizedQuery.includes('white oled') ||
    normalizedQuery.includes('woled') ||
    normalizedQuery.includes('화이트 oled') ||
    normalizedQuery.includes('화이트oled')
  ) {
    return pickPreferredTemplate(
      findTemplates({ mode: 'rgb', tags: ['woled'] }),
      'woled-rgb',
      'rgb'
    )
  }

  if (mode === 'rgb') {
    return pickPreferredTemplate(
      findTemplates({ mode: 'rgb', tags: ['basic', 'fmm'] }),
      'default-rgb-fmm',
      'rgb'
    )
  }

  if (normalizedQuery.includes('기본') || normalizedQuery.includes('basic')) {
    return pickPreferredTemplate(
      findTemplates({ mode: 'single', tags: ['basic'] }),
      'default-single',
      'single'
    )
  }

  return getDefaultTemplate(mode)
}
