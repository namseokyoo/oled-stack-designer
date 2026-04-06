import { describe, expect, it } from 'vitest'
import type { Layer } from '../../types'
import {
  explainCompareStructure,
  explainStructure,
  type CompareSlot
} from '../explainHandler'

const makeLayer = (id: string, name: string, material: string, thickness: number): Layer => ({
  id,
  name,
  role: 'custom',
  material,
  thickness,
  colorToken: 'custom',
  locked: false,
  appliesTo: ['r', 'g', 'b']
})

describe('explainHandler', () => {
  describe('explainStructure', () => {
    it('EH-01: 빈 레이어 → 빈 구조 메시지', () => {
      const result = explainStructure([], 'single')
      expect(result).toBe('현재 구조가 비어 있습니다.')
    })

    it('EH-02: single 모드 기본 동작', () => {
      const layers: Layer[] = [
        makeLayer('l1', 'HTL', 'NPB', 40),
        makeLayer('l2', 'EML', 'CBP', 30)
      ]
      const result = explainStructure(layers, 'single')
      expect(result).toContain('2개 레이어')
      expect(result).toContain('HTL')
      expect(result).toContain('EML')
    })
  })

  describe('explainCompareStructure', () => {
    it('EH-03: 빈 슬롯 → graceful 메시지', () => {
      const result = explainCompareStructure([], [], 'compare')
      expect(result).toContain('Compare 모드')
      expect(result).toContain('비교할 구조가 없습니다')
    })

    it('EH-04: 기본 슬롯 1개 + 비교 슬롯 1개 → 설명 포함', () => {
      const baseSlots: CompareSlot[] = [{ layers: [makeLayer('l1', 'HTL', 'NPB', 40)] }]
      const compareSlots: CompareSlot[] = [{ layers: [makeLayer('l2', 'ETL', 'Alq3', 30)] }]

      const result = explainCompareStructure(baseSlots, compareSlots, 'compare')

      expect(result).toContain('기본 구조 1개 슬롯')
      expect(result).toContain('비교 구조 1개 슬롯')
      expect(result).toContain('HTL')
      expect(result).toContain('ETL')
    })

    it('EH-05: 빈 슬롯 → graceful 처리', () => {
      const result = explainCompareStructure([{ layers: [] }], [{ layers: [] }], 'compare')
      expect(result).toContain('비어 있음')
    })
  })
})
