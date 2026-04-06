import { describe, expect, it } from 'vitest'
import { selectTemplate } from '../templateSelector'

describe('templateSelector', () => {
  it("SEL-01: '기본 oled' -> default-single", () => {
    expect(selectTemplate('기본 oled', 'single').id).toBe('default-single')
  })

  it("SEL-02: '기본' + mode single -> default-single", () => {
    expect(selectTemplate('기본', 'single').id).toBe('default-single')
  })

  it("SEL-03: 'basic' + mode single -> default-single", () => {
    expect(selectTemplate('basic', 'single').id).toBe('default-single')
  })

  it("SEL-04: 'rgb' + mode rgb -> default-rgb-fmm", () => {
    expect(selectTemplate('rgb', 'rgb').id).toBe('default-rgb-fmm')
  })

  it("SEL-05: 'tandem' keyword -> tandem-single", () => {
    expect(selectTemplate('tandem', 'single').id).toBe('tandem-single')
    expect(selectTemplate('tandem 구조', 'single').id).toBe('tandem-single')
  })

  it("SEL-06: '탠덤' keyword -> tandem-single", () => {
    expect(selectTemplate('탠덤', 'single').id).toBe('tandem-single')
  })

  it("SEL-07: 'white oled' keyword -> woled-rgb", () => {
    expect(selectTemplate('white oled', 'rgb').id).toBe('woled-rgb')
  })

  it("SEL-08: 'woled' keyword -> woled-rgb", () => {
    expect(selectTemplate('woled', 'rgb').id).toBe('woled-rgb')
  })

  it('SEL-09: empty query -> mode default', () => {
    expect(selectTemplate('', 'single').id).toBe('default-single')
    expect(selectTemplate('', 'rgb').id).toBe('default-rgb-fmm')
  })

  it('SEL-10: unknown query -> mode default fallback', () => {
    expect(selectTemplate('unknown-xyz-123', 'single').id).toBe('default-single')
    expect(selectTemplate('unknown-xyz-123', 'rgb').id).toBe('default-rgb-fmm')
  })

  it('SEL-11: selected template structureMode matches request mode', () => {
    expect(selectTemplate('기본', 'single').structureMode).toBe('single')
    expect(selectTemplate('rgb', 'rgb').structureMode).toBe('rgb')
  })
})
