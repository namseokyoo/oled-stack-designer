import { describe, expect, it } from 'vitest'
import { validateProject, selectSerializableProject, stripCompareState } from '../projectSerializer'
import type { Project } from '../../types'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    schemaVersion: '1.0.0',
    metadata: {
      name: 'Test Project',
      version: '1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    viewMode: 'scientific',
    structureMode: 'single',
    palette: 'classic',
    thicknessMode: 'uniform',
    stacks: [{ id: 'stack-1', label: 'Stack 1', layers: [] }],
    ...overrides
  }
}

describe('projectSerializer', () => {
  describe('T-09: validateProject — 필수 필드 누락 시 false', () => {
    it('schemaVersion 누락 시 false', () => {
      const data = { metadata: { name: 'x' }, stacks: [] }
      expect(validateProject(data)).toBe(false)
    })

    it('metadata 누락 시 false', () => {
      const data = { schemaVersion: '1.0.0', stacks: [] }
      expect(validateProject(data)).toBe(false)
    })

    it('stacks 누락 시 false', () => {
      const data = { schemaVersion: '1.0.0', metadata: { name: 'x' } }
      expect(validateProject(data)).toBe(false)
    })

    it('null 입력 시 false', () => {
      expect(validateProject(null)).toBe(false)
    })

    it('유효한 데이터 시 true', () => {
      const data = {
        schemaVersion: '1.0.0',
        metadata: { name: 'x' },
        stacks: []
      }
      expect(validateProject(data)).toBe(true)
    })
  })

  describe('T-08: selectSerializableProject — compare 모드 시 devices 포함', () => {
    it('single 모드 시 devices 없이 반환', () => {
      const project = makeProject({ structureMode: 'single' })
      const result = selectSerializableProject({
        project,
        devices: [{ id: 'd1', name: 'Device 1', layers: [] }],
        activeDeviceId: 'd1'
      })
      expect(result.devices).toBeUndefined()
    })

    it('compare 모드 시 devices 포함', () => {
      const project = makeProject({ structureMode: 'compare' })
      const devices = [{ id: 'd1', name: 'Device 1', layers: [] }]
      const result = selectSerializableProject({
        project,
        devices,
        activeDeviceId: 'd1'
      })
      expect(result.devices).toHaveLength(1)
      expect(result.activeDeviceId).toBe('d1')
    })

    it('compare 모드, activeDeviceId null 시 activeDeviceId undefined', () => {
      const project = makeProject({ structureMode: 'compare' })
      const result = selectSerializableProject({
        project,
        devices: [],
        activeDeviceId: null
      })
      expect(result.activeDeviceId).toBeUndefined()
    })
  })

  describe('stripCompareState', () => {
    it('devices/activeDeviceId 없는 복사본 반환', () => {
      const project = makeProject({ structureMode: 'compare' })
      const result = stripCompareState(project)
      expect(result.devices).toBeUndefined()
      expect(result.activeDeviceId).toBeUndefined()
    })
  })
})
